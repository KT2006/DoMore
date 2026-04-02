from __future__ import annotations

from typing import Any


from bs4 import BeautifulSoup

from scraper.utils import extract_html_from_sanitizer


from bs4 import BeautifulSoup

from scraper.utils import extract_html_from_sanitizer


def parse_my_timetable(html: str) -> dict[str, str]:
    """
    Phase 3: parse My Time Table page.
    Returns:
        dict mapping course_code -> slot (e.g., {"21CSE213T": "A", "21CSC303J": "P47-P48-"})
    """
    raw_html = extract_html_from_sanitizer(html)
    soup = BeautifulSoup(raw_html, "html.parser")
    tables = soup.find_all("table")

    course_to_slot: dict[str, str] = {}

    for table in tables:
        header_tds = [th for th in table.find_all(["th", "td"]) if "S.No" in th.text or th.find("strong")]
        header_texts = [th.text.strip() for th in header_tds]

        if "Course Code" in header_texts and "Slot" in header_texts:
            data_tds = [
                td.get_text(separator=" ", strip=True) 
                for td in table.find_all("td") 
                if not td.find("strong")
            ]

            chunk_size = len(header_texts)
            if chunk_size == 0:
                continue

            for j in range(0, len(data_tds), chunk_size):
                chunk = data_tds[j:j+chunk_size]
                if len(chunk) == chunk_size:
                    record = dict(zip(header_texts, chunk))
                    code = record.get("Course Code")
                    slot = record.get("Slot")
                    if code and slot:
                        # Depending on the course, practical slots might be "P47-P48-", clean it up
                        slot = slot.strip("- ")
                        # But wait, there can be multiple entries for the same course code!
                        # Typically one entry for Theory (Slot B) and one for Practical (Slot P47-P48).
                        # Let's disambiguate using the course category if "Course Type" is given
                        course_type = record.get("Course Type", "").lower()
                        if "practical" in course_type or "lab" in course_type:
                            course_to_slot[f"{code}_Lab"] = slot
                        else:
                            course_to_slot[f"{code}_Theory"] = slot

    return course_to_slot

