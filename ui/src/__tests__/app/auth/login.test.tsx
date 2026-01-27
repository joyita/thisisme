// src/__tests__/app/auth/login.test.tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '@/app/auth/login/page';
import { AuthProvider } from '@/context/AuthContext';
import { PassportProvider } from '@/context/PassportContext';
import { authApi } from '@/lib/api';

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
  usePathname: () => '/auth/login',
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PassportProvider>{children}</PassportProvider>
    </AuthProvider>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (require('@/lib/api').getTokens as jest.Mock).mockReturnValue(null);
    (window.localStorage.getItem as jest.Mock).mockReturnValue(null);
  });

  test('renders login form', async () => {
    render(
      <Wrapper>
        <LoginPage />
      </Wrapper>
    );

    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(screen.getByLabelText(/Email address/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
  });

  test('email input has required attribute', () => {
    render(
      <Wrapper>
        <LoginPage />
      </Wrapper>
    );

    expect(screen.getByLabelText(/Email address/)).toBeRequired();
  });

  test('password input has required attribute', () => {
    render(
      <Wrapper>
        <LoginPage />
      </Wrapper>
    );

    expect(screen.getByLabelText(/Password/)).toBeRequired();
  });

  test('calls login API with credentials', async () => {
    const mockResponse = {
      userId: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      accessToken: 'token',
      refreshToken: 'refresh',
      expiresAt: '2099-12-31',
    };
    (authApi.login as jest.Mock).mockResolvedValueOnce(mockResponse);

    render(
      <Wrapper>
        <LoginPage />
      </Wrapper>
    );

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Email address/), 'test@example.com');
    await user.type(screen.getByLabelText(/Password/), 'password123');
    await user.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  test('redirects to dashboard on successful login', async () => {
    const mockResponse = {
      userId: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      accessToken: 'token',
      refreshToken: 'refresh',
      expiresAt: '2099-12-31',
    };
    (authApi.login as jest.Mock).mockResolvedValueOnce(mockResponse);

    render(
      <Wrapper>
        <LoginPage />
      </Wrapper>
    );

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Email address/), 'test@example.com');
    await user.type(screen.getByLabelText(/Password/), 'password123');
    await user.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  test('shows error message on login failure', async () => {
    const error = { message: 'Invalid credentials' };
    (authApi.login as jest.Mock).mockRejectedValueOnce(error);

    render(
      <Wrapper>
        <LoginPage />
      </Wrapper>
    );

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Email address/), 'test@example.com');
    await user.type(screen.getByLabelText(/Password/), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials');
    });
  });

  test('has link to register page', () => {
    render(
      <Wrapper>
        <LoginPage />
      </Wrapper>
    );

    const registerLink = screen.getByRole('link', { name: /Create one/i });
    expect(registerLink).toHaveAttribute('href', '/auth/register');
  });

  test('disables submit button while loading', async () => {
    // Create a promise that we can resolve manually
    let resolveLogin: (value: any) => void;
    const loginPromise = new Promise((resolve) => {
      resolveLogin = resolve;
    });
    (authApi.login as jest.Mock).mockReturnValueOnce(loginPromise);

    render(
      <Wrapper>
        <LoginPage />
      </Wrapper>
    );

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Email address/), 'test@example.com');
    await user.type(screen.getByLabelText(/Password/), 'password123');
    await user.click(screen.getByRole('button', { name: /Sign In/i }));

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByRole('button')).toHaveTextContent(/Signing in/i);
    });

    // Resolve the promise
    resolveLogin!({
      userId: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      accessToken: 'token',
      refreshToken: 'refresh',
      expiresAt: '2099-12-31',
    });
  });
});
