/**
 * OpenCode Adapter Contract Tests
 *
 * Verifies OpenCodeAdapter implements PlatformAdapter interface correctly:
 * 1. Runs shared contract tests (interface compliance)
 * 2. Platform-specific behavior tests (capabilities, config format, graceful degradation)
 *
 * IMPORTANT: These tests use a real temp directory to avoid polluting
 * the developer's actual config. We set OPENCODE_CONFIG env var to redirect
 * the adapter to use our temp directory.
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import { OpenCodeAdapter } from '../../src/platform/adapters/opencode';

// Use a unique temp directory for ALL tests to avoid touching real config
let testTmpDir: string;
let originalOpenCodeConfig: string | undefined;

beforeAll(() => {
  // Save original env
  originalOpenCodeConfig = process.env.OPENCODE_CONFIG;
  
  // Create isolated temp directory
  testTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-opencode-test-'));
  
  // Point OpenCode adapter to our temp directory
  process.env.OPENCODE_CONFIG = path.join(testTmpDir, 'opencode.json');
});

afterAll(() => {
  // Restore original env
  if (originalOpenCodeConfig !== undefined) {
    process.env.OPENCODE_CONFIG = originalOpenCodeConfig;
  } else {
    delete process.env.OPENCODE_CONFIG;
  }
  
  // Clean up temp directory
  if (testTmpDir && fs.existsSync(testTmpDir)) {
    fs.rmSync(testTmpDir, { recursive: true });
  }
});

// OpenCode-specific behavior tests
describe('OpenCodeAdapter - Platform-Specific Behavior', () => {
  let adapter: OpenCodeAdapter;
  let configDir: string;
  let configPath: string;

  beforeEach(() => {
    // Each test gets a fresh adapter pointing to temp dir
    configDir = testTmpDir;
    configPath = path.join(configDir, 'opencode.json');
    
    // Clean up any existing config
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
    
    adapter = new OpenCodeAdapter();
  });

  afterEach(() => {
    // Clean up after each test
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
    const jsoncPath = path.join(configDir, 'opencode.jsonc');
    if (fs.existsSync(jsoncPath)) {
      fs.unlinkSync(jsoncPath);
    }
  });

  // =========================================================================
  // Capabilities - OpenCode specific (hooks and statusline not supported)
  // =========================================================================
  describe('capabilities', () => {
    it('supportsParallelAgents() returns true', () => {
      expect(adapter.supportsParallelAgents()).toBe(true);
    });

    it('supportsStatusLine() returns false', () => {
      expect(adapter.supportsStatusLine()).toBe(false);
    });

    it('supportsHooks() returns false', () => {
      expect(adapter.supportsHooks()).toBe(false);
    });
  });

  // =========================================================================
  // Platform Identity
  // =========================================================================
  describe('platform identity', () => {
    it('name is "opencode"', () => {
      expect(adapter.name).toBe('opencode');
    });

    it('version is defined', () => {
      expect(adapter.version).toBeDefined();
      expect(adapter.version.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Path Resolution - OpenCode specific paths
  // =========================================================================
  describe('path resolution', () => {
    it('getConfigDir() returns temp directory when OPENCODE_CONFIG is set', () => {
      const dir = adapter.getConfigDir();
      expect(dir).toBe(testTmpDir);
    });

    it('getCommandsDir() uses command (singular)', () => {
      const commandsDir = adapter.getCommandsDir();
      expect(commandsDir).toContain('/command/'); // singular
      expect(commandsDir).not.toContain('/commands/'); // not plural
    });

    it('getCommandsDir() includes /gsd namespace', () => {
      const commandsDir = adapter.getCommandsDir();
      expect(commandsDir).toContain('/gsd');
    });
  });

  // =========================================================================
  // Config Read - opencode.json and .jsonc
  // =========================================================================
  describe('readConfig', () => {
    it('returns empty object when config does not exist', async () => {
      const config = await adapter.readConfig();
      expect(config).toEqual({});
    });

    it('reads opencode.json', async () => {
      fs.writeFileSync(configPath, JSON.stringify({ existing: 'value' }));
      const config = await adapter.readConfig();
      expect(config).toEqual({ existing: 'value' });
    });

    it('reads opencode.jsonc (fallback)', async () => {
      const jsoncPath = path.join(configDir, 'opencode.jsonc');
      fs.writeFileSync(jsoncPath, '{ "key": "value" }');
      const config = await adapter.readConfig();
      expect(config).toEqual({ key: 'value' });
    });

    it('prefers .json over .jsonc when both exist', async () => {
      const jsoncPath = path.join(configDir, 'opencode.jsonc');
      fs.writeFileSync(configPath, JSON.stringify({ source: 'json' }));
      fs.writeFileSync(jsoncPath, '{ "source": "jsonc" }');
      const config = await adapter.readConfig();
      expect(config.source).toBe('json');
    });

    it('handles JSONC comments in .jsonc file', async () => {
      const jsoncPath = path.join(configDir, 'opencode.jsonc');
      fs.writeFileSync(jsoncPath, `{
        // This is a comment
        "key": "value"
        /* Block comment */
      }`);
      const config = await adapter.readConfig();
      expect(config.key).toBe('value');
    });
  });

  // =========================================================================
  // Config Write - always writes JSON (not JSONC)
  // =========================================================================
  describe('writeConfig', () => {
    it('writes to opencode.json (not jsonc)', async () => {
      await adapter.writeConfig({ written: 'by-test' });
      const content = fs.readFileSync(configPath, 'utf8');
      expect(JSON.parse(content)).toEqual({ written: 'by-test' });
    });

    it('creates directory if not exists', async () => {
      // Use a subdirectory that doesn't exist
      const subDir = path.join(testTmpDir, 'subdir');
      const subConfigPath = path.join(subDir, 'opencode.json');
      process.env.OPENCODE_CONFIG = subConfigPath;
      
      const subAdapter = new OpenCodeAdapter();
      await subAdapter.writeConfig({ nested: true });
      
      expect(fs.existsSync(subConfigPath)).toBe(true);
      
      // Clean up
      fs.rmSync(subDir, { recursive: true });
      process.env.OPENCODE_CONFIG = configPath;
    });

    it('formats JSON with indentation', async () => {
      await adapter.writeConfig({ key: 'value' });
      const content = fs.readFileSync(configPath, 'utf8');
      // Should have newlines from pretty-printing
      expect(content).toContain('\n');
    });
  });

  // =========================================================================
  // Config Merge
  // =========================================================================
  describe('mergeConfig', () => {
    it('merges updates into existing config', async () => {
      fs.writeFileSync(configPath, JSON.stringify({ existing: true, keep: 'this' }));
      await adapter.mergeConfig({ new: 'value' });
      const config = await adapter.readConfig();
      expect(config.existing).toBe(true);
      expect(config.keep).toBe('this');
      expect(config.new).toBe('value');
    });

    it('overwrites existing keys with updates', async () => {
      fs.writeFileSync(configPath, JSON.stringify({ key: 'old' }));
      await adapter.mergeConfig({ key: 'new' });
      const config = await adapter.readConfig();
      expect(config.key).toBe('new');
    });
  });

  // =========================================================================
  // Hook Registration - Graceful Degradation (silent no-op)
  // =========================================================================
  describe('registerHook (graceful degradation)', () => {
    it('returns silently without error', async () => {
      // Should not throw, should not modify config
      await expect(adapter.registerHook('SessionStart', '/path')).resolves.toBeUndefined();
    });

    it('does not modify config', async () => {
      fs.writeFileSync(configPath, JSON.stringify({ existing: true }));
      await adapter.registerHook('SessionStart', '/path');
      const config = await adapter.readConfig();
      expect(config.hooks).toBeUndefined(); // No hooks added
      expect(config.existing).toBe(true); // Original data preserved
    });
  });

  // =========================================================================
  // Unregister Hook - Graceful Degradation
  // =========================================================================
  describe('unregisterHook (graceful degradation)', () => {
    it('returns silently without error', async () => {
      await expect(adapter.unregisterHook('SessionStart')).resolves.toBeUndefined();
    });

    it('does not modify config', async () => {
      fs.writeFileSync(configPath, JSON.stringify({ existing: true }));
      await adapter.unregisterHook('SessionStart');
      const config = await adapter.readConfig();
      expect(config.existing).toBe(true); // Original data preserved
    });
  });

  // =========================================================================
  // Agent Spawning - file validation (spawn itself requires real CLI)
  // =========================================================================
  describe('spawnAgent', () => {
    it('throws error when agent file does not exist', async () => {
      await expect(adapter.spawnAgent('/nonexistent/agent.md')).rejects.toThrow(
        'Agent file not found'
      );
    });

    // Note: Testing actual spawn would require mocking child_process
    // and the opencode CLI, which is out of scope for contract tests.
    // The contract test verifies file validation behavior.
  });
});
