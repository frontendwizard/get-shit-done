/**
 * Platform abstraction layer exports
 *
 * Provides unified interface for platform-specific functionality.
 */

// Core types and interfaces
export { PlatformType } from './types';
export { PathResolver } from './paths';
export { PlatformAdapter, AgentInstance, HookType } from './adapter';

// Path implementations
export { ClaudeCodePaths, OpenCodePaths } from './paths';

// Platform detection
export { detectPlatform } from './detection';

// Adapter registry
export { PlatformRegistry } from './registry';

// Install adapter (for install.js integration)
export { getInstallPaths, InstallPaths } from './install-adapter';

// Platform adapters
export { ClaudeCodeAdapter } from './adapters/claude-code';
export { OpenCodeAdapter } from './adapters/opencode';
