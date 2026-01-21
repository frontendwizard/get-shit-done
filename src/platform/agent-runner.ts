/**
 * Parallel Agent Runner (AGENT-02, AGENT-04, AGENT-05)
 *
 * Provides shared helper for spawning multiple agents in parallel with
 * error isolation and partial result collection.
 *
 * Key capabilities:
 * - Spawn 4-7 agents simultaneously (AGENT-02)
 * - Collect partial results even when some agents fail (AGENT-05)
 * - Clear error reporting distinguishes successful vs failed agents (AGENT-04)
 *
 * Uses Promise.allSettled pattern (NOT Promise.all) to prevent cascading failures.
 * When one agent fails, others continue to completion.
 */

import { PlatformAdapter, AgentInstance } from './adapter';

/**
 * Configuration for a single agent to spawn
 */
export interface AgentConfig {
  /** Absolute path to agent markdown file */
  path: string;
  /** Optional arguments to pass to agent */
  args?: Record<string, string>;
}

/**
 * Result from a completed agent
 */
export interface AgentResult {
  /** Agent instance that completed */
  instance: AgentInstance;
  /** Output from agent */
  output: string;
}

/**
 * Error thrown when one or more agents fail
 * Contains both successful results and failure reasons
 */
export class MultiAgentError extends Error {
  constructor(
    message: string,
    public readonly successful: AgentResult[],
    public readonly failed: Array<{ config: AgentConfig; error: Error }>
  ) {
    super(message);
    this.name = 'MultiAgentError';
  }
}

/**
 * Spawn multiple agents in parallel using Promise.allSettled pattern
 *
 * Key behaviors (from research):
 * - All agents spawn simultaneously (not sequential)
 * - Waits for ALL agents to complete (doesn't fail fast)
 * - Collects both successes and failures
 * - Returns successful results even if some agents fail
 * - Throws MultiAgentError with detailed breakdown if any fail
 *
 * @param adapter - Platform adapter to use for spawning
 * @param agentConfigs - Array of agent configurations to spawn
 * @returns Promise resolving to array of successful agent results
 * @throws MultiAgentError if any agents fail (includes partial results)
 */
export async function spawnParallelAgents(
  adapter: PlatformAdapter,
  agentConfigs: AgentConfig[]
): Promise<AgentResult[]> {
  // Spawn all agents in parallel
  const agentPromises = agentConfigs.map(async (config) => {
    const instance = await adapter.spawnAgent(config.path, config.args);
    await instance.waitForCompletion();
    const output = await instance.getOutput();
    return { instance, output, config };
  });

  // Wait for ALL agents to complete (don't fail fast - use allSettled)
  const results = await Promise.allSettled(agentPromises);

  // Separate successes from failures
  const successful: AgentResult[] = [];
  const failed: Array<{ config: AgentConfig; error: Error }> = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      const { instance, output } = result.value;
      successful.push({ instance, output });
    } else {
      failed.push({
        config: agentConfigs[index],
        error: result.reason
      });
    }
  });

  // If any failed, throw MultiAgentError with full breakdown
  if (failed.length > 0) {
    const errorMsg = `${failed.length}/${agentConfigs.length} agents failed`;
    throw new MultiAgentError(errorMsg, successful, failed);
  }

  return successful;
}
