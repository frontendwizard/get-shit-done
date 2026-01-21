/**
 * Platform path resolution abstraction
 *
 * Provides runtime path resolution for platform-specific directories without
 * hardcoding ~/.claude/ paths. Enables platform portability.
 *
 * Scope (Phase 1): ONLY path resolution methods
 * Deferred to Phase 2: config management, agent spawning, hook registration
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PlatformType } from './types';

/**
 * PathResolver Interface (PLAT-06)
 *
 * Minimal interface defining platform-specific path resolution.
 * Each platform implementation provides its own directory structure.
 *
 * Contract:
 * - All methods MUST return absolute paths (never relative)
 * - Paths MUST be resolved at runtime (never compile-time)
 * - Tilde expansion MUST be handled for environment variables
 */
export interface PathResolver {
  /**
   * Platform identification
   */
  readonly name: PlatformType;

  /**
   * Get platform configuration directory
   * - Claude Code: ~/.claude/ (or CLAUDE_CONFIG_DIR)
   * - OpenCode: ~/.config/opencode/ (or OPENCODE_CONFIG parent)
   *
   * @returns Absolute path to config directory
   */
  getConfigDir(): string;

  /**
   * Get directory for GSD slash commands
   * - Claude Code: ~/.claude/commands/gsd/
   * - OpenCode: ~/.config/opencode/command/gsd/
   *
   * @returns Absolute path to commands directory
   */
  getCommandsDir(): string;

  /**
   * Get directory for GSD agents
   * - Claude Code: ~/.claude/agents/
   * - OpenCode: ~/.config/opencode/agents/
   *
   * @returns Absolute path to agents directory
   */
  getAgentsDir(): string;

  /**
   * Get directory for lifecycle hooks
   * - Claude Code: ~/.claude/hooks/
   * - OpenCode: ~/.config/opencode/hooks/
   *
   * @returns Absolute path to hooks directory
   */
  getHooksDir(): string;
}

/**
 * Claude Code path resolver
 *
 * Resolves paths for Anthropic's Claude Code platform.
 * Follows Claude Code's directory structure conventions.
 */
export class ClaudeCodePaths implements PathResolver {
  readonly name: PlatformType = 'claude-code';

  /**
   * Get Claude Code config directory
   * Priority: CLAUDE_CONFIG_DIR env var > default ~/.claude
   */
  getConfigDir(): string {
    const envDir = process.env.CLAUDE_CONFIG_DIR;
    if (envDir) {
      return this.expandTilde(envDir);
    }
    return path.join(os.homedir(), '.claude');
  }

  /**
   * Get Claude Code commands directory
   * Structure: {configDir}/commands/gsd/
   * Note: Claude Code uses 'gsd' subdirectory for GSD commands
   */
  getCommandsDir(): string {
    return path.join(this.getConfigDir(), 'commands', 'gsd');
  }

  /**
   * Get Claude Code agents directory
   * Structure: {configDir}/agents/
   */
  getAgentsDir(): string {
    return path.join(this.getConfigDir(), 'agents');
  }

  /**
   * Get Claude Code hooks directory
   * Structure: {configDir}/hooks/
   */
  getHooksDir(): string {
    return path.join(this.getConfigDir(), 'hooks');
  }

  /**
   * Expand tilde (~) in file paths to home directory
   * Helper for CLAUDE_CONFIG_DIR environment variable handling
   */
  private expandTilde(filePath: string): string {
    if (filePath.startsWith('~/')) {
      return path.join(os.homedir(), filePath.slice(2));
    }
    return filePath;
  }
}

/**
 * OpenCode path resolver
 *
 * Resolves paths for OpenCode platform.
 * Follows XDG Base Directory specification on all platforms.
 */
export class OpenCodePaths implements PathResolver {
  readonly name: PlatformType = 'opencode';

  /**
   * Get OpenCode config directory
   * Priority: OPENCODE_CONFIG env var (parent dir) > XDG_CONFIG_HOME/opencode > ~/.config/opencode
   *
   * Note: OPENCODE_CONFIG points to config FILE, not directory, so we use dirname
   */
  getConfigDir(): string {
    const envConfig = process.env.OPENCODE_CONFIG;
    if (envConfig) {
      return path.dirname(envConfig);
    }

    // Follow XDG Base Directory on Linux, equivalent on macOS/Windows
    const configHome = process.env.XDG_CONFIG_HOME ||
                      path.join(os.homedir(), '.config');
    return path.join(configHome, 'opencode');
  }

  /**
   * Get OpenCode commands directory
   * Structure: {configDir}/command/gsd/
   * Note: OpenCode uses 'command' (singular) and 'gsd' subdirectory for namespacing
   */
  getCommandsDir(): string {
    return path.join(this.getConfigDir(), 'command', 'gsd');
  }

  /**
   * Get OpenCode agents directory
   * Structure: {configDir}/agents/
   */
  getAgentsDir(): string {
    return path.join(this.getConfigDir(), 'agents');
  }

  /**
   * Get OpenCode hooks directory
   * Structure: {configDir}/hooks/
   */
  getHooksDir(): string {
    return path.join(this.getConfigDir(), 'hooks');
  }
}
