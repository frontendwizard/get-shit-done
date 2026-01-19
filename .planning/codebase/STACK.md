# Technology Stack

**Analysis Date:** 2026-01-19

## Languages

**Primary:**
- JavaScript (Node.js) - All runtime code (installer, hooks, update checker, statusline)

**Secondary:**
- Markdown - Command definitions, agent prompts, templates, workflow documentation

## Runtime

**Environment:**
- Node.js >= 16.7.0

**Package Manager:**
- npm (distributed via npx)
- Lockfile: Not present (package published to npm registry)

## Frameworks

**Core:**
- None - Pure Node.js stdlib implementation

**Testing:**
- Not detected - No test framework configured

**Build/Dev:**
- None - Direct JavaScript execution, no build step required

## Key Dependencies

**Critical:**
- None - Zero runtime dependencies
- All code uses Node.js built-in modules only (`fs`, `path`, `os`, `readline`, `child_process`)

**Infrastructure:**
- npm registry - Package distribution via `get-shit-done-cc` package
- Claude Code - Host environment (this is a Claude Code extension/skill system)

## Configuration

**Environment:**
- `CLAUDE_CONFIG_DIR` - Optional env var to specify custom Claude config directory (default: `~/.claude`)
- No `.env` files - Configuration stored in Claude Code's `settings.json`
- `~/.claude/get-shit-done/VERSION` - Tracks installed version for update checks
- `~/.claude/cache/gsd-update-check.json` - Update check cache

**Build:**
- `package.json` - NPM package manifest at `/Users/juliano.farias/code/github/get-shit-done/package.json`
- `bin/install.js` - Entry point binary for installation
- No compilation or transpilation required

## Platform Requirements

**Development:**
- Node.js >= 16.7.0
- Works on macOS, Windows, Linux
- Claude Code (Anthropic's IDE) - Required host environment

**Production:**
- Installed to `~/.claude/` (global) or `./.claude/` (local) directory
- Runs as Claude Code skill/command system
- Hooks execute via Claude Code's hook system
- Statusline runs via Claude Code's statusline command integration

## Architecture Notes

This is not a standalone application - it's a meta-prompting and workflow orchestration system that extends Claude Code through:

1. **Skill files** - Markdown prompts in `~/.claude/commands/gsd/*.md`
2. **Subagents** - Markdown agent definitions in `~/.claude/agents/gsd-*.md`
3. **Hooks** - JavaScript scripts triggered by Claude Code lifecycle events
4. **Configuration** - JSON templates and state management

The JavaScript codebase is minimal (3 files, ~650 lines total):
- `bin/install.js` - Installation script with interactive prompts
- `hooks/statusline.js` - Status bar display logic
- `hooks/gsd-check-update.js` - Background update checker

The actual "application logic" lives in ~8,300 lines of structured Markdown prompts that orchestrate Claude's behavior.

---

*Stack analysis: 2026-01-19*
