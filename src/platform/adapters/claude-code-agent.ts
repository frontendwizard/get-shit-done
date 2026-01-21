/**
 * Claude Code Agent Instance Implementation
 *
 * Provides agent lifecycle tracking for Claude Code platform.
 * Models Task tool behavior for agent completion and output collection.
 *
 * Phase 4 Implementation Notes:
 * - Task tool is native to Claude Code (runs in markdown workflow files)
 * - This class provides tracking interface, not Task tool invocation
 * - Actual Task tool integration happens in markdown workflows
 * - Completion detection via file watching (agents write to .planning/)
 */

import * as fs from 'fs';
import { AgentInstance } from '../adapter';

/**
 * ClaudeCodeAgentInstance
 *
 * Tracks lifecycle of a Claude Code Task tool agent execution.
 *
 * Contract:
 * - Starts in 'running' status
 * - Completion promise resolves when agent finishes
 * - Output collected from .planning/ files where agent writes results
 *
 * Usage:
 * ```typescript
 * const agent = new ClaudeCodeAgentInstance('task-123', '.planning/research/output.md');
 * await agent.waitForCompletion();
 * const result = await agent.getOutput();
 * ```
 */
export class ClaudeCodeAgentInstance implements AgentInstance {
  readonly id: string;
  private _status: 'running' | 'completed' | 'failed';
  private completionPromise: Promise<void>;
  private outputPath: string;

  /**
   * Create a new Claude Code agent instance
   *
   * @param id - Unique identifier for this agent (task ID)
   * @param outputPath - Path where agent writes output (.planning/ file)
   */
  constructor(id: string, outputPath: string) {
    this.id = id;
    this._status = 'running';
    this.outputPath = outputPath;

    // Initialize completion tracking
    // For Phase 4: Task tool completion is tracked via file watching
    // This is a placeholder - actual Task integration may differ
    this.completionPromise = this.watchForCompletion();
  }

  /**
   * Current execution status
   */
  get status(): 'running' | 'completed' | 'failed' {
    return this._status;
  }

  /**
   * Wait for agent to complete execution
   *
   * Blocks until agent reaches completed or failed status.
   * Throws if agent fails.
   */
  async waitForCompletion(): Promise<void> {
    return this.completionPromise;
  }

  /**
   * Get agent output after completion
   *
   * Reads from .planning/ file where agent wrote results.
   * Agents write to .planning/research/ or .planning/phases/ directories
   *
   * @returns Agent output as string
   */
  async getOutput(): Promise<string> {
    // Ensure agent has completed
    if (this._status === 'running') {
      throw new Error(`Cannot get output while agent ${this.id} is still running`);
    }

    // Read from .planning/ file where agent wrote results
    if (!fs.existsSync(this.outputPath)) {
      return ''; // No output file created
    }

    return fs.readFileSync(this.outputPath, 'utf8');
  }

  /**
   * Watch for agent completion
   *
   * Placeholder for Task tool completion detection.
   * Actual Task tool invocation happens in markdown workflow files.
   *
   * For Phase 4, this simulates completion detection by:
   * 1. Watching for output file creation
   * 2. Detecting Task tool completion signals (platform-specific)
   *
   * @returns Promise that resolves when agent completes
   */
  private async watchForCompletion(): Promise<void> {
    // Placeholder: Actual Task tool integration may use different mechanism
    // For now, simulate immediate completion for testing
    // Real implementation would:
    // 1. Watch for output file creation (fs.watch)
    // 2. Listen to Task tool completion events (if API exists)
    // 3. Poll for file changes with timeout

    return new Promise((resolve, reject) => {
      // Phase 4 placeholder: simulate completion
      // Real implementation to be determined based on Task tool API
      this._status = 'completed';
      resolve();
    });
  }
}
