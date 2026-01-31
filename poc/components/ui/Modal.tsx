// src/components/ui/Modal.tsx
'use client';

import { useEffect, useRef, ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      modalRef.current?.focus();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) onClose(); };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1} className="relative bg-white rounded-md shadow-xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 bg-white border-b-2 border-purple-200/50">
          <h2 id="modal-title" className="text-xl font-black text-gray-900">{title}</h2>
          <button 
            onClick={onClose} 
            className="p-2 min-h-[44px] min-w-[44px] text-gray-600 hover:bg-purple-50 hover:text-purple-700 rounded-md transition-all focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-purple-600" 
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="px-4 sm:px-6 py-4 overflow-y-auto flex-grow">{children}</div>
        
        {/* Footer */}
        <div className="px-4 sm:px-6 py-4 border-t border-purple-200/50 bg-purple-50/30">
          <button 
            onClick={onClose}
            className="w-full flex items-center justify-center px-4 py-3 min-h-[44px] text-sm font-medium bg-gradient-to-r from-[#a855f7] to-[#be185d] text-white hover:from-[#9333ea] hover:to-[#9f1239] rounded-md transition-all focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

