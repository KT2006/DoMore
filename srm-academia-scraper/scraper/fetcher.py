from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from scraper.utils import BASE_URL, debug_save_html, html_snippet, request_with_retries


WELCOME_URL = f"{BASE_URL}/srm_university/academia-academic-services/page/WELCOME"
ATTENDANCE_URL = f"{BASE_URL}/srm_university/academia-academic-services/page/My_Attendance"
MY_TIME_TABLE_URL = f"{BASE_URL}/srm_university/academia-academic-services/page/My_Time_Table_2023_24"

# Requirements-provided unified timetable endpoints.
UNIFIED_TT_BATCH1_URL = f"{BASE_URL}/srm_university/academia-academic-services/page/Unified_Time_Table_2025_Batch_1"
UNIFIED_TT_BATCH2_URL = f"{BASE_URL}/srm_university/academia-academic-services/page/Unified_Time_Table_2025_batch_2"


@dataclass
class FetchedPage:
    url: str
    final_url: str
    status_code: int
    html: str
    snippet: str
    debug_path: Optional[str]


def fetch_html_page(
    session,
    url: str,
    *,
    debug_filename: str | None,
    headers: dict[str, str] | None = None,
) -> FetchedPage:
    req_headers = {
        "X-Requested-With": "XMLHttpRequest",
        "Accept": "*/*",
    }
    if headers:
        req_headers.update(headers)

    resp = request_with_retries(
        session,
        "GET",
        url,
        headers=req_headers,
        debug=False,
    )

    snippet = html_snippet(resp.text, 1000)
    debug_path = debug_save_html(resp.text, debug_filename) if debug_filename else None

    print(f"  → Fetch: {url}")
    print(f"  → Status: {resp.status_code}")
    print(f"  → Final URL: {resp.url}")
    if debug_path:
        print(f"  → Saved debug HTML: {debug_path}")
    print(f"  → HTML snippet (first 1000 chars):\n{snippet}\n")

    return FetchedPage(
        url=url,
        final_url=resp.url,
        status_code=resp.status_code,
        html=resp.text,
        snippet=snippet,
        debug_path=debug_path,
    )


def fetch_welcome_page(session, *, debug: bool = True) -> FetchedPage:
    return fetch_html_page(
        session,
        WELCOME_URL,
        debug_filename="welcome.html" if debug else None,
        headers={"Referer": BASE_URL},
    )


def fetch_my_attendance_page(session, *, debug: bool = True) -> FetchedPage:
    return fetch_html_page(
        session,
        ATTENDANCE_URL,
        debug_filename="my_attendance.html" if debug else None,
        headers={"Referer": BASE_URL},
    )


def fetch_my_time_table_page(session, *, debug: bool = True) -> FetchedPage:
    return fetch_html_page(
        session,
        MY_TIME_TABLE_URL,
        debug_filename="my_time_table.html" if debug else None,
        headers={"Referer": BASE_URL},
    )


def fetch_unified_time_table_batch1(session, *, debug: bool = True) -> FetchedPage:
    return fetch_html_page(
        session,
        UNIFIED_TT_BATCH1_URL,
        debug_filename="unified_tt_batch1.html" if debug else None,
        headers={"Referer": BASE_URL},
    )


def fetch_unified_time_table_batch2(session, *, debug: bool = True) -> FetchedPage:
    return fetch_html_page(
        session,
        UNIFIED_TT_BATCH2_URL,
        debug_filename="unified_tt_batch2.html" if debug else None,
        headers={"Referer": BASE_URL},
    )

