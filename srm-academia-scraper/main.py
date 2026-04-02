from __future__ import annotations

import os
import json
from pathlib import Path
from getpass import getpass
from dataclasses import asdict

from scraper.auth import login
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


def load_dotenv_file(dotenv_path: Path) -> None:
    if not dotenv_path.exists():
        return
    for raw_line in dotenv_path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def print_cli_report(profile, attendance, schedule, welcome_info):
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(" STUDENT PROFILE")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f" Reg No       : {profile.registration_number}")
    print(f" Name         : {profile.name}")
    print(f" Program      : {profile.program}")
    print(f" Department   : {profile.department}")
    print(f" Specialization: {profile.specialization}")
    print(f" Semester     : {profile.semester}")
    print(f" Batch        : {profile.batch}")
    print(f" Enrolled     : {profile.enrollment_date}")
    print(f" Current Date : {welcome_info.get('date', 'Unknown')}")
    print(f" Day Order    : {welcome_info.get('day_order', 'Unknown')}")
    print("")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(" ATTENDANCE SUMMARY")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f" {'Course':<30} | {'Type':<10} | {'Slot':<8} | {'Attn%':<6} | {'Can Skip':<8} | Need")
    print("-" * 75)
    for c in attendance:
        course_name = (c.course_title[:27] + "...") if len(c.course_title) > 30 else c.course_title
        print(f" {course_name:<30} | {c.category[:10]:<10} | {c.slot[:8]:<8} | {c.attendance_percent:<6.2f} | {c.bunkable_classes:<8} | {c.classes_needed_for_75}")

    print("\n \"Can Skip\" = classes you can miss and stay >= 75%")
    print(" \"Need\"     = classes you must attend to reach 75% (0 = already above)\n")
    
    for day_num in range(1, 6):
        day_schedule = schedule.get(day_num, [])
        if not day_schedule:
            continue
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print(f" SCHEDULE (Day Order {day_num}, Batch {profile.batch})")
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        for s in day_schedule:
            if s.course:
                cat = "Theory" if "theory" in s.course.category.lower() else "Lab"
                print(f" {s.start_time}-{s.end_time} │ [{s.slot_code}] {s.course.course_title} ({cat}) — {s.course.room_no}")
            else:
                print(f" {s.start_time}-{s.end_time} │ [{s.slot_code}] FREE")
        print("")


def run_scraper(email: str, password: str, debug: bool = False):
    """Executes the core scraping workflow and returns the structured data dictionaries."""
    # Phase 1: Authentication
    session = login(email=email, password=password, debug=debug)
    
    # Phase 2: Fetch Data
    if debug:
        print("\nFetching data pages...")
    html_welcome = fetch_welcome_page(session, debug=debug)
    html_attn = fetch_my_attendance_page(session, debug=debug)
    html_mytt = fetch_my_time_table_page(session, debug=debug)
    html_u1 = fetch_unified_time_table_batch1(session, debug=debug)
    html_u2 = fetch_unified_time_table_batch2(session, debug=debug)
    
    # Phase 3: Parse
    welcome_info = parse_welcome_page(html_welcome.html)
    profile, attendance_list = parse_attendance_page(html_attn.html)
    my_timetable_slots = parse_my_timetable(html_mytt.html)
    
    # Phase 4: Calculate & Merge
    if profile.batch == 1:
        grid = parse_unified_timetable(html_u1.html)
    else:
        grid = parse_unified_timetable(html_u2.html)
        
    schedule = build_personal_schedule(profile, attendance_list, my_timetable_slots, grid)
    
    export_data = {
        "metadata": welcome_info,
        "student": asdict(profile),
        "attendance": [asdict(a) for a in attendance_list],
        "timetable": {day: [asdict(slot) for slot in slots] for day, slots in schedule.items()}
    }
    return export_data, profile, attendance_list, schedule, welcome_info


def main() -> None:
    root_dir = Path(__file__).resolve().parents[1]
    load_dotenv_file(root_dir / ".env")

    print("╔══════════════════════════════════════════════════════════════╗")
    print("║               SRM ACADEMIA SCRAPER v1.0                      ║")
    print("╚══════════════════════════════════════════════════════════════╝\n")

    email = os.getenv("SRM_EMAIL") or os.getenv("SRM_NETID") or input("Email/NetID: ").strip()
    password = os.getenv("SRM_PASSWORD") or getpass("Password: ")
    debug = (os.getenv("SRM_DEBUG") or "1").lower() in {"1", "true", "yes", "on"}

    try:
        export_data, profile, attendance_list, schedule, welcome_info = run_scraper(email, password, debug)
    except Exception as e:
        print(f"\n[ERROR] Scraping failed: {e}")
        return

    # Phase 5: Export & Print
    os.makedirs("output", exist_ok=True)
    with open("output/data.json", "w") as f:
        json.dump(export_data, f, indent=2)
        
    print_cli_report(profile, attendance_list, schedule, welcome_info)
    print("\nData successfully exported to output/data.json!")


if __name__ == "__main__":
    main()

