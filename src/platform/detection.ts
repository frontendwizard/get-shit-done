/**
 * Runtime platform detection for GSD
 *
 * Detects which AI coding platform (Claude Code or OpenCode) is executing GSD.
 * Uses priority-based resolution:
 * 1. GSD_PLATFORM environment variable (explicit override)
 * 2. .platform marker file (persisted choice from installer)
 * 3. Filesystem probing (detect installed platform)
 * 4. Ambiguity handling (warn if both platforms detected)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PlatformType } from './types';

/**
 * Detect the current AI coding platform at runtime.
 *
 * Priority order (highest to lowest):
 * 1. GSD_PLATFORM env var - allows explicit platform override
 * 2. .platform marker file - created by installer to persist choice
 * 3. Filesystem probing - checks for platform-specific config files
 * 4. Returns 'unknown' if neither or both platforms detected
 *
 * @returns The detected platform type
 */
export function detectPlatform(): PlatformType {
  // Priority 1: Explicit environment variable override
  const explicit = process.env.GSD_PLATFORM;
  if (explicit === 'claude-code' || explicit === 'opencode') {
    return explicit;
  }

  // Priority 2: Marker file from installation (most reliable for installed projects)
  const markerPath = path.join(__dirname, '..', '..', '.platform');
  if (fs.existsSync(markerPath)) {
    try {
      const platform = fs.readFileSync(markerPath, 'utf8').trim() as PlatformType;
      if (platform === 'claude-code' || platform === 'opencode') {
        return platform;
      }
    } catch (error) {
      // Marker file exists but is unreadable/malformed - continue to filesystem probing
      console.warn('GSD: .platform marker file exists but is invalid, falling back to filesystem probing');
    }
  }

  // Priority 3: Filesystem probing
  const homeDir = os.homedir();

  // Check for Claude Code
  const claudeSettings = path.join(homeDir, '.claude', 'settings.json');
  const hasClaudeCode = fs.existsSync(claudeSettings);

  // Check for OpenCode
  const opencodeConfig = path.join(homeDir, '.config', 'opencode', 'opencode.json');
  const hasOpenCode = fs.existsSync(opencodeConfig);

  // Ambiguity handling: both platforms detected
  if (hasClaudeCode && hasOpenCode) {
    console.warn(
      'GSD: Both Claude Code and OpenCode detected. ' +
      'Set GSD_PLATFORM environment variable to choose explicitly (GSD_PLATFORM=claude-code or GSD_PLATFORM=opencode).'
    );
    return 'unknown';
  }

  // Return detected platform
  if (hasClaudeCode) return 'claude-code';
  if (hasOpenCode) return 'opencode';

  // No platform detected
  return 'unknown';
}
