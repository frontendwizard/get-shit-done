---
phase: 01-platform-abstraction-foundation
plan: 03
subsystem: infra
tags: [typescript, platform-abstraction, installation, path-resolution]

# Dependency graph
requires:
  - phase: 01-02
    provides: PathResolver interface and PlatformRegistry for runtime path resolution
  - phase: 01-04
    provides: TypeScript build infrastructure for compiling platform abstraction code

provides:
  - Install-time path adapter (getInstallPaths) bridging install.js with platform abstraction
  - Platform-agnostic installation supporting both Claude Code and future OpenCode
  - Installation works identically on Claude Code (zero regression)

affects: [01-05, phase-2, phase-3]

# Tech tracking
tech-stack:
  added: []
  patterns: [install-adapter pattern for bridging shell scripts with TypeScript platform layer]

key-files:
  created:
    - src/platform/install-adapter.ts
  modified:
    - bin/install.js

key-decisions:
  - "PLAT-10: Install adapter separates local vs global installation paths (local bypasses platform detection for speed)"
  - "PLAT-11: PathResolver.getCommandsDir() returns full path including /gsd subdirectory for Claude Code"

patterns-established:
  - "Install adapter pattern: TypeScript module provides platform-aware paths to JavaScript installation script"
  - "Local install optimization: ./.claude/ mode bypasses platform detection for faster installation"

# Metrics
duration: 2.7min
completed: 2026-01-20
---

# Phase 01 Plan 03: Install Path Abstraction Summary

**Installation script now uses platform-aware path resolution, enabling multi-platform support while maintaining backward compatibility**

## Performance

- **Duration:** 2.7 min (159s)
- **Started:** 2026-01-20T10:10:46Z
- **Completed:** 2026-01-20T10:13:25Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created install-time path adapter bridging bin/install.js with platform abstraction layer
- Refactored install.js to use runtime-resolved paths instead of hardcoded ~/.claude/
- Maintained 100% backward compatibility with existing Claude Code installations
- Verified installation works correctly with test deployment

## Task Commits

Each task was committed atomically:

1. **Task 1: Create install-time path adapter** - `e01683f` (feat)
2. **Task 2: Refactor install.js to use path abstraction** - `d0232b9` (refactor)

## Files Created/Modified

- `src/platform/install-adapter.ts` - Install-specific path utilities using PlatformRegistry
  - Exports getInstallPaths(isGlobal, explicitConfigDir) function
  - Handles local vs global installation modes
  - Returns InstallPaths structure with configDir, commandsDir, agentsDir, hooksDir, pathPrefix
  - Local mode bypasses platform detection for speed

- `bin/install.js` - Platform-agnostic installation script
  - Replaced hardcoded path derivation (lines 248-264) with getInstallPaths() call
  - Uses commandsDir, agentsDir, hooksDir from platform abstraction
  - Maintains claudeDir alias for backward compatibility
  - Reduced code size by 31 lines (removed manual path construction)

## Decisions Made

**PLAT-10: Local install bypasses platform detection**
- Local installations (./.claude/) don't need platform detection - they always use relative paths
- Optimization: getInstallPaths() returns early for local mode without calling PlatformRegistry
- Rationale: Faster installation, simpler logic, no runtime dependencies for local mode

**PLAT-11: CommandsDir includes /gsd subdirectory**
- PathResolver.getCommandsDir() returns {configDir}/commands/gsd/ (full path including /gsd)
- Install.js previously constructed this in two steps (parent + subdirectory)
- Refactored to use commandsDir directly as destination for copyWithPathReplacement()
- Rationale: Platform abstraction should provide complete paths, not partial ones

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation proceeded smoothly. TypeScript compilation from Plan 04 was already complete, enabling immediate use of install-adapter module.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 1 completion:**
- Install script now fully platform-abstracted
- Both global and local installations work correctly
- Custom --config-dir flag supported
- Path replacement in markdown files uses runtime-resolved pathPrefix

**For Plan 01-05 (Complete Phase 1):**
- All platform abstraction infrastructure in place
- Ready for documentation and verification

**For Phase 2 (OpenCode Adapter):**
- Install adapter pattern established and tested
- Will work with OpenCode paths when OpenCodePaths implementation is complete
- No changes needed to install.js for OpenCode support

---
*Phase: 01-platform-abstraction-foundation*
*Completed: 2026-01-20*
