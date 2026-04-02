from __future__ import annotations

import time
from typing import Any
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

from scraper.utils import BASE_URL, ensure_dirs


def create_session() -> requests.Session:
    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }
    )
    return session


def terminate_all_sessions(session: requests.Session, block_page_response: requests.Response) -> bool:
    """
    Auto-terminate all sessions when SRM blocks the account due to concurrent sessions.
    """
    soup = BeautifulSoup(block_page_response.text, "html.parser")

    iamcsr = session.cookies.get("iamcsr")
    if not iamcsr:
        print("  ✗ Cannot terminate sessions: 'iamcsr' cookie missing.")
        return False
        
    action_full_url = urljoin(BASE_URL, "/accounts/p/40-10002227248/webclient/v1/announcement/pre/blocksessions")
    
    headers = {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "X-ZCSRF-TOKEN": f"iamcsrcoo={iamcsr}",
        "X-Requested-With": "XMLHttpRequest",
    }
    
    print(f"  → Terminate sessions: DELETE {action_full_url}")
    resp = session.delete(action_full_url, headers=headers, timeout=20)
    print(f"  → Terminate sessions response: {resp.status_code} (URL: {resp.url})")

    time.sleep(2)
    # Heuristic: if we didn't land back on a block page, assume termination worked.
    is_blocked = "block-sessions" in resp.url.lower() or "sessions-reminder" in resp.url.lower()
    return not is_blocked and resp.status_code in (200, 302, 204)

