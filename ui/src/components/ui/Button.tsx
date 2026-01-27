// src/components/ui/Button.tsx
'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md transition-all focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm';
    
    const variants = {
      primary: 'bg-gradient-to-r from-[#a855f7] to-[#be185d] text-white hover:from-[#9333ea] hover:to-[#9f1239] hover:shadow focus-visible:outline-white active:scale-[0.98]',
      secondary: 'bg-[#be185d] text-white hover:bg-[#9f1239] hover:shadow focus-visible:outline-pink-600 active:scale-[0.98]',
      outline: 'border-2 border-gray-300 text-gray-900 bg-white hover:border-purple-300 hover:bg-purple-50 focus-visible:outline-purple-600 active:scale-[0.98]',
      ghost: 'text-gray-900 hover:bg-gray-100 focus-visible:outline-gray-600 shadow-none active:scale-[0.98]',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm min-h-[40px]',
      md: 'px-4 py-2 text-sm min-h-[44px]',
      lg: 'px-5 py-2.5 text-base min-h-[48px]',
    };

    return (
      <button ref={ref} className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} disabled={disabled} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
export { Button };

