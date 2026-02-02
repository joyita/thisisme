// src/__tests__/context/PassportContext.test.tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PassportProvider, usePassport } from '@/context/PassportContext';
import { AuthProvider } from '@/context/AuthContext';

// Create mock functions
const mockPassportList = jest.fn();
const mockPassportGet = jest.fn();
const mockPassportCreate = jest.fn();
const mockPassportUpdate = jest.fn();
const mockPassportAddSection = jest.fn();
const mockPassportUpdateSection = jest.fn();
const mockPassportDeleteSection = jest.fn();
const mockGetTokens = jest.fn();

// Mock storage module
jest.mock('@/lib/storage', () => ({
  cachePassport: jest.fn(),
  getCachedPassport: jest.fn().mockReturnValue(null),
  clearPassportCache: jest.fn(),
  addPendingChange: jest.fn(),
  getPendingChanges: jest.fn().mockReturnValue([]),
  clearPendingChanges: jest.fn(),
}));

// Mock the API module
jest.mock('@/lib/api', () => ({
  passportApi: {
    list: () => mockPassportList(),
    get: (id: string) => mockPassportGet(id),
    create: (...args: any[]) => mockPassportCreate(...args),
    update: (...args: any[]) => mockPassportUpdate(...args),
    addSection: (...args: any[]) => mockPassportAddSection(...args),
    updateSection: (...args: any[]) => mockPassportUpdateSection(...args),
    deleteSection: (...args: any[]) => mockPassportDeleteSection(...args),
  },
  authApi: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
  },
  getTokens: () => mockGetTokens(),
  setTokens: jest.fn(),
  clearTokens: jest.fn(),
}));

// Test component that uses the passport context
function TestComponent() {
  const {
    passports,
    currentPassport,
    isLoading,
    error,
    loadPassport,
    createPassport,
    addSection,
    updateSection,
    deleteSection,
  } = usePassport();

  const handleLoadPassport = async () => {
    try {
      await loadPassport('test-id');
    } catch {
      // Error is handled by context
    }
  };

  const handleCreate = async () => {
    try {
      await createPassport('New Child', '2020-01-01');
    } catch {
      // Error is handled by context
    }
  };

  const handleAddSection = async () => {
    try {
      await addSection('test-id', 'LOVES', 'Music');
    } catch {
      // Error is handled by context
    }
  };

  const handleUpdateSection = async () => {
    try {
      await updateSection('test-id', 'section-1', { content: 'Updated content' });
    } catch {
      // Error is handled by context
    }
  };

  const handleDeleteSection = async () => {
    try {
      await deleteSection('test-id', 'section-1');
    } catch {
      // Error is handled by context
    }
  };

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'ready'}</div>
      <div data-testid="error">{error || 'no-error'}</div>
      <div data-testid="passport-count">{passports.length}</div>
      <div data-testid="current-passport">
        {currentPassport ? currentPassport.childFirstName : 'none'}
      </div>
      <div data-testid="sections">
        {currentPassport ? Object.values(currentPassport.sections || {}).flat().length : 0}
      </div>
      <button onClick={handleLoadPassport}>Load Passport</button>
      <button onClick={handleCreate}>Create</button>
      <button onClick={handleAddSection}>Add Section</button>
      <button onClick={handleUpdateSection}>Update Section</button>
      <button onClick={handleDeleteSection}>Delete Section</button>
    </div>
  );
}

// Wrapper with both providers
function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PassportProvider>{children}</PassportProvider>
    </AuthProvider>
  );
}

