/**
 * Claude Code Platform Adapter (Phase 2 - Ultra-minimal implementation)
 *
 * Implements ONLY what Phase 2 needs:
 * - Path methods (delegated to ClaudeCodePaths)
 * - Basic config read/write (simple fs wrapper for settings.json)
 * - Hook registration (modify settings.json hooks array)
 *
 * Everything else stubbed with "Not implemented in Phase 2" errors.
 *
 * Target: ~120-150 lines total (no deep merge, no backup, no collision detection)
 */

import * as fs from 'fs';
import * as path from 'path';
import { PlatformAdapter, AgentInstance, HookType } from '../adapter';
import { ClaudeCodePaths } from '../paths';
import { PlatformType } from '../types';

/**
 * Ultra-minimal Claude Code adapter for Phase 2
 *
 * IMPLEMENTED:
 * - Path delegation to ClaudeCodePaths
 * - Config read/write (fs wrapper)
 * - Hook registration (array modification)
 *
 * STUBBED (Phase 4):
 * - registerCommand, unregisterCommand, unregisterHook
 * - spawnAgent
 */
export class ClaudeCodeAdapter implements PlatformAdapter {
  readonly name: PlatformType = 'claude-code';
  readonly version: string = '1.0.0';

  private paths: ClaudeCodePaths;

  constructor() {
    this.paths = new ClaudeCodePaths();
  }

  // =========================================================================
  // Path methods - Pure delegation to ClaudeCodePaths
  // =========================================================================

  getConfigDir(): string {
    return this.paths.getConfigDir();
  }

  getCommandsDir(): string {
    return this.paths.getCommandsDir();
  }

  getAgentsDir(): string {
    return this.paths.getAgentsDir();
  }

  getHooksDir(): string {
    return this.paths.getHooksDir();
  }

  // =========================================================================
  // Config read/write - Simple fs wrapper for settings.json
  // =========================================================================

  /**
   * Read Claude Code settings.json
   *
   * Returns empty object if file doesn't exist.
   * Throws if JSON is malformed.
   */
  async readConfig(): Promise<Record<string, any>> {
    const settingsPath = path.join(this.getConfigDir(), 'settings.json');
    if (!fs.existsSync(settingsPath)) {
      return {};
    }
    const content = fs.readFileSync(settingsPath, 'utf8');
    return JSON.parse(content);
  }

  /**
   * Write Claude Code settings.json
   *
   * Simple replacement - NO deep merge, NO backup (install.js handles that).
   */
  async writeConfig(config: Record<string, any>): Promise<void> {
    const settingsPath = path.join(this.getConfigDir(), 'settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify(config, null, 2) + '\n');
  }

  // =========================================================================
  // Hook registration - Modify hooks array in settings.json
  // =========================================================================

  /**
   * Register hook in Claude Code settings.json
   *
   * Modifies hooks array with simple append.
   * No deduplication needed for fresh installs.
   */
  async registerHook(hookType: HookType, hookPath: string): Promise<void> {
    const config = await this.readConfig();

    // Initialize hooks structure if needed
    if (!config.hooks) {
      config.hooks = {};
    }
    if (!config.hooks[hookType]) {
      config.hooks[hookType] = [];
    }

    // Simple append - install.js handles deduplication
    config.hooks[hookType].push({
      hooks: [{ type: 'command', command: hookPath }]
    });

    await this.writeConfig(config);
  }

  /**
   * Merge updates into existing configuration
   *
   * Simple shallow merge - NOT deep merge (Phase 4).
   * Read existing config, merge updates, write back.
   */
  async mergeConfig(updates: Record<string, any>): Promise<void> {
    const existing = await this.readConfig();
    const merged = { ...existing, ...updates };
    await this.writeConfig(merged);
  }

  // =========================================================================
  // Platform capabilities - Claude Code supports everything
  // =========================================================================

  supportsParallelAgents(): boolean {
    return true;
  }

  supportsStatusLine(): boolean {
    return true;
  }

  supportsHooks(): boolean {
    return true;
  }

  // =========================================================================
  // Stubbed methods - Phase 4 implementation
  // =========================================================================

  async registerCommand(): Promise<void> {
    throw new Error('registerCommand() not implemented in Phase 2 - install.js handles command copying');
  }

  async unregisterCommand(): Promise<void> {
    throw new Error('unregisterCommand() not implemented in Phase 2');
  }

  async unregisterHook(): Promise<void> {
    throw new Error('unregisterHook() not implemented in Phase 2');
  }

  async spawnAgent(): Promise<AgentInstance> {
    throw new Error('spawnAgent() not implemented in Phase 2 - deferred to Phase 4');
  }
}
