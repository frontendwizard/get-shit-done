/**
 * PlatformAdapter Interface Contract (PLAT-02)
 *
 * This file defines the SPECIFICATION for what both Claude Code and OpenCode
 * adapters must implement in Phase 2/3. This is architectural documentation
 * and contract definition, not implementation.
 *
 * Purpose:
 * - Establish the complete interface contract for platform adapters
 * - Document behavioral requirements for implementers
 * - Enable type-safe platform abstraction layer
 *
 * Implementation phases:
 * - Phase 1 (current): Interface definition and documentation
 * - Phase 2: Claude Code adapter implementation
 * - Phase 3: OpenCode adapter implementation
 *
 * Key principle: Both platforms must satisfy this interface for GSD portability.
 * Any platform-specific behavior MUST be encapsulated within the adapter.
 */

import { PlatformType } from './types';
import { PathResolver } from './paths';

/**
 * PlatformAdapter Interface
 *
 * All platform implementations (Claude Code, OpenCode) must satisfy this interface.
 * Defines the complete contract for platform-specific behavior including:
 * - Path resolution (inherited from PathResolver)
 * - Configuration management
 * - Agent spawning and lifecycle
 * - Hook registration
 * - Command registration
 * - Platform capability detection
 *
 * This interface ensures GSD can work seamlessly across platforms without
 * conditional logic scattered throughout the codebase. All platform differences
 * are encapsulated in the adapter implementation.
 */
export interface PlatformAdapter extends PathResolver {
  /**
   * Platform identification
   *
   * Identifies which platform this adapter implements.
   * Used for diagnostics, logging, and capability-based feature detection.
   */
  readonly name: PlatformType;

  /**
   * Platform version string
   *
   * Reports the platform version for compatibility checking.
   * Format: semver string (e.g., "1.2.3")
   */
  readonly version: string;

  // =========================================================================
  // Path resolution (inherited from PathResolver)
  // =========================================================================
  // - getConfigDir(): string
  // - getCommandsDir(): string
  // - getAgentsDir(): string
  // - getHooksDir(): string

  // =========================================================================
  // Configuration management
  // =========================================================================

  /**
   * Read platform-specific configuration
   *
   * Contract:
   * - Claude Code: Read ~/.claude/settings.json
   * - OpenCode: Read ~/.config/opencode/opencode.jsonc
   * - Return empty object if config file doesn't exist
   * - Parse and return as generic key-value object
   * - Throw clear error if file is malformed
   *
   * @returns Configuration object
   */
  readConfig(): Promise<Record<string, any>>;

  /**
   * Write platform-specific configuration
   *
   * Contract:
   * - Claude Code: Write to ~/.claude/settings.json
   * - OpenCode: Write to ~/.config/opencode/opencode.jsonc
   * - MUST preserve existing settings not in the provided config
   * - MUST backup before modifying (INST-05)
   * - Format according to platform conventions (JSON vs JSONC)
   * - Create config directory if it doesn't exist
   *
   * @param config - Configuration object to write
   */
  writeConfig(config: Record<string, any>): Promise<void>;

  /**
   * Merge updates into existing configuration
   *
   * Contract:
   * - Read existing config
   * - Merge updates (deep merge, not shallow)
   * - Write merged result
   * - MUST preserve unrelated settings
   * - MUST backup before modifying (INST-05)
   *
   * @param updates - Configuration updates to merge
   */
  mergeConfig(updates: Record<string, any>): Promise<void>;

  // =========================================================================
  // Agent spawning and lifecycle (AGENT-01, AGENT-02, AGENT-04)
  // =========================================================================

  /**
   * Spawn an agent with platform-specific syntax
   *
   * Contract:
   * - Claude Code: Use Task tool with agent path and arguments
   * - OpenCode: Generate YAML agent definition and spawn
   * - MUST support parallel agent spawning (AGENT-02)
   * - MUST detect spawn failures immediately (AGENT-04)
   * - Return AgentInstance with status tracking
   * - Agent runs asynchronously (non-blocking)
   * - Unique agent ID for tracking/debugging
   *
   * Error handling:
   * - Throw if agent file doesn't exist
   * - Throw if agent syntax is invalid
   * - Throw if platform spawn mechanism fails
   *
   * @param agentPath - Absolute path to agent file
   * @param args - Optional key-value arguments to pass to agent
   * @returns AgentInstance for status tracking
   */
  spawnAgent(agentPath: string, args?: Record<string, string>): Promise<AgentInstance>;

  // =========================================================================
  // Hook registration (HOOK-03)
  // =========================================================================

  /**
   * Register a lifecycle hook with platform-specific mechanism
   *
   * Contract:
   * - Claude Code: Add hook to settings.json hooks array
   * - OpenCode: Register hook in opencode.jsonc hooks configuration
   * - MUST be idempotent (multiple registrations = same result)
   * - MUST backup config before modifying (INST-05)
   * - Hook file must exist at hookPath
   * - Validate hook file is executable/accessible
   *
   * Error handling:
   * - Throw if hook file doesn't exist
   * - Throw if hookType is not supported
   * - Throw if platform hook registration fails
   *
   * @param hookType - Type of lifecycle hook (SessionStart, StatusLine)
   * @param hookPath - Absolute path to hook implementation
   */
  registerHook(hookType: HookType, hookPath: string): Promise<void>;

  /**
   * Unregister a lifecycle hook
   *
   * Contract:
   * - Remove hook from platform configuration
   * - MUST be idempotent (safe to call multiple times)
   * - MUST backup config before modifying (INST-05)
   * - No error if hook wasn't registered
   *
   * @param hookType - Type of lifecycle hook to remove
   */
  unregisterHook(hookType: HookType): Promise<void>;

