// src/components/ui/TagInput.tsx
'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { MdClose } from 'react-icons/md';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  disabled?: boolean;
  maxTags?: number;
}

export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = 'Add tags...',
  disabled,
  maxTags = 10,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredSuggestions = suggestions.filter(
    s => s.toLowerCase().includes(inputValue.toLowerCase()) && !value.includes(s)
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !value.includes(trimmedTag) && value.length < maxTags) {
      onChange([...value, trimmedTag]);
      setInputValue('');
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (highlightedIndex >= 0 && filteredSuggestions[highlightedIndex]) {
        addTag(filteredSuggestions[highlightedIndex]);
      } else if (inputValue) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div className="space-y-1" ref={containerRef}>
      <label className="block text-sm font-medium text-gray-700">Tags</label>
      <div
        className={`flex flex-wrap gap-2 p-2 rounded-md border-2 bg-white transition-all ${
          disabled
            ? 'border-gray-200 bg-gray-100 cursor-not-allowed'
            : 'border-gray-300 focus-within:border-purple-500'
        }`}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-sm rounded-md"
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  removeTag(tag);
                }}
                className="p-0.5 hover:bg-purple-200 rounded"
              >
                <MdClose className="w-3.5 h-3.5" />
              </button>
            )}
          </span>
        ))}
        {value.length < maxTags && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={e => {
              setInputValue(e.target.value);
              setShowSuggestions(true);
              setHighlightedIndex(-1);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder={value.length === 0 ? placeholder : ''}
            disabled={disabled}
            className="flex-1 min-w-[120px] px-1 py-1 text-sm outline-none bg-transparent disabled:cursor-not-allowed"
          />
        )}
      </div>

      {showSuggestions && filteredSuggestions.length > 0 && inputValue && (
        <div className="relative">
          <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {filteredSuggestions.map((suggestion, index) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => addTag(suggestion)}
                className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                  index === highlightedIndex
                    ? 'bg-purple-100 text-purple-700'
                    : 'hover:bg-gray-50'
                }`}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Press Enter or comma to add. {value.length}/{maxTags} tags.
      </p>
    </div>
  );
}
