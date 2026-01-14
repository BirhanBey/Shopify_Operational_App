import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockPrisma } from '../../__mocks__/prisma.js';
import { mockGraphQLResponse } from '../../__fixtures__/variant-metafields.js';
import { mockShopifyApp } from '../../__mocks__/shopify.server.js';

// Mock Prisma
vi.mock('../../../app/db.server.js', () => ({
  default: createMockPrisma(),
}));

// Mock Shopify server
vi.mock('../../../app/shopify.server.js', () => ({
  default: mockShopifyApp,
  authenticate: mockShopifyApp.authenticate,
  sessionStorage: mockShopifyApp.sessionStorage,
}));

describe('api.variant-metafields.jsx', () => {
  let loader;
  let mockPrisma;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Import after mock
    const module = await import('../../../app/routes/api.variant-metafields.jsx');
    loader = module.loader;
    
    // Get mocked prisma
    const prismaModule = await import('../../../app/db.server.js');
    mockPrisma = prismaModule.default;

    // Setup default mocks
    mockShopifyApp.authenticate.admin.mockResolvedValue({
      admin: {
        graphql: vi.fn().mockResolvedValue({
          json: async () => mockGraphQLResponse,
        }),
      },
      session: { shop: 'test-shop.myshopify.com' },
    });
  });

  it('should return error when shop parameter is missing', async () => {
    const request = new Request('http://localhost/api/variant-metafields?handle=test-product');
    const response = await loader({ request });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Shop parameter is required');
  });

  it('should return error when handle parameter is missing', async () => {
    const request = new Request('http://localhost/api/variant-metafields?shop=test-shop.myshopify.com');
    const response = await loader({ request });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Product handle parameter is required');
  });

  it('should fetch and return variant metafields successfully', async () => {
    const request = new Request('http://localhost/api/variant-metafields?shop=test-shop.myshopify.com&handle=test-product');
    const response = await loader({ request });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.variantMetafields).toBeDefined();
    expect(mockShopifyApp.authenticate.admin).toHaveBeenCalled();
  });

  it('should handle authentication failure and try session storage', async () => {
    mockShopifyApp.authenticate.admin.mockRejectedValueOnce(new Error('Auth failed'));
    mockShopifyApp.sessionStorage.findSessionsByShop.mockResolvedValueOnce([
      { shop: 'test-shop.myshopify.com' },
    ]);

    // Mock GraphQL client
    const mockGraphQLClient = {
      graphql: vi.fn().mockResolvedValue({
        json: async () => mockGraphQLResponse,
      }),
    };
    mockShopifyApp.clients.Graphql.mockReturnValue(mockGraphQLClient);

    const request = new Request('http://localhost/api/variant-metafields?shop=test-shop.myshopify.com&handle=test-product');
    const response = await loader({ request });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockShopifyApp.sessionStorage.findSessionsByShop).toHaveBeenCalledWith('test-shop.myshopify.com');
  });

  it('should return empty metafields when session not found', async () => {
    mockShopifyApp.authenticate.admin.mockRejectedValueOnce(new Error('Auth failed'));
    mockShopifyApp.sessionStorage.findSessionsByShop.mockResolvedValueOnce([]);

    const request = new Request('http://localhost/api/variant-metafields?shop=test-shop.myshopify.com&handle=test-product');
    const response = await loader({ request });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.variantMetafields).toEqual({});
    expect(data.warning).toContain('Session not found');
  });

  it('should handle GraphQL errors', async () => {
    mockShopifyApp.authenticate.admin.mockResolvedValue({
      admin: {
        graphql: vi.fn().mockResolvedValue({
          json: async () => ({
            errors: [{ message: 'GraphQL error' }],
          }),
        }),
      },
      session: { shop: 'test-shop.myshopify.com' },
    });

    const request = new Request('http://localhost/api/variant-metafields?shop=test-shop.myshopify.com&handle=test-product');
    const response = await loader({ request });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Failed to fetch product data');
  });

  it('should include CORS headers', async () => {
    const request = new Request('http://localhost/api/variant-metafields?shop=test-shop.myshopify.com&handle=test-product');
    const response = await loader({ request });

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});
