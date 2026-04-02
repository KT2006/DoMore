from __future__ import annotations

from dataclasses import dataclass


@dataclass
class StudentProfile:
    registration_number: str
    name: str
    program: str
    department: str
    specialization: str
    semester: int
    batch: int  # CRITICAL — determines which unified timetable to use
    enrollment_status: str
    enrollment_date: str
    section: str


@dataclass
class CourseAttendance:
    course_code: str
    course_title: str
    category: str  # "Theory" or "Practical"
    faculty_name: str
    slot: str  # e.g., "A", "B", "P47-P48", "L51-L52"
    room_no: str
    hours_conducted: int
    hours_absent: int
    attendance_percent: float

    @property
    def hours_present(self) -> int:
        return self.hours_conducted - self.hours_absent

    @property
    def bunkable_classes(self) -> int:
        """How many more classes can be skipped while staying >= 75%"""
        if self.hours_conducted <= 0:
            return 0
        present = self.hours_present
        total = self.hours_conducted
        bunkable = int((present / 0.75) - total)
        return max(0, bunkable)

    @property
    def classes_needed_for_75(self) -> int:
        """If below 75%, how many (additional) classes needed to reach 75%"""
        if self.hours_conducted <= 0:
            return 0
        if self.attendance_percent >= 75.0:
            return 0
        present = self.hours_present
        total = self.hours_conducted
        needed = int(((0.75 * total) - present) / 0.25)
        return max(0, needed + 1)


@dataclass
class CourseDetails:
    course_code: str
    course_title: str
    category: str
    room_no: str
    faculty_name: str


@dataclass
class TimeSlot:
    hour: int
    start_time: str
    end_time: str
    slot_code: str
    course: CourseDetails | None  # None if free period

