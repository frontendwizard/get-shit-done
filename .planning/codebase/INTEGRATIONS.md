# External Integrations

**Analysis Date:** 2026-01-19

## APIs & External Services

**Package Registry:**
- npm - Package distribution and version checking
  - Package: `get-shit-done-cc`
  - Update check: `npm view get-shit-done-cc version`
  - No auth required for installation or version checks

**GitHub:**
- Repository: `github.com/glittercowboy/get-shit-done`
  - FUNDING.yml configured for GitHub Sponsors (`github: glittercowboy`)
  - No API integration - repository used for issue tracking and releases only

**Claude Code (Host Platform):**
- Full integration via Claude Code's extension system
  - Commands: Custom slash commands via `~/.claude/commands/gsd/*.md`
  - Agents: Subagent spawning via `~/.claude/agents/gsd-*.md`
  - Hooks: Lifecycle hooks via `settings.json` (SessionStart, Stop events)
  - Statusline: Custom status bar via `statusLine.command` in `settings.json`
  - Todos: Task tracking via `~/.claude/todos/` directory
  - State management: JSON files in `.planning/` directory

## Data Storage

**Databases:**
- None - All storage is filesystem-based

**File Storage:**
- Local filesystem only
  - Global installation: `~/.claude/` (or `$CLAUDE_CONFIG_DIR`)
  - Local installation: `./.claude/` in project directory
  - Project state: `.planning/` directory in workspace
  - Update cache: `~/.claude/cache/gsd-update-check.json`
  - Todo tracking: `~/.claude/todos/*.json`

**Caching:**
- File-based caching in `~/.claude/cache/`
  - `gsd-update-check.json` - Update availability check (refreshed per session)

## Authentication & Identity

**Auth Provider:**
- None - No authentication system

**User Identity:**
- Implicit via Claude Code session
  - Session ID tracked via Claude Code's `session_id` field
  - No user accounts or login system

## Monitoring & Observability

**Error Tracking:**
- None - No external error tracking service

**Logs:**
- Console output during installation (`bin/install.js`)
- Silent operation for hooks (errors suppressed to avoid breaking Claude Code UI)
- Statusline fails silently on parse errors

## CI/CD & Deployment

**Hosting:**
- npm registry (package hosting)
- GitHub (source code repository)

**CI Pipeline:**
- Not configured - No GitHub Actions, CircleCI, or similar

**Deployment:**
- Manual publish to npm registry
- Version bumps in `package.json` and `VERSION` file

## Environment Configuration

**Required env vars:**
- None - All configuration optional

**Optional env vars:**
- `CLAUDE_CONFIG_DIR` - Custom Claude config directory path (overrides default `~/.claude`)

**Secrets location:**
- Not applicable - No secrets or credentials required

## Webhooks & Callbacks

**Incoming:**
- None - No webhook endpoints

**Outgoing:**
- None - No webhook calls to external services

## System Dependencies

**CLI Tools Used:**
- `npm` - Package version checking via `execSync('npm view get-shit-done-cc version')`
- `node` - Runtime for all JavaScript execution
- `git` - Expected to be available in user's workspace (referenced in documentation, used by Claude Code)

**Operating System:**
- Cross-platform (macOS, Windows, Linux)
- Uses `os.homedir()` for home directory detection
- Path separators handled via `path` module

## Integration Points Summary

This system has minimal external dependencies by design:

1. **npm registry** - Only for package distribution and update checking
2. **Claude Code** - Deep integration as a skill/command/agent system
3. **Filesystem** - All state and configuration stored locally
4. **No cloud services** - No databases, no APIs, no authentication servers

The architecture is intentionally self-contained to avoid external failure points and maintain privacy (all data stays local to the user's machine).

---

*Integration audit: 2026-01-19*
