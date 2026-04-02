from __future__ import annotations

from typing import Any


from bs4 import BeautifulSoup

from scraper.utils import extract_html_from_sanitizer


def parse_unified_timetable(html: str) -> dict[str, list[str]]:
    """
    Phase 3: parse Unified Time Table grid.
    Returns: 
        dict mapping "Day 1" -> list of slot names ("P1", "A", etc)
    """
    raw_html = extract_html_from_sanitizer(html)
    soup = BeautifulSoup(raw_html, "html.parser")
    
    tt: dict[str, list[str]] = {}
    
    for table in soup.find_all("table"):
        for tr in table.find_all("tr"):
            tds = [td.get_text(separator=" ", strip=True) for td in tr.find_all(["th", "td"])]
            if len(tds) > 1 and "Day" in tds[0]:
                day_name = tds[0]
                slots = tds[1:]
                tt[day_name] = slots
                
    return tt

