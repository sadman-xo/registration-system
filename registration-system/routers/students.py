from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from database import supabase
from auth import hash_password, verify_password, create_token, get_current_student

router = APIRouter(prefix="/students", tags=["students"])

class StudentRegister(BaseModel):
    student_id: str
    email: str
    full_name: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/register")
def create_student(body: StudentRegister):
    existing = supabase.table("students") \
        .select("id") \
        .eq("student_id", body.student_id) \
        .execute()

    if existing.data:
        raise HTTPException(status_code=400, detail="Student ID already exists")

    result = supabase.table("students").insert({
        "student_id": body.student_id,
        "email": body.email,
        "full_name": body.full_name,
        "password_hash": hash_password(body.password),
        "role": "student"
    }).execute()

    student = result.data[0]
    student.pop("password_hash")
    return student

@router.post("/login")
def login(body: LoginRequest):
    result = supabase.table("students") \
        .select("*") \
        .eq("email", body.email) \
        .execute()

    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    student = result.data[0]

    if not verify_password(body.password, student["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token(student["id"], student["student_id"], student["role"])

    return {
        "token": token,
        "student": {
            "id": student["id"],
            "student_id": student["student_id"],
            "full_name": student["full_name"],
            "email": student["email"],
            "role": student["role"]
        }
    }

@router.get("/me")
def get_me(current: dict = Depends(get_current_student)):
    result = supabase.table("students") \
        .select("id, student_id, email, full_name, role, created_at") \
        .eq("id", current["sub"]) \
        .execute()
    return result.data[0]

@router.get("/me/registrations")
def get_my_registrations(current: dict = Depends(get_current_student)):
    result = supabase.table("registrations") \
        .select("*, sections(*, courses(*))") \
        .eq("student_id", current["sub"]) \
        .execute()
    return result.data