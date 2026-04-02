from __future__ import annotations

import os
import random
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Optional
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup


BASE_URL = "https://academia.srmist.edu.in"
DEFAULT_TIMEOUT_SECONDS = 20


class SRMError(Exception):
    pass


class LoginError(SRMError):
    pass


class SessionExpiredError(SRMError):
    pass


@dataclass(frozen=True)
class FormParseResult:
    form_action_url: str
    hidden_fields: dict[str, str]
    email_field_name: str
    password_field_name: str
    captcha_field_name: Optional[str]


def _project_root() -> Path:
    # scraper/utils.py -> scraper/ -> srm-academia-scraper/
    return Path(__file__).resolve().parents[1]


def ensure_dirs() -> tuple[Path, Path]:
    root = _project_root()
    output_dir = root / "output"
    debug_dir = root / "debug"
    output_dir.mkdir(parents=True, exist_ok=True)
    debug_dir.mkdir(parents=True, exist_ok=True)
    return output_dir, debug_dir


def mask_secret(value: str) -> str:
    if not value:
        return ""
    if len(value) <= 2:
        return "*" * len(value)
    return "*" * 4


def debug_save_html(html: str, debug_filename: str) -> str:
    _, debug_dir = ensure_dirs()
    path = debug_dir / debug_filename
    path.write_text(html, encoding="utf-8", errors="ignore")
    return str(path)


def html_snippet(html: str, limit: int = 500) -> str:
    cleaned = " ".join(html.split())
    return cleaned[:limit] + ("..." if len(cleaned) > limit else "")


def should_retry_for_network_exception(exc: Exception) -> bool:
    # requests.Timeout / ConnectionError / RequestException
    return isinstance(
        exc,
        (
            requests.Timeout,
            requests.ConnectionError,
            requests.ChunkedEncodingError,
        ),
    )


def request_with_retries(
    session: requests.Session,
    method: str,
    url: str,
    *,
    data: Optional[dict[str, Any]] = None,
    headers: Optional[dict[str, str]] = None,
    timeout_seconds: int = DEFAULT_TIMEOUT_SECONDS,
    max_retries: int = 3,
    debug: bool = False,
) -> requests.Response:
    """
    Retry policy (per requirements):
    - Network timeout: retry up to 3 times with exponential backoff (1s, 2s, 4s)
    - HTTP 403/401: session expired (raise SessionExpiredError)
    - HTTP 500: retry once after 5 seconds
    """
    backoffs = [1, 2, 4]
    # `max_retries` is the number of retries *after* the first attempt.
    network_retry_count = 0
    did_retry_500 = False
    last_exc: Optional[Exception] = None

    while True:
        try:
            resp = session.request(
                method,
                url,
                data=data,
                headers=headers,
                timeout=timeout_seconds,
            )
            if resp.status_code in (401, 403):
                raise SessionExpiredError(f"Session expired ({resp.status_code}) for {resp.url}")

            if resp.status_code == 500 and not did_retry_500:
                did_retry_500 = True
                if debug:
                    print("  ↻ HTTP 500 received; waiting 5 seconds then retrying once...")
                time.sleep(5)
                continue
            return resp
        except Exception as exc:  # noqa: BLE001
            if should_retry_for_network_exception(exc) and network_retry_count < max_retries:
                last_exc = exc
                wait_s = backoffs[min(network_retry_count, len(backoffs) - 1)]
                # Add tiny jitter to avoid thundering herd.
                wait_s = wait_s + random.uniform(0, 0.25)
                if debug:
                    print(
                        f"  ↻ Network error; retrying in {wait_s:.1f}s ... ({exc.__class__.__name__}) "
                        f"[retry {network_retry_count + 1}/{max_retries}]"
                    )
                time.sleep(wait_s)
                network_retry_count += 1
                continue
            raise exc

    # Unreachable, but keeps mypy/linters happy.
    if last_exc is not None:
        raise last_exc
    raise SRMError(f"Request failed unexpectedly: {method} {url}")


