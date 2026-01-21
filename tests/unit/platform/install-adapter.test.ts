import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import { getInstallPaths } from '../../../src/platform/install-adapter';

describe('getInstallPaths', () => {
  const originalEnv = process.env;
  const originalCwd = process.cwd;
  const homeDir = os.homedir();

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.CLAUDE_CONFIG_DIR;
    delete process.env.OPENCODE_CONFIG;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('global installation - Claude Code (default)', () => {
    it('returns correct paths for global install', () => {
      const paths = getInstallPaths(true, null, 'claude-code');

      expect(paths.configDir).toBe(path.join(homeDir, '.claude'));
      expect(paths.commandsDir).toBe(path.join(homeDir, '.claude', 'commands', 'gsd'));
      expect(paths.agentsDir).toBe(path.join(homeDir, '.claude', 'agents'));
      expect(paths.hooksDir).toBe(path.join(homeDir, '.claude', 'hooks'));
      expect(paths.pathPrefix).toBe('~/.claude/');
    });

    it('uses explicitConfigDir when provided', () => {
      const paths = getInstallPaths(true, '/custom/claude', 'claude-code');

      expect(paths.configDir).toBe('/custom/claude');
      expect(paths.commandsDir).toBe('/custom/claude/commands/gsd');
      expect(paths.pathPrefix).toBe('/custom/claude/');
    });

    it('expands tilde in explicitConfigDir', () => {
      const paths = getInstallPaths(true, '~/custom-claude', 'claude-code');

      expect(paths.configDir).toBe(path.join(homeDir, 'custom-claude'));
    });
  });

  describe('global installation - OpenCode', () => {
    it('returns correct paths for global install', () => {
      const paths = getInstallPaths(true, null, 'opencode');

      expect(paths.configDir).toBe(path.join(homeDir, '.config', 'opencode'));
      expect(paths.commandsDir).toBe(path.join(homeDir, '.config', 'opencode', 'command', 'gsd'));
      expect(paths.agentsDir).toBe(path.join(homeDir, '.config', 'opencode', 'agents'));
      expect(paths.hooksDir).toBe(path.join(homeDir, '.config', 'opencode', 'hooks'));
    });

    it('uses command (singular) not commands (plural)', () => {
      const paths = getInstallPaths(true, null, 'opencode');

      expect(paths.commandsDir).toContain('/command/');
      expect(paths.commandsDir).not.toContain('/commands/');
    });

    it('ignores explicitConfigDir for OpenCode', () => {
      // explicitConfigDir only applies to Claude Code (CLAUDE_CONFIG_DIR)
      const paths = getInstallPaths(true, '/custom/path', 'opencode');

      // Should use default OpenCode path, not the explicit one
      expect(paths.configDir).toBe(path.join(homeDir, '.config', 'opencode'));
    });
  });

  describe('local installation - Claude Code', () => {
    it('returns .claude in current directory', () => {
      const cwd = process.cwd();
      const paths = getInstallPaths(false, null, 'claude-code');

      expect(paths.configDir).toBe(path.join(cwd, '.claude'));
      expect(paths.commandsDir).toBe(path.join(cwd, '.claude', 'commands', 'gsd'));
      expect(paths.pathPrefix).toBe('./.claude/');
    });
  });

  describe('local installation - OpenCode', () => {
    it('returns .opencode in current directory', () => {
      const cwd = process.cwd();
      const paths = getInstallPaths(false, null, 'opencode');

      expect(paths.configDir).toBe(path.join(cwd, '.opencode'));
      expect(paths.commandsDir).toBe(path.join(cwd, '.opencode', 'command', 'gsd'));
      expect(paths.pathPrefix).toBe('./.opencode/');
    });
  });

  describe('backward compatibility', () => {
    it('defaults to claude-code when platform not specified', () => {
      const paths = getInstallPaths(true, null);

      expect(paths.configDir).toBe(path.join(homeDir, '.claude'));
    });
  });
});
