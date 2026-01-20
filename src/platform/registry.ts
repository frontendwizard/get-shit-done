/**
 * Platform Registry - Factory pattern for path resolver instantiation
 *
 * Provides singleton-based factory for creating platform-specific path resolvers.
 * Detects platform at runtime and returns appropriate PathResolver implementation.
 *
 * Pattern: Factory + Singleton
 * - Factory: Creates platform-specific instances based on detection
 * - Singleton: Caches instance to avoid repeated detection
 *
 * Scope (Phase 1): Creates PathResolver instances only
 * Future (Phase 2): Will be extended to also provide PlatformAdapter instances
 *
 * Anti-pattern warning: DO NOT expand into service locator (Pitfall #4)
 * This registry creates ONE thing: PathResolver (later: PlatformAdapter)
 */

import { detectPlatform } from './detection';
import { PathResolver, ClaudeCodePaths, OpenCodePaths } from './paths';
import { PlatformType } from './types';

/**
 * PlatformRegistry
 *
 * Factory registry for platform-specific implementations.
 * Uses singleton pattern to cache resolved platform instance.
 *
 * Usage:
 * ```typescript
 * const resolver = PlatformRegistry.getPathResolver();
 * const configDir = resolver.getConfigDir();
 * ```
 */
export class PlatformRegistry {
  /**
   * Singleton instance of PathResolver
   * Cached after first detection to avoid repeated filesystem probing
   */
  private static pathResolverInstance: PathResolver | null = null;

  /**
   * Get PathResolver for current platform
   *
   * Detects platform on first call, then caches result.
   * Subsequent calls return cached instance.
   *
   * @returns PathResolver implementation for detected platform
   * @throws Error if platform is 'unknown' (no supported platform detected)
   */
  static getPathResolver(): PathResolver {
    // Return cached instance if available
    if (PlatformRegistry.pathResolverInstance) {
      return PlatformRegistry.pathResolverInstance;
    }

    // Detect platform and create appropriate resolver
    const platform = detectPlatform();
    const resolver = PlatformRegistry.createPathResolver(platform);

    // Cache for future calls
    PlatformRegistry.pathResolverInstance = resolver;

    return resolver;
  }

  /**
   * Factory method: Create PathResolver for specified platform
   *
   * @param platform - Platform type to create resolver for
   * @returns PathResolver implementation
   * @throws Error if platform is 'unknown'
   */
  private static createPathResolver(platform: PlatformType): PathResolver {
    switch (platform) {
      case 'claude-code':
        return new ClaudeCodePaths();

      case 'opencode':
        return new OpenCodePaths();

      case 'unknown':
        throw new Error(
          'No supported AI platform detected. ' +
          'Install Claude Code or OpenCode, or set GSD_PLATFORM environment variable ' +
          '(GSD_PLATFORM=claude-code or GSD_PLATFORM=opencode).'
        );

      default:
        // Exhaustiveness check - TypeScript ensures all PlatformType cases are handled
        const exhaustiveCheck: never = platform;
        throw new Error(`Unhandled platform type: ${exhaustiveCheck}`);
    }
  }

  /**
   * Set PathResolver instance (for testing/dependency injection)
   *
   * Allows tests to inject mock PathResolver without triggering platform detection.
   * Should NOT be used in production code.
   *
   * @param resolver - PathResolver instance to use
   */
  static setPathResolver(resolver: PathResolver): void {
    PlatformRegistry.pathResolverInstance = resolver;
  }

  /**
   * Reset singleton state (for testing)
   *
   * Clears cached instance, forcing fresh platform detection on next getPathResolver() call.
   * Should NOT be used in production code.
   */
  static reset(): void {
    PlatformRegistry.pathResolverInstance = null;
  }
}
