from fastapi import APIRouter
from database import supabase
from cache import cache_get, cache_set, cache_delete_pattern, CACHE_TTL_COURSES, CACHE_TTL_SECTIONS

router = APIRouter(prefix="/courses", tags=["courses"])

@router.get("/")
def get_courses():
    cache_key = "courses:all"

    # 1. Check cache first
    cached = cache_get(cache_key)
    if cached:
        return cached   # returned in microseconds, Postgres never touched

    # 2. Cache miss — go to Postgres
    result = supabase.table("courses").select("*").execute()

    # 3. Store in cache for next time
    cache_set(cache_key, result.data, CACHE_TTL_COURSES)

    return result.data

@router.get("/{course_id}/sections")
def get_sections(course_id: str):
    cache_key = f"sections:{course_id}"

    cached = cache_get(cache_key)
    if cached:
        return cached

    result = supabase.table("sections") \
        .select("*") \
        .eq("course_id", course_id) \
        .execute()

    cache_set(cache_key, result.data, CACHE_TTL_SECTIONS)

    return result.data