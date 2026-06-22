from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from routers import courses, students, enrollment, admin
from fastapi.middleware.cors import CORSMiddleware



app = FastAPI(title="University Registration System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global error handler — catches any unhandled exception
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"}
    )

# Register all routers
app.include_router(courses.router)
app.include_router(students.router)
app.include_router(enrollment.router)
app.include_router(admin.router)

@app.get("/")
def root():
    return {"message": "Registration system is alive"}