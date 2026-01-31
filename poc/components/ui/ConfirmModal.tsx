// src/components/ui/ConfirmModal.tsx
'use client';

import { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger'
}: ConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Focus the cancel button when modal opens (safer default)
      cancelRef.current?.focus();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      }

      // Trap focus within modal
      if (e.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusableElements || focusableElements.length === 0) return;

        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-description"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 min-h-[44px] min-w-[44px] text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        {/* Icon */}
        <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
          variant === 'danger' ? 'bg-red-100' : 'bg-amber-100'
        }`}>
          <AlertTriangle
            className={`w-6 h-6 ${variant === 'danger' ? 'text-red-600' : 'text-amber-600'}`}
            aria-hidden="true"
          />
        </div>

        {/* Content */}
        <h2
          id="confirm-modal-title"
          className="text-lg font-semibold text-gray-900 text-center mb-2"
        >
          {title}
        </h2>
        <p
          id="confirm-modal-description"
          className="text-sm text-gray-600 text-center mb-6"
        >
          {message}
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            ref={cancelRef}
            onClick={onClose}
            className="flex-1 px-4 py-3 min-h-[44px] text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 px-4 py-3 min-h-[44px] text-sm font-semibold text-white rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
              variant === 'danger'
                ? 'bg-red-600 hover:bg-red-700 focus-visible:outline-red-600'
                : 'bg-amber-600 hover:bg-amber-700 focus-visible:outline-amber-600'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
