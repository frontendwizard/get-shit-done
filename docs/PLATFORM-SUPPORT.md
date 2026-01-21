# Platform Support

GSD (Get Shit Done) supports multiple AI coding assistants through a unified command interface. This document details platform capabilities and command compatibility.

## Overview

GSD uses a **platform adapter architecture** that abstracts platform-specific differences while maintaining consistent command syntax. Users can work on projects with any supported platform and switch between them based on their needs.

**Supported Platforms:**
- **Claude Code** - Anthropic's official CLI for Claude
- **OpenCode** - Open-source AI coding assistant

## Platform Capabilities

| Capability | Claude Code | OpenCode | Notes |
|------------|-------------|----------|-------|
| Command Registration | Yes | Yes | Slash commands work identically |
| Hook Registration | Yes | No | Planned for Phase 5 |
| StatusLine Integration | Yes | No | Platform-specific feature |
| Multi-Agent Spawning | Yes (Task tool) | Infrastructure only | See explanation below |
| Configuration Management | Yes | Yes | `.claude/` vs `.opencode/` paths |
| Local Project Installation | Yes | Yes | Both support project-local configs |
| Global Installation | Yes | Yes | Both support global command registration |

### Multi-Agent Spawning Limitation

Some GSD commands spawn multiple parallel agents for research, planning, and verification tasks. This capability depends on platform-specific features:

- **Claude Code** uses the `Task` tool, a native platform feature that spawns subagents within the same session
- **OpenCode** has TypeScript infrastructure for agent spawning via `child_process.spawn()`, but the current GSD workflows use declarative `Task()` syntax in markdown files

**Why this matters:** Commands that spawn agents (like `new-project` spawning 4 researcher agents in parallel) will not function on platforms without Task tool support. The infrastructure exists, but the markdown workflow files call `Task()` directly.

**Future path:** Either OpenCode adds a Task-equivalent feature, OR GSD workflows are rewritten to use the TypeScript agent spawning infrastructure.

## Command Compatibility Matrix

### Full Support (Both Platforms)

These 14 commands work identically on Claude Code and OpenCode:

| Command | Description |
|---------|-------------|
| `/gsd:help` | Show available commands and usage guide |
| `/gsd:progress` | Check project status and route to next action |
| `/gsd:add-todo` | Capture idea or task as todo |
| `/gsd:check-todos` | List pending todos and select one to work on |
| `/gsd:add-phase` | Add new phase to end of current milestone |
| `/gsd:insert-phase` | Insert urgent work as decimal phase |
| `/gsd:remove-phase` | Remove future phase and renumber |
| `/gsd:discuss-phase` | Articulate vision for a phase before planning |
| `/gsd:list-phase-assumptions` | See Claude's planned approach |
| `/gsd:pause-work` | Create context handoff when pausing |
| `/gsd:resume-work` | Resume from previous session |
| `/gsd:update` | Update GSD to latest version |
| `/gsd:whats-new` | See what's changed since installed version |
| `/gsd:map-codebase` | Map existing codebase for brownfield projects |

### Claude Code Only (Requires Task Tool)

These 10 commands use the `Task` tool to spawn parallel agents:

| Command | Agent Usage | Why Task Required |
|---------|-------------|-------------------|
| `/gsd:new-project` | 7 Task calls | Spawns 4 researcher agents + synthesizer + roadmapper |
| `/gsd:new-milestone` | 6 Task calls | Spawns researcher agents for domain analysis |
| `/gsd:plan-phase` | 4 Task calls | Spawns researcher + planner + checker + revision |
| `/gsd:execute-phase` | 3 Task calls | Spawns parallel plan executor agents per wave |
| `/gsd:research-phase` | 2 Task calls | Spawns phase researcher agents |
| `/gsd:audit-milestone` | 1 Task call | Spawns auditor agent |
| `/gsd:debug` | 2 Task calls | Spawns debugger agent |
| `/gsd:complete-milestone` | Uses Task | Archives and creates milestone summary |
| `/gsd:verify-work` | Uses Task | Verification agent for completed work |
| `/gsd:plan-milestone-gaps` | Uses Task | Gap analysis and plan generation |

## Platform Support Summary

| Metric | Value |
|--------|-------|
| Total Commands | 24 |
| Both Platforms | 14 (58%) |
| Claude Code Only | 10 (42%) |

## Recommendation

**For full GSD functionality,** use Claude Code. The multi-agent orchestration (parallel research, wave-based execution, automated planning) is the core value proposition of GSD.

**For basic workflow management,** OpenCode supports project structure, todo tracking, phase management, and session continuity.

## Platform Detection

GSD automatically detects your platform at runtime:

1. **Environment variable** - `GSD_PLATFORM=claude-code` or `GSD_PLATFORM=opencode`
2. **Marker file** - `.claude-code-platform` or `.opencode-platform`
3. **Filesystem probing** - Checks for `.claude/` or `.opencode/` directories

When both platforms are detected, GSD returns 'unknown' and requires explicit configuration.

## Configuration Paths

| Platform | Global Commands | Local Commands | Config File |
|----------|-----------------|----------------|-------------|
| Claude Code | `~/.claude/commands/gsd/` | `.claude/commands/gsd/` | `~/.claude/settings.json` |
| OpenCode | `~/.opencode/command/gsd/` | `.opencode/command/gsd/` | `~/.opencode/config.json` |

## Getting Help

- Check `~/.claude/` or `~/.opencode/` for installed commands
- Run `/gsd:help` on any platform for command reference
- Report issues at the GSD repository
