---
phase: 06-testing-validation
plan: 03
subsystem: testing
tags: [vitest, memfs, contract-tests, platform-adapter, typescript]

# Dependency graph
requires:
  - phase: 06-01
    provides: Vitest testing infrastructure with memfs mocking
  - phase: 01-02
    provides: PlatformAdapter interface contract
provides:
  - Shared adapter contract test suite (runAdapterContractTests)
  - ClaudeCodeAdapter contract tests (41 tests)
  - OpenCodeAdapter contract tests (43 tests)
  - Interface compliance verification for both adapters
affects: [06-04, 06-05, 06-06]

# Tech tracking
tech-stack:
  added: []
  patterns: [shared-contract-tests, memfs-mocking, factory-pattern-tests]

key-files:
  created:
    - tests/contract/adapter.contract.ts
    - tests/contract/claude-code.contract.test.ts
    - tests/contract/opencode.contract.test.ts
  modified: []

key-decisions:
  - "CONTRACT-01: Shared contract suite with factory pattern for adapter instantiation"
  - "CONTRACT-02: Catch unhandled promise rejections in signature tests to prevent test noise"
  - "CONTRACT-03: memfs mocking via vi.mock('fs', () => memfs) for filesystem isolation"

patterns-established:
  - "Contract test location: tests/contract/*.contract.test.ts"
  - "Shared test suite: export function to run common tests across implementations"
  - "Platform-specific tests: separate describe block after shared tests"

# Metrics
duration: 4min
completed: 2026-01-21
---

# Phase 6 Plan 3: Adapter Contract Tests Summary

**Shared contract test suite verifying both ClaudeCodeAdapter and OpenCodeAdapter satisfy PlatformAdapter interface with 84 total tests**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-21T21:22:00Z
- **Completed:** 2026-01-21T21:26:00Z
- **Tasks:** 3
- **Files created:** 3

## Accomplishments
- Created shared adapter contract test suite with 22 tests per adapter
- Verified ClaudeCodeAdapter implementation with 41 tests (shared + platform-specific)
- Verified OpenCodeAdapter implementation with 43 tests (shared + platform-specific)
- All tests use memfs for complete filesystem isolation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared adapter contract test suite** - `71ea6a2` (test)
2. **Task 2: Create Claude Code adapter contract tests** - `626802f` (test)
3. **Task 3: Create OpenCode adapter contract tests** - `e40195e` (test)

## Files Created

- `tests/contract/adapter.contract.ts` - Shared runAdapterContractTests() function with 22 contract tests
- `tests/contract/claude-code.contract.test.ts` - ClaudeCodeAdapter tests (41 total: shared + 19 platform-specific)
- `tests/contract/opencode.contract.test.ts` - OpenCodeAdapter tests (43 total: shared + 21 platform-specific)

## Contract Tests Implemented

### Shared Contract Suite (per adapter)
- Path Resolution Contract: 7 tests (absolute paths, directory hierarchy)
- Platform Identity Contract: 2 tests (valid name, non-empty version)
- Capability Contract: 3 tests (boolean return types)
- Config Methods Contract: 3 tests (Promise signatures)
- Hook Methods Contract: 2 tests (Promise signatures)
- Agent Methods Contract: 1 test (method existence)
- Command Methods Contract: 2 tests (method existence)

### ClaudeCodeAdapter Platform-Specific
- Capabilities: all true (parallel, statusline, hooks)
- Config read/write with settings.json
- Hook registration idempotency
- Agent spawning with file validation

### OpenCodeAdapter Platform-Specific
- Capabilities: parallel=true, statusline=false, hooks=false
- Config read with JSON and JSONC support (prefers .json)
- Config write always outputs JSON (not JSONC)
- Graceful degradation for hook registration (silent no-op)
- Path uses /command/ (singular) with /gsd namespace

## Decisions Made

**CONTRACT-01: Shared contract suite pattern**
- **Rationale:** Factory pattern allows same tests to run against any PlatformAdapter implementation
- **Impact:** Ensures both adapters satisfy identical interface contracts

**CONTRACT-02: Catch unhandled promise rejections**
- **Rationale:** Signature tests only verify return type, but filesystem operations may fail without mocks
- **Impact:** Clean test output without false positive errors

**CONTRACT-03: memfs mocking approach**
- **Rationale:** vi.mock('fs', () => memfs) properly intercepts both 'fs' and 'node:fs' imports
- **Impact:** Complete filesystem isolation in tests

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed unhandled promise rejections in contract tests**
- **Found during:** Task 2 (Claude Code tests)
- **Issue:** Contract tests called writeConfig/mergeConfig/registerHook but didn't await them, causing unhandled promise rejections when memfs directories didn't exist
- **Fix:** Added .catch(() => {}) to await promises in signature verification tests
- **Files modified:** tests/contract/adapter.contract.ts
- **Verification:** Test run completes without unhandled errors
- **Committed in:** 626802f (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor fix to prevent test noise. No scope creep.

## Issues Encountered
None - all tests pass and contract verification complete.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Contract tests in place for ongoing adapter development
- Ready for 06-04: Integration tests or 06-05: E2E tests
- Test infrastructure proven for both adapter implementations
- memfs mocking pattern established for future filesystem tests

---
*Phase: 06-testing-validation*
*Completed: 2026-01-21*
