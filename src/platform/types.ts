/**
 * Platform type definitions for GSD
 *
 * Supports runtime platform detection across multiple AI coding platforms.
 */

/**
 * Supported AI coding platforms
 * - claude-code: Anthropic's Claude Code platform
 * - opencode: OpenCode platform
 * - unknown: Platform could not be detected
 */
export type PlatformType = 'claude-code' | 'opencode' | 'unknown';
