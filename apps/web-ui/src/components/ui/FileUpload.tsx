'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  CloudArrowUpIcon,
  DocumentIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { cn, formatFileSize, isAllowedFileType, getFileExtension } from '@/lib/utils';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  onFilesRemoved?: (files: File[]) => void;
  acceptedFileTypes?: string[];
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
}

interface FileWithPreview extends File {
  preview?: string;
  id: string;
}

export function FileUpload({
  onFilesSelected,
  onFilesRemoved,
  acceptedFileTypes = ['.js', '.mjs', '.cjs'],
  maxFiles = 10,
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  multiple = true,
  disabled = false,
  className,
}: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<FileWithPreview[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      setErrors([]);
      const newErrors: string[] = [];

      // Handle rejected files
      rejectedFiles.forEach(({ file, errors }) => {
        errors.forEach((error: any) => {
          if (error.code === 'file-too-large') {
            newErrors.push(`${file.name}: File is too large (max ${formatFileSize(maxFileSize)})`);
          } else if (error.code === 'file-invalid-type') {
            newErrors.push(`${file.name}: Invalid file type. Allowed: ${acceptedFileTypes.join(', ')}`);
          } else if (error.code === 'too-many-files') {
            newErrors.push(`Too many files. Maximum ${maxFiles} files allowed.`);
          } else {
            newErrors.push(`${file.name}: ${error.message}`);
          }
        });
      });

      // Additional validation for accepted files
      const validFiles: File[] = [];
      acceptedFiles.forEach((file) => {
        // Check file extension
        if (!isAllowedFileType(file.name, acceptedFileTypes)) {
          newErrors.push(`${file.name}: Invalid file type. Allowed: ${acceptedFileTypes.join(', ')}`);
          return;
        }

        // Check if adding this file would exceed max files
        if (uploadedFiles.length + validFiles.length >= maxFiles) {
          newErrors.push(`Cannot add ${file.name}: Maximum ${maxFiles} files allowed`);
          return;
        }

        validFiles.push(file);
      });

      // Create file objects with preview
      const filesWithPreview: FileWithPreview[] = validFiles.map((file) => 
        Object.assign(file, {
          preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
          id: `${file.name}-${Date.now()}-${Math.random()}`,
        })
      );

      if (newErrors.length > 0) {
        setErrors(newErrors);
      }

      if (filesWithPreview.length > 0) {
        const updatedFiles = multiple ? [...uploadedFiles, ...filesWithPreview] : filesWithPreview;
        setUploadedFiles(updatedFiles);
        onFilesSelected(updatedFiles);
      }
    },
    [uploadedFiles, onFilesSelected, acceptedFileTypes, maxFiles, maxFileSize, multiple]
  );

  const removeFile = useCallback(
    (fileToRemove: FileWithPreview) => {
      const updatedFiles = uploadedFiles.filter((file) => file.id !== fileToRemove.id);
      
      // Revoke the preview URL to avoid memory leaks
      if (fileToRemove.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      
      setUploadedFiles(updatedFiles);
      onFilesSelected(updatedFiles);
      
      if (onFilesRemoved) {
        onFilesRemoved([fileToRemove]);
      }
    },
    [uploadedFiles, onFilesSelected, onFilesRemoved]
  );

  const clearAllFiles = useCallback(() => {
    // Revoke all preview URLs
    uploadedFiles.forEach((file) => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    
    setUploadedFiles([]);
    setErrors([]);
    onFilesSelected([]);
    
    if (onFilesRemoved) {
      onFilesRemoved(uploadedFiles);
    }
  }, [uploadedFiles, onFilesSelected, onFilesRemoved]);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
  } = useDropzone({
    onDrop,
    accept: {
      'application/javascript': acceptedFileTypes,
      'text/javascript': acceptedFileTypes,
    },
    maxSize: maxFileSize,
    maxFiles: multiple ? maxFiles - uploadedFiles.length : 1,
    multiple,
    disabled,
  });

  // Cleanup preview URLs on unmount
  React.useEffect(() => {
    return () => {
      uploadedFiles.forEach((file) => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, [uploadedFiles]);

  const dropzoneClass = cn(
    'upload-area cursor-pointer transition-all duration-200',
    {
      'dragover border-primary-500 bg-primary-100': isDragActive && isDragAccept,
      'border-error-500 bg-error-50': isDragActive && isDragReject,
      'opacity-50 cursor-not-allowed': disabled,
      'hover:border-primary-400 hover:bg-primary-50': !disabled && !isDragActive,
    },
    className
  );

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div {...getRootProps({ className: dropzoneClass })}>
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center py-12">
          <CloudArrowUpIcon className="h-12 w-12 text-secondary-400 mb-4" />
          
          {isDragActive ? (
            <div className="text-center">
              {isDragAccept ? (
                <p className="text-primary-600 font-medium">Drop the files here...</p>
              ) : (
                <p className="text-error-600 font-medium">Some files are not supported</p>
              )}
            </div>
          ) : (
            <div className="text-center">
              <p className="text-lg font-medium text-secondary-900 mb-2">
                {multiple ? 'Drop files here or click to select' : 'Drop a file here or click to select'}
              </p>
              <p className="text-sm text-secondary-600 mb-2">
                Supported: {acceptedFileTypes.join(', ')}
              </p>
              <p className="text-xs text-secondary-500">
                Max file size: {formatFileSize(maxFileSize)}
                {multiple && ` • Max ${maxFiles} files`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Error messages */}
      {errors.length > 0 && (
        <div className="bg-error-50 border border-error-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-error-400 flex-shrink-0" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-error-800">
                Upload Error{errors.length > 1 ? 's' : ''}
              </h3>
              <ul className="mt-2 text-sm text-error-700">
                {errors.map((error, index) => (
                  <li key={index} className="list-disc list-inside">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* File list */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-secondary-900">
              Selected Files ({uploadedFiles.length})
            </h3>
            <button
              onClick={clearAllFiles}
              className="text-sm text-secondary-500 hover:text-error-600 transition-colors"
            >
              Clear all
            </button>
          </div>
          
          <div className="grid gap-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg border border-secondary-200"
              >
                <div className="flex items-center min-w-0 flex-1">
                  <DocumentIcon className="h-5 w-5 text-secondary-400 flex-shrink-0" />
                  <div className="ml-3 min-w-0 flex-1">
                    <p className="text-sm font-medium text-secondary-900 truncate">
                      {file.name}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-secondary-500">
                      <span>{formatFileSize(file.size)}</span>
                      <span>•</span>
                      <span>{getFileExtension(file.name).toUpperCase()}</span>
                      <span>•</span>
                      <span>Modified {new Date(file.lastModified).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(file)}
                  className="ml-3 p-1 text-secondary-400 hover:text-error-600 transition-colors"
                  title="Remove file"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          
          <div className="text-xs text-secondary-500">
            Total size: {formatFileSize(uploadedFiles.reduce((sum, file) => sum + file.size, 0))}
          </div>
        </div>
      )}
    </div>
  );
}