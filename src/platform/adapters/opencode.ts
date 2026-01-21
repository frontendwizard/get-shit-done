/**
 * OpenCode Platform Adapter (Phase 3 - Ultra-minimal implementation)
 *
 * Implements ONLY what Phase 3 needs:
 * - Path methods (delegated to OpenCodePaths)
 * - Basic config read/write (JSONC parse, JSON write)
 * - Capability detection (returns false for unsupported features)
 *
 * Everything else stubbed with "Not implemented in Phase 3" errors.
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'jsonc-parser';
import { spawn } from 'child_process';
import { PlatformAdapter, AgentInstance, HookType } from '../adapter';
import { OpenCodePaths } from '../paths';
import { PlatformType } from '../types';
import { OpenCodeAgentInstance } from './opencode-agent';

export class OpenCodeAdapter implements PlatformAdapter {
  readonly name: PlatformType = 'opencode';
  readonly version: string = '1.0.0';

  private paths: OpenCodePaths;

  constructor() {
    this.paths = new OpenCodePaths();
  }

  // =========================================================================
  // Path methods - Pure delegation to OpenCodePaths
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
  // Config read/write - JSONC parse, JSON write
  // =========================================================================

  /**
   * Read OpenCode config (opencode.json or opencode.jsonc)
   *
   * Uses jsonc-parser to handle JSON with comments.
   * Returns empty object if file doesn't exist.
   */
  async readConfig(): Promise<Record<string, any>> {
    const configDir = this.getConfigDir();

    // Try both .json and .jsonc extensions
    const jsonPath = path.join(configDir, 'opencode.json');
    const jsoncPath = path.join(configDir, 'opencode.jsonc');

    let configPath = jsonPath;
    if (!fs.existsSync(jsonPath) && fs.existsSync(jsoncPath)) {
      configPath = jsoncPath;
    }

    if (!fs.existsSync(configPath)) {
      return {};
    }

    const content = fs.readFileSync(configPath, 'utf8');
    return parse(content); // jsonc-parser handles comments
  }

  /**
   * Write OpenCode config (always as JSON, not JSONC)
   *
   * GSD-generated config doesn't need comments.
   * Simple replacement - install.js handles backup.
   */
  async writeConfig(config: Record<string, any>): Promise<void> {
    const configDir = this.getConfigDir();
    const configPath = path.join(configDir, 'opencode.json');

    // Ensure directory exists
    fs.mkdirSync(configDir, { recursive: true });

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  }

  /**
   * Merge updates into existing configuration
   *
   * Simple shallow merge - NOT deep merge (Phase 4).
   */
  async mergeConfig(updates: Record<string, any>): Promise<void> {
    const existing = await this.readConfig();
    const merged = { ...existing, ...updates };
    await this.writeConfig(merged);
  }

  // =========================================================================
  // Hook registration - Stubbed for Phase 5
  // =========================================================================

  async registerHook(hookType: HookType, hookPath: string): Promise<void> {
    throw new Error(`registerHook() not implemented in Phase 3 - deferred to Phase 5 (Lifecycle Hooks)`);
  }

  async unregisterHook(hookType: HookType): Promise<void> {
    throw new Error(`unregisterHook() not implemented in Phase 3 - deferred to Phase 5 (Lifecycle Hooks)`);
  }

  // =========================================================================
  // Platform capabilities - OpenCode capabilities TBD
  // =========================================================================

  supportsParallelAgents(): boolean {
    // Phase 4: OpenCode supports parallel agents via child_process.spawn()
    // Can spawn multiple opencode CLI processes simultaneously
    return true;
  }

  supportsStatusLine(): boolean {
    // OpenCode may not have equivalent - graceful degradation
    return false;
  }

  supportsHooks(): boolean {
    // To be determined in Phase 5 (Lifecycle Hooks)
    return false;
  }

  // =========================================================================
  // Stubbed methods - Phase 4 implementation
  // =========================================================================

  async registerCommand(commandPath: string): Promise<void> {
    throw new Error('registerCommand() not implemented in Phase 3 - install.js handles command copying');
  }

  async unregisterCommand(commandName: string): Promise<void> {
    throw new Error('unregisterCommand() not implemented in Phase 3');
  }

  async spawnAgent(agentPath: string, args?: Record<string, string>): Promise<AgentInstance> {
    // Validate agent file exists
    if (!fs.existsSync(agentPath)) {
      throw new Error(`Agent file not found: ${agentPath}`);
    }

    // Extract agent name from path
    // Example: /path/to/gsd-project-researcher.md -> gsd-project-researcher
    const agentName = path.basename(agentPath, '.md');

    // Construct prompt from args
    const prompt = this.constructPrompt(args);

    // Generate unique agent ID
    const agentId = `${agentName}-${Date.now()}`;

    // Spawn opencode CLI process with --agent flag
    // Based on research: use array arguments (NOT shell: true) to prevent injection
    const child = spawn('opencode', [
      '--agent', agentName,
      '--non-interactive',  // Prevent TUI from launching
      prompt
    ], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe']  // stdin ignored, capture stdout/stderr
    });

    // Create AgentInstance wrapping the process
    const instance = new OpenCodeAgentInstance(child, agentId);

    return instance;
  }

  private constructPrompt(args?: Record<string, string>): string {
    if (!args || Object.keys(args).length === 0) {
      return '';
    }

    // Format args as key: value pairs
    return Object.entries(args)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
  }
}
