from groq import Groq
import os
from dotenv import load_dotenv
from typing import Dict
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

load_dotenv()

class StylistAgent:
    def __init__(self):
        self.client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        self.model = "llama-3.3-70b-versatile"
        
    def generate_advice(
        self, 
        query: str, 
        context: str,
        stream: bool = False
    ) -> str:
        """
        Generate fashion advice based on query and retrieved context.
        
        Args:
            query: User's question
            context: Retrieved knowledge chunks
            stream: Whether to stream the response
            
        Returns:
            Generated advice as string
        """
        system_prompt = """You are an expert fashion stylist and personal shopper with deep knowledge of:
- Fashion trends, styling, and color theory
- Fabrics, materials, and their properties
- Occasion-appropriate dressing
- Fit, sizing, and body proportions
- Sustainable and ethical fashion

Your role:
1. Provide helpful, accurate fashion advice based on the provided context
2. Be conversational and friendly, not robotic
3. Give specific, actionable recommendations
4. Cite sources when relevant (e.g., "According to our fabric guide...")
5. If the context doesn't contain the answer, say so honestly

Guidelines:
- Keep responses concise but complete
- Use bullet points for lists of recommendations
- Be inclusive and body-positive
- Consider budget and practicality
- Encourage personal style expression"""

        user_prompt = f"""Context from our knowledge base:

{context}

---

User Question: {query}

Based on the context above, provide helpful fashion advice. If the context doesn't fully answer the question, use your knowledge but note what information came from the context vs. your general knowledge."""

        if stream:
            return self._stream_response(system_prompt, user_prompt)
        else:
            return self._complete_response(system_prompt, user_prompt)
    
    def _complete_response(self, system_prompt: str, user_prompt: str) -> str:
        """Get complete response (non-streaming)"""
        chat_completion = self.client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model=self.model,
            temperature=0.7,
            max_tokens=1500
        )
        
        return chat_completion.choices[0].message.content
    
    def _stream_response(self, system_prompt: str, user_prompt: str):
        """Stream response token by token"""
        stream = self.client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model=self.model,
            temperature=0.7,
            max_tokens=1500,
            stream=True
        )
        
        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content


if __name__ == "__main__":
    # Test the stylist agent
    agent = StylistAgent()
    
    # Simulate context from RAG
    test_context = """
[Source 1: occasion_guide | Relevance: 0.89]
Job Interview - Conservative Approach:
- Navy or charcoal suit
- White or light blue shirt
- Conservative tie
- Black or brown leather shoes (polished)
- Minimal accessories

[Source 2: style_guide | Relevance: 0.82]
Business Professional:
Fit is crucial - tailored looks polished
Iron your clothes
Neutral colors are safest (navy, grey, black, white)
"""
    
    test_query = "What should I wear to a job interview at a tech startup?"
    
    print("Generating advice...\n")
    advice = agent.generate_advice(test_query, test_context)
    
    print("=" * 80)
    print(advice)
    print("=" * 80)