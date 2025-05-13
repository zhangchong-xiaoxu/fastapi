import React, { useState } from 'react';
import axios from 'axios';
import './FileUpload.css';

interface FileUploadProps {
  onUploadSuccess?: (data: any) => void;
  onUploadError?: (error: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess, onUploadError }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'info' | 'error' | 'success'>('info');
  const [importOptions, setImportOptions] = useState({
    nodeIdField: 'id',
    nodeLabelField: 'label',
    sourceLinkField: 'source',
    targetLinkField: 'target',
    weightField: 'weight',
    anonymize: true,
    skipFirstRow: true
  });
  const [showOptions, setShowOptions] = useState<boolean>(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      setMessage('');
      setShowOptions(true);
    }
  };

  const handleOptionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Handle checkboxes separately since they use checked property
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setImportOptions(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setImportOptions(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage('Please select a file first');
      setMessageType('error');
      if (onUploadError) onUploadError('No file selected');
      return;
    }

    // Validate file type
    const fileExt = selectedFile.name.toLowerCase().split('.').pop();
    if (!['csv', 'json', 'graphml'].includes(fileExt || '')) {
      setMessage('Only CSV, JSON, and GraphML files are supported');
      setMessageType('error');
      if (onUploadError) onUploadError('Invalid file type');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setMessage('Uploading...');
    setMessageType('info');

    // Create form data
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    // Add import options to the form data
    Object.entries(importOptions).forEach(([key, value]) => {
      formData.append(key, String(value));
    });

    try {
      // Send file to server
      const response = await axios.post('/api/network/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total!);
          setUploadProgress(percentCompleted);
        },
      });

      setMessage(`File uploaded successfully: ${response.data.status}`);
      setMessageType('success');
      setSelectedFile(null);
      setShowOptions(false);
      
      // Reset file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      // Call success callback
      if (onUploadSuccess) onUploadSuccess(response.data);
    } catch (error) {
      console.error('Error uploading file:', error);
      setMessage('Failed to upload file');
      setMessageType('error');
      if (onUploadError) onUploadError('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="file-upload-container">
      <div className="file-input-group">
        <input
          type="file"
          id="file-upload"
          onChange={handleFileChange}
          accept=".csv,.json,.graphml"
          disabled={uploading}
          className="file-input"
        />
        <label htmlFor="file-upload" className="file-label">
          {selectedFile ? selectedFile.name : 'Choose File'}
        </label>
        <button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          className="btn btn-primary upload-btn"
        >
          Upload
        </button>
      </div>
      
      {showOptions && selectedFile && (
        <div className="import-options">
          <h4>Import Options</h4>
          <div className="options-grid">
            <div className="option-group">
              <label htmlFor="nodeIdField">Node ID Field:</label>
              <input
                type="text"
                id="nodeIdField"
                name="nodeIdField"
                value={importOptions.nodeIdField}
                onChange={handleOptionChange}
              />
            </div>
            
            <div className="option-group">
              <label htmlFor="nodeLabelField">Node Label Field:</label>
              <input
                type="text"
                id="nodeLabelField"
                name="nodeLabelField"
                value={importOptions.nodeLabelField}
                onChange={handleOptionChange}
              />
            </div>
            
            <div className="option-group">
              <label htmlFor="sourceLinkField">Source Link Field:</label>
              <input
                type="text"
                id="sourceLinkField"
                name="sourceLinkField"
                value={importOptions.sourceLinkField}
                onChange={handleOptionChange}
              />
            </div>
            
            <div className="option-group">
              <label htmlFor="targetLinkField">Target Link Field:</label>
              <input
                type="text"
                id="targetLinkField"
                name="targetLinkField"
                value={importOptions.targetLinkField}
                onChange={handleOptionChange}
              />
            </div>
            
            <div className="option-group">
              <label htmlFor="weightField">Weight Field (optional):</label>
              <input
                type="text"
                id="weightField"
                name="weightField"
                value={importOptions.weightField}
                onChange={handleOptionChange}
              />
            </div>
            
            <div className="option-group checkbox">
              <label>
                <input
                  type="checkbox"
                  name="skipFirstRow"
                  checked={importOptions.skipFirstRow}
                  onChange={handleOptionChange}
                />
                Skip first row (headers)
              </label>
            </div>
            
            <div className="option-group checkbox">
              <label>
                <input
                  type="checkbox"
                  name="anonymize"
                  checked={importOptions.anonymize}
                  onChange={handleOptionChange}
                />
                Anonymize node IDs
              </label>
            </div>
          </div>
        </div>
      )}
      
      {uploading && (
        <div className="progress-container">
          <div className="progress-bar" style={{ width: `${uploadProgress}%` }}></div>
          <div className="progress-text">{uploadProgress}%</div>
        </div>
      )}
      
      {message && (
        <div className={`upload-message ${messageType !== 'info' ? messageType : ''}`}>
          {message}
        </div>
      )}
      
      <div className="file-format-info">
        <small>
          Supported formats: 
          <ul>
            <li>CSV with columns 'source', 'target', and optional 'weight'.</li>
            <li>JSON with 'nodes' and 'links'/'edges' arrays.</li>
            <li>GraphML network files.</li>
          </ul>
        </small>
      </div>
    </div>
  );
};

export default FileUpload; 