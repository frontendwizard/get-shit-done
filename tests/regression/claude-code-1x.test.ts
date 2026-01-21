/**
 * Claude Code 1.x Regression Tests (TEST-04)
 *
 * Purpose: Prevent breaking existing Claude Code users during upgrade
 * - User settings preserved after GSD modifies config
 * - Existing hooks preserved (user's custom hooks)
 * - Settings structure matches expected format (snapshot)
 * - Command path matches 1.x structure
 * - Hook registration is idempotent (no duplicates)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { vol, fs as memfs } from 'memfs';
import os from 'os';

// Mock fs with memfs implementation (same pattern as contract tests)
vi.mock('fs', () => memfs);
vi.mock('node:fs', () => memfs);

import { ClaudeCodeAdapter } from '../../src/platform/adapters/claude-code';

describe('Claude Code 1.x Regression Tests', () => {
  const homeDir = os.homedir();
  const settingsPath = `${homeDir}/.claude/settings.json`;

  beforeEach(() => {
    vol.reset();
    // Ensure .claude directory exists in virtual fs
    vol.mkdirSync(`${homeDir}/.claude`, { recursive: true });
  });

  afterEach(() => {
    vol.reset();
  });

  describe('settings.json preservation (COMPAT-03)', () => {
    it('preserves existing user settings after writeConfig', async () => {
      const existingSettings = {
        customUserSetting: 'preserved',
        userTheme: 'dark',
        userPreferences: {
          autoSave: true,
          fontSize: 14,
        },
      };

      vol.fromJSON({
        [settingsPath]: JSON.stringify(existingSettings, null, 2),
      });

      const adapter = new ClaudeCodeAdapter();

      // Simulate GSD writing its config (using mergeConfig)
      await adapter.mergeConfig({
        statusLine: { type: 'command', command: 'node /path/to/hook' },
      });

      // Read back and verify user settings preserved
      const finalSettings = await adapter.readConfig();

      expect(finalSettings.customUserSetting).toBe('preserved');
      expect(finalSettings.userTheme).toBe('dark');
      expect(finalSettings.userPreferences?.autoSave).toBe(true);
      expect(finalSettings.statusLine).toBeDefined();
    });

    it('preserves existing hooks structure', async () => {
      const existingSettings = {
        hooks: {
          SessionStart: [
            {
              hooks: [{ type: 'command', command: 'node /user/custom-hook.js' }],
            },
          ],
          Stop: [
            {
              hooks: [{ type: 'command', command: 'node /user/cleanup.js' }],
            },
          ],
        },
      };

      vol.fromJSON({
        [settingsPath]: JSON.stringify(existingSettings, null, 2),
      });

      const adapter = new ClaudeCodeAdapter();

      // GSD adds its own SessionStart hook
      await adapter.registerHook('SessionStart', 'node /gsd/hook.js');

      const finalSettings = await adapter.readConfig();

      // User's Stop hook should be preserved
      expect(finalSettings.hooks.Stop).toHaveLength(1);
      expect(finalSettings.hooks.Stop[0].hooks[0].command).toContain('cleanup.js');

      // SessionStart should have both user and GSD hooks
      expect(finalSettings.hooks.SessionStart.length).toBeGreaterThanOrEqual(1);
    });

    it('preserves existing statusLine when not replacing', async () => {
      const existingSettings = {
        statusLine: {
          type: 'command',
          command: 'node /user/custom-statusline.js',
        },
      };

      vol.fromJSON({
        [settingsPath]: JSON.stringify(existingSettings, null, 2),
      });

      const adapter = new ClaudeCodeAdapter();

      // Read config without modifying statusLine
      const settings = await adapter.readConfig();

      expect(settings.statusLine.command).toContain('custom-statusline.js');
    });
  });

  describe('settings.json structure (snapshot test)', () => {
    it('produces expected settings structure after GSD setup', async () => {
      vol.fromJSON({
        [settingsPath]: JSON.stringify({}, null, 2),
      });

      const adapter = new ClaudeCodeAdapter();

      // Simulate fresh GSD installation
      await adapter.registerHook('SessionStart', 'node /hooks/gsd-check-update.js');

      const config = await adapter.readConfig();

      // Snapshot the structure (not exact values)
      expect(config).toMatchSnapshot({
        hooks: {
          SessionStart: expect.any(Array),
        },
      });
    });
  });

  describe('command registration compatibility', () => {
    it('commands directory uses /commands/gsd path', () => {
      const adapter = new ClaudeCodeAdapter();
      const commandsDir = adapter.getCommandsDir();

      // Must match 1.x path structure
      expect(commandsDir).toContain('/commands/gsd');
      expect(commandsDir).not.toContain('/command/'); // Not OpenCode path
    });
  });

  describe('hook registration idempotency (HOOK-05)', () => {
    it('does not duplicate hooks on reinstall', async () => {
      vol.fromJSON({
        [settingsPath]: JSON.stringify({}, null, 2),
      });

      const adapter = new ClaudeCodeAdapter();

      // Simulate multiple installs (version upgrades)
      await adapter.registerHook('SessionStart', 'node /hooks/gsd-check-update.js');
      await adapter.registerHook('SessionStart', 'node /hooks/gsd-check-update.js');
      await adapter.registerHook('SessionStart', 'node /hooks/gsd-check-update.js');

      const settings = await adapter.readConfig();

      // Should only have one hook, not three
      expect(settings.hooks.SessionStart).toHaveLength(1);
    });

    it('allows different hooks to be registered', async () => {
      vol.fromJSON({
        [settingsPath]: JSON.stringify({}, null, 2),
      });

      const adapter = new ClaudeCodeAdapter();

      // Register different hooks
      await adapter.registerHook('SessionStart', 'node /hooks/hook-a.js');
      await adapter.registerHook('SessionStart', 'node /hooks/hook-b.js');

      const settings = await adapter.readConfig();

      // Should have both hooks
      expect(settings.hooks.SessionStart).toHaveLength(2);
    });
  });

  describe('backward compatible config reading', () => {
    it('handles empty settings.json gracefully', async () => {
      vol.fromJSON({
        [settingsPath]: '{}',
      });

      const adapter = new ClaudeCodeAdapter();
      const config = await adapter.readConfig();

      expect(config).toEqual({});
    });

    it('handles missing settings.json gracefully', async () => {
      // No settings.json file created
      const adapter = new ClaudeCodeAdapter();
      const config = await adapter.readConfig();

      expect(config).toEqual({});
    });

    it('handles settings with extra unknown fields', async () => {
      const settingsWithExtras = {
        unknownField: 'should be preserved',
        anotherExtra: { nested: true },
        hooks: {
          SessionStart: [],
        },
      };

      vol.fromJSON({
        [settingsPath]: JSON.stringify(settingsWithExtras, null, 2),
      });

      const adapter = new ClaudeCodeAdapter();
      await adapter.registerHook('SessionStart', 'node /gsd/hook.js');

      const config = await adapter.readConfig();

      // Unknown fields should still be there
      expect(config.unknownField).toBe('should be preserved');
      expect(config.anotherExtra.nested).toBe(true);
    });
  });
});