describe('PassportContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock unauthenticated state by default
    mockGetTokens.mockReturnValue(null);
    mockPassportList.mockResolvedValue([]);
    (window.localStorage.getItem as jest.Mock).mockReturnValue(null);
  });

  test('provides initial empty state when not authenticated', async () => {
    render(
      <Wrapper>
        <TestComponent />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    });

    expect(screen.getByTestId('passport-count')).toHaveTextContent('0');
    expect(screen.getByTestId('current-passport')).toHaveTextContent('none');
  });

  test('loadPassport fetches and sets current passport', async () => {
    const mockPassport = {
      id: 'test-id',
      childFirstName: 'Alice',
      sections: { LOVES: [{ id: 's1', type: 'LOVES', content: 'Dinosaurs', visibilityLevel: 'ALL' }] },
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    };
    mockPassportGet.mockResolvedValue(mockPassport);

    render(
      <Wrapper>
        <TestComponent />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    });

    const user = userEvent.setup();
    await user.click(screen.getByText('Load Passport'));

    await waitFor(() => {
      expect(screen.getByTestId('current-passport')).toHaveTextContent('Alice');
    });

    expect(screen.getByTestId('sections')).toHaveTextContent('1');
    expect(mockPassportGet).toHaveBeenCalledWith('test-id');
  });

  test('createPassport creates and sets new passport', async () => {
    const mockPassport = {
      id: 'new-passport',
      childFirstName: 'New Child',
      sections: {},
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    };
    mockPassportCreate.mockResolvedValue(mockPassport);

    render(
      <Wrapper>
        <TestComponent />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    });

    const user = userEvent.setup();
    await user.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(screen.getByTestId('current-passport')).toHaveTextContent('New Child');
    });

    expect(mockPassportCreate).toHaveBeenCalledWith('New Child', '2020-01-01', true);
  });

  test('addSection adds section to current passport', async () => {
    const mockPassport = {
      id: 'test-id',
      childFirstName: 'Alice',
      sections: {},
      permissions: [],
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    };
    const mockSection = {
      id: 'new-section',
      type: 'LOVES',
      content: 'Music',
      visibilityLevel: 'ALL',
      createdAt: '2025-01-01',
    };

    mockPassportGet.mockResolvedValue(mockPassport);
    mockPassportAddSection.mockResolvedValue(mockSection);

    render(
      <Wrapper>
        <TestComponent />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    });

    const user = userEvent.setup();

    // Load passport first
    await user.click(screen.getByText('Load Passport'));
    await waitFor(() => {
      expect(screen.getByTestId('current-passport')).toHaveTextContent('Alice');
    });

    // Add section
    await user.click(screen.getByText('Add Section'));

    await waitFor(() => {
      expect(screen.getByTestId('sections')).toHaveTextContent('1');
    });

    expect(mockPassportAddSection).toHaveBeenCalledWith('test-id', 'LOVES', 'Music', undefined, undefined);
  });

  test('updateSection updates section in current passport', async () => {
    const mockPassport = {
      id: 'test-id',
      childFirstName: 'Alice',
      sections: { LOVES: [{ id: 'section-1', type: 'LOVES', content: 'Original', visibilityLevel: 'ALL' }] },
      permissions: [],
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    };
    const updatedSection = {
      id: 'section-1',
      type: 'LOVES',
      content: 'Updated content',
      visibilityLevel: 'ALL',
      createdAt: '2025-01-01',
    };

    mockPassportGet.mockResolvedValue(mockPassport);
    mockPassportUpdateSection.mockResolvedValue(updatedSection);

    render(
      <Wrapper>
        <TestComponent />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    });

    const user = userEvent.setup();

    // Load passport first
    await user.click(screen.getByText('Load Passport'));
    await waitFor(() => {
      expect(screen.getByTestId('current-passport')).toHaveTextContent('Alice');
    });

    // Update section
    await user.click(screen.getByText('Update Section'));

    await waitFor(() => {
      expect(mockPassportUpdateSection).toHaveBeenCalledWith('test-id', 'section-1', { content: 'Updated content' });
    });
  });

  test('deleteSection removes section from current passport', async () => {
    const mockPassport = {
      id: 'test-id',
      childFirstName: 'Alice',
      sections: { LOVES: [{ id: 'section-1', type: 'LOVES', content: 'To delete', visibilityLevel: 'ALL' }] },
      permissions: [],
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    };

    mockPassportGet.mockResolvedValue(mockPassport);
    mockPassportDeleteSection.mockResolvedValue(undefined);

    render(
      <Wrapper>
        <TestComponent />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    });

    const user = userEvent.setup();

    // Load passport first
    await user.click(screen.getByText('Load Passport'));
    await waitFor(() => {
      expect(screen.getByTestId('sections')).toHaveTextContent('1');
    });

    // Delete section
    await user.click(screen.getByText('Delete Section'));

    await waitFor(() => {
      expect(screen.getByTestId('sections')).toHaveTextContent('0');
    });

    expect(mockPassportDeleteSection).toHaveBeenCalledWith('test-id', 'section-1');
  });

  test('sets error when API call fails', async () => {
    mockPassportGet.mockRejectedValueOnce({ message: 'Failed to load' });

    render(
      <Wrapper>
        <TestComponent />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    });

    const user = userEvent.setup();
    await user.click(screen.getByText('Load Passport'));

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Failed to load');
    });
  });
});

describe('usePassport hook', () => {
  test('throws error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('usePassport must be used within a PassportProvider');

    consoleSpy.mockRestore();
  });
});
