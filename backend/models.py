from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class ChatRequest(BaseModel):
    """Request model for chat endpoint"""
    query: str
    n_results: Optional[int] = 5

class ChatResponse(BaseModel):
    """Response model for chat endpoint"""
    query: str
    advice: str
    sources: List[Dict[str, Any]]
    total_sources: int

class ImageUploadResponse(BaseModel):
    """Response model for image upload"""
    filename: str
    filepath: str
    analysis: str
    message: str

class WardrobeItem(BaseModel):
    """Model for a wardrobe item"""
    id: str
    filename: str
    filepath: str
    description: str
    analysis: Optional[str] = ""
    uploaded_at: str