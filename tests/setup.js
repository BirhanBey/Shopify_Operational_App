import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './__mocks__/server.js';

// Setup MSW server
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Cleanup after each test
afterEach(() => {
  cleanup();
  server.resetHandlers();
});

// Cleanup after all tests
afterAll(() => server.close());

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock window.location
delete window.location;
window.location = {
  href: 'http://localhost:3000',
  origin: 'http://localhost:3000',
  pathname: '/',
  search: '',
  hash: '',
  assign: () => {},
  replace: () => {},
  reload: () => {},
};

// Mock fetch globally if needed
import { vi } from 'vitest';

// Create a proper mock function with all necessary methods
const createFetchMock = () => {
  const fetchMock = vi.fn(() => Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    headers: new Headers(),
  }));
  
  // Add mock methods that tests expect
  fetchMock.mockResolvedValueOnce = (value) => {
    fetchMock.mockReturnValueOnce(Promise.resolve(value));
    return fetchMock;
  };
  
  fetchMock.mockRejectedValueOnce = (value) => {
    fetchMock.mockReturnValueOnce(Promise.reject(value));
    return fetchMock;
  };
  
  // Note: mockClear is already available on vi.fn()
  
  return fetchMock;
};

if (!global.fetch || typeof global.fetch.mockResolvedValueOnce !== 'function') {
  global.fetch = createFetchMock();
}
