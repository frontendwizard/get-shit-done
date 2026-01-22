<div align="center">

# GSD for OpenCode

**OpenCode fork of [Get Shit Done](https://github.com/glittercowboy/get-shit-done) — the spec-driven development system.**

This fork adds **OpenCode platform support** to GSD. If you're using Claude Code, use the [original repo](https://github.com/glittercowboy/get-shit-done) instead.

[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)

</div>

---

## What This Fork Adds

The original GSD was built for Claude Code only. This fork adds:

- **Platform abstraction layer** — Same GSD, multiple platforms
- **OpenCode adapter** — Full implementation for OpenCode
- **Runtime detection** — Automatically detects which platform you're using
- **Portable projects** — `.planning/` directories work on either platform

**Architecture:** See [Platform Architecture](docs/platform/ARCHITECTURE.md) for how the adapter system works.

---

## Quick Start

```bash
npx get-shit-done-cc
```

Select your installation type (global or local), then verify in OpenCode:

```
/gsd:help
```

---

## What Works on OpenCode

GSD has 24 commands. **14 work on OpenCode**, 10 require Claude Code's Task tool.

### Full Support (OpenCode)

| Command | What it does |
|---------|--------------|
| `/gsd:help` | Show all commands |
| `/gsd:progress` | Check status, route to next action |
| `/gsd:discuss-phase` | Capture implementation decisions |
| `/gsd:add-phase` | Add phase to roadmap |
| `/gsd:insert-phase` | Insert urgent work |
| `/gsd:remove-phase` | Remove future phase |
| `/gsd:list-phase-assumptions` | See planned approach |
| `/gsd:pause-work` | Create handoff when stopping |
| `/gsd:resume-work` | Restore from last session |
| `/gsd:add-todo` | Capture idea for later |
| `/gsd:check-todos` | List pending todos |
| `/gsd:map-codebase` | Analyze existing codebase |
| `/gsd:update` | Update GSD |
| `/gsd:whats-new` | See changelog |

### Claude Code Only

These commands spawn parallel agents using the Task tool, which OpenCode doesn't have:

| Command | Why it needs Task |
|---------|-------------------|
| `/gsd:new-project` | Spawns 4 researcher agents + synthesizer + roadmapper |
| `/gsd:new-milestone` | Spawns researcher agents for domain analysis |
| `/gsd:plan-phase` | Spawns researcher + planner + checker |
| `/gsd:execute-phase` | Spawns parallel executor agents |
| `/gsd:verify-work` | Spawns verification agent |
| `/gsd:audit-milestone` | Spawns auditor agent |
| `/gsd:debug` | Spawns debugger agent |
| `/gsd:complete-milestone` | Archives with agent |
| `/gsd:plan-milestone-gaps` | Gap analysis agent |
| `/gsd:quick` | Spawns planner + executor |

**Full compatibility matrix:** [Platform Support](docs/PLATFORM-SUPPORT.md)

---

## Using GSD on OpenCode

Since the multi-agent commands don't work, here's the practical workflow:

### 1. Set up your project manually

Create `.planning/` directory with:
- `PROJECT.md` — Your project vision
- `ROADMAP.md` — Phases to build
- `STATE.md` — Current position

Or start on Claude Code with `/gsd:new-project`, then switch to OpenCode.

### 2. Use supported commands

```
/gsd:discuss-phase 1     # Capture your vision
/gsd:progress            # Check where you are
/gsd:pause-work          # Create handoff
/gsd:resume-work         # Continue later
```

### 3. Build manually with GSD context

The planning files give Claude/OpenCode full context. Even without multi-agent orchestration, having `PROJECT.md`, `ROADMAP.md`, and phase context makes AI coding significantly more reliable.

---

## Future: Full OpenCode Support

OpenCode could gain full GSD support if:

1. **OpenCode adds a Task-equivalent** — Native subagent spawning like Claude Code's Task tool
2. **GSD rewrites workflows** — Use TypeScript agent infrastructure instead of declarative `Task()` syntax

The platform abstraction is ready. The limitation is OpenCode's lack of subagent spawning.

---

## For Claude Code Users

**Use the original repo:** [glittercowboy/get-shit-done](https://github.com/glittercowboy/get-shit-done)

This fork is for OpenCode users. The original has all the same features and is actively maintained by TÂCHES.

---

## Adding Platform Support

Want to add support for another AI coding platform (Cursor, Aider, Continue, etc.)?

- **[Creating Platform Adapters](docs/platform/CREATING-ADAPTERS.md)** — Step-by-step tutorial
- **[Platform Architecture](docs/platform/ARCHITECTURE.md)** — How the adapter system works

The platform layer is designed for extensibility. Adding a new platform requires changes to 4 files.

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

<div align="center">

**Original GSD by [TÂCHES](https://github.com/glittercowboy/get-shit-done)**

OpenCode support by this fork.

</div>
