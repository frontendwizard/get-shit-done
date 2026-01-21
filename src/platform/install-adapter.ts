/**
 * Install-time path adapter
 *
 * Provides install-specific path utilities that bridge the install script
 * with platform abstraction layer.
 *
 * Purpose: Replace hardcoded ~/.claude/ path derivation in bin/install.js
 * with runtime-resolved paths from PathResolver.
 *
 * Scope: Installation only (not used by runtime commands)
 */

import * as path from 'path';
import * as os from 'os';
import { PlatformRegistry } from './registry';
import { ClaudeCodePaths, OpenCodePaths } from './paths';

/**
 * Installation paths structure
 *
 * Matches the path variables previously constructed manually in install.js
 */
export interface InstallPaths {
  /** Platform config directory (e.g., ~/.claude) */
  configDir: string;
  /** Commands installation directory */
  commandsDir: string;
  /** Agents installation directory */
  agentsDir: string;
  /** Hooks installation directory */
  hooksDir: string;
  /** Path prefix for markdown file replacements (e.g., '~/.claude/' or './.claude/') */
  pathPrefix: string;
}

/**
 * Get installation paths for current context
 *
 * Handles both global and local installations:
 * - Global: Uses platform detection to resolve paths
 * - Local: Bypasses platform detection, uses platform-specific local directory
 *
 * @param isGlobal - Whether this is a global installation
 * @param explicitConfigDir - User-provided --config-dir value (null if not provided)
 * @param platform - Target platform ('claude-code' | 'opencode'), defaults to 'claude-code' for backward compatibility
 * @returns Installation paths structure
 */
export function getInstallPaths(
  isGlobal: boolean,
  explicitConfigDir: string | null = null,
  platform: 'claude-code' | 'opencode' = 'claude-code'
): InstallPaths {
  // Local install: use platform-specific local directory
  if (!isGlobal) {
    const cwd = process.cwd();
    const localDirName = platform === 'opencode' ? '.opencode' : '.claude';
    const configDir = path.join(cwd, localDirName);

    // Commands directory uses platform-specific structure
    // Claude Code: commands/gsd, OpenCode: command/gsd (singular)
    const commandsSubdir = platform === 'opencode' ? 'command' : 'commands';

    return {
      configDir,
      commandsDir: path.join(configDir, commandsSubdir, 'gsd'),
      agentsDir: path.join(configDir, 'agents'),
      hooksDir: path.join(configDir, 'hooks'),
      pathPrefix: `./${localDirName}/`,
    };
  }

  // Global install: use platform-specific path resolver
  // Select resolver based on platform parameter
  const resolver = platform === 'opencode'
    ? new OpenCodePaths()
    : new ClaudeCodePaths();

  // Determine config directory
  // Priority: explicit --config-dir > platform-detected path
  // Note: explicitConfigDir only applies to Claude Code (CLAUDE_CONFIG_DIR)
  let configDir: string;
  if (explicitConfigDir && platform === 'claude-code') {
    configDir = expandTilde(explicitConfigDir);
  } else {
    configDir = resolver.getConfigDir();
  }

  // Get other directories from resolver
  // Note: Commands directory structure differs by platform:
  //   - Claude Code: {configDir}/commands/gsd
  //   - OpenCode: {configDir}/command/gsd (singular)
  let commandsDir: string;
  let agentsDir: string;
  let hooksDir: string;

  if (explicitConfigDir && platform === 'claude-code') {
    // When user provides explicit config dir for Claude Code, construct paths manually
    commandsDir = path.join(configDir, 'commands', 'gsd');
    agentsDir = path.join(configDir, 'agents');
    hooksDir = path.join(configDir, 'hooks');
  } else {
    // Use platform-specific paths from resolver
    commandsDir = resolver.getCommandsDir();
    agentsDir = resolver.getAgentsDir();
    hooksDir = resolver.getHooksDir();
  }

  // Determine path prefix for markdown file replacements
  // Use ~ shorthand when possible for cleaner docs
  // Platform-aware: OpenCode typically uses ~/.config/opencode/ vs Claude Code ~/.claude/
  const pathPrefix = (explicitConfigDir && platform === 'claude-code')
    ? `${configDir}/`
    : configDir.replace(os.homedir(), '~') + '/';

  return {
    configDir,
    commandsDir,
    agentsDir,
    hooksDir,
    pathPrefix,
  };
}

/**
 * Expand tilde (~) in file paths to home directory
 *
 * Handles CLAUDE_CONFIG_DIR and --config-dir values like ~/custom/path
 * Copied from install.js expandTilde helper
 *
 * @param filePath - Path potentially starting with ~/
 * @returns Expanded absolute path
 */
function expandTilde(filePath: string): string {
  if (filePath && filePath.startsWith('~/')) {
    return path.join(os.homedir(), filePath.slice(2));
  }
  return filePath;
}
