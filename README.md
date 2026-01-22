<div align="center">

# GSD Multi-Platform

**A platform abstraction layer for [Get Shit Done](https://github.com/glittercowboy/get-shit-done) — bringing spec-driven development to any AI coding assistant.**

[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)

</div>

---

## The Problem

GSD (Get Shit Done) is a powerful spec-driven development system, but it was built exclusively for Claude Code. As AI coding assistants proliferate — OpenCode, Cursor, Copilot CLI, Aider, Continue — developers are locked into one platform to use GSD's workflow.

## The Solution

This fork adds a **platform abstraction layer** that lets GSD run on multiple AI coding platforms:

```
┌─────────────────────────────────────────────────────┐
│                    GSD Core                         │
│         (commands, workflows, planning)             │
└─────────────────────────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              │  Platform Adapter   │
              │      Interface      │
              └──────────┬──────────┘
                         │
    ┌────────────────────┼────────────────────┐
    │                    │                    │
┌───┴───┐          ┌─────┴─────┐        ┌─────┴─────┐
│Claude │          │ OpenCode  │        │  Future   │
│ Code  │          │  Adapter  │        │ Adapters  │
└───────┘          └───────────┘        └───────────┘
                        ✓                 Cursor
                                          Copilot CLI
                                          Aider
                                          Continue
```

**Key features:**

- **Runtime detection** — Automatically detects which platform you're using
- **Portable projects** — `.planning/` directories work across platforms
- **Unified commands** — Same `/gsd-*` commands everywhere
- **Extensible** — Add new platforms by implementing one adapter interface

---

## Supported Platforms

| Platform | Status | Install Command |
|----------|--------|-----------------|
| Claude Code | Full support | Use [original repo](https://github.com/glittercowboy/get-shit-done) |
| OpenCode | Partial (14/24 commands) | See below |
| Cursor | Planned | — |
| Copilot CLI | Planned | — |
| Aider | Planned | — |

### Why "Partial" for OpenCode?

GSD's most powerful commands spawn parallel AI agents using Claude Code's `Task` tool. OpenCode doesn't have an equivalent yet, so 10 commands that require subagent orchestration don't work.

**What works:** All single-agent commands (help, progress, discuss-phase, pause/resume, todos, etc.)

**What doesn't:** Multi-agent workflows (new-project, plan-phase, execute-phase, debug, etc.)

See [Platform Support Matrix](docs/PLATFORM-SUPPORT.md) for the full breakdown.

---

## Quick Start (OpenCode)

```bash
git clone https://github.com/frontendwizard/get-shit-done.git
cd get-shit-done
node bin/install.js --global --platform=opencode
```

Verify in OpenCode:

```
/gsd-help
```

---

## Architecture

The platform layer consists of:

1. **Platform Registry** — Maps platform names to adapters
2. **Platform Detection** — Auto-detects current environment
3. **Adapter Interface** — Contract each platform must implement
4. **Install Adapter** — Platform-specific installation logic

```typescript
interface PlatformAdapter {
  name: string;
  configDir(): string;
  commandDir(): string;
  agentDir(): string;
  readConfig(): PlatformConfig;
  // ... capability flags
}
```

**Documentation:**
- [Platform Architecture](docs/platform/ARCHITECTURE.md) — How the adapter system works
- [Creating Adapters](docs/platform/CREATING-ADAPTERS.md) — Step-by-step tutorial for new platforms

---

## Adding a New Platform

Want to add support for Cursor, Copilot CLI, Aider, or another AI coding platform?

The platform layer is designed for extensibility. Adding a new platform requires:

1. Create adapter at `src/platform/adapters/your-platform.ts`
2. Register in `src/platform/registry.ts`
3. Add detection logic in `src/platform/detection.ts`
4. Add install logic in `bin/install.js`

See [Creating Platform Adapters](docs/platform/CREATING-ADAPTERS.md) for the full walkthrough.

---

## Using GSD on OpenCode

Since multi-agent commands don't work yet, here's the practical workflow:

### Option 1: Manual Setup

Create `.planning/` directory with:
- `PROJECT.md` — Your project vision
- `ROADMAP.md` — Phases to build
- `STATE.md` — Current position

### Option 2: Start on Claude Code

Use `/gsd:new-project` on Claude Code to scaffold, then switch to OpenCode.

### Then use supported commands:

```
/gsd-discuss-phase 1     # Capture decisions
/gsd-progress            # Check status
/gsd-pause-work          # Create handoff
/gsd-resume-work         # Continue later
```

The planning files give the AI full context. Even without multi-agent orchestration, having structured project files makes AI coding significantly more reliable.

---

## Contributing

This is an experimental fork. Contributions welcome:

- **New platform adapters** — Cursor, Copilot CLI, Aider, Continue
- **OpenCode improvements** — Better command support, workarounds for missing Task tool
- **Documentation** — Usage guides for each platform

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

<div align="center">

**Original GSD by [TÂCHES](https://github.com/glittercowboy/get-shit-done)**

Platform abstraction layer by [@frontendwizard](https://github.com/frontendwizard)

</div>
