import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createMockPrisma } from '../../__mocks__/prisma.js';
import { mockEditorSettings } from '../../__fixtures__/editor-settings.js';
import { server } from '../../__mocks__/server.js';

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

describe('api.create-project.jsx', () => {
    let loader, action, options;
    let mockPrisma;

    beforeEach(async () => {
        vi.clearAllMocks();

        // Re-create fetch mock in case it was overwritten
        global.fetch = createFetchMock();

        // Import after mock
        const module = await import('../../../app/routes/api.create-project.jsx');
        loader = module.loader;
        action = module.action;
        options = module.options;

        // Get mocked prisma
        const prismaModule = await import('../../../app/db.server.js');
        mockPrisma = prismaModule.default;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('loader', () => {
        it('should return error when shop parameter is missing', async () => {
            const request = new Request('http://localhost/api/create-project');
            const response = await loader({ request });
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.success).toBe(false);
            expect(data.error).toBe('Shop parameter is required');
        });

        it('should return error when editor settings are incomplete', async () => {
            mockPrisma.editorSettings.findUnique.mockResolvedValue({
                shop: 'test-shop.myshopify.com',
                editorApiKey: null,
                editorDomain: null,
                editorCustomerId: null,
            });

            const request = new Request('http://localhost/api/create-project?shop=test-shop.myshopify.com');
            const response = await loader({ request });
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.success).toBe(false);
            expect(data.error).toContain('Editor settings not configured');
        });

        it('should create project successfully with valid settings', async () => {
            mockPrisma.editorSettings.findUnique.mockResolvedValue(mockEditorSettings);

            // Mock successful API response
            global.fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: new Headers({ 'content-type': 'application/json' }),
                text: async () => JSON.stringify({
                    success: true,
                    data: { projectid: 'project-123' },
                }),
            });

            const request = new Request('http://localhost/api/create-project?shop=test-shop.myshopify.com');
            const response = await loader({ request });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.projectId).toBe('project-123');
            expect(global.fetch).toHaveBeenCalled();
        });

        it('should handle API errors gracefully', async () => {
            mockPrisma.editorSettings.findUnique.mockResolvedValue(mockEditorSettings);

            // Mock API error
            global.fetch.mockRejectedValueOnce(new Error('Network error'));

            const request = new Request('http://localhost/api/create-project?shop=test-shop.myshopify.com');
            const response = await loader({ request });
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.success).toBe(false);
            expect(data.error).toContain('Failed to create project');
        });
    });

    describe('action', () => {
        it('should return error for non-POST requests', async () => {
            const request = new Request('http://localhost/api/create-project', {
                method: 'GET',
            });
            const response = await action({ request });
            const data = await response.json();

            expect(response.status).toBe(405);
            expect(data.success).toBe(false);
            expect(data.error).toBe('Method not allowed');
        });

        it('should create project with POST and overrides', async () => {
            mockPrisma.editorSettings.findUnique.mockResolvedValue(mockEditorSettings);

            global.fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: new Headers({ 'content-type': 'application/json' }),
                text: async () => JSON.stringify({
                    success: true,
                    data: { projectid: 'project-456' },
                }),
            });

            const request = new Request('http://localhost/api/create-project?shop=test-shop.myshopify.com', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    overrides: {
                        templateId: 'custom-template',
                        projectName: 'Custom Project',
                    },
                }),
            });
            const response = await action({ request });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.projectId).toBe('project-456');
        });

        it('should handle invalid JSON payload', async () => {
            const request = new Request('http://localhost/api/create-project?shop=test-shop.myshopify.com', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: 'invalid json',
            });
            const response = await action({ request });
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.success).toBe(false);
            expect(data.error).toBe('Invalid JSON payload');
        });
    });

    describe('options', () => {
        it('should return CORS headers for OPTIONS request', async () => {
            const response = await options();

            expect(response.status).toBe(200);
            expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
            expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
            expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
        });
    });
});
