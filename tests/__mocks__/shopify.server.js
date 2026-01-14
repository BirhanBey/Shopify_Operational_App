import { vi } from 'vitest';

// Mock Shopify server functions
export const mockAuthenticate = {
  admin: vi.fn(),
  public: vi.fn(),
};

export const mockUnauthenticated = vi.fn();

export const mockLogin = vi.fn();

export const mockRegisterWebhooks = vi.fn();

export const mockSessionStorage = {
  findSessionsByShop: vi.fn(),
  storeSession: vi.fn(),
  deleteSession: vi.fn(),
};

export const mockShopifyApp = {
  authenticate: mockAuthenticate,
  unauthenticated: mockUnauthenticated,
  login: mockLogin,
  registerWebhooks: mockRegisterWebhooks,
  sessionStorage: mockSessionStorage,
  addDocumentResponseHeaders: vi.fn(),
  clients: {
    Graphql: vi.fn(),
    Rest: vi.fn(),
  },
};

export default mockShopifyApp;
