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
 * - Local: Bypasses platform detection, uses ./.claude/ directly
 *
 * @param isGlobal - Whether this is a global installation
 * @param explicitConfigDir - User-provided --config-dir value (null if not provided)
 * @returns Installation paths structure
 */
export function getInstallPaths(
  isGlobal: boolean,
  explicitConfigDir: string | null
): InstallPaths {
  // Local install: platform-agnostic, just use ./.claude/
  if (!isGlobal) {
    const cwd = process.cwd();
    const configDir = path.join(cwd, '.claude');
    return {
      configDir,
      commandsDir: path.join(configDir, 'commands', 'gsd'),
      agentsDir: path.join(configDir, 'agents'),
      hooksDir: path.join(configDir, 'hooks'),
      pathPrefix: './.claude/',
    };
  }

  // Global install: use platform detection
  const resolver = PlatformRegistry.getPathResolver();

  // Determine config directory
  // Priority: explicit --config-dir > platform-detected path
  let configDir: string;
  if (explicitConfigDir) {
    configDir = expandTilde(explicitConfigDir);
  } else {
    configDir = resolver.getConfigDir();
  }

  // Get other directories from resolver
  // Note: For Claude Code, commandsDir will be {configDir}/commands/gsd
  //       For explicit configDir, we need to construct the full path
  let commandsDir: string;
  let agentsDir: string;
  let hooksDir: string;

  if (explicitConfigDir) {
    // When user provides explicit config dir, construct paths manually
    // to match the structure they expect
    commandsDir = path.join(configDir, 'commands', 'gsd');
    agentsDir = path.join(configDir, 'agents');
    hooksDir = path.join(configDir, 'hooks');
  } else {
    // Use platform-specific paths
    commandsDir = resolver.getCommandsDir();
    agentsDir = resolver.getAgentsDir();
    hooksDir = resolver.getHooksDir();
  }

  // Determine path prefix for markdown file replacements
  // Use ~ shorthand when possible for cleaner docs
  const pathPrefix = explicitConfigDir
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
