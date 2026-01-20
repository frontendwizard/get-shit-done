# Phase 2: Claude Code Adapter & Backward Compatibility - Context

**Gathered:** 2026-01-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Extract Claude Code-specific logic into a ClaudeCodeAdapter that implements the PlatformAdapter interface (defined in Phase 1). Existing 1.6k+ GSD users must upgrade seamlessly from v1.x to v2.x without breaking changes, configuration loss, or manual migration. All 24 slash commands must execute identically to pre-refactor behavior. Active .planning/ projects continue working without modification.

</domain>

<decisions>
## Implementation Decisions

### Adapter Implementation Scope
- **Full adapter implementation**: Implement all PlatformAdapter interface methods in Phase 2 (config management, agent spawning, hooks, command registration) - complete abstraction upfront
- **Refactor existing install.js**: Modify install.js to detect platform and call adapter methods - single installer code path
- **Adapter location**: `src/platform/adapters/claude-code.ts` - new adapters/ subdirectory for clean separation, room for opencode.ts in Phase 3
- **Logic extraction strategy**: Hybrid approach - extract complex logic (settings.json merging, hook registration) to shared modules, inline simple logic (path construction) in adapter

### Installation & Upgrade Flow
- **Settings.json handling**: Backup then merge - create `settings.json.backup`, then merge new hooks/statusLine config with existing user settings
- **Orphaned file cleanup**: Detect and warn, ask user to clean up - report orphaned files but don't delete automatically, let user decide
- **Non-interactive mode**: Use safe defaults for everything - CI/Docker environments automatically choose conservative defaults (backup files, skip cleanup, no prompts)
- **Failure recovery**: Best-effort continue - log errors but continue installing other components, partial installation better than nothing

### Backward Compatibility Strategy
- **Zero behavior change mechanism**: ClaudeCodeAdapter must match v1.x behavior exactly - identical logic to current install.js (same file paths, hook scripts, settings format)
- **Command file updates**: Update commands to use abstraction - refactor all 24 command .md files to use platform-agnostic patterns for multi-platform support
- **Path reference handling**: Templating system with runtime rendering - commands use `{{config_dir}}`, `{{commands_dir}}` placeholders, installer renders them to actual platform-specific paths during installation
- **Template storage**: Templates in repo, render on install - source has `commands/gsd/*.md.tmpl` with {{placeholders}}, installer renders to `~/.claude/commands/gsd/*.md` with actual values
- **Platform-specific instructions**: Minimal divergence allowed - adapters can provide platform-specific template variables, but strive for maximum commonality across platforms

### Claude's Discretion
- Exact template rendering engine choice (simple string replace vs Handlebars/Mustache)
- Backup file naming convention (`.backup` vs timestamped)
- Logging verbosity and format during installation
- Error message phrasing for non-interactive failures

</decisions>

<specifics>
## Specific Ideas

- "The changes shouldn't cause any behavior change - we should ensure it by our choices"
- "We might need commands to diverge per agent and agent-specific instructions"
- "We need a way for the adapter to be able to diverge, but we should strive for minimal divergence"
- Manual testing verification approach (not automated tests) against real .planning/ projects

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope

</deferred>

---

*Phase: 02-claude-code-adapter-backward-compatibility*
*Context gathered: 2026-01-20*
