import React, { useState } from 'react';
import axios from 'axios';
import { Upload, Loader2, AlertCircle, CheckCircle, X, Image as ImageIcon } from 'lucide-react';
import { formatMessage } from '../utils/formatMessage';
import './ImageUpload.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function ImageUpload() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = (file) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
      setResult(null);
      setError(null);
    } else {
      setError('Please select a valid image file');
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await axios.post(`${API_URL}/api/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setResult(res.data);
      setSelectedFile(null);
      setPreview(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setPreview(null);
    setSelectedFile(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="image-upload">
      {/* Header */}
      <div className="upload-header">
        <h1>Add to Wardrobe</h1>
        <p>Upload clothing items to build your virtual wardrobe</p>
      </div>

      {/* Upload Area */}
      {!result ? (
        <div className="upload-section">
          {!preview ? (
            <div 
              className={`upload-dropzone ${dragActive ? 'active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileSelect(e.target.files[0])}
                style={{ display: 'none' }}
                id="file-input"
              />
              <label htmlFor="file-input" className="upload-label">
                <div className="upload-icon">
                  <ImageIcon size={48} strokeWidth={1.5} />
                </div>
                <h3>Drop your image here</h3>
                <p>or click to browse</p>
                <span className="upload-hint">PNG, JPG, JPEG up to 10MB</span>
              </label>
            </div>
          ) : (
            <div className="preview-section">
              <div className="preview-card">
                <button className="preview-close" onClick={handleReset}>
                  <X size={20} />
                </button>
                <div className="preview-image-wrapper">
                  <img src={preview} alt="Preview" className="preview-image" />
                </div>
                <div className="preview-actions">
                  <button onClick={handleReset} className="btn-secondary">
                    Change Image
                  </button>
                  <button 
                    onClick={handleUpload} 
                    disabled={uploading}
                    className="btn-primary"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="spinning" size={20} />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Upload size={20} />
                        Upload & Analyze
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="alert alert-error">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}
        </div>
      ) : (
        /* Success Result */
        <div className="result-section">
          <div className="alert alert-success">
            <CheckCircle size={20} />
            <span>{result.message}</span>
          </div>

          <div className="result-grid">
            {/* Image */}
            <div className="result-image-card">
              <img src={`${API_URL}${result.filepath}`} alt="Uploaded item" />
            </div>

            {/* Analysis */}
            <div className="result-analysis-card">
              <h3>AI Analysis</h3>
              <div className="analysis-content">
                {formatMessage(result.analysis)}
              </div>
            </div>
          </div>

          <button onClick={handleReset} className="btn-secondary upload-another">
            <Upload size={20} />
            Upload Another Item
          </button>
        </div>
      )}
    </div>
  );
}

export default ImageUpload;