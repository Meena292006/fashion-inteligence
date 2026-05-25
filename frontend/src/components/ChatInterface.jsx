import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Send, Loader2, AlertCircle, ChevronDown, ChevronUp, Plus, Menu, 
  PanelLeftClose, PanelLeftOpen, User, Sparkles, Copy, Check, 
  RotateCw, ThumbsUp, ThumbsDown, MoreHorizontal, Image, Mic, 
  Paperclip, Trash2, Edit2, CheckSquare, MessageSquare
} from 'lucide-react';
import { formatMessage } from '../utils/formatMessage';
import './ChatInterface.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function ChatInterface() {
  // State for threads
  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  
  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Current input/loading state
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  
  // Editing thread title state
  const [editingThreadId, setEditingThreadId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  
  // Source toggle map (messageId -> boolean)
  const [openSourcesMap, setOpenSourcesMap] = useState({});

  // Active agent model state
  const [activeModel, setActiveModel] = useState('StyleAI 1.0 (RAG)');
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Load threads from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('style_ai_chat_threads');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setThreads(parsed);
        if (parsed.length > 0) {
          setActiveThreadId(parsed[0].id);
        }
      } catch (e) {
        console.error('Failed to load chat history:', e);
      }
    }
  }, []);

  // Auto-scroll to bottom of messages
  const activeThread = threads.find(t => t.id === activeThreadId);
  const messages = activeThread?.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Handle textarea autosize
  const handleTextareaChange = (e) => {
    setQuery(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  // Create a new chat session
  const handleNewChat = () => {
    const newId = Date.now().toString();
    const newThread = {
      id: newId,
      title: 'New Style Chat',
      messages: [],
      date: new Date().toISOString()
    };
    const updatedThreads = [newThread, ...threads];
    setThreads(updatedThreads);
    setActiveThreadId(newId);
    localStorage.setItem('style_ai_chat_threads', JSON.stringify(updatedThreads));
  };

  // Delete a chat thread
  const handleDeleteThread = (threadId, e) => {
    e.stopPropagation();
    const updatedThreads = threads.filter(t => t.id !== threadId);
    setThreads(updatedThreads);
    localStorage.setItem('style_ai_chat_threads', JSON.stringify(updatedThreads));
    
    if (activeThreadId === threadId) {
      if (updatedThreads.length > 0) {
        setActiveThreadId(updatedThreads[0].id);
      } else {
        setActiveThreadId(null);
      }
    }
  };

  // Rename a chat thread
  const handleStartRename = (threadId, title, e) => {
    e.stopPropagation();
    setEditingThreadId(threadId);
    setEditingTitle(title);
  };

  const handleSaveRename = (threadId, e) => {
    if (e) e.stopPropagation();
    if (!editingTitle.trim()) return;
    
    const updatedThreads = threads.map(t => {
      if (t.id === threadId) {
        return { ...t, title: editingTitle };
      }
      return t;
    });
    setThreads(updatedThreads);
    localStorage.setItem('style_ai_chat_threads', JSON.stringify(updatedThreads));
    setEditingThreadId(null);
  };

  // Send message
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim() || loading) return;

    const currentQuery = query;
    setQuery('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    let currentThreadId = activeThreadId;
    let currentThreads = [...threads];

    // Create a thread if none exists
    if (!currentThreadId || currentThreads.length === 0) {
      const newId = Date.now().toString();
      const newThread = {
        id: newId,
        title: currentQuery.length > 25 ? currentQuery.substring(0, 25) + '...' : currentQuery,
        messages: [],
        date: new Date().toISOString()
      };
      currentThreads = [newThread, ...currentThreads];
      currentThreadId = newId;
      setThreads(currentThreads);
      setActiveThreadId(newId);
    }

    const userMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: currentQuery,
      timestamp: new Date().toISOString()
    };

    const updatedThreadsWithUser = currentThreads.map(t => {
      if (t.id !== currentThreadId) return t;
      const isFirstMessage = t.messages.length === 0;
      return {
        ...t,
        title: isFirstMessage ? (currentQuery.length > 25 ? currentQuery.substring(0, 25) + '...' : currentQuery) : t.title,
        messages: [...t.messages, userMessage]
      };
    });

    setThreads(updatedThreadsWithUser);
    localStorage.setItem('style_ai_chat_threads', JSON.stringify(updatedThreadsWithUser));
    
    setLoading(true);
    setError(null);

    try {
      const res = await axios.post(`${API_URL}/api/chat`, {
        query: currentQuery,
        n_results: 5
      });

      const aiMessage = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: res.data.advice,
        sources: res.data.sources || [],
        total_sources: res.data.total_sources || 0,
        timestamp: new Date().toISOString(),
        feedback: null
      };

      const finalThreads = updatedThreadsWithUser.map(t => {
        if (t.id !== currentThreadId) return t;
        return {
          ...t,
          messages: [...t.messages, aiMessage]
        };
      });

      setThreads(finalThreads);
      localStorage.setItem('style_ai_chat_threads', JSON.stringify(finalThreads));
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to get stylist advice. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  // Regenerate Response
  const handleRegenerate = async (messageIndex) => {
    if (loading || !activeThreadId) return;

    // Find the user query that is corresponding to the response we want to regenerate
    // The user query is usually at messageIndex - 1
    const userMessage = messages[messageIndex - 1];
    if (!userMessage || userMessage.role !== 'user') return;

    setLoading(true);
    setError(null);

    try {
      const res = await axios.post(`${API_URL}/api/chat`, {
        query: userMessage.content,
        n_results: 5
      });

      const aiMessage = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: res.data.advice,
        sources: res.data.sources || [],
        total_sources: res.data.total_sources || 0,
        timestamp: new Date().toISOString(),
        feedback: null
      };

      // Replace the old AI message with the newly regenerated one
      const updatedMessages = [...messages];
      updatedMessages[messageIndex] = aiMessage;

      const finalThreads = threads.map(t => {
        if (t.id !== activeThreadId) return t;
        return { ...t, messages: updatedMessages };
      });

      setThreads(finalThreads);
      localStorage.setItem('style_ai_chat_threads', JSON.stringify(finalThreads));
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to regenerate response');
    } finally {
      setLoading(false);
    }
  };

  // Feedback handler (Like/Dislike)
  const handleFeedback = (messageId, type) => {
    const finalThreads = threads.map(t => {
      if (t.id !== activeThreadId) return t;
      return {
        ...t,
        messages: t.messages.map(m => {
          if (m.id === messageId) {
            return { ...m, feedback: m.feedback === type ? null : type };
          }
          return m;
        })
      };
    });
    setThreads(finalThreads);
    localStorage.setItem('style_ai_chat_threads', JSON.stringify(finalThreads));
  };

  // Copy to clipboard
  const handleCopy = (text, messageId) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  // Toggle sources panel inside individual messages
  const toggleSources = (messageId) => {
    setOpenSourcesMap(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  // Group threads by date
  const groupThreads = (threadsList) => {
    const today = [];
    const yesterday = [];
    const previous = [];
    
    const now = new Date();
    const todayStr = now.toDateString();
    
    const yesterdayDate = new Date();
    yesterdayDate.setDate(now.getDate() - 1);
    const yesterdayStr = yesterdayDate.toDateString();

    threadsList.forEach(t => {
      const threadDate = new Date(t.date || Number(t.id));
      const threadDateStr = threadDate.toDateString();
      
      if (threadDateStr === todayStr) {
        today.push(t);
      } else if (threadDateStr === yesterdayStr) {
        yesterday.push(t);
      } else {
        previous.push(t);
      }
    });

    return { today, yesterday, previous };
  };

  const groupedThreads = groupThreads(threads);

  const exampleQueries = [
    "What should I wear to a formal summer wedding?",
    "Suggest a wardrobe color combination with khaki pants",
    "How should I style a black leather jacket casually?",
    "What are the best fabrics for breathable office wear?"
  ];

  return (
    <div className="chat-dashboard-container">
      {/* Sidebar Panel */}
      <div className={`chat-sidebar ${isSidebarOpen ? 'open' : 'collapsed'}`}>
        <div className="sidebar-header">
          <button className="new-chat-btn" onClick={handleNewChat}>
            <Plus size={18} />
            <span>Add new chat</span>
          </button>
        </div>

        {/* Scrollable Threads List */}
        <div className="sidebar-history-container">
          {threads.length === 0 ? (
            <div className="empty-history-text">No style sessions yet</div>
          ) : (
            <>
              {/* TODAY */}
              {groupedThreads.today.length > 0 && (
                <div className="history-group">
                  <div className="group-title">TODAY</div>
                  {groupedThreads.today.map(t => renderThreadItem(t))}
                </div>
              )}

              {/* YESTERDAY */}
              {groupedThreads.yesterday.length > 0 && (
                <div className="history-group">
                  <div className="group-title">YESTERDAY</div>
                  {groupedThreads.yesterday.map(t => renderThreadItem(t))}
                </div>
              )}

              {/* PREVIOUS */}
              {groupedThreads.previous.length > 0 && (
                <div className="history-group">
                  <div className="group-title">PREVIOUS</div>
                  {groupedThreads.previous.map(t => renderThreadItem(t))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom Premium Card */}
        <div className="sidebar-footer">
          <div className="upgrade-card">
            <div className="upgrade-icon-wrapper">
              <Sparkles size={16} />
              <span>Upgrade Your Plan</span>
            </div>
            <p>Unlock premium styling analysis, unlimited agent queries, and faster response times.</p>
            <button className="upgrade-btn">Upgrade Premium</button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="chat-main-area">
        {/* Top Navbar Header */}
        <div className="chat-main-header">
          <div className="header-left">
            <button 
              className="toggle-sidebar-btn" 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
            >
              {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
            </button>
            <span className="current-chat-title">
              {activeThread ? activeThread.title : 'New Chat'}
            </span>
          </div>

          <div className="header-right">
            <div className="model-selector-container">
              <button 
                className="model-select-btn"
                onClick={() => setShowModelDropdown(!showModelDropdown)}
              >
                <span>{activeModel}</span>
                <ChevronDown size={14} />
              </button>
              {showModelDropdown && (
                <div className="model-dropdown-menu">
                  {['StyleAI 1.0 (RAG)', 'Stylist Agent v2', 'Vision Expert 1.1'].map(model => (
                    <button
                      key={model}
                      className={`model-option ${activeModel === model ? 'active' : ''}`}
                      onClick={() => {
                        setActiveModel(model);
                        setShowModelDropdown(false);
                      }}
                    >
                      {model}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Messages Container */}
        <div className="messages-scroll-viewport">
          {messages.length === 0 ? (
            /* Empty Chat / Welcome State */
            <div className="welcome-state-container">
              <div className="welcome-icon">
                <Sparkles size={48} />
              </div>
              <h1>Your Personal AI Stylist</h1>
              <p>Get expert fashion advice, coordinated outfit plans, and detailed fabric tips powered by StyleAI.</p>
              
              <div className="suggestion-chips-grid">
                <div className="suggestion-label">Suggested style inquiries:</div>
                <div className="chips-container">
                  {exampleQueries.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setQuery(q);
                        if (textareaRef.current) {
                          textareaRef.current.focus();
                        }
                      }}
                      className="suggest-chip"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Message Thread */
            <div className="messages-thread-list">
              <div className="date-divider">
                <span>Today</span>
              </div>

              {messages.map((msg, index) => {
                const isUser = msg.role === 'user';
                return (
                  <div 
                    key={msg.id} 
                    className={`message-bubble-wrapper ${isUser ? 'user-aligned' : 'ai-aligned'}`}
                  >
                    {/* User message layouts */}
                    {isUser ? (
                      <>
                        <div className="message-header-row user">
                          <span>You</span>
                        </div>
                        <div className="user-message-row">
                          <button 
                            className="edit-message-btn" 
                            title="Edit message"
                            onClick={() => setQuery(msg.content)}
                          >
                            <Edit2 size={14} />
                          </button>
                          <div className="user-text-bubble">
                            <p>{msg.content}</p>
                          </div>
                          <div className="avatar user-avatar">
                            <User size={16} />
                          </div>
                        </div>
                      </>
                    ) : (
                      /* AI message layout */
                      <>
                        <div className="message-header-row ai">
                          <span>StyleAI Assistant</span>
                        </div>
                        <div className="ai-message-row">
                          <div className="avatar ai-avatar">
                            <Sparkles size={16} />
                          </div>
                          
                          <div className="ai-response-card">
                            <div className="ai-response-content">
                              {formatMessage(msg.content)}
                            </div>

                            {/* Collapsible Sources Panel inside the Card */}
                            {msg.sources && msg.sources.length > 0 && (
                              <div className="inner-sources-panel">
                                <button 
                                  className="inner-sources-toggle"
                                  onClick={() => toggleSources(msg.id)}
                                >
                                  <div className="toggle-label-left">
                                    <MessageSquare size={13} />
                                    <span>Knowledge Sources ({msg.total_sources})</span>
                                  </div>
                                  {openSourcesMap[msg.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                                
                                {openSourcesMap[msg.id] && (
                                  <div className="inner-sources-list">
                                    {msg.sources.map((source, sIdx) => (
                                      <div key={sIdx} className="inner-source-item">
                                        <div className="inner-source-header">
                                          <span className="source-num">#{sIdx + 1}</span>
                                          <span className="source-title">{source.source}</span>
                                          <span className="relevance-pct">
                                            {(source.relevance_score * 100).toFixed(0)}% match
                                          </span>
                                        </div>
                                        <p className="source-excerpt">
                                          {source.content.substring(0, 180)}
                                          {source.content.length > 180 && '...'}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Card Footer Actions */}
                            <div className="ai-response-actions-row">
                              <div className="action-icons-left">
                                <button 
                                  className={`action-btn ${msg.feedback === 'like' ? 'active-like' : ''}`}
                                  onClick={() => handleFeedback(msg.id, 'like')}
                                  title="Like this response"
                                >
                                  <ThumbsUp size={14} />
                                </button>
                                <button 
                                  className={`action-btn ${msg.feedback === 'dislike' ? 'active-dislike' : ''}`}
                                  onClick={() => handleFeedback(msg.id, 'dislike')}
                                  title="Dislike this response"
                                >
                                  <ThumbsDown size={14} />
                                </button>
                                <button 
                                  className="action-btn"
                                  onClick={() => handleCopy(msg.content, msg.id)}
                                  title="Copy response content"
                                >
                                  {copiedMessageId === msg.id ? <Check size={14} className="copied-green" /> : <Copy size={14} />}
                                </button>
                                <button 
                                  className="action-btn"
                                  onClick={() => handleRegenerate(index)}
                                  title="Regenerate styling advice"
                                >
                                  <RotateCw size={14} />
                                </button>
                              </div>
                              <div className="model-badge">
                                {activeModel}
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}

              {loading && (
                <div className="message-bubble-wrapper ai-aligned">
                  <div className="message-header-row ai">
                    <span>StyleAI Assistant</span>
                  </div>
                  <div className="ai-message-row">
                    <div className="avatar ai-avatar spinning-container">
                      <Loader2 size={16} className="spinning" />
                    </div>
                    <div className="ai-response-card loading-state">
                      <div className="typing-loader">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                      <p className="loading-label">Stylist is preparing your matches...</p>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="alert alert-error chat-alert">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Bar Fixed Bottom */}
        <div className="chat-input-sticky-bottom">
          <form onSubmit={handleSendMessage} className="sticky-chat-form">
            <div className="premium-textarea-box">
              <textarea
                ref={textareaRef}
                value={query}
                onChange={handleTextareaChange}
                placeholder="How can I support you?"
                rows="1"
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <div className="textarea-controls-row">
                <div className="left-controls">
                  <button type="button" className="control-btn" title="More tools">
                    <MoreHorizontal size={16} />
                  </button>
                </div>
                <div className="right-controls">
                  <button type="button" className="control-btn" title="Upload design file">
                    <Image size={16} />
                  </button>
                  <button type="button" className="control-btn" title="Voice query">
                    <Mic size={16} />
                  </button>
                  <button type="button" className="control-btn" title="Add links or references">
                    <Paperclip size={16} />
                  </button>
                  <button 
                    type="submit" 
                    className="premium-send-btn" 
                    disabled={loading || !query.trim()}
                    title="Send styling request"
                  >
                    {loading ? <Loader2 className="spinning" size={16} /> : <Send size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </form>
          <div className="input-disclaimer">
            StyleAI can make mistakes. Verify critical fits, labels, and sizes before ordering.
          </div>
        </div>
      </div>
    </div>
  );

  // Helper render for thread item
  function renderThreadItem(t) {
    const isActive = t.id === activeThreadId;
    const isEditing = t.id === editingThreadId;
    
    return (
      <div 
        key={t.id} 
        className={`history-item ${isActive ? 'active' : ''}`}
        onClick={() => {
          if (!isEditing) {
            setActiveThreadId(t.id);
          }
        }}
      >
        <MessageSquare size={15} className="history-icon" />
        
        {isEditing ? (
          <input
            type="text"
            className="rename-input"
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveRename(t.id);
              if (e.key === 'Escape') setEditingThreadId(null);
            }}
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        ) : (
          <span className="history-title">{t.title}</span>
        )}

        <div className="history-item-actions">
          {isEditing ? (
            <button 
              className="action-icon-btn check"
              onClick={(e) => handleSaveRename(t.id, e)}
            >
              <CheckSquare size={13} />
            </button>
          ) : (
            <>
              <button 
                className="action-icon-btn edit"
                onClick={(e) => handleStartRename(t.id, t.title, e)}
                title="Rename chat"
              >
                <Edit2 size={13} />
              </button>
              <button 
                className="action-icon-btn delete"
                onClick={(e) => handleDeleteThread(t.id, e)}
                title="Delete chat"
              >
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      </div>
    );
  }
}

export default ChatInterface;