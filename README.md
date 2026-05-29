# 🎨 Fashion Intelligence AI

> AI-powered fashion stylist with multi-agent RAG architecture. Get personalized styling advice, analyze clothing items, and manage your virtual wardrobe.

**[🚀 Live Demo](https://fashion-inteligence-web.onrender.com/)**

---

## ✨ Features

- 💬 **AI Stylist Chat** - Ask fashion questions, get expert advice with sources
- 📸 **Image Analysis** - Upload clothes, get AI-powered analysis
- 👔 **Wardrobe Management** - Build your digital wardrobe
- 🧠 **RAG Pipeline** - 150+ knowledge chunks with semantic search
- 📊 **Source Traceability** - See which sources informed each answer

---

## 🛠️ Tech Stack

**Frontend:** React 18, Vite, Axios, Lucide Icons  
**Backend:** FastAPI, Uvicorn, Pydantic  
**AI/ML:** Groq (Llama 3.3 70B), Google Gemini 2.5 Flash, Ollama embeddings  
**Database:** ChromaDB (vectors), SQLite (metadata)  
**Architecture:** Multi-Agent System, RAG Pipeline

---

## 🏗️ Architecture

```
┌─────────────────────────────────┐
│   REACT FRONTEND (Vite)         │
│   ├─ Chat Interface             │
│   ├─ Image Upload               │
│   └─ Wardrobe Gallery           │
└────────────────┬────────────────┘
                 │ HTTP/REST
                 ↓
┌─────────────────────────────────┐
│   FASTAPI BACKEND               │
│   ├─ REST API Routes            │
│   └─ Orchestrator               │
└────────────┬────────┬───────────┘
             │        │
      ┌──────┴──┐    │
      ↓         ↓    ↓
   ┌─────┐  ┌──────┐┌──────┐
   │RAG  │  │Vision││Stylist│
   │Agent│  │Agent ││Agent  │
   └──┬──┘  └───┬──┘└───┬───┘
      │         │       │
      ↓         ↓       ↓
  ┌────────┐ ┌────────┐┌──────────┐
  │ChromaDB│ │Gemini  ││Groq LLM  │
  │+ Ollama│ │Vision  ││Llama 3.3 │
  └────────┘ └────────┘└──────────┘

  SQLite (Wardrobe Data)
```

---

## 🚀 Quick Start

### **Prerequisites**
- Python 3.11+, Node 18+
- API Keys: [Groq](https://console.groq.com), [Google](https://aistudio.google.com/app/apikey)

### **Local Setup**

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
echo GROQ_API_KEY=your_key > .env
echo GOOGLE_API_KEY=your_key >> .env
uvicorn main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`

---

## 📦 Deployment

### **Docker**
```bash
docker-compose up -d --build
```

### **Render**
1. Push to GitHub
2. Go to [Render.com](https://render.com)
3. Create Web Service → Connect repo
4. Add environment variables
5. Deploy!

---

## 🔌 API Endpoints

```bash
# Chat
POST /api/chat
{ "query": "What fabric is best for summer?", "n_results": 5 }

# Upload image
POST /api/upload
(multipart/form-data)

# Get wardrobe
GET /api/wardrobe

# Delete item
DELETE /api/wardrobe/{item_id}
```

---

## 💡 How It Works

**Text Query:**
1. User asks fashion question
2. Orchestrator routes to RAG Agent
3. Retrieves 5 most relevant knowledge chunks from ChromaDB
4. Groq Llama generates answer with context
5. Returns answer + sources with relevance scores

**Image Upload:**
1. User uploads clothing photo
2. Google Gemini analyzes colors, style, fabric
3. Description stored in SQLite
4. Image added to wardrobe gallery

---

## 📊 Performance

- Chat response: ~2-3 seconds
- Image analysis: ~3-5 seconds  
- Vector search: <50ms
- Free tier services

---


<div align="center">

**Multi-Agent RAG for Fashion** ⭐

</div>
