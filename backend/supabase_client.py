import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

# Look for .env in current directory or parent directory
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)
if not os.getenv("SUPABASE_KEY"):
    load_dotenv() # Fallback to root .env

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://unowbqmjwzofklnhbkbc.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

_supabase_client: Client = None

def get_supabase_client() -> Client:
    global _supabase_client
    if _supabase_client is None:
        if not SUPABASE_KEY or SUPABASE_KEY.startswith("your_"):
            raise ValueError(
                "SUPABASE_KEY is missing or unconfigured. Please set SUPABASE_KEY in backend/.env"
            )
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _supabase_client

