// src/__tests__/context/AuthContext.test.tsx
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '@/context/AuthContext';

// Create mock functions
const mockLogin = jest.fn();
const mockRegister = jest.fn();
const mockLogout = jest.fn();
const mockGetTokens = jest.fn();
const mockSetTokens = jest.fn();
const mockClearTokens = jest.fn();

// Mock the API module
jest.mock('@/lib/api', () => ({
  authApi: {
    login: (...args: any[]) => mockLogin(...args),
    register: (...args: any[]) => mockRegister(...args),
    logout: (...args: any[]) => mockLogout(...args),
  },
  getTokens: () => mockGetTokens(),
  setTokens: (...args: any[]) => mockSetTokens(...args),
  clearTokens: () => mockClearTokens(),
}));

// Test component that uses the auth context
function TestComponent() {
  const { user, isLoading, isAuthenticated, login, register, logout, error } = useAuth();

  const handleLogin = async () => {
    try {
      await login('test@example.com', 'password');
    } catch {
      // Error is handled by context
    }
  };

  const handleRegister = async () => {
    try {
      await register('Test', 'test@example.com', 'password', true);
    } catch {
      // Error is handled by context
    }
  };

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'ready'}</div>
      <div data-testid="authenticated">{isAuthenticated ? 'yes' : 'no'}</div>
      <div data-testid="user">{user ? user.name : 'none'}</div>
      <div data-testid="error">{error || 'no-error'}</div>
      <button onClick={handleLogin}>Login</button>
      <button onClick={handleRegister}>Register</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTokens.mockReturnValue(null);
    (window.localStorage.getItem as jest.Mock).mockReturnValue(null);
  });

  test('provides initial unauthenticated state', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    });

    expect(screen.getByTestId('authenticated')).toHaveTextContent('no');
    expect(screen.getByTestId('user')).toHaveTextContent('none');
  });

  test('login updates auth state on success', async () => {
    const mockResponse = {
      userId: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      accessToken: 'token',
      refreshToken: 'refresh',
      expiresAt: '2099-12-31',
    };
    mockLogin.mockResolvedValue(mockResponse);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    });

    const user = userEvent.setup();
    await user.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('yes');
    });

    expect(screen.getByTestId('user')).toHaveTextContent('Test User');
    expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password');
  });

  test('login sets error on failure', async () => {
    mockLogin.mockRejectedValueOnce({ message: 'Invalid credentials' });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    });

    const user = userEvent.setup();
    await user.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Invalid credentials');
    });

    expect(screen.getByTestId('authenticated')).toHaveTextContent('no');
  });

  test('register updates auth state on success', async () => {
    const mockResponse = {
      userId: 'user-new',
      name: 'Test',
      email: 'test@example.com',
      accessToken: 'token',
      refreshToken: 'refresh',
      expiresAt: '2099-12-31',
    };
    mockRegister.mockResolvedValue(mockResponse);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    });

    const user = userEvent.setup();
    await user.click(screen.getByText('Register'));

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('yes');
    });

    expect(screen.getByTestId('user')).toHaveTextContent('Test');
    expect(mockRegister).toHaveBeenCalledWith('Test', 'test@example.com', 'password', true);
  });

  test('logout clears auth state', async () => {
    const mockResponse = {
      userId: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      accessToken: 'token',
      refreshToken: 'refresh',
      expiresAt: '2099-12-31',
    };
    mockLogin.mockResolvedValue(mockResponse);
    mockLogout.mockResolvedValue(undefined);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    });

    const user = userEvent.setup();

    // Login first
    await user.click(screen.getByText('Login'));
    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('yes');
    });

    // Then logout
    await user.click(screen.getByText('Logout'));

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('no');
    });

    expect(screen.getByTestId('user')).toHaveTextContent('none');
    expect(mockClearTokens).toHaveBeenCalled();
  });

  test('restores user from localStorage on mount', async () => {
    const storedUser = { id: 'stored-user', name: 'Stored User', email: 'stored@example.com' };
    const tokens = { accessToken: 'token', refreshToken: 'refresh', expiresAt: '2099-12-31' };

    mockGetTokens.mockReturnValue(tokens);
    (window.localStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === 'user_info') return JSON.stringify(storedUser);
      return null;
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    });

    expect(screen.getByTestId('authenticated')).toHaveTextContent('yes');
    expect(screen.getByTestId('user')).toHaveTextContent('Stored User');
  });
});

describe('useAuth hook', () => {
  test('throws error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });
});
