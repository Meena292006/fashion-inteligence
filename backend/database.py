import sqlite3
from datetime import datetime
from typing import List, Dict, Optional
from pathlib import Path

class Database:
    def __init__(self, db_path: str = "fashion_intelligence.db"):
        self.db_path = db_path
        self.init_db()
    
    def init_db(self):
        """Initialize database with required tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Wardrobe items table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS wardrobe_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT NOT NULL,
                filepath TEXT NOT NULL,
                description TEXT,
                analysis TEXT,
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Add analysis column if it doesn't exist (migration for existing DBs)
        try:
            cursor.execute('ALTER TABLE wardrobe_items ADD COLUMN analysis TEXT')
        except sqlite3.OperationalError:
            pass  # Column already exists
        
        # User preferences table (for future use)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_preferences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                preference_key TEXT UNIQUE NOT NULL,
                preference_value TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def add_wardrobe_item(self, filename: str, filepath: str, description: str, analysis: str = "") -> int:
        """Add a wardrobe item to the database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO wardrobe_items (filename, filepath, description, analysis)
            VALUES (?, ?, ?, ?)
        ''', (filename, filepath, description, analysis))
        
        item_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return item_id
    
    def get_wardrobe_items(self, limit: Optional[int] = None) -> List[Dict]:
        """Get all wardrobe items"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        if limit:
            cursor.execute('''
                SELECT * FROM wardrobe_items 
                ORDER BY uploaded_at DESC 
                LIMIT ?
            ''', (limit,))
        else:
            cursor.execute('''
                SELECT * FROM wardrobe_items 
                ORDER BY uploaded_at DESC
            ''')
        
        rows = cursor.fetchall()
        conn.close()
        
        return [dict(row) for row in rows]
    
    def get_wardrobe_item(self, item_id: int) -> Optional[Dict]:
        """Get a specific wardrobe item by ID"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM wardrobe_items WHERE id = ?', (item_id,))
        row = cursor.fetchone()
        conn.close()
        
        return dict(row) if row else None
    
    def delete_wardrobe_item(self, item_id: int) -> bool:
        """Delete a wardrobe item"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM wardrobe_items WHERE id = ?', (item_id,))
        deleted = cursor.rowcount > 0
        
        conn.commit()
        conn.close()
        
        return deleted


if __name__ == "__main__":
    # Test the database
    db = Database()
    print("✅ Database initialized successfully!")
    
    # Test adding an item
    item_id = db.add_wardrobe_item(
        "test_shirt.jpg",
        "uploads/test_shirt.jpg",
        "Blue cotton t-shirt"
    )
    print(f"✅ Added item with ID: {item_id}")
    
    # Test retrieving items
    items = db.get_wardrobe_items()
    print(f"✅ Total items in wardrobe: {len(items)}")
    for item in items:
        print(f"  - {item['filename']}: {item['description']}")