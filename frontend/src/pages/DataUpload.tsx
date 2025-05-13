import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/DataUpload.css';
import { networkApi } from '../services/api';

interface FileInfo {
  file: File;
  preview: string | null;
  format: 'csv' | 'json' | 'graphml' | 'unknown';
  size: string;
  isValid: boolean;
}

interface UploadResponse {
  filename: string;
  status: string;
  node_count?: number;
  edge_count?: number;
}

const DataUpload: React.FC = () => {
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [importOptions, setImportOptions] = useState({
    nodeIdField: 'id',
    sourceLinkField: 'source',
    targetLinkField: 'target',
    nodeLabelField: 'label',
    weightField: 'weight',
    anonymize: true,
    skipFirstRow: true
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    setError(null);
    setUploadResult(null);

    if (!files || files.length === 0) {
      setFileInfo(null);
      return;
    }

    const file = files[0];
    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
    let format: 'csv' | 'json' | 'graphml' | 'unknown' = 'unknown';
    let isValid = false;

    // Determine file format and validate
    if (fileExt === 'csv') {
      format = 'csv';
      isValid = true;
    } else if (fileExt === 'json') {
      format = 'json';
      isValid = true;
    } else if (fileExt === 'graphml') {
      format = 'graphml';
      isValid = true;
    }

    // Handle invalid file types
    if (!isValid) {
      setError('文件格式无效。请上传CSV、JSON或GraphML格式的文件。');
      setFileInfo(null);
      event.target.value = '';
      return;
    }

    // Format file size
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const sizeFormatted = `${sizeMB} MB`;

    // Create file preview for certain file types
    let preview: string | null = null;
    if (file.type.startsWith('text/') || file.type === 'application/json') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const previewContent = content.substring(0, 500) + (content.length > 500 ? '...' : '');
        setFileInfo(prev => prev ? { ...prev, preview: previewContent } : null);
      };
      reader.readAsText(file);
    }

    setFileInfo({
      file,
      preview,
      format,
      size: sizeFormatted,
      isValid
    });
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      // Create a new event-like object
      const fileChangeEvent = {
        target: {
          files,
          value: ''
        }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      
      handleFileChange(fileChangeEvent);
    }
  };

  const handleRemoveFile = () => {
    setFileInfo(null);
    setError(null);
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!fileInfo || !fileInfo.isValid) {
      setError('请在上传前选择有效的文件。');
      return;
    }

    setIsLoading(true);
    setUploadProgress(0);
    setError(null);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', fileInfo.file);
    
    // Append import options to the form data
    Object.entries(importOptions).forEach(([key, value]) => {
      formData.append(key, String(value));
    });
    
    try {
      // Use the API service to upload the file
      const response = await networkApi.uploadNetwork(formData);
      
      setUploadResult(response.data);
      setIsLoading(false);
      
      // Check if processing was successful
      if (response.data.status.includes('processed successfully')) {
        // Show success for 2 seconds then navigate
        setTimeout(() => {
          navigate('/network');
        }, 2000);
      }
    } catch (error: any) {
      console.error('上传文件时出错:', error);
      let errorMessage = 'Failed to upload file. Please try again.';
      
      if (error.response) {
        // Get the specific error message from the backend if available
        errorMessage = error.response.data.detail || errorMessage;
      }
      
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="data-upload-container">
      <h1>上传数据</h1>
      <p className="description">上传您的社交网络数据文件，以分析关系和社区结构。</p>
      
      <div className="upload-card">
        <div 
          className={`file-drop-area ${fileInfo ? 'has-file' : ''}`}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="file-input"
            onChange={handleFileChange}
            accept=".csv,.json,.graphml"
          />
          
          {!fileInfo ? (
            <div className="upload-prompt">
              <div className="upload-icon">📁</div>
              <p>拖放您的网络数据文件到此处，或点击浏览</p>
              <p className="upload-formats">支持的格式: CSV, JSON, GraphML</p>
            </div>
          ) : (
            <div className="file-info">
              <div className="file-info-header">
                <h3>{fileInfo.file.name}</h3>
                <button 
                  className="remove-file-btn" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile();
                  }}
                >
                  ✕
                </button>
              </div>
              <div className="file-details">
                <p>类型: {fileInfo.format.toUpperCase()}</p>
                <p>大小: {fileInfo.size}</p>
              </div>
              {fileInfo.preview && (
                <div className="file-preview">
                  <h4>文件预览:</h4>
                  <pre>{fileInfo.preview}</pre>
                </div>
              )}
            </div>
          )}
        </div>
        
        {fileInfo && (
          <form onSubmit={handleSubmit} className="import-options">
            <h3>导入选项</h3>
            
            <div className="options-grid">
              <div className="option-group">
                <label htmlFor="nodeIdField">节点ID字段</label>
                <input
                  type="text"
                  id="nodeIdField"
                  name="nodeIdField"
                  value={importOptions.nodeIdField}
                  onChange={handleOptionChange}
                />
              </div>
              
              <div className="option-group">
                <label htmlFor="nodeLabelField">节点标签字段</label>
                <input
                  type="text"
                  id="nodeLabelField"
                  name="nodeLabelField"
                  value={importOptions.nodeLabelField}
                  onChange={handleOptionChange}
                />
              </div>
              
              <div className="option-group">
                <label htmlFor="sourceLinkField">连接源字段</label>
                <input
                  type="text"
                  id="sourceLinkField"
                  name="sourceLinkField"
                  value={importOptions.sourceLinkField}
                  onChange={handleOptionChange}
                />
              </div>
              
              <div className="option-group">
                <label htmlFor="targetLinkField">连接目标字段</label>
                <input
                  type="text"
                  id="targetLinkField"
                  name="targetLinkField"
                  value={importOptions.targetLinkField}
                  onChange={handleOptionChange}
                />
              </div>
              
              <div className="option-group">
                <label htmlFor="weightField">权重字段</label>
                <input
                  type="text"
                  id="weightField"
                  name="weightField"
                  value={importOptions.weightField}
                  onChange={handleOptionChange}
                />
              </div>
              
              <div className="option-group checkbox">
                <input
                  type="checkbox"
                  id="skipFirstRow"
                  name="skipFirstRow"
                  checked={importOptions.skipFirstRow}
                  onChange={handleOptionChange}
                />
                <label htmlFor="skipFirstRow">跳过第一行（标题）</label>
              </div>
              
              <div className="option-group checkbox">
                <input
                  type="checkbox"
                  id="anonymize"
                  name="anonymize"
                  checked={importOptions.anonymize}
                  onChange={handleOptionChange}
                />
                <label htmlFor="anonymize">匿名化数据</label>
              </div>
            </div>
            
            <div className="upload-actions">
              <button 
                type="submit" 
                className="upload-button"
                disabled={isLoading}
              >
                {isLoading ? '处理中...' : '上传并处理'}
              </button>
            </div>
            
            {isLoading && (
              <div className="progress-container">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="progress-text">{uploadProgress}% 已完成</p>
              </div>
            )}
          </form>
        )}
        
        {error && (
          <div className="error-message">
            <p>错误: {error}</p>
          </div>
        )}
        
        {uploadResult && (
          <div className="success-message">
            <h4>上传成功!</h4>
            <p>文件 {uploadResult.filename} 已成功处理.</p>
            {uploadResult.node_count && uploadResult.edge_count && (
              <p>
                导入了 {uploadResult.node_count} 个节点和 {uploadResult.edge_count} 个连接。
                正在重定向到网络视图...
              </p>
            )}
          </div>
        )}
      </div>
      
      <div className="data-format-guide">
        <h2>数据格式指南</h2>
        <div className="format-sections">
          <div className="format-section">
            <h3>CSV 格式</h3>
            <p>
              CSV文件应包含边列表或邻接矩阵。对于边列表，每行应代表一个连接，
              包括源节点ID、目标节点ID，并可选择性地包括连接权重。
            </p>
            <div className="code-example">
              <pre>
                源,目标,权重<br/>
                user1,user2,1.5<br/>
                user1,user3,2.0<br/>
                user2,user4,1.0
              </pre>
            </div>
          </div>
          
          <div className="format-section">
            <h3>JSON 格式</h3>
            <p>
              JSON数据应包含节点和连接数组。每个节点应有一个唯一的ID和可选属性。
              连接应指定源和目标节点ID。
            </p>
            <div className="code-example">
              <pre>
                {`{
  "nodes": [
    {"id": "user1", "name": "张三"},
    {"id": "user2", "name": "李四"}
  ],
  "links": [
    {"source": "user1", "target": "user2", "weight": 1.5}
  ]
}`}
              </pre>
            </div>
          </div>
          
          <div className="format-section">
            <h3>GraphML 格式</h3>
            <p>
              GraphML是一种基于XML的文件格式，专为图形描述而设计。
              它支持节点、边、与它们相关的数据。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataUpload; 