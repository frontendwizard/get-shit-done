import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  spawnParallelAgents,
  MultiAgentError,
  AgentConfig,
} from '../../../src/platform/agent-runner';
import { PlatformAdapter, AgentInstance } from '../../../src/platform/adapter';

// Mock adapter for testing
function createMockAdapter(
  spawnBehavior: (path: string) => Promise<AgentInstance>
): PlatformAdapter {
  return {
    name: 'claude-code',
    version: '1.0.0',
    getConfigDir: () => '/mock/config',
    getCommandsDir: () => '/mock/config/commands/gsd',
    getAgentsDir: () => '/mock/config/agents',
    getHooksDir: () => '/mock/config/hooks',
    readConfig: vi.fn().mockResolvedValue({}),
    writeConfig: vi.fn().mockResolvedValue(undefined),
    mergeConfig: vi.fn().mockResolvedValue(undefined),
    registerHook: vi.fn().mockResolvedValue(undefined),
    unregisterHook: vi.fn().mockResolvedValue(undefined),
    registerCommand: vi.fn().mockResolvedValue(undefined),
    unregisterCommand: vi.fn().mockResolvedValue(undefined),
    spawnAgent: spawnBehavior,
    supportsParallelAgents: () => true,
    supportsStatusLine: () => true,
    supportsHooks: () => true,
  };
}

// Mock AgentInstance
function createMockAgentInstance(
  id: string,
  shouldFail: boolean = false,
  output: string = 'output'
): AgentInstance {
  return {
    id,
    status: shouldFail ? 'failed' : 'completed',
    waitForCompletion: shouldFail
      ? vi.fn().mockRejectedValue(new Error(`Agent ${id} failed`))
      : vi.fn().mockResolvedValue(undefined),
    getOutput: vi.fn().mockResolvedValue(output),
  };
}

describe('spawnParallelAgents', () => {
  describe('successful execution', () => {
    it('spawns all agents and returns results', async () => {
      const adapter = createMockAdapter(async (path) => {
        return createMockAgentInstance(`agent-${path}`);
      });

      const configs: AgentConfig[] = [
        { path: '/agent1.md' },
        { path: '/agent2.md' },
        { path: '/agent3.md' },
      ];

      const results = await spawnParallelAgents(adapter, configs);

      expect(results).toHaveLength(3);
      expect(results[0].instance.id).toBe('agent-/agent1.md');
      expect(results[1].instance.id).toBe('agent-/agent2.md');
      expect(results[2].instance.id).toBe('agent-/agent3.md');
    });

    it('collects output from all agents', async () => {
      let counter = 0;
      const adapter = createMockAdapter(async () => {
        counter++;
        return createMockAgentInstance(`agent-${counter}`, false, `output-${counter}`);
      });

      const configs: AgentConfig[] = [
        { path: '/agent1.md' },
        { path: '/agent2.md' },
      ];

      const results = await spawnParallelAgents(adapter, configs);

      expect(results[0].output).toBe('output-1');
      expect(results[1].output).toBe('output-2');
    });

    it('spawns agents in parallel (not sequential)', async () => {
      const spawnOrder: string[] = [];
      const completionOrder: string[] = [];

      const adapter = createMockAdapter(async (path) => {
        spawnOrder.push(path);
        return {
          id: path,
          status: 'completed' as const,
          waitForCompletion: async () => {
            // Simulate varying completion times
            await new Promise((r) => setTimeout(r, Math.random() * 10));
            completionOrder.push(path);
          },
          getOutput: async () => 'output',
        };
      });

      const configs: AgentConfig[] = [
        { path: '/a.md' },
        { path: '/b.md' },
        { path: '/c.md' },
      ];

      await spawnParallelAgents(adapter, configs);

      // All should spawn before any complete (parallel behavior)
      expect(spawnOrder).toHaveLength(3);
    });
  });

  describe('partial failure handling', () => {
    it('throws MultiAgentError when any agent fails', async () => {
      let counter = 0;
      const adapter = createMockAdapter(async () => {
        counter++;
        // Second agent fails
        return createMockAgentInstance(`agent-${counter}`, counter === 2);
      });

      const configs: AgentConfig[] = [
        { path: '/agent1.md' },
        { path: '/agent2.md' }, // This one fails
        { path: '/agent3.md' },
      ];

      await expect(spawnParallelAgents(adapter, configs)).rejects.toThrow(MultiAgentError);
    });

    it('MultiAgentError contains successful results', async () => {
      let counter = 0;
      const adapter = createMockAdapter(async () => {
        counter++;
        return createMockAgentInstance(`agent-${counter}`, counter === 2);
      });

      const configs: AgentConfig[] = [
        { path: '/agent1.md' },
        { path: '/agent2.md' },
        { path: '/agent3.md' },
      ];

      try {
        await spawnParallelAgents(adapter, configs);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(MultiAgentError);
        const multiError = error as MultiAgentError;
        expect(multiError.successful).toHaveLength(2); // agent1 and agent3 succeeded
        expect(multiError.failed).toHaveLength(1); // agent2 failed
      }
    });

    it('MultiAgentError contains failure details', async () => {
      const adapter = createMockAdapter(async () => {
        return createMockAgentInstance('failing', true);
      });

      const configs: AgentConfig[] = [{ path: '/failing.md' }];

      try {
        await spawnParallelAgents(adapter, configs);
        expect.fail('Should have thrown');
      } catch (error) {
        const multiError = error as MultiAgentError;
        expect(multiError.failed[0].config.path).toBe('/failing.md');
        expect(multiError.failed[0].error.message).toContain('failed');
      }
    });
  });

  describe('empty input handling', () => {
    it('returns empty array for empty configs', async () => {
      const adapter = createMockAdapter(async () => {
        throw new Error('Should not be called');
      });

      const results = await spawnParallelAgents(adapter, []);
      expect(results).toEqual([]);
    });
  });
});
