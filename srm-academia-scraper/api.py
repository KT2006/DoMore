"""
FastAPI wrapper for the SRM Academia Scraper.
Supports a two-phase login flow:
  Phase 1: POST /api/scrape  → attempts login; if CAPTCHA triggered, returns captcha image
  Phase 2: POST /api/scrape  → same endpoint with captcha_text + session_id to complete
"""
import base64
import logging
import uuid
import threading
import time
from dataclasses import asdict

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from main import run_scraper
from scraper.auth import login as scraper_login
from scraper.fetcher import (
    fetch_my_attendance_page,
    fetch_my_time_table_page,
    fetch_unified_time_table_batch1,
    fetch_unified_time_table_batch2,
    fetch_welcome_page,
)
from scraper.pages.attendance import parse_attendance_page
from scraper.pages.timetable import parse_my_timetable
from scraper.pages.unified_tt import parse_unified_timetable
from scraper.pages.welcome import parse_welcome_page
from scraper.calculator import build_personal_schedule

# ---------------------------------------------------------------------------
# In-memory store for pending CAPTCHA sessions
# ---------------------------------------------------------------------------
_pending_sessions: dict[str, dict] = {}
_SESSION_TTL_SECONDS = 300  # 5 minutes

def _cleanup_stale_sessions() -> None:
    """Remove sessions older than TTL."""
    now = time.time()
    stale = [sid for sid, s in _pending_sessions.items() if now - s["created_at"] > _SESSION_TTL_SECONDS]
    for sid in stale:
        _pending_sessions.pop(sid, None)

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="SRM Academia API",
    description="FastAPI wrapper for the SRM Academia Scraper with CAPTCHA support.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ScrapeRequest(BaseModel):
    email: str = Field(..., description="SRM NetID or Email")
    password: str = Field(..., description="SRM Password")
    captcha_text: str = Field("", description="CAPTCHA solution (only if captcha was required)")
    session_id: str = Field("", description="Session ID from a captcha_required response")


class CaptchaResponse(BaseModel):
    status: str = "captcha_required"
    session_id: str
    captcha_image: str  # base64 PNG


# ---------------------------------------------------------------------------
# Custom CaptchaInterrupt
# ---------------------------------------------------------------------------
class CaptchaInterrupt(Exception):
    """Raised inside captcha_callback to signal that we need user input."""
    def __init__(self, captcha_bytes: bytes):
        self.captcha_bytes = captcha_bytes


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _scrape_with_session(session, debug: bool = False):
    """Given an authenticated requests.Session, fetch + parse all pages."""
    html_welcome = fetch_welcome_page(session, debug=debug)
    html_attn = fetch_my_attendance_page(session, debug=debug)
    html_mytt = fetch_my_time_table_page(session, debug=debug)
    html_u1 = fetch_unified_time_table_batch1(session, debug=debug)
    html_u2 = fetch_unified_time_table_batch2(session, debug=debug)

    welcome_info = parse_welcome_page(html_welcome.html)
    profile, attendance_list = parse_attendance_page(html_attn.html)
    my_timetable_slots = parse_my_timetable(html_mytt.html)

    if profile.batch == 1:
        grid = parse_unified_timetable(html_u1.html)
    else:
        grid = parse_unified_timetable(html_u2.html)

    schedule = build_personal_schedule(profile, attendance_list, my_timetable_slots, grid)

    export_data = {
        "metadata": welcome_info,
        "student": asdict(profile),
        "attendance": [asdict(a) for a in attendance_list],
        "timetable": {day: [asdict(slot) for slot in slots] for day, slots in schedule.items()},
    }
    return export_data


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/api/health")
def health():
    return {"ok": True, "engine": "srm-academia-scraper", "version": "2.0.0"}


