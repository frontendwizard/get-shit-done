import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import { ClaudeCodePaths, OpenCodePaths } from '../../../src/platform/paths';

describe('ClaudeCodePaths', () => {
  const originalEnv = process.env;
  const homeDir = os.homedir();

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.CLAUDE_CONFIG_DIR;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getConfigDir', () => {
    it('returns ~/.claude by default', () => {
      const paths = new ClaudeCodePaths();
      expect(paths.getConfigDir()).toBe(path.join(homeDir, '.claude'));
    });

    it('respects CLAUDE_CONFIG_DIR env var', () => {
      process.env.CLAUDE_CONFIG_DIR = '/custom/claude';
      const paths = new ClaudeCodePaths();
      expect(paths.getConfigDir()).toBe('/custom/claude');
    });

    it('expands tilde in CLAUDE_CONFIG_DIR', () => {
      process.env.CLAUDE_CONFIG_DIR = '~/custom-claude';
      const paths = new ClaudeCodePaths();
      expect(paths.getConfigDir()).toBe(path.join(homeDir, 'custom-claude'));
    });
  });

  describe('getCommandsDir', () => {
    it('returns {configDir}/commands/gsd', () => {
      const paths = new ClaudeCodePaths();
      expect(paths.getCommandsDir()).toBe(path.join(homeDir, '.claude', 'commands', 'gsd'));
    });

    it('uses custom configDir when CLAUDE_CONFIG_DIR is set', () => {
      process.env.CLAUDE_CONFIG_DIR = '/custom/claude';
      const paths = new ClaudeCodePaths();
      expect(paths.getCommandsDir()).toBe('/custom/claude/commands/gsd');
    });
  });

  describe('getAgentsDir', () => {
    it('returns {configDir}/agents', () => {
      const paths = new ClaudeCodePaths();
      expect(paths.getAgentsDir()).toBe(path.join(homeDir, '.claude', 'agents'));
    });
  });

  describe('getHooksDir', () => {
    it('returns {configDir}/hooks', () => {
      const paths = new ClaudeCodePaths();
      expect(paths.getHooksDir()).toBe(path.join(homeDir, '.claude', 'hooks'));
    });
  });

  describe('platform identifier', () => {
    it('has name property set to claude-code', () => {
      const paths = new ClaudeCodePaths();
      expect(paths.name).toBe('claude-code');
    });
  });

  describe('all paths are absolute', () => {
    it('never returns relative paths', () => {
      const paths = new ClaudeCodePaths();
      expect(paths.getConfigDir()).toMatch(/^\//);
      expect(paths.getCommandsDir()).toMatch(/^\//);
      expect(paths.getAgentsDir()).toMatch(/^\//);
      expect(paths.getHooksDir()).toMatch(/^\//);
    });

    it('never contains tilde', () => {
      const paths = new ClaudeCodePaths();
      expect(paths.getConfigDir()).not.toContain('~');
      expect(paths.getCommandsDir()).not.toContain('~');
      expect(paths.getAgentsDir()).not.toContain('~');
      expect(paths.getHooksDir()).not.toContain('~');
    });

    it('returns absolute paths even with tilde in env var', () => {
      process.env.CLAUDE_CONFIG_DIR = '~/custom-claude';
      const paths = new ClaudeCodePaths();
      expect(paths.getConfigDir()).toMatch(/^\//);
      expect(paths.getConfigDir()).not.toContain('~');
    });
  });
});

describe('OpenCodePaths', () => {
  const originalEnv = process.env;
  const homeDir = os.homedir();

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.OPENCODE_CONFIG;
    delete process.env.XDG_CONFIG_HOME;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getConfigDir', () => {
    it('returns ~/.config/opencode by default', () => {
      const paths = new OpenCodePaths();
      expect(paths.getConfigDir()).toBe(path.join(homeDir, '.config', 'opencode'));
    });

    it('respects XDG_CONFIG_HOME', () => {
      process.env.XDG_CONFIG_HOME = '/custom/config';
      const paths = new OpenCodePaths();
      expect(paths.getConfigDir()).toBe('/custom/config/opencode');
    });

    it('respects OPENCODE_CONFIG (uses dirname)', () => {
      process.env.OPENCODE_CONFIG = '/custom/path/opencode.json';
      const paths = new OpenCodePaths();
      expect(paths.getConfigDir()).toBe('/custom/path');
    });

    it('OPENCODE_CONFIG takes priority over XDG_CONFIG_HOME', () => {
      process.env.XDG_CONFIG_HOME = '/xdg/config';
      process.env.OPENCODE_CONFIG = '/opencode/path/opencode.json';
      const paths = new OpenCodePaths();
      expect(paths.getConfigDir()).toBe('/opencode/path');
    });
  });

  describe('getCommandsDir', () => {
    it('returns {configDir}/command/gsd (singular command)', () => {
      const paths = new OpenCodePaths();
      // Note: OpenCode uses 'command' singular, not 'commands'
      expect(paths.getCommandsDir()).toBe(path.join(homeDir, '.config', 'opencode', 'command', 'gsd'));
    });

    it('uses custom configDir when XDG_CONFIG_HOME is set', () => {
      process.env.XDG_CONFIG_HOME = '/custom/config';
      const paths = new OpenCodePaths();
      expect(paths.getCommandsDir()).toBe('/custom/config/opencode/command/gsd');
    });
  });

  describe('getAgentsDir', () => {
    it('returns {configDir}/agents', () => {
      const paths = new OpenCodePaths();
      expect(paths.getAgentsDir()).toBe(path.join(homeDir, '.config', 'opencode', 'agents'));
    });
  });

  describe('getHooksDir', () => {
    it('returns {configDir}/hooks', () => {
      const paths = new OpenCodePaths();
      expect(paths.getHooksDir()).toBe(path.join(homeDir, '.config', 'opencode', 'hooks'));
    });
  });

  describe('platform identifier', () => {
    it('has name property set to opencode', () => {
      const paths = new OpenCodePaths();
      expect(paths.name).toBe('opencode');
    });
  });

  describe('all paths are absolute', () => {
    it('never returns relative paths', () => {
      const paths = new OpenCodePaths();
      expect(paths.getConfigDir()).toMatch(/^\//);
      expect(paths.getCommandsDir()).toMatch(/^\//);
      expect(paths.getAgentsDir()).toMatch(/^\//);
      expect(paths.getHooksDir()).toMatch(/^\//);
    });

    it('never contains tilde', () => {
      const paths = new OpenCodePaths();
      expect(paths.getConfigDir()).not.toContain('~');
      expect(paths.getCommandsDir()).not.toContain('~');
      expect(paths.getAgentsDir()).not.toContain('~');
      expect(paths.getHooksDir()).not.toContain('~');
    });
  });

  describe('directory naming convention', () => {
    it('uses singular "command" not plural "commands"', () => {
      const paths = new OpenCodePaths();
      const commandsDir = paths.getCommandsDir();
      expect(commandsDir).toContain('/command/');
      expect(commandsDir).not.toMatch(/\/commands\//);
    });
  });
});
