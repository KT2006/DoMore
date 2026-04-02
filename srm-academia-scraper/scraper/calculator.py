from __future__ import annotations

from typing import Any

from scraper.models import CourseAttendance, CourseDetails, TimeSlot, StudentProfile


TIMES = [
    ("08:00", "08:50"), ("08:50", "09:40"), ("09:45", "10:35"), ("10:40", "11:30"),
    ("11:35", "12:25"), ("12:30", "01:20"), ("01:25", "02:15"), ("02:20", "03:10"),
    ("03:10", "04:00"), ("04:00", "04:50"), ("04:50", "05:30"), ("05:30", "06:10")
]


def build_personal_schedule(
    student: StudentProfile,
    courses: list[CourseAttendance],
    my_timetable_slots: dict[str, str],
    unified_grid: dict[str, list[str]],
) -> dict[int, list[TimeSlot]]:
    """
    Phase 4: schedule builder.
    Combines registered course slots with the unified batch timetable grid.
    Returns: A complete hierarchical map of Day (1-5) -> 12 TimeSlots per day.
    """
    schedule: dict[int, list[TimeSlot]] = {}
    
    # Pre-compute components for each course
    course_slot_components = {}
    for course in courses:
        key_suffix = "Lab" if ("practical" in course.category.lower() or "lab" in course.category.lower()) else "Theory"
        slot_key = f"{course.course_code}_{key_suffix}"
        
        user_slot = my_timetable_slots.get(slot_key)
        if not user_slot:
            continue
            
        components = [s.strip() for s in user_slot.split("-") if s.strip()]
        course_slot_components[course.course_code] = {
            "components": components,
            "course": course
        }

    # Always ensure Day 1 through 5 exist correctly
    for day_num in range(1, 6):
        schedule[day_num] = []
        day_str = f"Day {day_num}"
        grid_slots_for_day = unified_grid.get(day_str, [])
        
        for hour_idx in range(12):
            start_time, end_time = TIMES[hour_idx]
            raw_grid_slot = grid_slots_for_day[hour_idx] if hour_idx < len(grid_slots_for_day) else ""
            clean_grid_slot = raw_grid_slot.split("/")[0].strip() if raw_grid_slot else ""
            
            # Identify if any user course matches this slot
            matched_course_details = None
            for course_code, data in course_slot_components.items():
                if clean_grid_slot and clean_grid_slot in data["components"]:
                    c = data["course"]
                    matched_course_details = CourseDetails(
                        course_code=c.course_code,
                        course_title=c.course_title,
                        category=c.category,
                        room_no=c.room_no,
                        faculty_name=c.faculty_name,
                    )
                    break
            
            entry = TimeSlot(
                hour=hour_idx + 1,
                start_time=start_time,
                end_time=end_time,
                slot_code=raw_grid_slot,
                course=matched_course_details,
            )
            schedule[day_num].append(entry)

    return schedule

