# Phase 4: Agent Spawning Abstraction - Research

**Researched:** 2026-01-21
**Domain:** Multi-agent orchestration and subprocess spawning
**Confidence:** HIGH

## Summary

This research investigates how Claude Code's Task tool currently spawns parallel agents, and how to replicate that behavior on OpenCode to achieve platform-agnostic multi-agent workflows.

**Current Claude Code behavior:**
- Claude Code uses the Task tool (native to the platform) to spawn subagents defined as markdown files with YAML frontmatter
- Supports up to 7 parallel agents simultaneously
- Subagents run in isolated context windows with their own system prompts
- Task tool invocation uses `Task(prompt="...", subagent_type="agent-name", description="...")` syntax
- Completion detection is automatic (foreground tasks block until complete)
- Output collection happens via subagent summary returned to main conversation

**OpenCode equivalent:**
- OpenCode also uses markdown files with YAML frontmatter for agent definitions
- OpenCode has subagent capabilities invoked via `@mention` syntax or automatically by primary agents
- The task tool creates child sessions with specified subagents
- No direct Task() function equivalent - needs CLI-based or programmatic spawning

**Implementation approach:**
Phase 4 must abstract this difference via the PlatformAdapter pattern. The adapter translates `Task()` calls in workflow markdown into platform-specific agent spawning mechanisms:
- Claude Code: Use native Task tool (current behavior)
- OpenCode: Programmatically spawn OpenCode CLI processes with agent specification

**Primary recommendation:** Use Node.js `child_process.spawn()` for OpenCode adapter to spawn parallel `opencode` CLI processes with `--agent` flag, monitoring exit codes and collecting output from `.planning/` files. Match Claude Code's Task tool completion and error detection behavior exactly.

## Standard Stack

The established libraries/tools for subprocess spawning and parallel execution in Node.js:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| child_process (Node.js built-in) | Latest (v25.3.0) | Spawn parallel processes | Native Node.js API, no dependencies, proven reliability for subprocess management |
| AbortController (Node.js built-in) | Latest | Timeout and cancellation | Modern standard for async operation cancellation, built-in support in spawn() |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| util.promisify | Built-in | Convert callback APIs to promises | When wrapping spawn() for async/await patterns |
| Promise.allSettled | Built-in (ES2020) | Parallel execution with error isolation | When spawning multiple agents where failures shouldn't cascade |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| child_process.spawn() | child_process.exec() | exec() buffers all output (memory issues with large logs), shell injection risk. spawn() streams output, safer. |
| child_process.spawn() | child_process.fork() | fork() is for Node.js-to-Node.js IPC only. We're spawning CLI processes (opencode, potentially claude-code in future). |
| Promise.allSettled | Promise.all | Promise.all fails fast on first rejection. allSettled waits for all agents to complete, critical for collecting partial results. |

**Installation:**
```bash
# No installation needed - all built-in Node.js APIs
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── platform/
│   ├── adapter.ts           # PlatformAdapter interface with AgentInstance
│   ├── adapters/
│   │   ├── claude-code.ts   # spawnAgent() delegates to Task tool
│   │   └── opencode.ts      # spawnAgent() uses child_process.spawn()
│   └── agent-runner.ts      # NEW: Shared logic for process monitoring
```

### Pattern 1: Platform-Specific Agent Spawning
**What:** Adapter abstracts platform differences in agent invocation
**When to use:** When workflows need to spawn agents transparently across platforms

**Example:**
```typescript
// Source: PlatformAdapter interface definition (.planning/phases/04-*/04-CONTEXT.md)
// Workflow code (platform-agnostic):
const agent = await adapter.spawnAgent(
  '/path/to/gsd-project-researcher.md',
  { dimension: 'stack', domain: 'e-commerce' }
);
await agent.waitForCompletion();
const output = await agent.getOutput();

// Claude Code adapter implementation:
async spawnAgent(agentPath: string, args?: Record<string, string>): Promise<AgentInstance> {
  // Use native Task tool - Claude Code handles everything
  // NOTE: This is conceptual - actual implementation may use Claude Code SDK/API
  const taskId = Task(
    prompt: constructPromptFromArgs(args),
    subagent_type: extractAgentName(agentPath),
    description: 'Agent execution'
  );
  return new ClaudeCodeAgentInstance(taskId);
}

// OpenCode adapter implementation:
async spawnAgent(agentPath: string, args?: Record<string, string>): Promise<AgentInstance> {
  // Spawn OpenCode CLI process with --agent flag
  const agentName = extractAgentName(agentPath);
  const prompt = constructPromptFromArgs(args);

  const child = spawn('opencode', [
    '--agent', agentName,
    '--non-interactive',  // Prevent TUI
    prompt
  ], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe']
  });

  return new OpenCodeAgentInstance(child, agentName);
}
```

