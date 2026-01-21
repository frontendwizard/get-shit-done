/**
 * OpenCode Agent Instance Implementation
 *
 * Provides agent lifecycle tracking for OpenCode platform.
 * Monitors child process execution for agent completion and output collection.
 *
 * Phase 4 Implementation Notes:
 * - OpenCode agents run as CLI processes (child_process.spawn)
 * - Uses 'close' event for reliable completion detection (not 'exit')
 * - Listens to 'error' event for spawn failures
 * - Collects stdout and stderr streams
 * - Exit code 0 = success, non-zero = failure
 */

import { ChildProcess } from 'child_process';
import { AgentInstance } from '../adapter';

/**
 * OpenCodeAgentInstance
 *
 * Tracks lifecycle of an OpenCode CLI process agent execution.
 *
 * Contract:
 * - Wraps ChildProcess from Node.js child_process
 * - Monitors 'close' event (ensures streams fully closed)
 * - Monitors 'error' event (catches spawn failures)
 * - Collects stdout and stderr streams
 * - Exit code 0 = completed, non-zero = failed
 *
 * Usage:
 * ```typescript
 * const child = spawn('opencode', ['--agent', 'gsd-researcher', 'Research topic']);
 * const agent = new OpenCodeAgentInstance(child, 'researcher-1');
 * await agent.waitForCompletion();
 * const output = await agent.getOutput();
 * ```
 */
export class OpenCodeAgentInstance implements AgentInstance {
  readonly id: string;
  private _status: 'running' | 'completed' | 'failed';
  private child: ChildProcess;
  private completionPromise: Promise<void>;
  private stdout = '';
  private stderr = '';

  /**
   * Create a new OpenCode agent instance
   *
   * @param child - ChildProcess from child_process.spawn()
   * @param id - Unique identifier for this agent
   */
  constructor(child: ChildProcess, id: string) {
    this.child = child;
    this.id = id;
    this._status = 'running';

    // Collect output streams
    // Agents may write to stdout or .planning/ files
    child.stdout?.on('data', (data) => {
      this.stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      this.stderr += data.toString();
    });

    // Monitor completion - use 'close' event per research
    // 'close' fires after all streams are closed (more reliable than 'exit')
    this.completionPromise = new Promise((resolve, reject) => {
      child.on('close', (code, signal) => {
        if (code === 0) {
          this._status = 'completed';
          resolve();
        } else {
          this._status = 'failed';
          const errorMessage = signal
            ? `Agent ${id} terminated by signal ${signal}`
            : `Agent ${id} failed with exit code ${code}`;
          reject(new Error(
            `${errorMessage}\n${this.stderr}`
          ));
        }
      });

      // Listen to 'error' event for spawn failures
      // This catches failures before the process even starts
      child.on('error', (err) => {
        this._status = 'failed';
        reject(new Error(`Agent ${id} spawn failed: ${err.message}`));
      });
    });
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
   * Throws if agent fails (non-zero exit code or spawn error).
   */
  async waitForCompletion(): Promise<void> {
    return this.completionPromise;
  }

  /**
   * Get agent output after completion
   *
   * Returns stdout collected during execution.
   * For structured results, agents may also write to .planning/ files
   * (collection of those files handled by caller).
   *
   * @returns Agent stdout as string
   */
  async getOutput(): Promise<string> {
    // Ensure agent has completed
    if (this._status === 'running') {
      throw new Error(`Cannot get output while agent ${this.id} is still running`);
    }

    // Return stdout - stderr is included in error messages if failed
    return this.stdout;
  }

  /**
   * Get stderr output for debugging
   *
   * Useful for error diagnostics when agent fails.
   *
   * @returns Agent stderr as string
   */
  getStderr(): string {
    return this.stderr;
  }
}