@app.post("/api/scrape")
def scrape_academia(creds: ScrapeRequest):
    print(f"[DEBUG] Received scrape request for: {creds.email}")
    """
    Main scrape endpoint.

    Flow A (no prior CAPTCHA):
      - Send { email, password }
      - If CAPTCHA is required: returns { status: "captcha_required", session_id, captcha_image }
      - If login succeeds: returns the full academic data JSON

    Flow B (CAPTCHA was required — user solved it):
      - Send { email, password, captcha_text, session_id }
      - Backend resumes login with the CAPTCHA solution
      - Returns the full academic data JSON
    """
    _cleanup_stale_sessions()

    # ── Flow B: Resume with CAPTCHA solution ──────────────────────────────
    if creds.session_id and creds.captcha_text:
        pending = _pending_sessions.pop(creds.session_id, None)
        if not pending:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Session expired or invalid. Please try logging in again.",
            )

        # The pending session stores the event + condition used to synchronize
        pending["captcha_solution"] = creds.captcha_text.strip()
        pending["resolved"] = True
        with pending["condition"]:
            pending["condition"].notify_all()

        # Wait for the background login thread to finish
        pending["thread"].join(timeout=60)
        if pending.get("error"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(pending["error"]),
            )
        if not pending.get("result"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Login timed out. Please try again.",
            )
        return pending["result"]

    # ── Flow A: Fresh login attempt ───────────────────────────────────────
    # We need a synchronization mechanism: the login runs in a thread.
    # If CAPTCHA is needed, the captcha_callback blocks (waits on a condition)
    # and we return the captcha image to the client.
    session_id = str(uuid.uuid4())
    condition = threading.Condition()
    session_state = {
        "created_at": time.time(),
        "condition": condition,
        "captcha_bytes": None,
        "captcha_solution": None,
        "resolved": False,
        "result": None,
        "error": None,
        "thread": None,
        "login_done": False,
    }

    def captcha_callback(captcha_bytes: bytes) -> str:
        """Called by the scraper when CAPTCHA is needed. Blocks until user provides solution."""
        session_state["captcha_bytes"] = captcha_bytes
        # Signal the main thread that captcha is ready
        with condition:
            condition.notify_all()
        # Now wait for the user to provide the solution (up to 5 minutes)
        with condition:
            condition.wait_for(lambda: session_state["resolved"], timeout=_SESSION_TTL_SECONDS)
        if not session_state.get("captcha_solution"):
            raise RuntimeError("CAPTCHA solution was not provided in time.")
        return session_state["captcha_solution"]

    def login_and_scrape():
        try:
            session = scraper_login(
                email=creds.email,
                password=creds.password,
                captcha_callback=captcha_callback,
                debug=False,
            )
            result = _scrape_with_session(session, debug=False)
            session_state["result"] = result
        except Exception as e:
            session_state["error"] = str(e)
            logging.error(f"Scraper error: {e}", exc_info=True)
        finally:
            session_state["login_done"] = True
            with condition:
                condition.notify_all()

    thread = threading.Thread(target=login_and_scrape, daemon=True)
    session_state["thread"] = thread
    _pending_sessions[session_id] = session_state
    thread.start()

    # Wait for either: (a) login completes, or (b) captcha_callback fires
    with condition:
        condition.wait_for(
            lambda: session_state["captcha_bytes"] is not None or session_state["login_done"],
            timeout=60,
        )

    # Case 1: CAPTCHA was triggered — return image to frontend
    if session_state["captcha_bytes"] and not session_state["login_done"]:
        captcha_b64 = base64.b64encode(session_state["captcha_bytes"]).decode("ascii")
        return {
            "status": "captcha_required",
            "session_id": session_id,
            "captcha_image": captcha_b64,
        }

    # Case 2: Login completed (no CAPTCHA or after CAPTCHA)
    if session_state.get("error"):
        _pending_sessions.pop(session_id, None)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(session_state["error"]),
        )

    _pending_sessions.pop(session_id, None)
    if session_state.get("result"):
        print(f"[DEBUG] Scrape Result Student: {session_state['result']['student']}")
        return session_state["result"]

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Login timed out. Please try again.",
    )


# Legacy alias
@app.post("/scrape")
def scrape_legacy(creds: ScrapeRequest):
    return scrape_academia(creds)
