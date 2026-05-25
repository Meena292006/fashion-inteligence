import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Loader2, Trash2, AlertCircle, RefreshCw, Shirt, X, Calendar, FileText, Sparkles } from 'lucide-react';
import { formatMessage } from '../utils/formatMessage';
import './WardrobeView.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function WardrobeView() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    fetchWardrobe();
  }, []);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedItem) {
        setSelectedItem(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem]);

  const fetchWardrobe = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await axios.get(`${API_URL}/api/wardrobe`);
      setItems(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load wardrobe');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (itemId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Remove this item from your wardrobe?')) return;

    setDeletingId(itemId);
    
    try {
      await axios.delete(`${API_URL}/api/wardrobe/${itemId}`);
      setItems(items.filter(item => item.id !== itemId));
      if (selectedItem && selectedItem.id === itemId) {
        setSelectedItem(null);
      }
    } catch (err) {
      alert('Failed to delete item');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="wardrobe-loading">
        <Loader2 className="spinning" size={48} />
        <p>Loading your wardrobe...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wardrobe-error">
        <AlertCircle size={48} />
        <h3>Failed to load wardrobe</h3>
        <p>{error}</p>
        <button onClick={fetchWardrobe} className="btn-primary">
          <RefreshCw size={20} />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="wardrobe-view">
      {/* Header */}
      <div className="wardrobe-header">
        <div className="wardrobe-title">
          <h1>My Wardrobe</h1>
          <span className="item-count">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </span>
        </div>
        {items.length > 0 && (
          <button onClick={fetchWardrobe} className="btn-secondary">
            <RefreshCw size={18} />
            Refresh
          </button>
        )}
      </div>

      {/* Empty State */}
      {items.length === 0 ? (
        <div className="wardrobe-empty">
          <div className="empty-icon">
            <Shirt size={64} strokeWidth={1.5} />
          </div>
          <h2>Your wardrobe is empty</h2>
          <p>Start building your collection by uploading clothing items</p>
        </div>
      ) : (
        /* Items Grid */
        <div className="wardrobe-grid">
          {items.map((item) => (
            <div 
              key={item.id} 
              className="wardrobe-item"
              onClick={() => setSelectedItem(item)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') setSelectedItem(item); }}
            >
              <div className="item-image">
                <img src={`${API_URL}${item.filepath}`} alt={item.filename} />
                <button
                  onClick={(e) => handleDelete(item.id, e)}
                  className="item-delete"
                  disabled={deletingId === item.id}
                  title="Remove from wardrobe"
                >
                  {deletingId === item.id ? (
                    <Loader2 className="spinning" size={18} />
                  ) : (
                    <Trash2 size={18} />
                  )}
                </button>
                <div className="item-view-badge">
                  <FileText size={13} />
                  <span>View Details</span>
                </div>
              </div>
              <div className="item-details">
                <p className="item-description">{item.description}</p>
                <span className="item-date">{formatDate(item.uploaded_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ============ DETAIL MODAL ============ */}
      {selectedItem && (
        <div 
          className="wardrobe-modal-overlay"
          onClick={() => setSelectedItem(null)}
        >
          <div 
            className="wardrobe-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header">
              <div className="modal-header-title">
                <Sparkles size={18} className="modal-header-icon" />
                <span>Item Details</span>
              </div>
              <button 
                className="modal-close-btn"
                onClick={() => setSelectedItem(null)}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body">
              {/* Image Section */}
              <div className="modal-image-section">
                <img 
                  src={`${API_URL}${selectedItem.filepath}`} 
                  alt={selectedItem.filename} 
                  className="modal-image"
                />
              </div>

              {/* Info Section */}
              <div className="modal-info-section">
                {/* Meta Tags */}
                <div className="modal-meta-row">
                  <div className="meta-tag">
                    <Calendar size={13} />
                    <span>{formatDate(selectedItem.uploaded_at)} at {formatTime(selectedItem.uploaded_at)}</span>
                  </div>
                  <div className="meta-tag">
                    <FileText size={13} />
                    <span>{selectedItem.filename}</span>
                  </div>
                </div>

                {/* Description */}
                <div className="modal-section">
                  <h3 className="modal-section-title">Description</h3>
                  <p className="modal-description-text">{selectedItem.description}</p>
                </div>

                {/* AI Analysis */}
                {selectedItem.analysis && (
                  <div className="modal-section">
                    <div className="modal-analysis-header">
                      <Sparkles size={16} className="analysis-header-icon" />
                      <h3 className="modal-section-title">AI Analysis</h3>
                    </div>
                    <div className="modal-analysis-content">
                      {formatMessage(selectedItem.analysis)}
                    </div>
                  </div>
                )}

                {/* Delete Action */}
                <div className="modal-actions">
                  <button 
                    className="modal-delete-btn"
                    onClick={(e) => handleDelete(selectedItem.id, e)}
                    disabled={deletingId === selectedItem.id}
                  >
                    {deletingId === selectedItem.id ? (
                      <><Loader2 className="spinning" size={16} /> Removing...</>
                    ) : (
                      <><Trash2 size={16} /> Remove from Wardrobe</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WardrobeView;