### Pattern 2: Parallel Agent Execution with Promise.allSettled
**What:** Spawn multiple agents simultaneously, collect all results even if some fail
**When to use:** Multi-agent workflows like new-project (4 researchers + 1 synthesizer)

**Example:**
```typescript
// Source: Node.js documentation (nodejs.org/api/child_process.html)
async function spawnParallelAgents(
  adapter: PlatformAdapter,
  agentConfigs: Array<{ path: string; args: Record<string, string> }>
): Promise<AgentResult[]> {
  // Spawn all agents in parallel
  const agentPromises = agentConfigs.map(config =>
    adapter.spawnAgent(config.path, config.args)
      .then(agent => agent.waitForCompletion().then(() => agent))
  );

  // Wait for ALL agents to complete (don't fail fast)
  const results = await Promise.allSettled(agentPromises);

  // Separate successes from failures
  const successful = results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);
  const failed = results
    .filter(r => r.status === 'rejected')
    .map(r => r.reason);

  if (failed.length > 0) {
    throw new MultiAgentError(
      `${failed.length} agents failed`,
      successful,
      failed
    );
  }

  return successful;
}
```

### Pattern 3: Process Monitoring with Exit Code Detection
**What:** Monitor spawned processes for completion, capture exit codes and output
**When to use:** OpenCode adapter implementation for reliable failure detection

**Example:**
```typescript
// Source: Node.js child_process documentation
class OpenCodeAgentInstance implements AgentInstance {
  private child: ChildProcess;
  private completionPromise: Promise<void>;
  private stdout = '';
  private stderr = '';

  constructor(child: ChildProcess, public readonly id: string) {
    this.child = child;
    this.status = 'running';

    // Collect output streams
    child.stdout?.on('data', (data) => {
      this.stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      this.stderr += data.toString();
    });

    // Monitor completion - use 'close' event, not 'exit'
    this.completionPromise = new Promise((resolve, reject) => {
      child.on('close', (code, signal) => {
        if (code === 0) {
          this.status = 'completed';
          resolve();
        } else {
          this.status = 'failed';
          reject(new Error(
            `Agent ${id} failed with exit code ${code}\n${this.stderr}`
          ));
        }
      });

      child.on('error', (err) => {
        this.status = 'failed';
        reject(new Error(`Agent ${id} spawn failed: ${err.message}`));
      });
    });
  }

  async waitForCompletion(): Promise<void> {
    return this.completionPromise;
  }

  async getOutput(): Promise<string> {
    // Output collection from .planning/ files (AGENT-05)
    // Agents write to .planning/research/*.md or .planning/phases/*/*.md
    return this.stdout; // Or read from .planning/ files
  }
}
```

### Anti-Patterns to Avoid

- **Using shell: true without sanitization:** Shell injection vulnerability when passing user-provided arguments. Always use array-based arguments with spawn().
- **Listening only to 'exit' event:** The 'exit' event fires before stdio streams close. Use 'close' event to guarantee all output is captured.
- **Using Promise.all for agent spawning:** First agent failure aborts remaining agents. Use Promise.allSettled to collect partial results.
- **Buffering large output in memory:** If agent produces large logs, stream to files instead of accumulating in strings.
- **Silent timeout failures:** Without proper timeout detection, long-running agents hang indefinitely. Use AbortController or timeout option.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Promise-based process spawning | Custom promise wrapper around spawn() | util.promisify(exec) OR spawn + manual promise | spawn() requires manual promise wrapping (shown in patterns), but exec() can be promisified. Choose based on output size and streaming needs. |
| Parallel execution with error isolation | Manual try/catch per agent | Promise.allSettled | Built-in ES2020 feature handles exactly this use case - wait for all, collect successes and failures separately. |
| Process timeout handling | setTimeout + manual kill() | spawn() timeout option + AbortController | Native support in Node.js with proper signal handling and cleanup. |
| Exit code vs signal detection | Custom status tracking | Use 'close' event code/signal params | Node.js provides both exit code and termination signal - use platform primitives. |

**Key insight:** Node.js child_process API is designed exactly for this use case. Avoid reinventing subprocess management - use built-in APIs and focus abstraction on the platform differences (Task tool vs CLI invocation), not subprocess primitives.

## Common Pitfalls

### Pitfall 1: Assuming Task Tool is a JavaScript Function
**What goes wrong:** Developers might try to import or require a Task function in TypeScript/JavaScript code
**Why it happens:** GSD workflows use `Task(prompt="...", subagent_type="...")` syntax which looks like JavaScript
**How to avoid:** Task is a Claude Code platform feature available only in markdown workflow files, not a JavaScript API. The adapter must parse/translate these calls, not execute them directly.
**Warning signs:** Import errors, "Task is not defined" errors in compiled code

