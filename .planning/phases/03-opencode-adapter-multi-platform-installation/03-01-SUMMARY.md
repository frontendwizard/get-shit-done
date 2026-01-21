---
phase: 03-opencode-adapter-multi-platform-installation
plan: 01
subsystem: infra
tags: [dependencies, opencode, inquirer, jsonc-parser, platform-paths]

# Dependency graph
requires:
  - phase: 02-claude-code-adapter-backward-compatibility
    provides: Platform abstraction foundation with PathResolver interface
provides:
  - Phase 3 runtime dependencies (@inquirer/checkbox, jsonc-parser)
  - Corrected OpenCode command directory path structure (/command/gsd/)
affects: [03-02-opencode-adapter, 03-03-multi-platform-installer]

# Tech tracking
tech-stack:
  added: ['@inquirer/checkbox@3.0.1', 'jsonc-parser@3.3.1']
  patterns: ['OpenCode uses singular command/ directory with gsd/ namespacing']

key-files:
  created: []
  modified: ['package.json', 'src/platform/paths.ts']

key-decisions:
  - "DEPS-01: Added @inquirer/checkbox and jsonc-parser as runtime dependencies (not devDependencies)"
  - "PATH-01: Corrected OpenCodePaths to use /command/gsd/ (singular with namespacing) instead of /commands/ (plural)"

patterns-established:
  - "OpenCode path structure: {configDir}/command/gsd/ mirrors Claude Code's {configDir}/commands/gsd/ pattern"

# Metrics
duration: 1min
completed: 2026-01-21
---

# Phase 03 Plan 01: Dependencies and Path Corrections Summary

**Runtime dependencies for Phase 3 multi-platform installer and corrected OpenCode command directory to /command/gsd/ structure**

## Performance

- **Duration:** 1 min
- **Started:** 2026-01-21T11:04:16Z
- **Completed:** 2026-01-21T11:05:16Z
- **Tasks:** 2 completed (Task 3 was verification-only, no changes needed)
- **Files modified:** 2

## Accomplishments
- Added @inquirer/checkbox (multi-select TUI) and jsonc-parser (JSONC config parsing) as runtime dependencies
- Fixed OpenCodePaths.getCommandsDir() to return correct /command/gsd/ path structure
- Verified TypeScript compilation and platform module exports integrity

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Phase 3 dependencies to package.json** - `aaa45ad` (chore)
2. **Task 2: Fix OpenCodePaths command directory path** - `9c344a7` (fix)

Task 3 (Export verification) required no changes - exports already correct.

## Files Created/Modified
- `package.json` - Added dependencies section with @inquirer/checkbox and jsonc-parser
- `src/platform/paths.ts` - Corrected OpenCodePaths.getCommandsDir() to use /command/gsd/ path

## Decisions Made

**DEPS-01: Runtime dependencies for Phase 3 libraries**
- Added @inquirer/checkbox and jsonc-parser to "dependencies" (not devDependencies)
- Rationale: Both used at runtime (install.js for TUI, OpenCodeAdapter for config parsing)
- Versions: @inquirer/checkbox@3.0.1, jsonc-parser@3.3.1

**PATH-01: OpenCode uses singular 'command' directory**
- Research revealed OpenCode uses `.opencode/command/` (singular) not `commands/` (plural)
- Added `gsd` subdirectory for namespacing to prevent collision with user's custom commands
- Final structure: {configDir}/command/gsd/ (matches Claude Code pattern)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - dependencies resolved correctly, TypeScript compilation succeeded without errors.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Plan 03-02 (OpenCode Adapter Implementation):
- Dependencies installed and verified
- OpenCodePaths returns correct directory structure
- Platform module exports intact and functional

No blockers. OpenCode adapter can now be implemented using jsonc-parser for config handling and correct command directory paths.

---
*Phase: 03-opencode-adapter-multi-platform-installation*
*Completed: 2026-01-21*