def parse_login_form(html: str, page_url: str = BASE_URL) -> FormParseResult:
    soup = BeautifulSoup(html, "html.parser")
    forms = soup.find_all("form")
    if not forms:
        raise LoginError("Login form not found in HTML.")

    def _has_email_password(form) -> bool:
        has_email = (
            bool(form.find("input", {"type": "email"})) or 
            bool(form.find("input", {"name": lambda v: isinstance(v, str) and ("email" in v.lower() or "login_id" in v.lower())})) or
            (bool(form.find("input", {"name": True, "type": True})) and "email" in (form.get_text() or "").lower())
        )
        has_password = bool(form.find("input", {"type": "password"})) or bool(form.find("input", {"name": lambda v: isinstance(v, str) and "password" in v.lower()}))
        return has_email or has_password

    form = next((f for f in forms if _has_email_password(f)), forms[0])

    action = form.get("action") or ""
    action_url = urljoin(page_url, action)

    hidden_fields: dict[str, str] = {}
    for inp in form.find_all("input", {"type": "hidden"}):
        name = inp.get("name")
        if not name:
            continue
        hidden_fields[name] = inp.get("value", "")

    email_input = form.find("input", {"type": "email"}) or form.find(
        "input",
        {"name": lambda v: isinstance(v, str) and ("email" in v.lower() or "login_id" in v.lower())}
    )
    password_input = form.find("input", {"type": "password"}) or form.find("input", {"name": lambda v: isinstance(v, str) and "password" in v.lower()})

    if not email_input or not email_input.get("name"):
        raise LoginError("Email field not found in login form.")
    if not password_input or not password_input.get("name"):
        raise LoginError("Password field not found in login form.")

    email_field_name = str(email_input.get("name"))
    password_field_name = str(password_input.get("name"))

    captcha_input = form.find("input", {"name": lambda v: isinstance(v, str) and "captcha" in v.lower()}) or form.find(
        "input",
        {"id": lambda v: isinstance(v, str) and "captcha" in v.lower()},
    )
    captcha_field_name = None
    if captcha_input:
        captcha_field_name = captcha_input.get("name") or captcha_input.get("id")

    return FormParseResult(
        form_action_url=action_url,
        hidden_fields=hidden_fields,
        email_field_name=email_field_name,
        password_field_name=password_field_name,
        captcha_field_name=captcha_field_name,
    )


def find_captcha_image_tag(html: str) -> Any | None:
    soup = BeautifulSoup(html, "html.parser")
    # Heuristic: src/id/name contains "captcha"
    img_candidates = soup.find_all("img")
    for img in img_candidates:
        src = (img.get("src") or "").lower()
        alt = (img.get("alt") or "").lower()
        element_id = (img.get("id") or "").lower()
        cls = " ".join(img.get("class") or []).lower()
        if "captcha" in src or "captcha" in alt or "captcha" in element_id or "captcha" in cls:
            return img

    # Fallback: if there is exactly one image, it might be the captcha.
    if len(img_candidates) == 1:
        return img_candidates[0]
    return None


def extract_login_error_message(html: str) -> Optional[str]:
    soup = BeautifulSoup(html, "html.parser")
    text = soup.get_text(" ", strip=True)
    lowered = text.lower()
    # Minimal heuristics; keep it robust to minor HTML changes.
    for needle in ["invalid", "captcha", "wrong", "error", "failed"]:
        if needle in lowered:
            # Return a small excerpt around the first occurrence.
            idx = lowered.find(needle)
            start = max(0, idx - 80)
            end = min(len(text), idx + 160)
            snippet = text[start:end]
            return " ".join(snippet.split())[:300]
    return None


def looks_logged_in(html: str, response_url: str) -> bool:
    """Check if the given HTML string or URL indicates a logged-in state."""
    # Check URLs or SPA paths
    if "#WELCOME" in response_url or "page/WELCOME" in response_url:
        return True
    
    # Check if the page contains pageSanitizer (which is only present on internal data pages)
    if "pageSanitizer.sanitize(" in html:
        return True
        
    # Check if we landed on the main App Shell but `#WELCOME` wasn't explicitly loaded in the URL
    if '"APPLINKNAME":"academia-academic-services"' in html or 'ZCGlobal.loginEmail' in html:
        return True
        
    # Warning: The login page also contains 'Academia - Academic Web Services' and 'Welcome',
    # so we must be very careful not to false-positive on the login page itself.
    if '<div class="welcome_txt">We have sent an email' in html:
        return False
        
    return False


def extract_html_from_sanitizer(raw_html: str) -> str:
    """
    The Academia SPA embeds the actual structured HTML data inside a JS string:
    document.getElementById("...").innerHTML = pageSanitizer.sanitize('<style> ... <table> ...');
    
    This function extracts that embedded string and unescapes it for BeautifulSoup parsing.
    """
    import re
    m = re.search(r"pageSanitizer\.sanitize\('(.+?)'\);", raw_html, flags=re.DOTALL)
    if not m:
        return raw_html # Return as-is if no sanitizer string is found (e.g., standard HTML)
        
    raw_str = m.group(1)
    # Decode javascript unicode string escapes (like \x22 to ")
    try:
        decoded_str = bytes(raw_str, "utf-8").decode("unicode_escape").replace(r"\-", "-").replace(r"\/", "/")
        return decoded_str
    except Exception:
        return raw_html

