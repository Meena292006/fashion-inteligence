import os
from pathlib import Path
import chromadb
from chromadb.config import Settings
from typing import List, Dict
import requests
import json

class RAGPipeline:
    def __init__(self):
        # Use consistent absolute path - always in project root
        project_root = Path(__file__).parent.parent.parent
        chroma_path = project_root / "chroma_db"
        
        print(f"Using ChromaDB path: {chroma_path}")  # Debug print
        
        # Initialize ChromaDB client
        self.client = chromadb.PersistentClient(
            path=str(chroma_path),
            settings=Settings(anonymized_telemetry=False)
        )
        
        # Ollama embedding endpoint
        self.ollama_url = "http://localhost:11434/api/embeddings"
        
    def chunk_text(self, text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
        """
        Split text into overlapping chunks - MEMORY EFFICIENT VERSION.
        
        Args:
            text: The text to chunk
            chunk_size: Target size of each chunk in characters
            overlap: Number of characters to overlap between chunks
            
        Returns:
            List of text chunks
        """
        chunks = []
        # Split by paragraphs first to avoid mid-sentence breaks
        paragraphs = text.split('\n\n')
        
        current_chunk = ""
        
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            
            # If adding this paragraph would exceed chunk size
            if len(current_chunk) + len(para) > chunk_size and current_chunk:
                # Save current chunk
                chunks.append(current_chunk.strip())
                
                # Start new chunk with overlap (last few sentences of previous)
                sentences = current_chunk.split('. ')
                overlap_text = '. '.join(sentences[-2:]) if len(sentences) > 2 else ""
                current_chunk = overlap_text + "\n\n" + para
            else:
                # Add paragraph to current chunk
                if current_chunk:
                    current_chunk += "\n\n" + para
                else:
                    current_chunk = para
        
        # Don't forget the last chunk
        if current_chunk.strip():
            chunks.append(current_chunk.strip())
        
        return chunks
    
    def get_embedding(self, text: str) -> List[float]:
        """
        Get embedding vector for text using Ollama's nomic-embed-text model.
        
        Args:
            text: The text to embed
            
        Returns:
            Embedding vector as list of floats
        """
        try:
            # Truncate very long text to avoid issues
            if len(text) > 2000:
                text = text[:2000]
                
            response = requests.post(
                self.ollama_url,
                json={
                    "model": "nomic-embed-text",
                    "prompt": text
                },
                timeout=30
            )
            response.raise_for_status()
            return response.json()["embedding"]
        except Exception as e:
            print(f"Error getting embedding: {e}")
            # Return a zero vector as fallback (768 dimensions for nomic-embed-text)
            return [0.0] * 768
    
    def load_knowledge_files(self) -> Dict[str, str]:
        """
        Load all knowledge files from the knowledge directory.
        
        Returns:
            Dictionary mapping filename to file content
        """
        knowledge_dir = Path("backend/knowledge")
        knowledge_files = {}
        
        for file_path in knowledge_dir.glob("*.txt"):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    knowledge_files[file_path.stem] = content
                    print(f"  Loaded {file_path.name}: {len(content)} characters")
            except Exception as e:
                print(f"  Error loading {file_path.name}: {e}")
                
        return knowledge_files
    
    def create_collection(self, collection_name: str, reset: bool = False):
        """
        Create or get a ChromaDB collection.
        
        Args:
            collection_name: Name of the collection
            reset: If True, delete existing collection and create new one
            
        Returns:
            ChromaDB collection object
        """
        if reset:
            try:
                self.client.delete_collection(collection_name)
                print(f"Deleted existing collection: {collection_name}")
            except:
                pass
        
        collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"}
        )
        
        return collection
    
    def index_style_knowledge(self, reset: bool = False, batch_size: int = 10):
        """
        Index all knowledge files into the style_knowledge collection.
        MEMORY EFFICIENT: Process in batches.
        
        Args:
            reset: If True, reset the collection before indexing
            batch_size: Number of chunks to process at once
        """
        print("Loading knowledge files...")
        knowledge_files = self.load_knowledge_files()
        
        print("\nCreating style_knowledge collection...")
        collection = self.create_collection("style_knowledge", reset=reset)
        
        total_indexed = 0
        
        for filename, content in knowledge_files.items():
            print(f"\nProcessing {filename}...")
            chunks = self.chunk_text(content)
            print(f"  Created {len(chunks)} chunks")
            
            # Process in batches to avoid memory issues
            for i in range(0, len(chunks), batch_size):
                batch_chunks = chunks[i:i + batch_size]
                batch_metadatas = []
                batch_ids = []
                batch_embeddings = []
                
                print(f"  Processing batch {i//batch_size + 1}/{(len(chunks) + batch_size - 1)//batch_size}...")
                
                for j, chunk in enumerate(batch_chunks):
                    chunk_id = total_indexed + j
                    
                    # Generate embedding
                    embedding = self.get_embedding(chunk)
                    
                    batch_embeddings.append(embedding)
                    batch_metadatas.append({
                        "source": filename,
                        "chunk_id": chunk_id
                    })
                    batch_ids.append(f"{filename}_{chunk_id}")
                
                # Add batch to collection
                try:
                    collection.add(
                        embeddings=batch_embeddings,
                        documents=batch_chunks,
                        metadatas=batch_metadatas,
                        ids=batch_ids
                    )
                    total_indexed += len(batch_chunks)
                    print(f"    ✓ Indexed {len(batch_chunks)} chunks (total: {total_indexed})")
                except Exception as e:
                    print(f"    ✗ Error adding batch: {e}")
        
        print(f"\n✅ Successfully indexed {total_indexed} chunks into style_knowledge collection!")
        return collection
    
    def test_retrieval(self, query: str, n_results: int = 3):
        """
        Test retrieval with a query.
        
        Args:
            query: The query text
            n_results: Number of results to retrieve
        """
        try:
            collection = self.client.get_collection("style_knowledge")
            query_embedding = self.get_embedding(query)
            
            results = collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results
            )
            
            print(f"\n🔍 Query: {query}\n")
            print("Retrieved chunks:")
            print("=" * 80)
            
            for i, (doc, metadata, distance) in enumerate(zip(
                results['documents'][0],
                results['metadatas'][0],
                results['distances'][0]
            )):
                print(f"\n[Result {i+1}] Relevance: {1 - distance:.3f}")
                print(f"Source: {metadata['source']}")
                print(f"Content: {doc[:300]}...")
                print("-" * 80)
        except Exception as e:
            print(f"Error testing retrieval: {e}")


if __name__ == "__main__":
    # This runs when you execute: python backend/rag/pipeline.py
    
    print("=" * 80)
    print("RAG PIPELINE - KNOWLEDGE INDEXING")
    print("=" * 80)
    
    pipeline = RAGPipeline()
    
    # Index all knowledge files
    pipeline.index_style_knowledge(reset=True, batch_size=5)
    
    # Test some queries
    print("\n\n" + "=" * 80)
    print("TESTING RETRIEVAL")
    print("=" * 80)
    
    test_queries = [
        "What fabric is good for summer?",
        "What should I wear to a wedding?",
        "What colors are trending?"
    ]
    
    for query in test_queries:
        pipeline.test_retrieval(query, n_results=2)
        print("\n")