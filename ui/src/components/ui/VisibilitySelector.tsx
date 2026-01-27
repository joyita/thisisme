// src/components/ui/VisibilitySelector.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { MdLock, MdPeople, MdPublic, MdSettings, MdKeyboardArrowDown } from 'react-icons/md';
import { VisibilityLevel } from '@/lib/types';
import { VISIBILITY_CONFIG } from '@/lib/constants';

interface VisibilitySelectorProps {
  value: VisibilityLevel;
  onChange: (value: VisibilityLevel) => void;
  disabled?: boolean;
  hideCustom?: boolean;
}

const iconMap = {
  lock: MdLock,
  users: MdPeople,
  globe: MdPublic,
  settings: MdSettings,
};

export function VisibilitySelector({ value, onChange, disabled, hideCustom }: VisibilitySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const options = Object.entries(VISIBILITY_CONFIG)
    .filter(([key]) => !hideCustom || key !== 'CUSTOM')
    .map(([key, config]) => ({
      value: key as VisibilityLevel,
      ...config,
    }));

  const selectedOption = options.find(opt => opt.value === value) || options[0];
  const Icon = iconMap[selectedOption.icon as keyof typeof iconMap];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-md border-2 bg-white text-left transition-all ${
          disabled
            ? 'border-gray-200 bg-gray-100 cursor-not-allowed'
            : 'border-gray-300 hover:border-gray-400 focus:border-purple-500 focus:outline-none'
        }`}
      >
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-gray-500" />
          <span className="text-gray-900">{selectedOption.label}</span>
        </div>
        <MdKeyboardArrowDown className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {options.map(option => {
            const OptionIcon = iconMap[option.icon as keyof typeof iconMap];
            const isSelected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-purple-50 transition-colors ${
                  isSelected ? 'bg-purple-50' : ''
                }`}
              >
                <OptionIcon className={`w-5 h-5 mt-0.5 ${isSelected ? 'text-purple-600' : 'text-gray-500'}`} />
                <div>
                  <p className={`font-medium ${isSelected ? 'text-purple-700' : 'text-gray-900'}`}>
                    {option.label}
                  </p>
                  <p className="text-xs text-gray-500">{option.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