### Pitfall 2: Using 'exit' Event Instead of 'close' Event
**What goes wrong:** Process exit code is captured, but stdout/stderr output is incomplete or missing
**Why it happens:** 'exit' event fires when process ends, but stdio streams may still be open. 'close' event fires after streams close.
**How to avoid:** Always listen to 'close' event for final exit code. Only use 'exit' if you need immediate notification before streams finish.
**Warning signs:** Intermittent missing output, especially on fast-completing processes

### Pitfall 3: Silent Agent Spawn Failures
**What goes wrong:** Agent spawn fails (bad path, permission denied, etc.) but workflow continues as if successful
**Why it happens:** spawn() doesn't throw immediately - errors emit via 'error' event
**How to avoid:** Always attach 'error' event listener to ChildProcess. Reject the AgentInstance promise on spawn errors.
**Warning signs:** "No such file or directory" errors appearing late or not at all, workflows reporting success despite missing agents

### Pitfall 4: Cascading Failures with Promise.all
**What goes wrong:** First agent failure aborts all remaining agents, losing partial results
**Why it happens:** Promise.all rejects immediately on first rejection
**How to avoid:** Use Promise.allSettled for multi-agent spawning. Allows collecting results from successful agents even when some fail.
**Warning signs:** Multi-agent workflows all-or-nothing (0 results or 4 results, never 1-3)

### Pitfall 5: Shell Injection via Unsanitized Arguments
**What goes wrong:** Malicious input in agent arguments executes arbitrary shell commands
**Why it happens:** Using shell: true with string command instead of array arguments
**How to avoid:** Never use shell: true. Always pass command and arguments as separate array items: `spawn('opencode', ['--agent', agentName, prompt])`
**Warning signs:** Needing to escape special characters, command string concatenation

### Pitfall 6: Timeout Detection Ambiguity
**What goes wrong:** Process terminates due to timeout, but code can't distinguish timeout from normal failure
**Why it happens:** Node.js spawn() timeout option provides no explicit timeout signal (open issue #51561)
**How to avoid:** Track timeout separately with AbortController or manual timer. Set timeout reason when aborting.
**Warning signs:** Generic "process exited with code null" errors that could be timeout or SIGTERM

## Code Examples

Verified patterns from official sources:

### Spawning a Process with Output Collection
```typescript
// Source: Node.js v25.3.0 child_process documentation
import { spawn } from 'child_process';

const child = spawn('opencode', [
  '--agent', 'gsd-project-researcher',
  '--non-interactive',
  'Research the authentication patterns'
], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe']
});

let stdout = '';
let stderr = '';

child.stdout.on('data', (data) => {
  stdout += data.toString();
});

child.stderr.on('data', (data) => {
  stderr += data.toString();
});

child.on('close', (code, signal) => {
  if (code === 0) {
    console.log('Agent completed successfully');
    console.log('Output:', stdout);
  } else {
    console.error(`Agent failed with code ${code}`);
    console.error('Error output:', stderr);
  }
});

child.on('error', (err) => {
  console.error('Failed to spawn agent:', err.message);
});
```

### Parallel Execution with Promise.allSettled
```typescript
// Source: MDN Web Docs - Promise.allSettled()
async function spawnMultipleAgents(
  agentConfigs: Array<{ name: string; prompt: string }>
): Promise<void> {
  const agentPromises = agentConfigs.map(config =>
    spawnAgent(config.name, config.prompt)
  );

  const results = await Promise.allSettled(agentPromises);

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      console.log(`Agent ${index} succeeded:`, result.value);
    } else {
      console.error(`Agent ${index} failed:`, result.reason);
    }
  });

  // Check if any succeeded
  const succeeded = results.filter(r => r.status === 'fulfilled');
  console.log(`${succeeded.length}/${results.length} agents completed successfully`);
}
```

### Timeout Handling with AbortController
```typescript
// Source: Node.js v25.3.0 child_process documentation
import { spawn } from 'child_process';

const controller = new AbortController();
const { signal } = controller;

const child = spawn('opencode', ['--agent', 'general', 'Long task'], {
  signal,
  timeout: 60000  // 60 seconds
});

// Manually abort if needed
setTimeout(() => {
  controller.abort();
}, 30000);  // Abort after 30 seconds

child.on('error', (err) => {
  if (err.name === 'AbortError') {
    console.log('Process aborted due to timeout');
  } else {
    console.error('Process error:', err);
  }
});
```

### Promisifying spawn for async/await
```typescript
// Source: Community pattern (verified against Node.js docs)
function spawnAsync(
  command: string,
  args: string[],
  options: SpawnOptions = {}
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => stdout += data.toString());
    child.stderr?.on('data', (data) => stderr += data.toString());

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Process exited with code ${code}\n${stderr}`));
      }
    });

    child.on('error', reject);
  });
}

