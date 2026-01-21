import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as os from 'os';
import * as path from 'path';

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

// Import after mocking
import { detectPlatform } from '../../../src/platform/detection';

describe('detectPlatform', () => {
  const originalEnv = process.env;
  const homeDir = os.homedir();

  // Platform config paths
  const claudeSettingsPath = path.join(homeDir, '.claude', 'settings.json');
  const opencodeConfigPath = path.join(homeDir, '.config', 'opencode', 'opencode.json');

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.GSD_PLATFORM;
    mockExistsSync.mockReset();
    mockReadFileSync.mockReset();
    // Default: no files exist
    mockExistsSync.mockReturnValue(false);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Priority 1: Environment variable', () => {
    it('returns claude-code when GSD_PLATFORM=claude-code', () => {
      process.env.GSD_PLATFORM = 'claude-code';
      expect(detectPlatform()).toBe('claude-code');
    });

    it('returns opencode when GSD_PLATFORM=opencode', () => {
      process.env.GSD_PLATFORM = 'opencode';
      expect(detectPlatform()).toBe('opencode');
    });

    it('ignores invalid GSD_PLATFORM values', () => {
      process.env.GSD_PLATFORM = 'invalid';
      // Falls through to marker file then filesystem probing, returns unknown if no platform detected
      expect(detectPlatform()).toBe('unknown');
    });
  });

  describe('Priority 2: Marker file', () => {
    it('returns claude-code when .platform marker file contains claude-code', () => {
      // First call is marker file check (exists)
      // Second call is claude settings check (not exists)
      // Third call is opencode config check (not exists)
      mockExistsSync.mockImplementation((filePath: string) => {
        if (filePath.endsWith('.platform')) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue('claude-code');

      expect(detectPlatform()).toBe('claude-code');
    });

    it('returns opencode when .platform marker file contains opencode', () => {
      mockExistsSync.mockImplementation((filePath: string) => {
        if (filePath.endsWith('.platform')) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue('opencode');

      expect(detectPlatform()).toBe('opencode');
    });

    it('falls through when marker file has invalid content', () => {
      mockExistsSync.mockImplementation((filePath: string) => {
        if (filePath.endsWith('.platform')) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue('invalid-platform');

      // Should fall through to filesystem probing, return unknown
      expect(detectPlatform()).toBe('unknown');
    });
  });

  describe('Priority 3: Filesystem probing', () => {
    it('returns claude-code when ~/.claude/settings.json exists', () => {
      mockExistsSync.mockImplementation((filePath: string) => {
        return filePath === claudeSettingsPath;
      });
      expect(detectPlatform()).toBe('claude-code');
    });

    it('returns opencode when ~/.config/opencode/opencode.json exists', () => {
      mockExistsSync.mockImplementation((filePath: string) => {
        return filePath === opencodeConfigPath;
      });
      expect(detectPlatform()).toBe('opencode');
    });

    it('returns unknown when both platforms detected (ambiguous)', () => {
      mockExistsSync.mockImplementation((filePath: string) => {
        return filePath === claudeSettingsPath || filePath === opencodeConfigPath;
      });
      // Should warn and return unknown
      expect(detectPlatform()).toBe('unknown');
    });

    it('returns unknown when no platform config exists', () => {
      mockExistsSync.mockReturnValue(false);
      expect(detectPlatform()).toBe('unknown');
    });
  });

  describe('Edge cases', () => {
    it('env var takes priority over marker file', () => {
      process.env.GSD_PLATFORM = 'opencode';
      mockExistsSync.mockImplementation((filePath: string) => {
        if (filePath.endsWith('.platform')) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue('claude-code');

      // Env var should win
      expect(detectPlatform()).toBe('opencode');
    });

    it('marker file takes priority over filesystem probing', () => {
      mockExistsSync.mockImplementation((filePath: string) => {
        // Marker file exists with opencode
        if (filePath.endsWith('.platform')) return true;
        // Claude Code settings also exist
        if (filePath === claudeSettingsPath) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue('opencode');

      // Marker file should win over filesystem detection
      expect(detectPlatform()).toBe('opencode');
    });
  });
});
