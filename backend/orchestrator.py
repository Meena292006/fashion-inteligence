import os
import sys
from pathlib import Path
from typing import Dict, Optional

# Add backend directory to path
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

from agents.rag_agent import RAGAgent
from agents.stylist_agent import StylistAgent
from agents.vision_agent import VisionAgent

class Orchestrator:
    def __init__(self):
        self.rag_agent = RAGAgent()
        self.stylist_agent = StylistAgent()
        self.vision_agent = VisionAgent()
    
    def process_text_query(self, query: str, n_results: int = 5) -> Dict:
        """
        Process a text-based fashion query.
        
        Workflow:
        1. RAG Agent retrieves relevant knowledge
        2. Stylist Agent generates advice based on retrieved context
        
        Args:
            query: User's question
            n_results: Number of knowledge chunks to retrieve
            
        Returns:
            Complete response with advice and sources
        """
        print(f"🔍 Retrieving knowledge for: {query}")
        
        # Step 1: Retrieve relevant knowledge
        retrieval_result = self.rag_agent.retrieve_knowledge(query, n_results)
        context = self.rag_agent.format_context(retrieval_result)
        
        print(f"✓ Retrieved {retrieval_result['total_results']} chunks")
        print(f"💬 Generating advice...")
        
        # Step 2: Generate advice
        advice = self.stylist_agent.generate_advice(query, context)
        
        print(f"✓ Advice generated\n")
        
        return {
            'query': query,
            'advice': advice,
            'sources': retrieval_result['chunks'],
            'total_sources': retrieval_result['total_results']
        }
    
    def process_image_query(self, image_path: str, additional_query: Optional[str] = None) -> Dict:
        """
        Process an image-based query (analyze wardrobe item).
        
        Workflow:
        1. Vision Agent analyzes the image
        2. If additional query provided, use that analysis as context for stylist
        
        Args:
            image_path: Path to uploaded image
            additional_query: Optional follow-up question (e.g., "What should I pair this with?")
            
        Returns:
            Image analysis and optional styling advice
        """
        print(f"👁️ Analyzing image: {image_path}")
        
        # Step 1: Analyze image
        analysis_result = self.vision_agent.analyze_image(image_path)
        
        print(f"✓ Image analyzed\n")
        
        result = {
            'image_path': image_path,
            'analysis': analysis_result['analysis']
        }
        
        # Step 2: If user asks a follow-up question, use analysis as context
        if additional_query:
            print(f"💬 Processing follow-up: {additional_query}")
            
            # Combine image analysis with retrieved knowledge
            retrieval_result = self.rag_agent.retrieve_knowledge(additional_query, n_results=3)
            rag_context = self.rag_agent.format_context(retrieval_result)
            
            combined_context = f"""Image Analysis:
{analysis_result['analysis']}

---

Additional Knowledge:
{rag_context}"""
            
            advice = self.stylist_agent.generate_advice(additional_query, combined_context)
            
            result['follow_up_query'] = additional_query
            result['advice'] = advice
            result['sources'] = retrieval_result['chunks']
        
        return result


if __name__ == "__main__":
    # Test the orchestrator
    orchestrator = Orchestrator()
    
    print("=" * 80)
    print("TESTING TEXT QUERY")
    print("=" * 80)
    
    result = orchestrator.process_text_query("What fabric is best for hot weather?")
    
    print("ADVICE:")
    print(result['advice'])
    print("\n" + "=" * 80)
    print(f"Sources used: {result['total_sources']}")
    for i, source in enumerate(result['sources'][:2]):
        print(f"\n[{i+1}] {source['source']} (Relevance: {source['relevance_score']:.2f})")
        print(f"{source['content'][:150]}...")