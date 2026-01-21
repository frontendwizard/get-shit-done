# Phase 3: OpenCode Adapter & Multi-Platform Installation - Context

**Gathered:** 2026-01-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Add OpenCode as a second supported platform with multi-platform installer. Users installing GSD can select Claude Code, OpenCode, or both during installation. OpenCode adapter implements the platform interface contract, config file (opencode.jsonc) is created, and basic slash commands execute successfully on OpenCode.

**What's in scope:** Platform selection installer, OpenCode adapter implementation, config file management, non-agent command execution
**What's deferred:** Agent spawning (Phase 4), lifecycle hooks (Phase 5)

</domain>

<decisions>
## Implementation Decisions

### Installer Interaction Model
- **Selection UI:** Multi-select checkboxes for platform choice
  - Interactive TUI: `☐ Claude Code  ☐ OpenCode` (user can check one or both)
  - Natural for "install for both platforms" use case
- **Default behavior:** Pre-select NONE - force explicit user choice
  - Prevents accidental dual installation
  - User must actively check at least one platform
- **Non-interactive mode:** Optional `--platform` flag, defaults to Claude Code
  - If stdin is not a TTY and no flag provided: install for Claude Code only (safe default)
  - Supports explicit override: `npm install -- --platform=opencode` or `--platform=both`
- **No platform detected:** Still show TUI question
  - User selects desired platform(s) even if auto-detection fails
  - Proceed with installation using user's explicit choice (manual override)

### OpenCode Config Structure
- **Config content:** Command registrations ONLY
  - Minimal viable: just the slash command mappings
  - No settings, no hooks, no metadata in Phase 3
  - Mirror Claude Code's `settings.json` "commands" array concept
- **Registration format:** Research-driven - use OpenCode's native schema
  - Research Phase 3 must investigate OpenCode API documentation
  - Determine exact JSON/JSONC schema expected by OpenCode for command registration
  - May require format translation layer in adapter if different from Claude Code
- **File location:** OpenCode's config directory
  - Use OpenCode's equivalent of `~/.claude/` (path needs research)
  - Platform-specific location (idiomatic for OpenCode users)
- **Existing config handling:** Backup and overwrite
  - Same pattern as Phase 2 Claude Code adapter
  - If `opencode.jsonc` exists: backup to `opencode.jsonc.backup`, then write fresh config
  - No merge logic in Phase 3 (keep it simple)

### Adapter Implementation Scope
- **Required methods:** Research-driven scope
  - Researcher identifies which OpenCode API methods are needed for basic commands
  - Minimum likely includes: path resolution, config read/write, command registration
  - Mark as "Determine during research" - don't guess ahead of API documentation
- **Command scope:** All non-agent commands must work
  - `/gsd:help`, `/gsd:progress`, `/gsd:settings` (minimal verification)
  - `/gsd:new-project` (WITHOUT agent spawning - manual PROJECT.md creation only)
  - `/gsd:plan-phase` (WITHOUT planner agent - user-written plans or stub)
  - Any other commands that don't spawn agents
  - Proves platform works end-to-end for non-parallel workflows
- **Stub behavior:** Throw clear "Phase N" errors
  - Unimplemented methods: `throw new Error('Method X requires Phase 4 (Agent Spawning)')`
  - Explicit about what's missing, aids debugging
  - Same pattern as Phase 2 ClaudeCodeAdapter stubs
- **Agent spawning:** ZERO agent spawning in Phase 3
  - Complete deferral to Phase 4
  - Phase 3 success criteria says "basic commands" - agent orchestration is complex
  - Agent spawning needs dedicated phase focus

### Claude's Discretion
- Exact TUI library choice for checkbox UI (inquirer, prompts, etc.)
- Error message wording and formatting
- Progress/status output during installation
- Exact backup file naming convention (`.backup` suffix is fine, timestamp optional)

</decisions>

<specifics>
## Specific Ideas

- Installer UX should feel like modern package managers (interactive, clear feedback, safe defaults)
- Non-interactive mode is critical for CI/Docker - must work without TTY
- Config backup pattern from Phase 2 worked well - reuse it for OpenCode

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope

</deferred>

---

*Phase: 03-opencode-adapter-multi-platform-installation*
*Context gathered: 2026-01-21*
