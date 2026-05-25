import chromadb
from chromadb.config import Settings
from typing import List, Dict, Optional
import requests
from pathlib import Path

class RAGRetriever:
    def __init__(self):
        # Use consistent absolute path - always in project root
        project_root = Path(__file__).parent.parent.parent
        chroma_path = project_root / "chroma_db"
        
        print(f"Using ChromaDB path: {chroma_path}")  # Debug print
        
        self.client = chromadb.PersistentClient(
            path=str(chroma_path),
            settings=Settings(anonymized_telemetry=False)
        )
        self.ollama_url = "http://localhost:11434/api/embeddings"
    
    def get_embedding(self, text: str) -> List[float]:
        """Get embedding for query text."""
        try:
            response = requests.post(
                self.ollama_url,
                json={
                    "model": "nomic-embed-text",
                    "prompt": text
                }
            )
            response.raise_for_status()
            return response.json()["embedding"]
        except Exception as e:
            print(f"Error getting embedding: {e}")
            return [0.0] * 768
    
    def retrieve_from_collection(
        self, 
        collection_name: str, 
        query: str, 
        n_results: int = 5
    ) -> Dict:
        """
        Retrieve from a specific collection.
        
        Args:
            collection_name: Name of the ChromaDB collection
            query: Query text
            n_results: Number of results to retrieve
            
        Returns:
            Dictionary with retrieved documents and metadata
        """
        try:
            collection = self.client.get_collection(collection_name)
            query_embedding = self.get_embedding(query)
            
            results = collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results
            )
            
            # Format results
            formatted_results = []
            for doc, metadata, distance in zip(
                results['documents'][0],
                results['metadatas'][0],
                results['distances'][0]
            ):
                formatted_results.append({
                    'content': doc,
                    'source': metadata.get('source', 'unknown'),
                    'relevance_score': 1 - distance,  # Convert distance to similarity
                    'collection': collection_name
                })
            
            return {
                'query': query,
                'results': formatted_results,
                'collection': collection_name
            }
            
        except Exception as e:
            print(f"Error retrieving from {collection_name}: {e}")
            return {
                'query': query,
                'results': [],
                'collection': collection_name,
                'error': str(e)
            }
    
    def retrieve_style_knowledge(self, query: str, n_results: int = 5) -> Dict:
        """Retrieve from style_knowledge collection."""
        return self.retrieve_from_collection("style_knowledge", query, n_results)
    
    def retrieve_products(self, query: str, n_results: int = 5) -> Dict:
        """Retrieve from products_index collection (to be implemented later)."""
        return self.retrieve_from_collection("products_index", query, n_results)
    
    def retrieve_user_wardrobe(self, query: str, n_results: int = 5) -> Dict:
        """Retrieve from user_wardrobe collection (to be implemented later)."""
        return self.retrieve_from_collection("user_wardrobe", query, n_results)
    
    def multi_collection_retrieve(
        self, 
        query: str, 
        collections: List[str], 
        n_results_per_collection: int = 3
    ) -> Dict:
        """
        Retrieve from multiple collections and merge results.
        
        Args:
            query: Query text
            collections: List of collection names to query
            n_results_per_collection: Results to get from each collection
            
        Returns:
            Merged results from all collections
        """
        all_results = []
        
        for collection_name in collections:
            result = self.retrieve_from_collection(
                collection_name, 
                query, 
                n_results_per_collection
            )
            if result['results']:
                all_results.extend(result['results'])
        
        # Sort by relevance score
        all_results.sort(key=lambda x: x['relevance_score'], reverse=True)
        
        return {
            'query': query,
            'results': all_results,
            'collections_queried': collections,
            'total_results': len(all_results)
        }


if __name__ == "__main__":
    # Test retrieval
    retriever = RAGRetriever()
    
    print("Testing style knowledge retrieval...")
    result = retriever.retrieve_style_knowledge("What should I wear to a job interview?")
    
    print(f"\nQuery: {result['query']}")
    print(f"Found {len(result['results'])} results\n")
    
    for i, r in enumerate(result['results'][:3]):
        print(f"[{i+1}] Relevance: {r['relevance_score']:.3f}")
        print(f"Source: {r['source']}")
        print(f"Content: {r['content'][:150]}...")
        print("-" * 80)