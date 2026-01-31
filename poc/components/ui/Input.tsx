// src/components/ui/Input.tsx
'use client';

import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef, KeyboardEvent } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, className = '', ...props }, ref) => {
    const inputId = id || label.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="space-y-1">
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-900">
          {label}
          {props.required && <span className="text-[#be185d] ml-0.5">*</span>}
        </label>
        <input
          ref={ref}
          id={inputId}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          aria-invalid={error ? 'true' : undefined}
          className={`w-full px-3 py-2.5 rounded-md border-2 bg-white text-gray-900 border-gray-300 hover:border-gray-400 focus:border-[#a855f7] focus:outline-none focus:ring-4 focus:ring-[#a855f7]/20 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all ${error ? 'border-[#be185d] focus:border-[#be185d] focus:ring-pink-200/50' : ''} ${className}`}
          {...props}
        />
        {hint && !error && <p id={`${inputId}-hint`} className="text-xs text-gray-700">{hint}</p>}
        {error && <p id={`${inputId}-error`} className="text-xs text-[#be185d]" role="alert">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
  onSubmit?: () => void;
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, hint, id, className = '', onSubmit, ...props }, ref) => {
    const inputId = id || label.toLowerCase().replace(/\s+/g, '-');
    
    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && onSubmit) {
        e.preventDefault();
        onSubmit();
      }
    };
    
    return (
      <div className="space-y-1">
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-900">
          {label}
          {props.required && <span className="text-[#be185d] ml-0.5">*</span>}
        </label>
        <textarea
          ref={ref}
          id={inputId}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          aria-invalid={error ? 'true' : undefined}
          onKeyDown={handleKeyDown}
          className={`w-full px-3 py-2.5 rounded-md border-2 bg-white text-gray-900 border-gray-300 hover:border-gray-400 focus:border-[#a855f7] focus:outline-none focus:ring-4 focus:ring-[#a855f7]/20 disabled:bg-gray-100 disabled:cursor-not-allowed resize-y min-h-[60px] transition-all ${error ? 'border-[#be185d] focus:border-[#be185d] focus:ring-pink-200/50' : ''} ${className}`}
          {...props}
        />
        {hint && !error && <p id={`${inputId}-hint`} className="text-xs text-gray-700">{hint}</p>}
        {error && <p id={`${inputId}-error`} className="text-xs text-[#be185d]" role="alert">{error}</p>}
      </div>
    );
  }
);
TextArea.displayName = 'TextArea';

export { Input, TextArea };

