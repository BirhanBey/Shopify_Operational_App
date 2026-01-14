import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockPrisma } from '../../__mocks__/prisma.js';
import { mockEditorSettings } from '../../__fixtures__/editor-settings.js';
import { mockProjectDetails } from '../../__fixtures__/project-data.js';

// Mock Prisma
vi.mock('../../../app/db.server.js', () => ({
  default: createMockPrisma(),
}));

// Mock global fetch with proper mock methods
const createFetchMock = () => {
  const fetchMock = vi.fn();
  
  // Add mockResolvedValueOnce method
  fetchMock.mockResolvedValueOnce = (value) => {
    fetchMock.mockReturnValueOnce(Promise.resolve(value));
    return fetchMock;
  };
  
  // Add mockRejectedValueOnce method
  fetchMock.mockRejectedValueOnce = (value) => {
    fetchMock.mockReturnValueOnce(Promise.reject(value));
    return fetchMock;
  };
  
  // Note: mockClear is already available on vi.fn(), don't override it
  
  return fetchMock;
};

global.fetch = createFetchMock();

describe('api.project-details.jsx', () => {
  let loader;
  let mockPrisma;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Re-create fetch mock in case it was overwritten
    global.fetch = createFetchMock();
    
    // Import after mock
    const module = await import('../../../app/routes/api.project-details.jsx');
    loader = module.loader;
    
    // Get mocked prisma
    const prismaModule = await import('../../../app/db.server.js');
    mockPrisma = prismaModule.default;
  });

  it('should return error when projectId is missing', async () => {
    const request = new Request('http://localhost/api/project-details?shop=test-shop.myshopify.com');
    const response = await loader({ request });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Project ID parameter is required');
  });

  it('should return error when shop is missing', async () => {
    const request = new Request('http://localhost/api/project-details?projectid=project-123');
    const response = await loader({ request });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Shop parameter is required');
  });

  it('should return error when editor settings are not configured', async () => {
    mockPrisma.editorSettings.findUnique.mockResolvedValue(null);

    const request = new Request('http://localhost/api/project-details?projectid=project-123&shop=test-shop.myshopify.com');
    const response = await loader({ request });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Editor settings not configured');
  });

  it('should fetch and return project details successfully', async () => {
    mockPrisma.editorSettings.findUnique.mockResolvedValue(mockEditorSettings);

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockProjectDetails.project,
    });

    const request = new Request('http://localhost/api/project-details?projectid=project-123&shop=test-shop.myshopify.com');
    const response = await loader({ request });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.project).toEqual(mockProjectDetails.project);
    expect(global.fetch).toHaveBeenCalled();
  });

  it('should handle API errors', async () => {
    mockPrisma.editorSettings.findUnique.mockResolvedValue(mockEditorSettings);

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    const request = new Request('http://localhost/api/project-details?projectid=project-123&shop=test-shop.myshopify.com');
    const response = await loader({ request });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Project details API error');
  });

  it('should handle JSON parsing errors', async () => {
    mockPrisma.editorSettings.findUnique.mockResolvedValue(mockEditorSettings);

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error('Invalid JSON');
      },
    });

    const request = new Request('http://localhost/api/project-details?projectid=project-123&shop=test-shop.myshopify.com');
    const response = await loader({ request });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Failed to parse project details JSON');
  });

  it('should include CORS headers', async () => {
    mockPrisma.editorSettings.findUnique.mockResolvedValue(mockEditorSettings);

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockProjectDetails.project,
    });

    const request = new Request('http://localhost/api/project-details?projectid=project-123&shop=test-shop.myshopify.com');
    const response = await loader({ request });

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});
