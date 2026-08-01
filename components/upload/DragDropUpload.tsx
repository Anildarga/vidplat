'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, FileVideo, Image, CheckCircle } from 'lucide-react';

interface DragDropUploadProps {
  onFileSelect: (file: File) => void;
  acceptedTypes?: string;
  maxSize?: number; // in MB
  label?: string;
  description?: string;
  preview?: boolean;
  className?: string;
}

export default function DragDropUpload({
  onFileSelect,
  acceptedTypes = 'video/*,image/*',
  maxSize = 500, // MB
  label = 'Upload Video',
  description = 'Drag & drop a video file here, or click to browse',
  preview = true,
  className = '',
}: DragDropUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const processFile = (file: File) => {
    setError(null);

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSize) {
      setError(`File size exceeds ${maxSize}MB limit`);
      return;
    }

    // Check file type
    const acceptedTypesArray = acceptedTypes.split(',').map(type => type.trim());
    const isAccepted = acceptedTypesArray.some(type => {
      if (type.endsWith('/*')) {
        const category = type.split('/')[0];
        return file.type.startsWith(`${category}/`);
      }
      return file.type === type;
    });

    if (!isAccepted) {
      setError(`File type not supported. Accepted: ${acceptedTypes}`);
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);

    // Create preview URL for images and videos
    if (preview && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = () => {
    if (!selectedFile) return <Upload className="w-12 h-12 text-gray-400" />;
    
    if (selectedFile.type.startsWith('video/')) {
      return <FileVideo className="w-12 h-12 text-blue-500" />;
    } else if (selectedFile.type.startsWith('image/')) {
      return <Image className="w-12 h-12 text-green-500" />;
    }
    return <Upload className="w-12 h-12 text-gray-400" />;
  };

  return (
    <div className={`w-full ${className}`}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInput}
        accept={acceptedTypes}
        className="hidden"
      />

      {!selectedFile ? (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleBrowseClick}
        >
          <div className="flex flex-col items-center justify-center space-y-4">
            <Upload className="w-12 h-12 text-gray-400" />
            <div>
              <p className="text-lg font-medium text-gray-900 dark:text-white">{label}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                Max file size: {maxSize}MB • {acceptedTypes}
              </p>
            </div>
            <button
              type="button"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                handleBrowseClick();
              }}
            >
              Browse Files
            </button>
          </div>
        </div>
      ) : (
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                {getFileIcon()}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {selectedFile.name}
                  </h3>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {formatFileSize(selectedFile.size)} • {selectedFile.type}
                </p>
                <div className="mt-4 flex space-x-3">
                  <button
                    type="button"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    onClick={handleBrowseClick}
                  >
                    Change File
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
                    onClick={handleRemoveFile}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>

          {previewUrl && (
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Preview:</p>
              {selectedFile.type.startsWith('image/') ? (
                <div className="max-w-md">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="rounded-lg border border-gray-300 dark:border-gray-600 max-h-64 object-contain"
                  />
                </div>
              ) : selectedFile.type.startsWith('video/') ? (
                <div className="max-w-md">
                  <video
                    src={previewUrl}
                    controls
                    className="rounded-lg border border-gray-300 dark:border-gray-600 max-h-64 w-full"
                  />
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        <p>Supported formats: MP4, WebM, OGG, MOV, AVI for videos • JPG, PNG, GIF, WebP for images</p>
        <p>Files are uploaded to Cloudinary for optimal streaming and thumbnail generation</p>
      </div>
    </div>
  );
}