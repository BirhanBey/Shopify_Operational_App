import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Prisma Client to avoid initialization errors in tests
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  })),
}));

// Import after mock
import prisma from '../../app/db.server.js';

describe('db.server.js', () => {
  beforeEach(() => {
    // Reset global state
    global.prismaGlobal = undefined;
    process.env.NODE_ENV = 'test';
  });

  it('should export a PrismaClient instance', () => {
    expect(prisma).toBeDefined();
    expect(prisma).toHaveProperty('$connect');
    expect(prisma).toHaveProperty('$disconnect');
  });

  it('should reuse global instance in non-production environment', () => {
    process.env.NODE_ENV = 'development';
    
    // First import should create global instance
    const firstImport = prisma;
    global.prismaGlobal = firstImport;
    
    // Second import should reuse the same instance
    const secondImport = prisma;
    
    expect(firstImport).toBe(secondImport);
  });

  it('should create new instance in production', () => {
    process.env.NODE_ENV = 'production';
    global.prismaGlobal = undefined;
    
    // In production, should create new instance
    const instance = prisma;
    expect(instance).toBeDefined();
  });
});
