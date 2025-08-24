/**
 * AudioUploader - User-friendly audio file upload component
 * 
 * Provides drag-and-drop and file selection for audio files,
 * with progress tracking and format validation.
 */

import React, { useState, useCallback } from 'react';
import audioFileProcessor from '../../services/AudioFileProcessor.js';

const AudioUploader = ({ onAudioProcessed, onError }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');

  const handleFileSelect = useCallback(async (files) => {
    const file = files[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      setProgress(0);
      setProgressStatus('Starting...');

      const result = await audioFileProcessor.processFile(file, (progressData) => {
        setProgress(progressData.progress);
        setProgressStatus(progressData.status);
      });

      onAudioProcessed(result);
      
    } catch (error) {
      console.error('File processing error:', error);
      onError(error.message);
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setProgressStatus('');
    }
  }, [onAudioProcessed, onError]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const audioFiles = files.filter(file => 
      audioFileProcessor.isFormatSupported(file.type)
    );
    
    if (audioFiles.length === 0) {
      onError('Please drop a valid audio file (MP3, WAV, OGG, M4A, FLAC)');
      return;
    }
    
    handleFileSelect(audioFiles);
  }, [handleFileSelect, onError]);

  const handleFileInputChange = useCallback((e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      handleFileSelect(files);
    }
  }, [handleFileSelect]);

  const supportedFormats = audioFileProcessor.getSupportedFormats();
  const formatList = supportedFormats.map(format => format.split('/')[1]).join(', ').toUpperCase();

  return (
    <div className="audio-uploader">
      <div 
        className={`upload-zone ${isDragging ? 'dragging' : ''} ${isProcessing ? 'processing' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isProcessing ? (
          <div className="processing-indicator">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="progress-text">
              {progressStatus} ({progress}%)
            </p>
          </div>
        ) : (
          <>
            <div className="upload-icon">🎵</div>
            <h3>Drop your audio file here</h3>
            <p>or click to browse</p>
            <p className="format-info">
              Supported formats: {formatList}
            </p>
            <p className="size-info">
              Maximum file size: 100MB
            </p>
          </>
        )}
        
        <input
          type="file"
          accept={supportedFormats.join(',')}
          onChange={handleFileInputChange}
          disabled={isProcessing}
          className="file-input"
        />
      </div>

      <style jsx>{`
        .audio-uploader {
          width: 100%;
          margin: 20px 0;
        }

        .upload-zone {
          position: relative;
          border: 2px dashed #ccc;
          border-radius: 8px;
          padding: 40px 20px;
          text-align: center;
          background: #fafafa;
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .upload-zone:hover {
          border-color: #007bff;
          background: #f0f8ff;
        }

        .upload-zone.dragging {
          border-color: #007bff;
          background: #e6f3ff;
          transform: scale(1.02);
        }

        .upload-zone.processing {
          cursor: not-allowed;
          opacity: 0.8;
        }

        .upload-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .upload-zone h3 {
          margin: 0 0 8px 0;
          color: #333;
          font-size: 18px;
        }

        .upload-zone p {
          margin: 4px 0;
          color: #666;
          font-size: 14px;
        }

        .format-info {
          font-weight: 500;
          color: #007bff;
        }

        .size-info {
          font-size: 12px;
          color: #999;
        }

        .file-input {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
        }

        .file-input:disabled {
          cursor: not-allowed;
        }

        .processing-indicator {
          padding: 20px;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: #e0e0e0;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 12px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #007bff, #0056b3);
          transition: width 0.3s ease;
        }

        .progress-text {
          font-weight: 500;
          color: #007bff;
          margin: 0;
        }
      `}</style>
    </div>
  );
};

export default AudioUploader;