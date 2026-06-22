from upstash_redis import Redis
import os
import json
from dotenv import load_dotenv

load_dotenv()

redis = Redis(
    url=os.getenv("UPSTASH_REDIS_REST_URL"),
    token=os.getenv("UPSTASH_REDIS_REST_TOKEN")
)

# How long data stays cached (in seconds)
CACHE_TTL_COURSES = 300      # 5 minutes — courses rarely change
CACHE_TTL_SECTIONS = 20      # 20 seconds — seat counts change fast during registration

def cache_get(key: str):
    """Get a value from cache. Returns None if not found."""
    value = redis.get(key)
    if value is None:
        return None
    return json.loads(value)

def cache_set(key: str, value, ttl: int):
    """Store a value in cache with expiry."""
    redis.set(key, json.dumps(value), ex=ttl)

def cache_delete(key: str):
    """Remove a value from cache."""
    redis.delete(key)

def cache_delete_pattern(pattern: str):
    """Remove all keys matching a pattern — used when data changes."""
    keys = redis.keys(pattern)
    if keys:
        redis.delete(*keys)