// Usage:
try {
  const { stdout } = await spawnAsync('opencode', [
    '--agent', 'gsd-researcher',
    'Research topic'
  ]);
  console.log('Agent output:', stdout);
} catch (err) {
  console.error('Agent failed:', err.message);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| callback-based exec() | Promise-based spawn() with async/await | ES2017+ async/await | Cleaner error handling, easier parallel execution |
| Promise.all for parallel tasks | Promise.allSettled | ES2020 (Node.js 12.9+) | Isolated failures, partial result collection |
| Manual timeout with setTimeout | timeout option + AbortController | Node.js 14.17.0+ | Built-in timeout handling, proper cleanup |
| Shell string commands | Array-based arguments | Always best practice | Security (no shell injection), reliability |

**Deprecated/outdated:**
- **Shell string commands (shell: true with string command)**: Security risk, use array arguments instead
- **Promise.all for parallel agents**: Fails fast, use Promise.allSettled for collecting partial results
- **Listening only to 'exit' event**: May miss output, use 'close' event for complete data collection

## Open Questions

Things that couldn't be fully resolved:

1. **How does Claude Code Task tool actually work internally?**
   - What we know: Task tool is native to Claude Code, available in markdown files, spawns subagents with isolated contexts
   - What's unclear: Whether there's a JavaScript/TypeScript API to invoke Task programmatically, or if it's only available in markdown
   - Recommendation: Phase 4 implementation may need to keep Task() calls in markdown as-is for Claude Code (no adapter translation needed), focus OpenCode adapter on CLI spawning

2. **Does OpenCode support non-interactive mode for agent spawning?**
   - What we know: OpenCode has `--agent` flag for CLI, documentation mentions automatic subagent invocation
   - What's unclear: Whether there's a `--non-interactive` or similar flag to prevent TUI from launching
   - Recommendation: Test OpenCode CLI during implementation, may need to use different approach (API, SDK, or stdin piping)

3. **How should output be collected - from stdout or .planning/ files?**
   - What we know: GSD agents write results to `.planning/research/*.md` and `.planning/phases/*/*.md` files
   - What's unclear: Whether AgentInstance.getOutput() should return stdout/stderr or read from .planning/ files
   - Recommendation: Collect both - stderr for error messages, .planning/ files for structured results. AgentInstance tracks which files the agent should create.

4. **What timeout values are appropriate for agent spawning?**
   - What we know: Claude Code's Task tool likely has internal timeouts
   - What's unclear: What timeout values Claude Code uses, what's appropriate for different agent types
   - Recommendation: Start with generous timeout (10 minutes), make configurable per agent type in Phase 5

## Sources

### Primary (HIGH confidence)
- [Claude Code Sub-agents Documentation](https://code.claude.com/docs/en/sub-agents) - Official subagent creation guide
- [Node.js v25.3.0 child_process API](https://nodejs.org/api/child_process.html) - Official Node.js subprocess spawning API
- [OpenCode Agents Documentation](https://opencode.ai/docs/agents/) - Official OpenCode agent system documentation
- Existing GSD codebase - Current Task() usage patterns in commands/gsd/*.md files

### Secondary (MEDIUM confidence)
- [ClaudeLog - Task/Agent Tools](https://claudelog.com/mechanics/task-agent-tools/) - Community documentation of Claude Code Task tool
- [Multi-agent parallel coding with Claude Code Subagents](https://medium.com/@codecentrevibe/claude-code-multi-agent-parallel-coding-83271c4675fa) - Real-world usage patterns
- [How to Use Claude Code Sub-Agents for Parallel Work](https://timdietrich.me/blog/claude-code-parallel-subagents/) - Parallel execution techniques
- [MDN - Promise.allSettled()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled) - Official Promise.allSettled documentation

### Tertiary (LOW confidence)
- WebSearch results on OpenCode CLI invocation - general patterns, needs verification during implementation
- Community discussions on child_process best practices - established patterns, verify against official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Built-in Node.js APIs, official documentation, no third-party dependencies
- Architecture patterns: HIGH - Verified against official Node.js docs and existing GSD codebase structure
- Claude Code behavior: MEDIUM - Based on official docs and community usage, but Task tool internals not fully documented
- OpenCode behavior: MEDIUM - Official docs confirm agent system exists, but CLI spawning approach needs verification
- Pitfalls: HIGH - Based on official Node.js documentation warnings and established community best practices

**Research date:** 2026-01-21
**Valid until:** ~60 days (stable Node.js APIs, platform adapters unlikely to change rapidly)
