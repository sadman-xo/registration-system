from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from auth import get_current_student, require_admin
from waiting_room import (
    join_queue, get_queue_status, get_queue_stats,
    open_registration, close_registration
)

router = APIRouter(prefix="/queue", tags=["waiting-room"])

class JoinRequest(BaseModel):
    pass  # student identity comes from token

@router.post("/join")
def join(current: dict = Depends(get_current_student)):
    result = join_queue(current["sub"])
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.get("/status")
def status(current: dict = Depends(get_current_student)):
    return get_queue_status(current["sub"])

# --- ADMIN CONTROLS ---

@router.post("/admin/open")
def open_reg(current: dict = Depends(require_admin)):
    open_registration()
    return {"message": "Registration window opened"}

@router.post("/admin/close")
def close_reg(current: dict = Depends(require_admin)):
    close_registration()
    return {"message": "Registration window closed"}

@router.get("/admin/stats")
def stats(current: dict = Depends(require_admin)):
    return get_queue_stats()