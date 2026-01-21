---
phase: 05-lifecycle-hooks
plan: 02
subsystem: hooks
tags: [adapters, hooks, statusline, capability-pattern, graceful-degradation]

# Dependency graph
requires:
  - phase: 05-01
    provides: Idempotent hook registration for Claude Code, silent no-op for OpenCode
provides:
  - Capability-based hook registration in install.js
  - Capability-based statusline configuration in install.js
affects: [05-03, 05-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Capability check pattern: adapter.supportsX() before feature usage"
    - "Platform-agnostic code via adapter abstraction"

key-files:
  created: []
  modified:
    - bin/install.js

key-decisions:
  - "INSTALL-02: Use adapter.supportsHooks() instead of platform === 'claude-code' for hook registration"
  - "INSTALL-03: Use adapter.supportsStatusLine() instead of hardcoded platform checks for statusline config"

patterns-established:
  - "Capability pattern: Check adapter.supportsX() before attempting platform-specific features"
  - "Silent degradation: Unsupported features skip silently without error or log"

# Metrics
duration: 2min
completed: 2026-01-21
---

# Phase 5 Plan 2: Cross-platform install.js Integration Summary

**Capability-based hook and statusline registration using adapter.supportsHooks() and adapter.supportsStatusLine()**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-21T17:28:45Z
- **Completed:** 2026-01-21T17:30:29Z
- **Tasks:** 3
- **Files modified:** 1

## Accomplishments
- Hook registration now uses adapter.supportsHooks() instead of hardcoded platform check
- StatusLine configuration now uses adapter.supportsStatusLine() in both finishInstall() and handleStatusline()
- handleStatusline() skips prompt entirely if platform doesn't support statusline
- installForPlatform() creates adapter and passes to capability-checking functions
- install.js is now platform-agnostic for hook and statusline features

## Task Commits

Each task was committed atomically:

1. **Task 1: Add capability checks for hook registration** - `87a736c` (feat)
2. **Task 2: Add capability check for statusline configuration** - `ee90eec` (feat)
3. **Task 3: Verify cross-platform installation simulation** - N/A (verification only)

## Files Created/Modified
- `bin/install.js` - Updated hook and statusline registration to use adapter capability checks

## Decisions Made

1. **INSTALL-02: Capability-based hook registration** - Changed `platform === 'claude-code'` to `adapter.supportsHooks()` for hook registration. This makes the code platform-agnostic and allows the adapter to determine capability.

2. **INSTALL-03: Capability-based statusline configuration** - Added `adapter.supportsStatusLine()` checks to both finishInstall() and handleStatusline(). The prompt is skipped entirely if platform doesn't support statusline.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- install.js now uses capability-based checks for all hook and statusline operations
- Claude Code: Registers hooks and statusline as before
- OpenCode: Silently skips hooks and statusline per graceful degradation
- Ready for 05-03-PLAN.md: Human verification of cross-platform installation

---
*Phase: 05-lifecycle-hooks*
*Completed: 2026-01-21*
