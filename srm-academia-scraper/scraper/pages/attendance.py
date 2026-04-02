from __future__ import annotations

from typing import Any


from bs4 import BeautifulSoup

from scraper.utils import extract_html_from_sanitizer


from bs4 import BeautifulSoup

from scraper.utils import extract_html_from_sanitizer
from scraper.models import StudentProfile, CourseAttendance


def parse_attendance_page(html: str) -> tuple[StudentProfile, list[CourseAttendance]]:
    """
    Phase 3: parse My Attendance page.
    Returns:
       profile_info (StudentProfile), attendance_records (list of CourseAttendance)
    """
    raw_html = extract_html_from_sanitizer(html)
    soup = BeautifulSoup(raw_html, "html.parser")
    tables = soup.find_all("table")

    profile_data: dict[str, str] = {}
    attendance: list[CourseAttendance] = []

    for table in tables:
        rows = table.find_all("tr")
        if not rows:
            continue

        first_row_text = rows[0].get_text(separator=" ", strip=True).lower()
        if "registration number" in first_row_text and not profile_data:
            for tr in rows:
                tds = tr.find_all("td")
                for i in range(0, len(tds) - 1, 2):
                    key = tds[i].get_text(separator=" ", strip=True).replace(":", "").strip()
                    val = tds[i + 1].get_text(separator=" ", strip=True)
                    if key:
                        profile_data[key] = val
            print(f"[DEBUG] Profile Data Keys: {list(profile_data.keys())}")
            print(f"[DEBUG] Profile Data: {profile_data}")
            continue

        headers = [th.get_text(separator=" ", strip=True) for th in rows[0].find_all(["th", "td"])]
        if "Course Code" in headers and "Attn %" in headers:
            for tr in rows[1:]:
                tds = tr.find_all("td")
                if len(tds) != len(headers):
                    continue
                record = {}
                for h, td in zip(headers, tds):
                    val = td.get_text(separator=" ", strip=True)
                    if h in ("Hours Conducted", "Hours Absent") and val.isdigit():
                        record[h] = int(val)
                    elif h == "Attn %":
                        try:
                            record[h] = float(val)
                        except ValueError:
                            record[h] = 0.0
                    else:
                        record[h] = val
                
                # Convert the course code removing newlines if present
                cc = record.get("Course Code", "").split("Regular")[0].strip()
                course = CourseAttendance(
                    course_code=cc,
                    course_title=record.get("Course Title", ""),
                    category=record.get("Category", ""),
                    faculty_name=record.get("Faculty Name", ""),
                    slot=record.get("Slot", ""),
                    room_no=record.get("Room No", ""),
                    hours_conducted=record.get("Hours Conducted", 0),
                    hours_absent=record.get("Hours Absent", 0),
                    attendance_percent=record.get("Attn %", 0.0),
                )
                attendance.append(course)

    # Some fallback for fields parsing depending on precise labels
    batch_str = profile_data.get("Batch", "1")
    batch_val = int(batch_str) if batch_str.isdigit() else 1
    
    semester_str = profile_data.get("Semester", "1")
    sem_val = int(semester_str) if semester_str.isdigit() else 1
    
    enrollment_raw = profile_data.get("Enrollment Status / DOE", "")
    enroll_status, enroll_date = "", ""
    if "/" in enrollment_raw:
        parts = enrollment_raw.split("/")
        enroll_status = parts[0].strip()
        enroll_date = parts[1].strip()
        
    profile = StudentProfile(
        registration_number=profile_data.get("Registration Number", ""),
        name=profile_data.get("Name", ""),
        program=profile_data.get("Program", ""),
        department=profile_data.get("Department", ""),
        specialization=profile_data.get("Specialization", ""),
        semester=sem_val,
        batch=batch_val,
        enrollment_status=enroll_status,
        enrollment_date=enroll_date,
        section=profile_data.get("Section") or profile_data.get("Batch / Section") or "",
    )

    return profile, attendance

