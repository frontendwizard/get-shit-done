---
phase: 04-agent-spawning-abstraction
plan: 01
subsystem: platform
tags: [typescript, child_process, agent-spawning, platform-abstraction]

# Dependency graph
requires:
  - phase: 03-opencode-adapter
    provides: Platform adapter implementations
  - phase: 02-adapter-integration
    provides: PlatformAdapter interface with AgentInstance
  - phase: 01-detection-paths
    provides: TypeScript foundation and platform detection
provides:
  - ClaudeCodeAgentInstance class for Task tool agent tracking
  - OpenCodeAgentInstance class for subprocess-based agent tracking
  - Platform-agnostic agent lifecycle tracking interface implementations
affects:
  - 04-02 (Claude Code spawnAgent implementation)
  - 04-03 (OpenCode spawnAgent implementation)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "AgentInstance wrapper pattern for unified status tracking"
    - "Process monitoring with 'close' event (not 'exit') for reliable completion"
    - "'error' event listening for spawn failure detection"

key-files:
  created:
    - src/platform/adapters/claude-code-agent.ts
    - src/platform/adapters/opencode-agent.ts
  modified:
    - src/platform/index.ts

key-decisions:
  - "Use 'close' event (not 'exit') for process completion to ensure streams fully closed"
  - "Listen to 'error' event for immediate spawn failure detection"
  - "ClaudeCodeAgentInstance uses placeholder completion detection (Task tool API TBD)"
  - "OpenCodeAgentInstance wraps ChildProcess for subprocess monitoring"

patterns-established:
  - "Platform-specific AgentInstance implementations for unified lifecycle tracking"
  - "Completion promise pattern for async agent awaiting"
  - "Status tracking: running → completed | failed"

# Metrics
duration: 2min
completed: 2026-01-21
---

# Phase 04 Plan 01: Agent Spawning Abstraction Summary

**Platform-specific AgentInstance implementations with unified status tracking, completion promises, and subprocess monitoring for multi-agent workflows**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-21T14:32:43Z
- **Completed:** 2026-01-21T14:34:15Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- ClaudeCodeAgentInstance implements AgentInstance interface with Task tool tracking model
- OpenCodeAgentInstance implements AgentInstance with ChildProcess monitoring
- Both classes provide unified status tracking (running/completed/failed)
- Reliable process completion detection using 'close' event (not 'exit')
- Spawn failure detection via 'error' event listeners
- Exports available from src/platform/index.ts for adapter use

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ClaudeCodeAgentInstance** - `c51db18` (feat)
2. **Task 2: Create OpenCodeAgentInstance with Process Monitoring** - `0156900` (feat)
3. **Task 3: Export AgentInstance Implementations from Index** - `e65fb6a` (feat)

## Files Created/Modified
- `src/platform/adapters/claude-code-agent.ts` - AgentInstance implementation for Claude Code platform with Task tool tracking model (123 lines)
- `src/platform/adapters/opencode-agent.ts` - AgentInstance implementation for OpenCode platform with ChildProcess subprocess monitoring (140 lines)
- `src/platform/index.ts` - Added exports for ClaudeCodeAgentInstance and OpenCodeAgentInstance

## Decisions Made

**AGENT-01: Use 'close' event (not 'exit') for process completion**
- Rationale: 'close' event fires after all streams are closed, ensuring complete output collection. 'exit' fires before streams finish, causing intermittent missing output.
- Implementation: OpenCodeAgentInstance listens to 'close' event for final exit code
- Based on: Phase 4 research (04-RESEARCH.md Pitfall #2)

**AGENT-02: Listen to 'error' event for spawn failures**
- Rationale: spawn() doesn't throw immediately - errors emit via 'error' event. Without this listener, spawn failures are silent.
- Implementation: Both instances attach 'error' event listeners in constructor
- Based on: Phase 4 research (04-RESEARCH.md Pitfall #3)

**AGENT-03: ClaudeCodeAgentInstance uses placeholder completion**
- Rationale: Task tool is native to Claude Code platform (runs in markdown). TypeScript implementation provides tracking interface, not Task invocation.
- Implementation: Placeholder watchForCompletion() method, actual Task tool integration TBD
- Note: Real Task tool invocation happens in markdown workflow files

**AGENT-04: OpenCodeAgentInstance includes getStderr() helper**
- Rationale: Useful for debugging failed agents - stderr contains error diagnostics
- Implementation: Public getStderr() method returns collected stderr
- Note: stderr is also included in rejection error messages

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Issue: TypeScript JSDoc syntax error with glob pattern**
- Found during: Task 1 compilation
- Problem: JSDoc comment contained `*.md` glob pattern which TypeScript parser misinterpreted
- Solution: Changed comment from "Agents write to .planning/research/*.md or .planning/phases/*/*.md" to "Agents write to .planning/research/ or .planning/phases/ directories"
- Impact: Minor documentation clarification, no functional change

## Next Phase Readiness

**Ready for:**
- Plan 04-02: Claude Code spawnAgent() implementation can use ClaudeCodeAgentInstance
- Plan 04-03: OpenCode spawnAgent() implementation can use OpenCodeAgentInstance with spawn()

**Dependencies satisfied:**
- AgentInstance interface implemented for both platforms
- Status tracking (running/completed/failed) working
- Completion promises structured correctly
- Process monitoring uses reliable 'close' and 'error' events
- All exports available from src/platform/index.ts

**No blockers or concerns.**

---
*Phase: 04-agent-spawning-abstraction*
*Completed: 2026-01-21*
