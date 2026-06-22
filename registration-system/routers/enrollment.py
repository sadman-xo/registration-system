from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from database import supabase
from auth import get_current_student

router = APIRouter(prefix="/enrollment", tags=["enrollment"])

class EnrollRequest(BaseModel):
    section_id: str

class DropRequest(BaseModel):
    section_id: str

@router.post("/enroll")
def enroll(body: EnrollRequest, current: dict = Depends(get_current_student)):
    result = supabase.rpc("enroll_student", {
        "p_student_id": current["sub"],
        "p_section_id": body.section_id
    }).execute()

    response = result.data

    if "error" in response:
        raise HTTPException(status_code=400, detail=response["error"])

    return response

@router.post("/drop")
def drop(body: DropRequest, current: dict = Depends(get_current_student)):
    # Check they're actually enrolled
    existing = supabase.table("registrations") \
        .select("id") \
        .eq("student_id", current["sub"]) \
        .eq("section_id", body.section_id) \
        .execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Registration not found")

    # Delete registration
    supabase.table("registrations") \
        .delete() \
        .eq("student_id", current["sub"]) \
        .eq("section_id", body.section_id) \
        .execute()

    # Give the seat back
    supabase.rpc("increment_seats", {
        "p_section_id": body.section_id
    }).execute()

    return {"message": "Dropped successfully"}