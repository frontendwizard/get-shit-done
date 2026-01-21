/**
 * Shared Contract Tests for PlatformAdapter Implementations
 *
 * These tests verify that any adapter implementing PlatformAdapter
 * satisfies the behavioral contracts defined in adapter.ts.
 *
 * Usage:
 *   runAdapterContractTests('ClaudeCodeAdapter', () => new ClaudeCodeAdapter());
 *
 * Contract requirements verified:
 * - Path methods return absolute paths (never relative)
 * - Platform identity is valid PlatformType
 * - Capability methods return booleans
 * - Async methods return Promises
 * - All interface methods exist
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PlatformAdapter } from '../../src/platform/adapter';

/**
 * Run shared contract tests against any PlatformAdapter implementation
 *
 * @param adapterName - Name for test suite display (e.g., 'ClaudeCodeAdapter')
 * @param createAdapter - Factory function returning fresh adapter instance
 */
export function runAdapterContractTests(
  adapterName: string,
  createAdapter: () => PlatformAdapter
) {
  describe(`${adapterName} - Contract Tests`, () => {
    let adapter: PlatformAdapter;

    beforeEach(() => {
      adapter = createAdapter();
    });

    // =========================================================================
    // Path Resolution Contract (from PathResolver interface)
    // =========================================================================
    describe('Path Resolution Contract', () => {
      it('getConfigDir() returns absolute path', () => {
        const configDir = adapter.getConfigDir();
        expect(configDir).toMatch(/^\//); // Starts with /
        expect(configDir).not.toContain('~'); // No unexpanded tilde
      });

      it('getCommandsDir() returns absolute path', () => {
        const commandsDir = adapter.getCommandsDir();
        expect(commandsDir).toMatch(/^\//);
        expect(commandsDir).not.toContain('~');
      });

      it('getAgentsDir() returns absolute path', () => {
        const agentsDir = adapter.getAgentsDir();
        expect(agentsDir).toMatch(/^\//);
        expect(agentsDir).not.toContain('~');
      });

      it('getHooksDir() returns absolute path', () => {
        const hooksDir = adapter.getHooksDir();
        expect(hooksDir).toMatch(/^\//);
        expect(hooksDir).not.toContain('~');
      });

      it('getCommandsDir() is under getConfigDir()', () => {
        const configDir = adapter.getConfigDir();
        const commandsDir = adapter.getCommandsDir();
        expect(commandsDir.startsWith(configDir)).toBe(true);
      });

      it('getAgentsDir() is under getConfigDir()', () => {
        const configDir = adapter.getConfigDir();
        const agentsDir = adapter.getAgentsDir();
        expect(agentsDir.startsWith(configDir)).toBe(true);
      });

      it('getHooksDir() is under getConfigDir()', () => {
        const configDir = adapter.getConfigDir();
        const hooksDir = adapter.getHooksDir();
        expect(hooksDir.startsWith(configDir)).toBe(true);
      });
    });

    // =========================================================================
    // Platform Identity Contract
    // =========================================================================
    describe('Platform Identity Contract', () => {
      it('name is a valid PlatformType', () => {
        expect(['claude-code', 'opencode']).toContain(adapter.name);
      });

      it('version is a non-empty string', () => {
        expect(typeof adapter.version).toBe('string');
        expect(adapter.version.length).toBeGreaterThan(0);
      });
    });

    // =========================================================================
    // Capability Contract
    // =========================================================================
    describe('Capability Contract', () => {
      it('supportsParallelAgents() returns boolean', () => {
        expect(typeof adapter.supportsParallelAgents()).toBe('boolean');
      });

      it('supportsStatusLine() returns boolean', () => {
        expect(typeof adapter.supportsStatusLine()).toBe('boolean');
      });

      it('supportsHooks() returns boolean', () => {
        expect(typeof adapter.supportsHooks()).toBe('boolean');
      });
    });

    // =========================================================================
    // Config Methods Contract (async signature)
    // =========================================================================
    describe('Config Methods Contract', () => {
      it('readConfig() returns a Promise', async () => {
        const result = adapter.readConfig();
        expect(result).toBeInstanceOf(Promise);
        // Await to prevent unhandled rejections (may fail without mocks, that's ok)
        await result.catch(() => {});
      });

      it('writeConfig() returns a Promise', async () => {
        const result = adapter.writeConfig({});
        expect(result).toBeInstanceOf(Promise);
        // Await to prevent unhandled rejections (may fail without fs setup)
        await result.catch(() => {});
      });

      it('mergeConfig() returns a Promise', async () => {
        const result = adapter.mergeConfig({});
        expect(result).toBeInstanceOf(Promise);
        // Await to prevent unhandled rejections (may fail without fs setup)
        await result.catch(() => {});
      });
    });

    // =========================================================================
    // Hook Methods Contract (async signature)
    // =========================================================================
    describe('Hook Methods Contract', () => {
      it('registerHook() returns a Promise', async () => {
        const result = adapter.registerHook('SessionStart', '/path/to/hook');
        expect(result).toBeInstanceOf(Promise);
        // Await to prevent unhandled rejections
        await result.catch(() => {});
      });

      it('unregisterHook() returns a Promise', async () => {
        const result = adapter.unregisterHook('SessionStart');
        expect(result).toBeInstanceOf(Promise);
        // Await to prevent unhandled rejections
        await result.catch(() => {});
      });
    });

    // =========================================================================
    // Agent Methods Contract (method existence)
    // =========================================================================
    describe('Agent Methods Contract', () => {
      // Note: spawnAgent requires file to exist, tested separately with mocks
      it('spawnAgent method exists and is a function', () => {
        expect(typeof adapter.spawnAgent).toBe('function');
      });
    });

    // =========================================================================
    // Command Methods Contract (method existence)
    // =========================================================================
    describe('Command Methods Contract', () => {
      it('registerCommand method exists and is a function', () => {
        expect(typeof adapter.registerCommand).toBe('function');
      });

      it('unregisterCommand method exists and is a function', () => {
        expect(typeof adapter.unregisterCommand).toBe('function');
      });
    });
  });
}
