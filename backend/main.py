from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Any, Dict
import os
from dotenv import load_dotenv

from supabase_client import get_supabase_client

load_dotenv()

app = FastAPI(
    title="TrendPilot AI Backend",
    description="FastAPI service connected to Supabase for Influencer Trend Analysis and Content Blueprints",
    version="1.0.0",
)

# Enable CORS for React frontend (Vite defaults to port 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Data Models ---
class ContentItem(BaseModel):
    id: Optional[str] = None
    topicTitle: str
    category: str
    format: str
    whyTrending: Optional[str] = None
    hooks: Dict[str, str]
    scriptOutline: Dict[str, str]
    linkedInPost: Optional[str] = None
    caption: str
    hashtags: List[str]
    recommendedLength: Optional[str] = None
    bestPostingWindow: Optional[str] = None
    status: str = "draft"
    notes: Optional[str] = None

class StatusUpdate(BaseModel):
    status: str

# --- Endpoints ---

@app.get("/")
def root():
    return {
        "service": "TrendPilot API",
        "status": "online",
        "supabase_project": os.getenv("SUPABASE_URL", "https://unowbqmjwzofklnhbkbc.supabase.co"),
    }

@app.get("/api/health")
def health_check():
    """Verify backend and Supabase connectivity"""
    try:
        client = get_supabase_client()
        # Ping Supabase with a lightweight query (e.g. check auth or public tables)
        res = client.table("categories").select("*").limit(1).execute()
        return {
            "status": "connected",
            "database": "Supabase PostgreSQL",
            "project_ref": "unowbqmjwzofklnhbkbc",
            "tables_found": True,
        }
    except Exception as e:
        return {
            "status": "warning",
            "database": "Supabase configured but awaiting table/key initialization",
            "error_detail": str(e),
            "tip": "Ensure SUPABASE_KEY is set in backend/.env and tables are created.",
        }

@app.get("/api/trends")
def get_trends(category: Optional[str] = None):
    """Retrieve trending topics from Supabase"""
    try:
        client = get_supabase_client()
        query = client.table("topics").select("*").order("momentum_score", desc=True)
        if category and category.lower() != "all":
            query = query.ilike("category", f"%{category}%")
        
        response = query.execute()
        return {"data": response.data, "count": len(response.data)}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to query trends from Supabase: {str(e)}",
        )

@app.get("/api/content")
def get_saved_content():
    """Retrieve all saved influencer content blueprints from Supabase"""
    try:
        client = get_supabase_client()
        response = client.table("suggestions").select("*").order("created_at", desc=True).execute()
        return {"data": response.data, "count": len(response.data)}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve content from Supabase: {str(e)}",
        )

@app.post("/api/content")
def save_content(content: ContentItem):
    """Save or update a content blueprint in Supabase"""
    try:
        client = get_supabase_client()
        payload = {
            "topic_title": content.topicTitle,
            "category": content.category,
            "format": content.format,
            "why_trending": content.whyTrending,
            "hooks": content.hooks,
            "script_outline": content.scriptOutline,
            "linkedin_post": content.linkedInPost,
            "caption": content.caption,
            "hashtags": content.hashtags,
            "recommended_length": content.recommendedLength,
            "best_posting_window": content.bestPostingWindow,
            "status": content.status,
            "notes": content.notes,
        }
        if content.id:
            payload["id"] = content.id

        response = client.table("suggestions").upsert(payload).execute()
        return {"success": True, "data": response.data}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save content to Supabase: {str(e)}",
        )

@app.patch("/api/content/{content_id}/status")
def update_content_status(content_id: str, payload: StatusUpdate):
    """Update workflow status (draft -> scripted -> ready-to-film -> posted)"""
    try:
        client = get_supabase_client()
        response = client.table("suggestions").update({"status": payload.status}).eq("id", content_id).execute()
        return {"success": True, "data": response.data}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update status in Supabase: {str(e)}",
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

