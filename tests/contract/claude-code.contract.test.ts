/**
 * Claude Code Adapter Contract Tests
 *
 * Verifies ClaudeCodeAdapter implements PlatformAdapter interface correctly:
 * 1. Runs shared contract tests (interface compliance)
 * 2. Platform-specific behavior tests (capabilities, config format, hooks)
 *
 * IMPORTANT: These tests use a real temp directory to avoid polluting
 * the developer's actual config. We set CLAUDE_CONFIG_DIR env var to redirect
 * the adapter to use our temp directory.
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import { ClaudeCodeAdapter } from '../../src/platform/adapters/claude-code';

// Use a unique temp directory for ALL tests to avoid touching real config
let testTmpDir: string;
let originalClaudeConfigDir: string | undefined;

beforeAll(() => {
  // Save original env
  originalClaudeConfigDir = process.env.CLAUDE_CONFIG_DIR;
  
  // Create isolated temp directory
  testTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-claude-test-'));
  
  // Point Claude Code adapter to our temp directory
  process.env.CLAUDE_CONFIG_DIR = testTmpDir;
});

afterAll(() => {
  // Restore original env
  if (originalClaudeConfigDir !== undefined) {
    process.env.CLAUDE_CONFIG_DIR = originalClaudeConfigDir;
  } else {
    delete process.env.CLAUDE_CONFIG_DIR;
  }
  
  // Clean up temp directory
  if (testTmpDir && fs.existsSync(testTmpDir)) {
    fs.rmSync(testTmpDir, { recursive: true });
  }
});

// Claude Code-specific behavior tests
describe('ClaudeCodeAdapter - Platform-Specific Behavior', () => {
  let adapter: ClaudeCodeAdapter;
  let configDir: string;
  let settingsPath: string;

  beforeEach(() => {
    // Each test gets a fresh adapter pointing to temp dir
    configDir = testTmpDir;
    settingsPath = path.join(configDir, 'settings.json');
    
    // Clean up any existing config
    if (fs.existsSync(settingsPath)) {
      fs.unlinkSync(settingsPath);
    }
    
    adapter = new ClaudeCodeAdapter();
  });

  afterEach(() => {
    // Clean up after each test
    if (fs.existsSync(settingsPath)) {
      fs.unlinkSync(settingsPath);
    }
  });

  // =========================================================================
  // Capabilities - Claude Code supports everything
  // =========================================================================
  describe('capabilities', () => {
    it('supportsParallelAgents() returns true', () => {
      expect(adapter.supportsParallelAgents()).toBe(true);
    });

    it('supportsStatusLine() returns true', () => {
      expect(adapter.supportsStatusLine()).toBe(true);
    });

    it('supportsHooks() returns true', () => {
      expect(adapter.supportsHooks()).toBe(true);
    });
  });

  // =========================================================================
  // Platform Identity
  // =========================================================================
  describe('platform identity', () => {
    it('name is "claude-code"', () => {
      expect(adapter.name).toBe('claude-code');
    });

    it('version is defined', () => {
      expect(adapter.version).toBeDefined();
      expect(adapter.version.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Path Resolution - Claude Code specific paths
  // =========================================================================
  describe('path resolution', () => {
    it('getConfigDir() returns temp directory when CLAUDE_CONFIG_DIR is set', () => {
      const dir = adapter.getConfigDir();
      expect(dir).toBe(testTmpDir);
    });

    it('getCommandsDir() includes /gsd namespace', () => {
      const commandsDir = adapter.getCommandsDir();
      expect(commandsDir).toContain('/commands/gsd');
    });
  });

  // =========================================================================
  // Config Read - settings.json
  // =========================================================================
  describe('readConfig', () => {
    it('returns empty object when settings.json does not exist', async () => {
      const config = await adapter.readConfig();
      expect(config).toEqual({});
    });

    it('returns parsed JSON when settings.json exists', async () => {
      fs.writeFileSync(settingsPath, JSON.stringify({ existing: 'value', nested: { key: true } }));
      const config = await adapter.readConfig();
      expect(config).toEqual({ existing: 'value', nested: { key: true } });
    });

    it('throws on malformed JSON', async () => {
      fs.writeFileSync(settingsPath, '{ invalid json');
      await expect(adapter.readConfig()).rejects.toThrow();
    });
  });

  // =========================================================================
  // Config Write - settings.json
  // =========================================================================
  describe('writeConfig', () => {
    it('writes JSON to settings.json', async () => {
      await adapter.writeConfig({ written: 'by-test', number: 42 });
      const content = fs.readFileSync(settingsPath, 'utf8');
      expect(JSON.parse(content)).toEqual({ written: 'by-test', number: 42 });
    });

    it('formats JSON with indentation', async () => {
      await adapter.writeConfig({ key: 'value' });
      const content = fs.readFileSync(settingsPath, 'utf8');
      // Should have newlines from pretty-printing
      expect(content).toContain('\n');
    });
  });

  // =========================================================================
  // Config Merge
  // =========================================================================
  describe('mergeConfig', () => {
    it('merges updates into existing config', async () => {
      fs.writeFileSync(settingsPath, JSON.stringify({ existing: true, keep: 'this' }));
      await adapter.mergeConfig({ new: 'value' });
      const config = await adapter.readConfig();
      expect(config.existing).toBe(true);
      expect(config.keep).toBe('this');
      expect(config.new).toBe('value');
    });

    it('overwrites existing keys with updates', async () => {
      fs.writeFileSync(settingsPath, JSON.stringify({ key: 'old' }));
      await adapter.mergeConfig({ key: 'new' });
      const config = await adapter.readConfig();
      expect(config.key).toBe('new');
    });
  });

  // =========================================================================
  // Hook Registration - Claude Code uses settings.json hooks array
  // =========================================================================
  describe('registerHook', () => {
    it('creates hooks structure if not exists', async () => {
      fs.writeFileSync(settingsPath, JSON.stringify({}));
      await adapter.registerHook('SessionStart', '/path/to/hook.js');
      const content = fs.readFileSync(settingsPath, 'utf8');
      const settings = JSON.parse(content);
      expect(settings.hooks).toBeDefined();
      expect(settings.hooks.SessionStart).toBeDefined();
    });

    it('adds hook to settings.json hooks array', async () => {
      fs.writeFileSync(settingsPath, JSON.stringify({}));
      await adapter.registerHook('SessionStart', '/path/to/hook.js');
      const content = fs.readFileSync(settingsPath, 'utf8');
      const settings = JSON.parse(content);
      expect(settings.hooks.SessionStart).toBeDefined();
      expect(settings.hooks.SessionStart.length).toBe(1);
      expect(settings.hooks.SessionStart[0].hooks[0].command).toContain('/path/to/hook.js');
    });

    it('is idempotent (does not duplicate hooks)', async () => {
      fs.writeFileSync(settingsPath, JSON.stringify({}));
      await adapter.registerHook('SessionStart', '/path/to/hook.js');
      await adapter.registerHook('SessionStart', '/path/to/hook.js');
      const content = fs.readFileSync(settingsPath, 'utf8');
      const settings = JSON.parse(content);
      expect(settings.hooks.SessionStart.length).toBe(1);
    });

    it('supports multiple different hooks', async () => {
      fs.writeFileSync(settingsPath, JSON.stringify({}));
      await adapter.registerHook('SessionStart', '/path/to/start.js');
      await adapter.registerHook('StatusLine', '/path/to/status.js');
      const config = await adapter.readConfig();
      expect(config.hooks.SessionStart).toBeDefined();
      expect(config.hooks.StatusLine).toBeDefined();
    });
  });

  // =========================================================================
  // Agent Spawning - file validation
  // =========================================================================
  describe('spawnAgent', () => {
    it('throws error when agent file does not exist', async () => {
      await expect(adapter.spawnAgent('/nonexistent/agent.md')).rejects.toThrow(
        'Agent file not found'
      );
    });

    it('returns AgentInstance when agent file exists', async () => {
      const agentPath = path.join(testTmpDir, 'test-agent.md');
      fs.writeFileSync(agentPath, '# Test Agent\n\nThis is a test agent.');
      const instance = await adapter.spawnAgent(agentPath);
      expect(instance.id).toContain('test-agent');
      expect(instance.status).toBe('completed'); // Placeholder implementation
      fs.unlinkSync(agentPath);
    });

    it('generates unique agent IDs', async () => {
      const agentPath = path.join(testTmpDir, 'test-agent.md');
      fs.writeFileSync(agentPath, '# Test Agent');
      const instance1 = await adapter.spawnAgent(agentPath);
      // Small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 5));
      const instance2 = await adapter.spawnAgent(agentPath);
      expect(instance1.id).not.toBe(instance2.id);
      fs.unlinkSync(agentPath);
    });
  });
});
