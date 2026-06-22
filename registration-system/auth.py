from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import bcrypt
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

security = HTTPBearer()
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())

def create_token(student_uuid: str, student_id: str, role: str) -> str:
    payload = {
        "sub": student_uuid,
        "student_id": student_id,
        "role": role,                  # role now lives in the token
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def get_current_student(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

def require_admin(current: dict = Depends(get_current_student)):
    if current.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    return current