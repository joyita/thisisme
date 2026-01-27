// src/__tests__/lib/api.test.ts
import { authApi, passportApi, setTokens, getTokens, clearTokens, ApiError } from '@/lib/api';

describe('Token Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearTokens();
    (window.localStorage.getItem as jest.Mock).mockReturnValue(null);
  });

  test('setTokens stores tokens in localStorage', () => {
    const tokens = {
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      expiresAt: '2025-12-31T23:59:59Z',
    };

    setTokens(tokens);

    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      'auth_tokens',
      JSON.stringify(tokens)
    );
  });

  test('getTokens retrieves tokens from localStorage', () => {
    const tokens = {
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      expiresAt: '2025-12-31T23:59:59Z',
    };
    (window.localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(tokens));

    const result = getTokens();

    expect(result).toEqual(tokens);
  });

  test('clearTokens removes tokens from localStorage', () => {
    clearTokens();

    expect(window.localStorage.removeItem).toHaveBeenCalledWith('auth_tokens');
  });
});

describe('Auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearTokens();
  });

  test('login sends correct request and stores tokens', async () => {
    const mockResponse = {
      accessToken: 'access-123',
      refreshToken: 'refresh-123',
      expiresAt: '2025-12-31T23:59:59Z',
      userId: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await authApi.login('test@example.com', 'password123');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/login'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
      })
    );
    expect(result.userId).toBe('user-123');
    expect(window.localStorage.setItem).toHaveBeenCalled();
  });

  test('login throws ApiError on failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ message: 'Invalid credentials' }),
    });

    await expect(authApi.login('test@example.com', 'wrong')).rejects.toThrow(ApiError);
  });

  test('register sends correct request with consent', async () => {
    const mockResponse = {
      accessToken: 'access-123',
      refreshToken: 'refresh-123',
      expiresAt: '2025-12-31T23:59:59Z',
      userId: 'user-123',
      name: 'New User',
      email: 'new@example.com',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await authApi.register('New User', 'new@example.com', 'password123', true);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/register'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          name: 'New User',
          email: 'new@example.com',
          password: 'password123',
          parentalResponsibilityConfirmed: true,
        }),
      })
    );
    expect(result.userId).toBe('user-123');
  });

  test('logout clears tokens', async () => {
    setTokens({
      accessToken: 'test-token',
      refreshToken: 'refresh-token',
      expiresAt: '2025-12-31T23:59:59Z',
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: () => Promise.resolve({}),
    });

    await authApi.logout();

    expect(window.localStorage.removeItem).toHaveBeenCalledWith('auth_tokens');
  });
});

describe('Passport API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setTokens({
      accessToken: 'test-token',
      refreshToken: 'refresh-token',
      expiresAt: '2099-12-31T23:59:59Z',
    });
  });

  test('list fetches passports with auth header', async () => {
    const mockPassports = [
      { id: 'p1', childFirstName: 'Alice', role: 'OWNER', createdAt: '2025-01-01' },
      { id: 'p2', childFirstName: 'Bob', role: 'CO_OWNER', createdAt: '2025-01-02' },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockPassports),
    });

    const result = await passportApi.list();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/passports'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    );
    expect(result).toHaveLength(2);
    expect(result[0].childFirstName).toBe('Alice');
  });

  test('create sends correct request', async () => {
    const mockPassport = {
      id: 'p-new',
      childFirstName: 'Charlie',
      sections: [],
      permissions: [],
      createdAt: '2025-01-03',
      updatedAt: '2025-01-03',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockPassport),
    });

    const result = await passportApi.create('Charlie', '2020-05-15', true);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/passports'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          childFirstName: 'Charlie',
          childDateOfBirth: '2020-05-15',
          consentGiven: true,
        }),
      })
    );
    expect(result.childFirstName).toBe('Charlie');
  });

  test('get fetches single passport', async () => {
    const mockPassport = {
      id: 'p1',
      childFirstName: 'Alice',
      sections: [{ id: 's1', type: 'LOVES', content: 'Dinosaurs' }],
      permissions: [],
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockPassport),
    });

    const result = await passportApi.get('p1');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/passports/p1'),
      expect.any(Object)
    );
    expect(result.sections).toHaveLength(1);
  });

  test('addSection sends correct request', async () => {
    const mockSection = {
      id: 's-new',
      type: 'LOVES',
      content: 'Music',
      visibilityLevel: 'ALL',
      createdAt: '2025-01-03',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockSection),
    });

    const result = await passportApi.addSection('p1', 'LOVES', 'Music', 'ALL');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/passports/p1/sections'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ type: 'LOVES', content: 'Music', visibilityLevel: 'ALL' }),
      })
    );
    expect(result.content).toBe('Music');
  });
});

describe('ApiError', () => {
  test('ApiError has correct properties', () => {
    const error = new ApiError(404, 'Not found');

    expect(error.status).toBe(404);
    expect(error.message).toBe('Not found');
    expect(error.name).toBe('ApiError');
  });
});
