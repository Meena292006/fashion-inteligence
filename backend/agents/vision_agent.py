from google import genai
from google.genai import types
import os
from dotenv import load_dotenv
from typing import Dict
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

load_dotenv()

class VisionAgent:
    def __init__(self):
        self.client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
        self.model = "gemini-2.5-flash"
        print("Vision Agent initialized with Google Gemini 2.5 Flash (FREE)")
    
    def analyze_image(self, image_path: str) -> Dict:
        """
        Analyze a clothing/outfit image using Google Gemini.
        
        Args:
            image_path: Path to the image file
            
        Returns:
            Dictionary with analysis results
        """
        try:
            # Read image as bytes
            with open(image_path, 'rb') as f:
                image_bytes = f.read()
            
            prompt = """Analyze this clothing item or outfit. Provide:

1. Item Type: What clothing item(s) are shown
2. Colors: Dominant colors and patterns
3. Style/Aesthetic: Fashion style (casual, formal, sporty, etc.)
4. Fabric/Material: What materials it appears to be made from
5. Occasion Suitability: What occasions this would be appropriate for
6. Season: What season(s) this is suitable for
7. Styling Suggestions: What this could be paired with

Be specific and concise."""

            # Correct syntax for new SDK
            response = self.client.models.generate_content(
                model=self.model,
                contents=[
                    prompt,
                    types.Part.from_bytes(
                        data=image_bytes,
                        mime_type="image/jpeg"
                    )
                ]
            )
            
            return {
                'image_path': image_path,
                'analysis': response.text,
                'model': self.model
            }
        except Exception as e:
            return {
                'image_path': image_path,
                'analysis': f"Error analyzing image: {str(e)}",
                'model': self.model
            }
    
    def describe_for_embedding(self, image_path: str) -> str:
        """
        Generate a text description optimized for embedding into vector DB.
        
        Args:
            image_path: Path to the image file
            
        Returns:
            Concise text description
        """
        try:
            with open(image_path, 'rb') as f:
                image_bytes = f.read()
            
            prompt = """Describe this clothing item in 2-3 sentences optimized for search. Include:
- Item type and color
- Material/fabric (if visible)
- Style and occasion suitability

Example: "Navy blue cotton blazer with structured shoulders. Business casual style suitable for office or semi-formal events."

Be concise and specific."""

            response = self.client.models.generate_content(
                model=self.model,
                contents=[
                    prompt,
                    types.Part.from_bytes(
                        data=image_bytes,
                        mime_type="image/jpeg"
                    )
                ]
            )
            
            return response.text.strip()
        except Exception as e:
            return f"Clothing item (error: unable to analyze)"


if __name__ == "__main__":
    agent = VisionAgent()
    print("\nVision Agent ready!")
    print("Using Google Gemini 2.5 Flash - FREE tier")