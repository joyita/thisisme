// src/components/ui/Breadcrumb.tsx
'use client';

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center gap-1 text-sm" role="list">
        <li>
          <Link
            href="/"
            className="flex items-center gap-1 text-gray-600 hover:text-purple-700 transition-colors min-h-[44px] px-2 rounded-md hover:bg-purple-50"
            aria-label="Home"
          >
            <Home className="w-4 h-4" aria-hidden="true" />
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-1">
            <ChevronRight className="w-4 h-4 text-gray-400" aria-hidden="true" />
            {item.current ? (
              <span
                className="px-2 py-1 text-gray-900 font-medium"
                aria-current="page"
              >
                {item.label}
              </span>
            ) : item.href ? (
              <Link
                href={item.href}
                className="px-2 py-1 text-gray-600 hover:text-purple-700 transition-colors rounded-md hover:bg-purple-50 min-h-[44px] flex items-center"
              >
                {item.label}
              </Link>
            ) : (
              <span className="px-2 py-1 text-gray-600">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
