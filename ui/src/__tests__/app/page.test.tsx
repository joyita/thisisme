// src/__tests__/app/page.test.tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import HomePage from '@/app/page';
import { AuthProvider } from '@/context/AuthContext';
import { PassportProvider } from '@/context/PassportContext';

// Mock the API module
jest.mock('@/lib/api', () => ({
  authApi: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
  },
  passportApi: {
    list: jest.fn().mockResolvedValue([]),
  },
  getTokens: jest.fn(),
  setTokens: jest.fn(),
  clearTokens: jest.fn(),
}));

// Mock useRouter
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
  }),
  usePathname: () => '/',
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PassportProvider>{children}</PassportProvider>
    </AuthProvider>
  );
}

describe('HomePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (require('@/lib/api').getTokens as jest.Mock).mockReturnValue(null);
    (window.localStorage.getItem as jest.Mock).mockReturnValue(null);
  });

  test('renders landing page when not authenticated', async () => {
    render(
      <Wrapper>
        <HomePage />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('ThisIsMe')).toBeInTheDocument();
    });

    expect(screen.getByText('Get Started Free')).toBeInTheDocument();
    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });

  test('displays features section', async () => {
    render(
      <Wrapper>
        <HomePage />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Passport Documents')).toBeInTheDocument();
    });

    expect(screen.getByText('Secure Sharing')).toBeInTheDocument();
    expect(screen.getByText('Timeline Tracking')).toBeInTheDocument();
    expect(screen.getByText('Document Storage')).toBeInTheDocument();
  });

  test('displays UK GDPR compliance section', async () => {
    render(
      <Wrapper>
        <HomePage />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Built for UK Families')).toBeInTheDocument();
    });

    expect(screen.getByText(/UK GDPR compliant/)).toBeInTheDocument();
    expect(screen.getByText(/Age Appropriate Design Code/)).toBeInTheDocument();
  });

  test('redirects to dashboard when authenticated', async () => {
    const tokens = { accessToken: 'token', refreshToken: 'refresh', expiresAt: '2099-12-31' };
    const storedUser = { id: 'user-1', name: 'Test User', email: 'test@example.com' };

    (require('@/lib/api').getTokens as jest.Mock).mockReturnValue(tokens);
    (window.localStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === 'user_info') return JSON.stringify(storedUser);
      return null;
    });

    render(
      <Wrapper>
        <HomePage />
      </Wrapper>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });
});
