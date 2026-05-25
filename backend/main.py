from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import os
from typing import List 
from pathlib import Path
import shutil
from datetime import datetime
import sys

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from models import ChatRequest, ChatResponse, ImageUploadResponse, WardrobeItem
from orchestrator import Orchestrator
from database import Database

# Initialize FastAPI app
app = FastAPI(
    title="AI Fashion Intelligence API",
    description="Multi-agent RAG system for fashion advice",
    version="1.0.0"
)

# CORS middleware (allows frontend to call API)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize components
orchestrator = Orchestrator()
db = Database()

# Ensure uploads directory exists
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Mount uploads directory for serving images
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "AI Fashion Intelligence API",
        "docs": "/docs",
        "health": "/api/health"
    }


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Process a text-based fashion query.
    
    This endpoint:
    1. Retrieves relevant knowledge chunks via RAG
    2. Generates fashion advice using the Stylist Agent
    """
    try:
        result = orchestrator.process_text_query(
            query=request.query,
            n_results=request.n_results
        )
        
        return ChatResponse(
            query=result['query'],
            advice=result['advice'],
            sources=result['sources'],
            total_sources=result['total_sources']
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")


@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    """
    Streaming version of chat endpoint.
    Returns advice token-by-token for better UX.
    """
    try:
        # Retrieve context
        retrieval_result = orchestrator.rag_agent.retrieve_knowledge(
            request.query, 
            request.n_results
        )
        context = orchestrator.rag_agent.format_context(retrieval_result)
        
        # Stream response
        def generate():
            for chunk in orchestrator.stylist_agent.generate_advice(
                request.query, 
                context, 
                stream=True
            ):
                yield chunk
        
        return StreamingResponse(generate(), media_type="text/plain")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error streaming response: {str(e)}")


@app.post("/api/upload", response_model=ImageUploadResponse)
async def upload_image(file: UploadFile = File(...)):
    """
    Upload a wardrobe item image.
    
    This endpoint:
    1. Saves the uploaded image
    2. Analyzes it with Vision Agent
    3. Generates a description for embedding
    4. Stores in database
    """
    try:
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_extension = Path(file.filename).suffix
        unique_filename = f"{timestamp}_{file.filename}"
        filepath = UPLOAD_DIR / unique_filename
        
        # Save file
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Analyze image
        analysis_result = orchestrator.vision_agent.analyze_image(str(filepath))
        description = orchestrator.vision_agent.describe_for_embedding(str(filepath))
        
        # Store in database
        item_id = db.add_wardrobe_item(
            filename=unique_filename,
            filepath=str(filepath),
            description=description,
            analysis=analysis_result['analysis']
        )
        
        return ImageUploadResponse(
            filename=unique_filename,
            filepath=f"/uploads/{unique_filename}",
            analysis=analysis_result['analysis'],
            message=f"Successfully uploaded and analyzed! Item ID: {item_id}"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading image: {str(e)}")


@app.get("/api/wardrobe", response_model=List[WardrobeItem])
async def get_wardrobe(limit: int = 50):
    """
    Get all wardrobe items.
    """
    try:
        items = db.get_wardrobe_items(limit=limit)
        
        return [
            WardrobeItem(
                id=str(item['id']),
                filename=item['filename'],
                filepath=f"/uploads/{item['filename']}",
                description=item['description'],
                analysis=item.get('analysis', ''),
                uploaded_at=item['uploaded_at']
            )
            for item in items
        ]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving wardrobe: {str(e)}")


@app.delete("/api/wardrobe/{item_id}")
async def delete_wardrobe_item(item_id: int):
    """
    Delete a wardrobe item.
    """
    try:
        # Get item to delete file
        item = db.get_wardrobe_item(item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        
        # Delete file
        filepath = Path(item['filepath'])
        if filepath.exists():
            filepath.unlink()
        
        # Delete from database
        db.delete_wardrobe_item(item_id)
        
        return {"message": f"Item {item_id} deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting item: {str(e)}")


@app.get("/api/health")
async def health_check():
    """
    Health check endpoint.
    """
    return {
        "status": "healthy",
        "components": {
            "rag_agent": "operational",
            "stylist_agent": "operational",
            "vision_agent": "operational",
            "database": "operational"
        }
    }


if __name__ == "__main__":
    import uvicorn
    
    print("=" * 80)
    print("🚀 STARTING AI FASHION INTELLIGENCE API")
    print("=" * 80)
    print("\n📚 API Documentation: http://localhost:8000/docs")
    print("💚 Health Check: http://localhost:8000/api/health")
    print("\n⏸️  Press Ctrl+C to stop\n")
    
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 