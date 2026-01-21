import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Create mock functions for fs
const mockExistsSync = vi.fn();
const mockReadFileSync = vi.fn();

// Mock fs with our spy functions
vi.mock('fs', () => ({
  default: {
    existsSync: (...args: unknown[]) => mockExistsSync(...args),
    readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
  },
  existsSync: (...args: unknown[]) => mockExistsSync(...args),
  readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
}));

import { PlatformRegistry } from '../../../src/platform/registry';
import { ClaudeCodePaths, OpenCodePaths } from '../../../src/platform/paths';

describe('PlatformRegistry', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.GSD_PLATFORM;
    mockExistsSync.mockReset();
    mockReadFileSync.mockReset();
    // Default: no files exist
    mockExistsSync.mockReturnValue(false);
    PlatformRegistry.reset(); // Clear singleton
  });

  afterEach(() => {
    process.env = originalEnv;
    PlatformRegistry.reset();
  });

  describe('getPathResolver', () => {
    it('returns ClaudeCodePaths when claude-code detected', () => {
      process.env.GSD_PLATFORM = 'claude-code';
      const resolver = PlatformRegistry.getPathResolver();
      expect(resolver.name).toBe('claude-code');
      expect(resolver).toBeInstanceOf(ClaudeCodePaths);
    });

    it('returns OpenCodePaths when opencode detected', () => {
      process.env.GSD_PLATFORM = 'opencode';
      const resolver = PlatformRegistry.getPathResolver();
      expect(resolver.name).toBe('opencode');
      expect(resolver).toBeInstanceOf(OpenCodePaths);
    });

    it('throws error when platform is unknown', () => {
      // No env var, no filesystem markers
      expect(() => PlatformRegistry.getPathResolver()).toThrow('No supported AI platform detected');
    });

    it('throws error with helpful message', () => {
      expect(() => PlatformRegistry.getPathResolver()).toThrow(/GSD_PLATFORM/);
    });
  });

  describe('singleton behavior', () => {
    it('returns same instance on multiple calls', () => {
      process.env.GSD_PLATFORM = 'claude-code';
      const first = PlatformRegistry.getPathResolver();
      const second = PlatformRegistry.getPathResolver();
      expect(first).toBe(second);
    });

    it('caches instance after first detection', () => {
      process.env.GSD_PLATFORM = 'claude-code';
      const first = PlatformRegistry.getPathResolver();

      // Change env - should still return cached instance
      process.env.GSD_PLATFORM = 'opencode';
      const second = PlatformRegistry.getPathResolver();

      expect(second.name).toBe('claude-code'); // Still cached
    });

    it('does not re-detect platform after caching', () => {
      process.env.GSD_PLATFORM = 'claude-code';
      PlatformRegistry.getPathResolver();

      // Now set opencode in env and remove claude-code
      delete process.env.GSD_PLATFORM;

      // Should still return claude-code (cached)
      const resolver = PlatformRegistry.getPathResolver();
      expect(resolver.name).toBe('claude-code');
    });
  });

  describe('reset', () => {
    it('clears cached instance', () => {
      process.env.GSD_PLATFORM = 'claude-code';
      const first = PlatformRegistry.getPathResolver();
      expect(first.name).toBe('claude-code');

      PlatformRegistry.reset();
      process.env.GSD_PLATFORM = 'opencode';
      const second = PlatformRegistry.getPathResolver();

      expect(second.name).toBe('opencode'); // Fresh detection
    });

    it('allows fresh detection after reset', () => {
      process.env.GSD_PLATFORM = 'opencode';
      PlatformRegistry.getPathResolver();

      PlatformRegistry.reset();

      // Remove platform env, should throw
      delete process.env.GSD_PLATFORM;
      expect(() => PlatformRegistry.getPathResolver()).toThrow();
    });
  });

  describe('setPathResolver (testing hook)', () => {
    it('allows injecting mock resolver', () => {
      const mockResolver = new ClaudeCodePaths();
      PlatformRegistry.setPathResolver(mockResolver);

      const resolver = PlatformRegistry.getPathResolver();
      expect(resolver).toBe(mockResolver);
    });

    it('injected resolver bypasses detection', () => {
      // No env set, would normally throw
      const mockResolver = new OpenCodePaths();
      PlatformRegistry.setPathResolver(mockResolver);

      // Should NOT throw, returns injected mock
      const resolver = PlatformRegistry.getPathResolver();
      expect(resolver.name).toBe('opencode');
    });

    it('injected resolver can be cleared with reset', () => {
      const mockResolver = new ClaudeCodePaths();
      PlatformRegistry.setPathResolver(mockResolver);

      PlatformRegistry.reset();

      // Now should throw since no platform
      expect(() => PlatformRegistry.getPathResolver()).toThrow();
    });
  });

  describe('factory pattern', () => {
    it('creates new ClaudeCodePaths instance for claude-code', () => {
      process.env.GSD_PLATFORM = 'claude-code';
      PlatformRegistry.reset();
      const resolver1 = PlatformRegistry.getPathResolver();

      PlatformRegistry.reset();
      const resolver2 = PlatformRegistry.getPathResolver();

      // Different instances (fresh creation after reset)
      expect(resolver1).not.toBe(resolver2);
      // But same type
      expect(resolver1).toBeInstanceOf(ClaudeCodePaths);
      expect(resolver2).toBeInstanceOf(ClaudeCodePaths);
    });

    it('creates new OpenCodePaths instance for opencode', () => {
      process.env.GSD_PLATFORM = 'opencode';
      PlatformRegistry.reset();
      const resolver1 = PlatformRegistry.getPathResolver();

      PlatformRegistry.reset();
      const resolver2 = PlatformRegistry.getPathResolver();

      expect(resolver1).not.toBe(resolver2);
      expect(resolver1).toBeInstanceOf(OpenCodePaths);
      expect(resolver2).toBeInstanceOf(OpenCodePaths);
    });
  });
});
