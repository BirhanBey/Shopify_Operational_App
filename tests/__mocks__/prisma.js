import { vi } from 'vitest';

// Mock Prisma Client with all required models
export const mockPrismaClient = {
  editorSettings: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  session: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  $connect: vi.fn(),
  $disconnect: vi.fn(),
};

// Default mock implementation
export const createMockPrisma = (overrides = {}) => {
  return {
    ...mockPrismaClient,
    ...overrides,
  };
};

export default mockPrismaClient;
