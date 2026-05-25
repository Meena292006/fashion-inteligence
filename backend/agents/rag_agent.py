from pydantic import BaseModel
from typing import List, Dict, Any
import os
import sys
from pathlib import Path

# Add parent directory to path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from rag.retriever import RAGRetriever

class RetrievalResult(BaseModel):
    """Structured output from RAG agent"""
    query: str
    chunks: List[Dict[str, Any]]
    total_results: int
    collections_used: List[str]

class RAGAgent:
    def __init__(self):
        print("Initializing RAG Agent...")
        self.retriever = RAGRetriever()
        print("RAG Agent initialized!")
        
    def retrieve_knowledge(self, query: str, n_results: int = 5) -> Dict:
        """
        Retrieve relevant knowledge chunks for a query.
        
        Args:
            query: User's question
            n_results: Number of chunks to retrieve
            
        Returns:
            Dictionary with retrieved chunks and metadata
        """
        result = self.retriever.retrieve_style_knowledge(query, n_results)
        
        return {
            'query': query,
            'chunks': result['results'],
            'total_results': len(result['results']),
            'collections_used': ['style_knowledge']
        }
    
    def format_context(self, retrieval_result: Dict) -> str:
        """
        Format retrieved chunks into context string for LLM.
        
        Args:
            retrieval_result: Output from retrieve_knowledge()
            
        Returns:
            Formatted context string
        """
        context_parts = []
        
        for i, chunk in enumerate(retrieval_result['chunks']):
            context_parts.append(
                f"[Source {i+1}: {chunk['source']} | Relevance: {chunk['relevance_score']:.2f}]\n"
                f"{chunk['content']}\n"
            )
        
        return "\n---\n".join(context_parts)


if __name__ == "__main__":
    # Test the RAG agent
    agent = RAGAgent()
    
    test_query = "What should I wear to a job interview?"
    result = agent.retrieve_knowledge(test_query, n_results=3)
    
    print(f"Query: {result['query']}")
    print(f"Retrieved {result['total_results']} chunks\n")
    
    context = agent.format_context(result)
    print("Formatted Context:")
    print("=" * 80)
    print(context)