from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from database import supabase
from auth import require_admin
from cache import cache_delete, cache_delete_pattern

router = APIRouter(prefix="/admin", tags=["admin"])

class CourseCreate(BaseModel):
    code: str
    title: str
    credits: int

class SectionCreate(BaseModel):
    course_id: str
    section_code: str
    instructor: str
    schedule: str
    seats_total: int

class SectionUpdate(BaseModel):
    instructor: str | None = None
    schedule: str | None = None
    seats_total: int | None = None

# --- COURSES ---

@router.post("/courses")
def create_course(body: CourseCreate, current: dict = Depends(require_admin)):
    existing = supabase.table("courses") \
        .select("id") \
        .eq("code", body.code) \
        .execute()

    if existing.data:
        raise HTTPException(status_code=400, detail="Course code already exists")

    result = supabase.table("courses").insert({
        "code": body.code,
        "title": body.title,
        "credits": body.credits
    }).execute()

    # Bust course cache so new course appears immediately
    cache_delete("courses:all")

    return result.data[0]

@router.delete("/courses/{course_id}")
def delete_course(course_id: str, current: dict = Depends(require_admin)):
    sections = supabase.table("sections") \
        .select("id") \
        .eq("course_id", course_id) \
        .execute()

    section_ids = [s["id"] for s in sections.data]

    if section_ids:
        enrollments = supabase.table("registrations") \
            .select("id") \
            .in_("section_id", section_ids) \
            .execute()

        if enrollments.data:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete course with active enrollments"
            )

    supabase.table("courses").delete().eq("id", course_id).execute()

    # Bust both course cache and its sections cache
    cache_delete("courses:all")
    cache_delete_pattern(f"sections:{course_id}")

    return {"message": "Course deleted"}

# --- SECTIONS ---

@router.post("/sections")
def create_section(body: SectionCreate, current: dict = Depends(require_admin)):
    result = supabase.table("sections").insert({
        "course_id": body.course_id,
        "section_code": body.section_code,
        "instructor": body.instructor,
        "schedule": body.schedule,
        "seats_total": body.seats_total,
        "seats_remaining": body.seats_total
    }).execute()

    # Bust sections cache for this course
    cache_delete(f"sections:{body.course_id}")

    return result.data[0]

@router.patch("/sections/{section_id}")
def update_section(section_id: str, body: SectionUpdate, current: dict = Depends(require_admin)):
    updates = {k: v for k, v in body.dict().items() if v is not None}

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    # Get course_id first so we know which cache to bust
    section = supabase.table("sections") \
        .select("course_id") \
        .eq("id", section_id) \
        .execute()

    result = supabase.table("sections") \
        .update(updates) \
        .eq("id", section_id) \
        .execute()

    cache_delete(f"sections:{section['data'][0]['course_id']}")

    return result.data[0]

# --- REGISTRATIONS ---

@router.get("/registrations")
def get_all_registrations(current: dict = Depends(require_admin)):
    result = supabase.table("registrations") \
        .select("*, students(student_id, full_name, email), sections(section_code, courses(code, title))") \
        .execute()
    return result.data

@router.delete("/registrations/{registration_id}")
def force_drop(registration_id: str, current: dict = Depends(require_admin)):
    reg = supabase.table("registrations") \
        .select("*") \
        .eq("id", registration_id) \
        .execute()

    if not reg.data:
        raise HTTPException(status_code=404, detail="Registration not found")

    section_id = reg.data[0]["section_id"]

    supabase.table("registrations") \
        .delete() \
        .eq("id", registration_id) \
        .execute()

    supabase.rpc("increment_seats", {"p_section_id": section_id}).execute()

    return {"message": "Registration force-dropped by admin"}

# --- STUDENTS ---

@router.get("/students")
def get_all_students(current: dict = Depends(require_admin)):
    result = supabase.table("students") \
        .select("id, student_id, full_name, email, role, created_at") \
        .execute()
    return result.data