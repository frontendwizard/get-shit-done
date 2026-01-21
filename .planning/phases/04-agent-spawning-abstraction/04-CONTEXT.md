# Phase 4: Agent Spawning Abstraction - Context

**Gathered:** 2026-01-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Abstract parallel agent orchestration (4-7 agents simultaneously) across both Claude Code and OpenCode platforms. This phase makes existing multi-agent workflows (like `new-project` with 4 researchers + 1 synthesizer) work transparently on both platforms.

**Core principle:** This is platform abstraction, NOT feature addition. The goal is to replicate current Claude Code behavior exactly on OpenCode.

</domain>

<decisions>
## Implementation Decisions

### Agent Invocation Mechanism
- Platform-specific CLI commands (Claude Code uses one command, OpenCode uses another)
- Adapter maps Task() calls to the right platform command
- Keep current Task(prompt='...', subagent_type='gsd-xxx') pattern in workflows
- No extraction of prompts to files — prompts passed directly as command arguments (current behavior)
- Adapter provides full command template: `adapter.spawnAgent(type, prompt)` returns array like `['claude-code', 'task', '--type', type, '--prompt', prompt]`

### Parallel Execution Coordination
- **Research-first approach:** Investigate how Claude Code's Task tool currently handles parallel spawning
- Replicate exact current behavior (don't add concurrency features)
- Understand Task tool internals to design OpenCode equivalent
- Adapter should expose spawning API that minimizes workflow changes while maximizing platform flexibility

### Failure Detection & Recovery
- Match current Claude Code behavior for spawn failures (investigate what happens now)
- Platform-specific detection: each adapter decides how to detect failure (Claude Code uses Task tool signals, OpenCode might use exit codes)
- Detailed error reporting: surface agent name, platform, exit code, stderr when failures occur
- Retry behavior: match whatever Claude Code Task tool does (investigate whether it retries)

### Output Collection & Verification
- Research current completion detection: how does Claude Code Task tool signal when agents finish?
- Research output collection: where does Task tool collect agent output from (files, stdout, both)?
- No changes to validation logic — just swap the agent runner, keep behavior identical
- After all agents complete: match current behavior exactly (no new post-processing unless research reveals platform differences)

### Claude's Discretion
- Choose subprocess spawning library (child_process.spawn vs exec vs other)
- Exact argument escaping/sanitization approach
- Timeout values (if not already defined in current implementation)
- Logging verbosity and format
- Temporary file cleanup strategy (if needed for cross-platform compatibility)

</decisions>

<specifics>
## Specific Ideas

- "Investigate what is being done now on Claude Code, replicate" — user's recurring theme
- Current pattern uses Task() calls in command markdown files (e.g., new-project.md lines 371, 410, 449, 488, 512)
- Agent definitions live in ~/.claude/subagents/ as markdown files (11 GSD agents currently)
- Success criteria from ROADMAP.md emphasize "no silent failures" — detection must be reliable

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. No concurrency improvements or feature additions suggested.

</deferred>

---

*Phase: 04-agent-spawning-abstraction*
*Context gathered: 2026-01-21*
