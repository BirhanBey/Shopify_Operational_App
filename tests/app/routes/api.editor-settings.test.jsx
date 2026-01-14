import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockPrisma } from '../../__mocks__/prisma.js';
import { mockEditorSettings, mockEditorSettingsMissing } from '../../__fixtures__/editor-settings.js';

// Mock Prisma
vi.mock('../../../app/db.server.js', () => ({
  default: createMockPrisma(),
}));

describe('api.editor-settings.jsx', () => {
  let loader;
  let mockPrisma;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Import after mock
    const module = await import('../../../app/routes/api.editor-settings.jsx');
    loader = module.loader;
    
    // Get mocked prisma
    const prismaModule = await import('../../../app/db.server.js');
    mockPrisma = prismaModule.default;
  });

  it('should return settings when shop parameter is provided', async () => {
    mockPrisma.editorSettings.findUnique.mockResolvedValue(mockEditorSettings);

    const request = new Request('http://localhost/api/editor-settings?shop=test-shop.myshopify.com');
    const response = await loader({ request });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.settings).toEqual(mockEditorSettings);
    expect(mockPrisma.editorSettings.findUnique).toHaveBeenCalledWith({
      where: { shop: 'test-shop.myshopify.com' },
      select: {
        editorApiKey: true,
        editorDomain: true,
        editorCustomerId: true,
      },
    });
  });

  it('should return error when shop parameter is missing', async () => {
    const request = new Request('http://localhost/api/editor-settings');
    const response = await loader({ request });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Shop parameter is required');
  });

  it('should return null settings when no settings found', async () => {
    mockPrisma.editorSettings.findUnique.mockResolvedValue(mockEditorSettingsMissing);

    const request = new Request('http://localhost/api/editor-settings?shop=test-shop.myshopify.com');
    const response = await loader({ request });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.settings).toEqual({
      editorApiKey: null,
      editorDomain: null,
      editorCustomerId: null,
    });
  });

  it('should handle database errors', async () => {
    mockPrisma.editorSettings.findUnique.mockRejectedValue(new Error('Database error'));

    const request = new Request('http://localhost/api/editor-settings?shop=test-shop.myshopify.com');
    const response = await loader({ request });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to load settings');
  });

  it('should include CORS headers', async () => {
    mockPrisma.editorSettings.findUnique.mockResolvedValue(mockEditorSettings);

    const request = new Request('http://localhost/api/editor-settings?shop=test-shop.myshopify.com');
    const response = await loader({ request });

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS');
  });

  it('should handle OPTIONS request', async () => {
    const module = await import('../../../app/routes/api.editor-settings.jsx');
    const options = module.options;
    
    const response = await options();
    
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});
