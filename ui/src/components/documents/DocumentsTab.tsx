// src/components/documents/DocumentsTab.tsx
'use client';

import { useState, useEffect, useRef, useId } from 'react';
import { documentApi, Document, DocumentListResponse } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import {
  MdAdd, MdDescription, MdDelete, MdDownload, MdClose,
  MdUploadFile, MdInsertDriveFile, MdPictureAsPdf, MdImage
} from 'react-icons/md';
import { AlertCircle, FileText, File } from 'lucide-react';
import toast from 'react-hot-toast';

interface DocumentsTabProps {
  passportId: string;
}

export function DocumentsTab({ passportId }: DocumentsTabProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [storageInfo, setStorageInfo] = useState<{ used: number; quota: number } | null>(null);

  useEffect(() => {
    loadDocuments();
  }, [passportId]);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await documentApi.list(passportId);
      setDocuments(response.documents);
      setStorageInfo({
        used: response.totalStorageBytes,
        quota: response.storageQuotaBytes,
      });
    } catch (err) {
      toast.error('Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    try {
      const doc = await documentApi.upload(passportId, file);
      setDocuments(prev => [...prev, doc]);
      setShowUploadModal(false);
      toast.success('Document uploaded successfully!');
      // Reload to get updated storage info
      loadDocuments();
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload document');
      throw err;
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const { downloadUrl } = await documentApi.getDownloadUrl(passportId, doc.id);
      window.open(downloadUrl, '_blank');
    } catch (err) {
      toast.error('Failed to download document');
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document? This cannot be undone.')) {
      return;
    }
    try {
      await documentApi.delete(passportId, docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
      toast.success('Document deleted');
      loadDocuments(); // Reload for updated storage
    } catch (err) {
      toast.error('Failed to delete document');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <MdImage className="w-8 h-8 text-blue-500" />;
    }
    if (mimeType === 'application/pdf') {
      return <MdPictureAsPdf className="w-8 h-8 text-red-500" />;
    }
    return <MdInsertDriveFile className="w-8 h-8 text-gray-500" />;
  };

  const storagePercent = storageInfo
    ? Math.round((storageInfo.used / storageInfo.quota) * 100)
    : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Documents</h2>
          {storageInfo && (
            <p className="text-sm text-gray-600 mt-1">
              {formatFileSize(storageInfo.used)} of {formatFileSize(storageInfo.quota)} used ({storagePercent}%)
            </p>
          )}
        </div>
        <Button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2"
          aria-label="Upload new document"
        >
          <MdAdd className="w-5 h-5" aria-hidden="true" />
          Upload
        </Button>
      </div>

      {/* Storage Bar */}
      {storageInfo && (
        <div className="mb-6">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                storagePercent > 90 ? 'bg-red-500' : storagePercent > 70 ? 'bg-yellow-500' : 'bg-purple-500'
              }`}
              style={{ width: `${Math.min(storagePercent, 100)}%` }}
            />
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500" role="status">Loading documents...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <MdDescription className="w-12 h-12 text-gray-300 mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
          <p className="text-gray-600 mb-4">Upload medical records, assessments, and reports.</p>
          <Button
            onClick={() => setShowUploadModal(true)}
            variant="outline"
            className="inline-flex items-center gap-2"
          >
            <MdUploadFile className="w-5 h-5" aria-hidden="true" />
            Upload your first document
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:border-purple-300 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0" aria-hidden="true">
                  {getFileIcon(doc.mimeType)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 truncate" title={doc.fileName}>
                    {doc.fileName}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(doc.fileSize)} &middot; {formatDate(doc.uploadedAt)}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload(doc)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-purple-700 bg-purple-50 rounded-md hover:bg-purple-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"
                  aria-label={`Download ${doc.fileName}`}
                >
                  <MdDownload className="w-4 h-4" aria-hidden="true" />
                  Download
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(doc.id)}
                  className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                  aria-label={`Delete ${doc.fileName}`}
                >
                  <MdDelete className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadDocumentModal
          onClose={() => setShowUploadModal(false)}
          onUpload={handleUpload}
          maxSizeBytes={storageInfo ? storageInfo.quota - storageInfo.used : 50 * 1024 * 1024}
        />
      )}
    </div>
  );
}

interface UploadDocumentModalProps {
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
  maxSizeBytes: number;
}

function UploadDocumentModal({ onClose, onUpload, maxSizeBytes }: UploadDocumentModalProps) {
  const formId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ALLOWED_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ];

  const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.doc', '.docx', '.txt'];

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `File type not allowed. Accepted types: ${ALLOWED_EXTENSIONS.join(', ')}`;
    }
    if (file.size > maxSizeBytes) {
      return `File too large. Maximum size: ${formatFileSize(maxSizeBytes)}`;
    }
    if (file.size > 10 * 1024 * 1024) {
      return 'File too large. Maximum size: 10 MB per file';
    }
    return null;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileSelect = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
    } else {
      setError(null);
      setSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);

    try {
      await onUpload(selectedFile);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${formId}-title`}
    >
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 id={`${formId}-title`} className="text-xl font-bold text-gray-900">
            Upload Document
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
            aria-label="Close modal"
          >
            <MdClose className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 flex items-start gap-3" role="alert">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Drop Zone */}
          <div
            ref={dropZoneRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-purple-500 bg-purple-50'
                : selectedFile
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 hover:border-purple-400 hover:bg-gray-50'
            }`}
            role="button"
            tabIndex={0}
            aria-label="Click or drag file to upload"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_EXTENSIONS.join(',')}
              onChange={handleInputChange}
              className="sr-only"
              aria-describedby={`${formId}-file-hint`}
            />

            {selectedFile ? (
              <div>
                <MdInsertDriveFile className="w-12 h-12 text-green-500 mx-auto mb-2" aria-hidden="true" />
                <p className="font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                <p className="text-sm text-purple-600 mt-2">Click to change file</p>
              </div>
            ) : (
              <div>
                <MdUploadFile className="w-12 h-12 text-gray-400 mx-auto mb-2" aria-hidden="true" />
                <p className="font-medium text-gray-900">
                  {isDragging ? 'Drop file here' : 'Click or drag file to upload'}
                </p>
                <p id={`${formId}-file-hint`} className="text-sm text-gray-500 mt-1">
                  PDF, images, Word documents up to 10 MB
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedFile || isUploading}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-md hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
