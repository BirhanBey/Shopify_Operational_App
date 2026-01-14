import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Prisma to avoid initialization errors
import { createMockPrisma } from '../__mocks__/prisma.js';

vi.mock('../../app/db.server.js', () => ({
  default: createMockPrisma(),
}));

// Set required environment variables for Shopify app
process.env.SHOPIFY_APP_URL = process.env.SHOPIFY_APP_URL || 'https://test-app.myshopify.com';
process.env.SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY || 'test-api-key';
process.env.SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET || 'test-api-secret';
process.env.SCOPES = process.env.SCOPES || 'read_products,write_products';

describe('shopify.server.js', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure environment variables are set
    process.env.SHOPIFY_APP_URL = process.env.SHOPIFY_APP_URL || 'https://test-app.myshopify.com';
    process.env.SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY || 'test-api-key';
    process.env.SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET || 'test-api-secret';
  });

  it('should export shopify app instance', async () => {
    const shopify = await import('../../app/shopify.server.js');
    expect(shopify.default).toBeDefined();
  });

  it('should export authentication functions', async () => {
    const shopify = await import('../../app/shopify.server.js');
    expect(shopify.authenticate).toBeDefined();
    expect(shopify.unauthenticated).toBeDefined();
    expect(shopify.login).toBeDefined();
  });

  it('should export session storage', async () => {
    const shopify = await import('../../app/shopify.server.js');
    expect(shopify.sessionStorage).toBeDefined();
  });

  it('should export webhook registration', async () => {
    const shopify = await import('../../app/shopify.server.js');
    expect(shopify.registerWebhooks).toBeDefined();
  });

  it('should export API version', async () => {
    const shopify = await import('../../app/shopify.server.js');
    expect(shopify.apiVersion).toBeDefined();
  });
});
