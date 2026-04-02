import re
from typing import Any
from bs4 import BeautifulSoup
from scraper.utils import extract_html_from_sanitizer


def parse_welcome_page(html: str) -> dict[str, str]:
    """
    Phase 3: parse welcome/home page.
    Extracts the current Date and Day Order from the portal.
    """
    raw_html = extract_html_from_sanitizer(html)
    text = BeautifulSoup(raw_html, "html.parser").get_text(separator=" ", strip=True)
    
    # Example text: "Date:01-Apr-26 Day Order:4" or "Date: 01-Apr-26 Day Order: 4"
    date_match = re.search(r"Date\s*:\s*([\d\w-]+)", text, re.IGNORECASE)
    day_match = re.search(r"Day\s*Order\s*:\s*(\d+|-)", text, re.IGNORECASE)
    
    return {
        "date": date_match.group(1).strip() if date_match else "Unknown",
        "day_order": day_match.group(1).strip() if day_match else "Unknown"
    }

