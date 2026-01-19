# Multi-Platform GSD

## What This Is

A platform-agnostic workflow orchestration system for AI-assisted software development. GSD provides the same project planning, execution, and verification experience across Claude Code, OpenCode, and future AI coding platforms. Users can switch between platforms seamlessly without losing workflow capabilities or project state.

## Core Value

Platform independence - users choose AI platforms based on project needs, not tooling limitations. GSD workflow remains consistent regardless of which platform executes it.

## Requirements

### Validated

Existing GSD capabilities proven valuable with Claude Code users:

- ✓ Project initialization with deep questioning — existing
- ✓ Research-driven requirements gathering (4 parallel agents) — existing
- ✓ Phase-based roadmap creation — existing
- ✓ Plan creation with wave-based execution — existing
- ✓ Atomic git commits per task — existing
- ✓ Goal-backward verification — existing
- ✓ User acceptance testing (UAT) — existing
- ✓ 24 commands covering full development lifecycle — existing

### Active

Multi-platform support capabilities being built:

- [ ] Platform abstraction layer encapsulating platform-specific APIs
- [ ] Multi-platform installer with simple UX (checkbox selection)
- [ ] Runtime platform detection (auto-detect which platform is executing)
- [ ] All 24 commands work on Claude Code
- [ ] All 24 commands work on OpenCode
- [ ] Complete project portability (`.planning/` works across all platforms)
- [ ] Backward compatibility (existing Claude Code setups upgrade smoothly)
- [ ] Platform-specific hook implementations (StatusLine, SessionStart equivalents)
- [ ] Platform-specific agent spawning (Task tool vs agent/subtask YAML)
- [ ] Platform-specific configuration (settings.json vs opencode.jsonc)
- [ ] Extensible architecture (easy to add Cursor, Windsurf, etc.)

### Out of Scope

- Building custom AI platforms — GSD integrates with existing platforms only
- Full feature parity on UI/UX details — platform-specific rendering can differ (StatusLine format, TUI notifications)
- Migration tools for `.planning/` directories — existing projects must work without conversion
- Supporting non-AI coding platforms — focused on LLM-based development environments
- Per-command platform selection — platform detected at runtime, not user-specified per command

## Context

**User motivation:** User has projects where Claude Code isn't viable but wants the same GSD workflow via OpenCode. Needs ability to switch between platforms based on project constraints while maintaining consistent development experience.

**Current state:** GSD is tightly coupled to Claude Code with 10 major integration points:
1. Installation paths (`~/.claude/`)
2. Hook system (SessionStart, StatusLine)
3. Settings.json manipulation
4. Slash command registration
5. Agent spawning (Task tool)
6. JSON stdin protocol for hooks
7. Todo storage patterns
8. Context file references (@ syntax)
9. MCP tool dependencies
10. Parallel execution patterns

**Platform comparison findings:**

| Aspect | Claude Code | OpenCode |
|--------|-------------|----------|
| Config location | `~/.claude/` | `~/.config/opencode/` |
| Commands | `commands/gsd/*.md` | `commands/*.md` |
| Command format | Markdown + YAML frontmatter | Markdown + YAML frontmatter |
| Agent spawning | Task tool with `subagent_type` | YAML `agent: name` + `subtask: true` |
| Hooks | settings.json registration | Plugin event system (20+ events) |
| Arguments | Direct passing | `$ARGUMENTS` placeholder |
| Tools | allowed-tools in YAML | No explicit tool restriction visible |

**Technical approach:** Platform abstraction layer with:
- Platform adapters implementing common interface
- Runtime detection based on available APIs/environment
- Command files with platform-agnostic prompt content
- Platform-specific installation/configuration/execution logic

**Existing users:** 1.6k+ npm downloads, users with active `.planning/` projects that must continue working after upgrade.

## Constraints

- **Backward compatibility**: Existing Claude Code GSD installations must upgrade smoothly without breaking active projects
- **Zero migration**: Existing `.planning/` directories must work on OpenCode without conversion or modification
- **Feature preservation**: All 24 current commands must continue working on Claude Code with identical behavior
- **Simple UX**: Installer complexity acceptable internally, but user experience must be simple checkbox selection
- **Maintenance**: Solo maintainer (you) - architecture must be maintainable without extensive platform-specific debugging

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Re-architecture with platform abstraction layer | Current tight coupling makes multi-platform impossible; abstraction enables future extensibility | — Pending |
| Multi-select installer (not auto-detect all) | User explicitly chooses which platforms to setup; avoids installing for platforms user doesn't have | — Pending |
| Runtime platform detection (not config-based) | Projects are portable; platform detected from execution environment, not stored in `.planning/` | — Pending |
| Backward compatible upgrade path | Existing users must not break; GSD 1.x to 2.x should be seamless | — Pending |
| Command structure stays markdown + YAML | Both platforms support this format; leverages existing GSD command definitions | — Pending |
| Platform-specific hook implementations | StatusLine/SessionStart differ between platforms; implement best-effort equivalents rather than skip | — Pending |

---
*Last updated: 2026-01-19 after initialization*