  // =========================================================================
  // Command registration (CMD-01, INST-03)
  // =========================================================================

  /**
   * Register a slash command with platform-specific mechanism
   *
   * Contract:
   * - Claude Code: Copy command file to ~/.claude/commands/gsd/
   * - OpenCode: Copy command file to ~/.config/opencode/commands/
   * - MUST detect name collisions with existing commands (INST-03)
   * - MUST validate command file exists and is valid
   * - Create commands directory if it doesn't exist
   *
   * Error handling:
   * - Throw if command file doesn't exist
   * - Throw if command name collides with existing command
   * - Throw if command file is malformed
   *
   * @param commandPath - Absolute path to command implementation
   */
  registerCommand(commandPath: string): Promise<void>;

  /**
   * Unregister a slash command
   *
   * Contract:
   * - Remove command file from platform commands directory
   * - MUST be idempotent (safe to call multiple times)
   * - No error if command doesn't exist
   *
   * @param commandName - Name of command to remove (without slash)
   */
  unregisterCommand(commandName: string): Promise<void>;

  // =========================================================================
  // Platform capabilities
  // =========================================================================

  /**
   * Check if platform supports parallel agent spawning
   *
   * Contract:
   * - Claude Code: true (supports multiple Task tool calls)
   * - OpenCode: implementation-dependent (to be determined in Phase 3)
   *
   * @returns true if platform can spawn multiple agents concurrently
   */
  supportsParallelAgents(): boolean;

  /**
   * Check if platform supports status line hooks
   *
   * Contract:
   * - Claude Code: true (supports statusLine hook)
   * - OpenCode: implementation-dependent (to be determined in Phase 3)
   *
   * @returns true if platform supports status line customization
   */
  supportsStatusLine(): boolean;

  /**
   * Check if platform supports lifecycle hooks
   *
   * Contract:
   * - Claude Code: true (supports SessionStart and StatusLine hooks)
   * - OpenCode: implementation-dependent (to be determined in Phase 3)
   *
   * @returns true if platform supports hook registration
   */
  supportsHooks(): boolean;
}

/**
 * AgentInstance Interface
 *
 * Unified interface for agent status tracking across platforms.
 * Returned by spawnAgent() for monitoring agent execution.
 *
 * Contract:
 * - Platform adapters MUST provide real-time status updates
 * - Status transitions: running -> completed | failed
 * - Output MUST be available after completion
 */
export interface AgentInstance {
  /**
   * Unique identifier for this agent instance
   * Used for logging, debugging, and tracking
   */
  readonly id: string;

  /**
   * Current execution status
   * - running: Agent is currently executing
   * - completed: Agent finished successfully
   * - failed: Agent encountered an error
   */
  readonly status: 'running' | 'completed' | 'failed';

  /**
   * Wait for agent to complete execution
   *
   * Contract:
   * - Blocks until agent reaches completed or failed status
   * - Throws if agent fails (status = failed)
   * - Returns normally if agent completes successfully
   */
  waitForCompletion(): Promise<void>;

  /**
   * Get agent output after completion
   *
   * Contract:
   * - MUST be called after waitForCompletion()
   * - Returns combined stdout/stderr
   * - Empty string if no output
   */
  getOutput(): Promise<string>;
}

/**
 * Hook types supported by platform adapters
 *
 * SessionStart: Executed when a new Claude/OpenCode session starts
 * StatusLine: Provides custom status line content
 */
export type HookType = 'SessionStart' | 'StatusLine';

// =========================================================================
// Behavioral Contract Specification
// =========================================================================
/**
 * BINDING REQUIREMENTS FOR ALL PLATFORM ADAPTER IMPLEMENTATIONS
 *
 * These behavioral contracts MUST be satisfied by all platform adapters
 * to ensure correct and portable operation of GSD across platforms.
 *
 * Contract violations will cause:
 * - Silent failures in production
 * - Difficult-to-debug platform-specific issues
 * - Breaking changes for users switching platforms
 *
 * REQUIRED BEHAVIORS:
 *
 * 1. Path resolution MUST return absolute paths (never relative)
 *    Rationale: Prevents CWD-dependent bugs, enables reliable file operations
 *
 * 2. Config methods MUST preserve existing settings when merging
 *    Rationale: Prevents data loss when GSD modifies only specific settings
 *
 * 3. Agent spawning MUST support parallel execution (AGENT-02)
 *    Rationale: Critical for multi-agent workflows (Phase 4-7)
 *
 * 4. Agent spawning MUST detect spawn failures immediately (AGENT-04)
 *    Rationale: Silent failures are unacceptable for reliability
 *
 * 5. Hook registration MUST be idempotent (multiple calls = same result)
 *    Rationale: Prevents duplicate hooks from multiple installations
 *
 * 6. Command registration MUST detect name collisions (INST-03)
 *    Rationale: Prevents overwriting user's custom commands
 *
 * 7. All methods MUST throw clear errors (no silent failures)
 *    Rationale: Debuggability and user-friendly error messages
 *
 * 8. Platform adapters MUST NOT modify .planning/ files (PORT-02)
 *    Rationale: Planning files are platform-agnostic project state
 *
 * 9. Platform detection MUST happen at runtime (never compile-time)
 *    Rationale: Enables portable .planning/ directories across platforms
 *
 * 10. Configuration changes MUST backup before modifying (INST-05)
 *     Rationale: Enables safe rollback on installation failures
 *
 * TESTING REQUIREMENTS:
 *
 * All platform adapter implementations MUST have:
 * - Unit tests for each interface method
 * - Integration tests for multi-agent spawning
 * - Error handling tests for all failure modes
 * - Idempotency tests for hook/command registration
 * - Backup/restore tests for config modifications
 */
