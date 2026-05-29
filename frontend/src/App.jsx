import React, { useState } from 'react';
import './App.css';
import ChatInterface from './components/ChatInterface';
import ImageUpload from './components/ImageUpload';
import WardrobeView from './components/WardrobeView';
import { MessageSquare, Upload, Shirt, Sparkles } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('chat');

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-container">
          <div className="logo">
            <Sparkles className="logo-icon" />
            <span className="logo-text">StyleAI</span>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="nav-desktop">
            <button 
              className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              <MessageSquare size={20} />
              <span>Ask Stylist</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              <Upload size={20} />
              <span>Add Item</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'wardrobe' ? 'active' : ''}`}
              onClick={() => setActiveTab('wardrobe')}
            >
              <Shirt size={20} />
              <span>My Wardrobe</span>
            </button>
          </nav>

        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="nav-bottom-bar">
        <button 
          className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <MessageSquare size={20} />
          <span>Stylist</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          <Upload size={20} />
          <span>Add Item</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'wardrobe' ? 'active' : ''}`}
          onClick={() => setActiveTab('wardrobe')}
        >
          <Shirt size={20} />
          <span>Wardrobe</span>
        </button>
      </nav>

      {/* Main Content */}
      <main className="main">
        <div className="main-container">
          {activeTab === 'chat' && <ChatInterface />}
          {activeTab === 'upload' && <ImageUpload />}
          {activeTab === 'wardrobe' && <WardrobeView />}
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>Powered by Multi-Agent RAG • ChromaDB • Gemini Vision</p>
      </footer>
    </div>
  );
}

export default App;