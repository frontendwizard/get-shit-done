/**
 * OpenCode Adapter Contract Tests
 *
 * Verifies OpenCodeAdapter implements PlatformAdapter interface correctly:
 * 1. Runs shared contract tests (interface compliance)
 * 2. Platform-specific behavior tests (capabilities, config format, graceful degradation)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { vol, fs as memfs } from 'memfs';
import os from 'os';

// Mock fs with memfs implementation
vi.mock('fs', () => memfs);
vi.mock('node:fs', () => memfs);

import { OpenCodeAdapter } from '../../src/platform/adapters/opencode';
import { runAdapterContractTests } from './adapter.contract';

// Run shared contract tests - verifies interface compliance
runAdapterContractTests('OpenCodeAdapter', () => new OpenCodeAdapter());

// OpenCode-specific behavior tests
describe('OpenCodeAdapter - Platform-Specific Behavior', () => {
  let adapter: OpenCodeAdapter;
  const homeDir = os.homedir();
  const configDir = `${homeDir}/.config/opencode`;
  const configPath = `${configDir}/opencode.json`;

  beforeEach(() => {
    vol.reset();
    // Initialize directory structure
    vol.mkdirSync(configDir, { recursive: true });
    adapter = new OpenCodeAdapter();
  });

  afterEach(() => {
    vol.reset();
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
    it('getConfigDir() returns ~/.config/opencode', () => {
      const dir = adapter.getConfigDir();
      expect(dir).toContain('.config/opencode');
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
      vol.writeFileSync(configPath, JSON.stringify({ existing: 'value' }));
      const config = await adapter.readConfig();
      expect(config).toEqual({ existing: 'value' });
    });

    it('reads opencode.jsonc (fallback)', async () => {
      const jsoncPath = `${configDir}/opencode.jsonc`;
      vol.writeFileSync(jsoncPath, '{ "key": "value" }');
      const config = await adapter.readConfig();
      expect(config).toEqual({ key: 'value' });
    });

    it('prefers .json over .jsonc when both exist', async () => {
      const jsoncPath = `${configDir}/opencode.jsonc`;
      vol.writeFileSync(configPath, JSON.stringify({ source: 'json' }));
      vol.writeFileSync(jsoncPath, '{ "source": "jsonc" }');
      const config = await adapter.readConfig();
      expect(config.source).toBe('json');
    });

    it('handles JSONC comments in .jsonc file', async () => {
      const jsoncPath = `${configDir}/opencode.jsonc`;
      vol.writeFileSync(jsoncPath, `{
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
      await adapter.writeConfig({ test: 'data' });
      const content = vol.readFileSync(configPath, 'utf8');
      expect(JSON.parse(content as string)).toEqual({ test: 'data' });
    });

    it('creates directory if not exists', async () => {
      vol.reset();
      await adapter.writeConfig({ test: 'data' });
      expect(vol.existsSync(configPath)).toBe(true);
    });

    it('formats JSON with indentation', async () => {
      await adapter.writeConfig({ key: 'value' });
      const content = vol.readFileSync(configPath, 'utf8') as string;
      // Should have newlines from pretty-printing
      expect(content).toContain('\n');
    });
  });

  // =========================================================================
  // Config Merge
  // =========================================================================
  describe('mergeConfig', () => {
    it('merges updates into existing config', async () => {
      vol.writeFileSync(configPath, JSON.stringify({ existing: true, keep: 'this' }));
      await adapter.mergeConfig({ new: 'value' });
      const config = await adapter.readConfig();
      expect(config.existing).toBe(true);
      expect(config.keep).toBe('this');
      expect(config.new).toBe('value');
    });

    it('overwrites existing keys with updates', async () => {
      vol.writeFileSync(configPath, JSON.stringify({ key: 'old' }));
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
      vol.writeFileSync(configPath, JSON.stringify({ existing: true }));
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
      vol.writeFileSync(configPath, JSON.stringify({ existing: true }));
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
