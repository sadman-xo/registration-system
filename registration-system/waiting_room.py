import uuid
import time
from cache import redis
from typing import Optional

# Config — registration day
BATCH_SIZE = 50          # how many students admitted at a time
ADMISSION_TTL = 300      # admitted students have 5 minutes to enroll
POLL_INTERVAL = 5        # frontend polls every 5 seconds

QUEUE_KEY = "waiting_room:queue"
ADMITTED_KEY = "waiting_room:admitted"
PROCESSING_KEY = "waiting_room:processing"
OPEN_KEY = "waiting_room:open"

# --- QUEUE MANAGEMENT ---

def open_registration():
    """Admin opens the registration window."""
    redis.set(OPEN_KEY, "1")
    redis.set(PROCESSING_KEY, 0)

def close_registration():
    """Admin closes the registration window."""
    redis.delete(OPEN_KEY)

def is_registration_open() -> bool:
    return redis.get(OPEN_KEY) is not None

def join_queue(student_uuid: str) -> dict:
    """
    Add student to the waiting queue.
    Score is current timestamp — earlier = lower score = closer to front.
    """
    if not is_registration_open():
        return {"error": "Registration is not open"}

    # Check if already in queue
    score = redis.zscore(QUEUE_KEY, student_uuid)
    if score is not None:
        position = get_position(student_uuid)
        return {"already_in_queue": True, "position": position}

    # Check if already admitted
    existing_token = _get_existing_admission(student_uuid)
    if existing_token:
        return {"admitted": True, "admission_token": existing_token}

    # Add to queue with timestamp as score
    timestamp = time.time()
    redis.zadd(QUEUE_KEY, {student_uuid: timestamp})

    position = get_position(student_uuid)
    return {
        "joined": True,
        "position": position,
        "estimated_wait_seconds": position * POLL_INTERVAL
    }

def get_position(student_uuid: str) -> int:
    """
    0-indexed rank in queue. 0 means next to be admitted.
    Returns -1 if not in queue.
    """
    rank = redis.zrank(QUEUE_KEY, student_uuid)
    if rank is None:
        return -1
    return int(rank)

def get_queue_status(student_uuid: str) -> dict:
    """
    Called by frontend polling. Returns current status.
    """
    if not is_registration_open():
        return {"status": "closed"}

    # Check if already admitted
    existing_token = _get_existing_admission(student_uuid)
    if existing_token:
        return {
            "status": "admitted",
            "admission_token": existing_token,
            "message": "You may now enroll. Token expires in 5 minutes."
        }

    position = get_position(student_uuid)

    if position == -1:
        return {"status": "not_in_queue"}

    # Admit next batch if processing slot is available
    _try_admit_batch()

    # Re-check after potential admission
    existing_token = _get_existing_admission(student_uuid)
    if existing_token:
        return {
            "status": "admitted",
            "admission_token": existing_token,
            "message": "You may now enroll. Token expires in 5 minutes."
        }

    position = get_position(student_uuid)
    return {
        "status": "waiting",
        "position": position,
        "estimated_wait_seconds": position * POLL_INTERVAL,
        "message": f"You are #{position + 1} in line"
    }

def _try_admit_batch():
    """
    If there's capacity, pull the next batch from the queue and admit them.
    """
    processing = int(redis.get(PROCESSING_KEY) or 0)
    available_slots = BATCH_SIZE - processing

    if available_slots <= 0:
        return

    # Get next N students from front of queue
    next_students = redis.zrange(QUEUE_KEY, 0, available_slots - 1)

    if not next_students:
        return

    for student_uuid in next_students:
        # Generate one-time admission token
        token = str(uuid.uuid4())

        # Store token → student mapping with TTL
        redis.hset(ADMITTED_KEY, token, student_uuid)
        redis.expire(ADMITTED_KEY, ADMISSION_TTL)

        # Store reverse mapping so we can look up by student
        redis.set(f"admitted_student:{student_uuid}", token, ex=ADMISSION_TTL)

        # Remove from queue
        redis.zrem(QUEUE_KEY, student_uuid)

        # Increment processing count
        redis.incr(PROCESSING_KEY)

def validate_admission_token(token: str, student_uuid: str) -> bool:
    """
    Check token is valid, belongs to this student, and consume it (one-time use).
    """
    stored_student = redis.hget(ADMITTED_KEY, token)

    if not stored_student:
        return False

    if stored_student != student_uuid:
        return False

    # Consume the token — one use only
    redis.hdel(ADMITTED_KEY, token)
    redis.delete(f"admitted_student:{student_uuid}")

    # Free up a processing slot
    current = int(redis.get(PROCESSING_KEY) or 1)
    redis.set(PROCESSING_KEY, max(0, current - 1))

    return True

def release_slot(student_uuid: str):
    """
    Called when enrollment fails after admission — return the slot.
    """
    current = int(redis.get(PROCESSING_KEY) or 1)
    redis.set(PROCESSING_KEY, max(0, current - 1))

def get_queue_stats() -> dict:
    """Admin overview of queue state."""
    return {
        "open": is_registration_open(),
        "queue_length": redis.zcard(QUEUE_KEY),
        "processing": int(redis.get(PROCESSING_KEY) or 0),
        "batch_size": BATCH_SIZE,
        "admission_ttl_seconds": ADMISSION_TTL
    }

def _get_existing_admission(student_uuid: str) -> Optional[str]:
    """Check if student already has an active admission token."""
    return redis.get(f"admitted_student:{student_uuid}")