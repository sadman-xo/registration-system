# from fastapi import APIRouter, HTTPException, Depends
# from pydantic import BaseModel
# from database import supabase
# from auth import get_current_student

# router = APIRouter(prefix="/enrollment", tags=["enrollment"])

# class EnrollRequest(BaseModel):
#     section_id: str

# class DropRequest(BaseModel):
#     section_id: str

# @router.post("/enroll")
# def enroll(body: EnrollRequest, current: dict = Depends(get_current_student)):
#     result = supabase.rpc("enroll_student", {
#         "p_student_id": current["sub"],
#         "p_section_id": body.section_id
#     }).execute()

#     response = result.data

#     if "error" in response:
#         raise HTTPException(status_code=400, detail=response["error"])

#     return response

# @router.post("/drop")
# def drop(body: DropRequest, current: dict = Depends(get_current_student)):
#     # Check they're actually enrolled
#     existing = supabase.table("registrations") \
#         .select("id") \
#         .eq("student_id", current["sub"]) \
#         .eq("section_id", body.section_id) \
#         .execute()

#     if not existing.data:
#         raise HTTPException(status_code=404, detail="Registration not found")

#     # Delete registration
#     supabase.table("registrations") \
#         .delete() \
#         .eq("student_id", current["sub"]) \
#         .eq("section_id", body.section_id) \
#         .execute()

#     # Give the seat back
#     supabase.rpc("increment_seats", {
#         "p_section_id": body.section_id
#     }).execute()

#     return {"message": "Dropped successfully"}

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from database import supabase
from auth import get_current_student
from waiting_room import validate_admission_token, release_slot

router = APIRouter(prefix="/enrollment", tags=["enrollment"])

class EnrollRequest(BaseModel):
    section_id: str
    admission_token: str      # required — must come through the queue

class DropRequest(BaseModel):
    section_id: str

@router.post("/enroll")
def enroll(body: EnrollRequest, current: dict = Depends(get_current_student)):
    student_uuid = current["sub"]

    # 1. Validate admission token — must be valid and belong to this student
    if not validate_admission_token(body.admission_token, student_uuid):
        raise HTTPException(
            status_code=403,
            detail="Invalid or expired admission token. Please rejoin the queue."
        )

    # 2. Atomic enrollment in Postgres
    result = supabase.rpc("enroll_student", {
        "p_student_id": student_uuid,
        "p_section_id": body.section_id
    }).execute()

    response = result.data

    if "error" in response:
        # Enrollment failed — release the slot back to the pool
        release_slot(student_uuid)
        raise HTTPException(status_code=400, detail=response["error"])

    return response

@router.post("/drop")
def drop(body: DropRequest, current: dict = Depends(get_current_student)):
    existing = supabase.table("registrations") \
        .select("id") \
        .eq("student_id", current["sub"]) \
        .eq("section_id", body.section_id) \
        .execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Registration not found")

    supabase.table("registrations") \
        .delete() \
        .eq("student_id", current["sub"]) \
        .eq("section_id", body.section_id) \
        .execute()

    supabase.rpc("increment_seats", {
        "p_section_id": body.section_id
    }).execute()

    return {"message": "Dropped successfully"}