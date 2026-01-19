# Codebase Structure

**Analysis Date:** 2026-01-19

## Directory Layout

```
get-shit-done/
├── bin/                    # npm package entry point
│   └── install.js          # Installation script
├── commands/               # User-facing command definitions
│   └── gsd/                # All GSD commands (24 files)
├── agents/                 # Subagent definitions
│   ├── gsd-planner.md
│   ├── gsd-executor.md
│   ├── gsd-verifier.md
│   └── ... (11 total)
├── get-shit-done/          # GSD system resources (installed to ~/.claude/)
│   ├── workflows/          # Reusable execution patterns
│   ├── templates/          # Document structure templates
│   └── references/         # Shared knowledge (questioning, verification, etc.)
├── hooks/                  # Claude Code lifecycle integration
│   ├── statusline.js       # Status bar display
│   └── gsd-check-update.js # Update notification
├── .planning/              # Project workspace (created per-project)
│   └── codebase/           # Codebase analysis documents (this file)
├── assets/                 # Marketing/documentation assets
├── package.json            # npm package definition
├── README.md               # Public documentation
├── CHANGELOG.md            # Version history
└── GSD-STYLE.md            # Writing style guide
```

## Directory Purposes

**bin/**
- Purpose: npm package entry point
- Contains: install.js script
- Key files: `bin/install.js` (570 lines, handles global/local installation)

**commands/gsd/**
- Purpose: User-facing command definitions
- Contains: Markdown files with YAML frontmatter + process definitions
- Key files:
  - `new-project.md` (897 lines): Project initialization workflow
  - `execute-phase.md` (305 lines): Wave-based plan execution orchestrator
  - `plan-phase.md` (877 lines): Phase planning orchestrator
  - `verify-work.md` (305 lines): User acceptance testing
  - `help.md` (397 lines): Command reference

**agents/**
- Purpose: Specialized subagent definitions spawned by commands
- Contains: Agent markdown files (gsd-*.md pattern)
- Key files:
  - `gsd-planner.md` (1633 lines): Creates PLAN.md files from phase requirements
  - `gsd-executor.md` (1030 lines): Executes plans, commits per task
  - `gsd-verifier.md` (1009 lines): Verifies phase goals against actual code
  - `gsd-codebase-mapper.md` (685 lines): Analyzes codebase, writes STACK.md, ARCHITECTURE.md, etc.
  - `gsd-roadmapper.md` (727 lines): Creates ROADMAP.md from requirements
  - `gsd-project-researcher.md` (1001 lines): Researches stack/features/architecture
  - `gsd-debugger.md` (1631 lines): Diagnoses and fixes issues

**get-shit-done/workflows/**
- Purpose: Detailed execution patterns referenced by commands/agents
- Contains: Process definitions for complex workflows
- Key files:
  - `execute-plan.md` (2562 lines): Complete plan execution protocol
  - `execute-phase.md` (677 lines): Wave execution, verification, state updates
  - `verify-phase.md` (829 lines): Phase verification methodology
  - `map-codebase.md` (341 lines): Parallel codebase analysis flow

**get-shit-done/templates/**
- Purpose: Document structure templates for consistent outputs
- Contains: Template files by artifact type
- Key files:
  - `project.md`: PROJECT.md template
  - `requirements.md`: REQUIREMENTS.md template
  - `roadmap.md`: ROADMAP.md template
  - `state.md`: STATE.md template
  - `codebase/*.md`: STACK.md, ARCHITECTURE.md, CONVENTIONS.md, etc.
  - `research-project/*.md`: Research output templates

**get-shit-done/references/**
- Purpose: Shared knowledge and patterns
- Contains: Reference documents on techniques
- Key files:
  - `questioning.md`: Deep questioning techniques for context gathering
  - `verification-patterns.md`: Code verification methodologies
  - `checkpoints.md`: Checkpoint protocol for human-in-loop
  - `git-integration.md`: Commit conventions
  - `ui-brand.md`: Banner formatting, output styling

**hooks/**
- Purpose: Claude Code lifecycle integration
- Contains: Node.js scripts for hooks
- Key files:
  - `statusline.js` (85 lines): Displays model | task | directory | context %
  - `gsd-check-update.js` (138 lines): Background update checking

**.planning/** (created per-project)
- Purpose: Project workspace for all planning artifacts
- Contains: Generated during project initialization
- Structure:
  - `PROJECT.md`: Project context document
  - `REQUIREMENTS.md`: Requirements with REQ-IDs
  - `ROADMAP.md`: Phase structure
  - `STATE.md`: Current project state
  - `config.json`: Workflow preferences (mode, depth, parallelization)
  - `research/`: Domain research outputs (if research performed)
  - `phases/XX-name/`: Phase directories with PLAN.md, SUMMARY.md, VERIFICATION.md files
  - `codebase/`: Codebase analysis documents (STACK.md, ARCHITECTURE.md, etc.)

## Key File Locations

**Entry Points:**
- `bin/install.js`: npm package installation entry point
- `commands/gsd/*.md`: Command definitions loaded by Claude Code

**Configuration:**
- `package.json`: npm package metadata, version, bin entry
- `.planning/config.json`: Per-project workflow configuration (created by new-project)

**Core Logic:**
- `agents/gsd-planner.md`: Plan creation logic
- `agents/gsd-executor.md`: Plan execution logic
- `agents/gsd-verifier.md`: Verification logic
- `get-shit-done/workflows/execute-plan.md`: Complete execution protocol

**Testing:**
- Not detected (no test files present)

## Naming Conventions

**Files:**
- Commands: kebab-case.md (`new-project.md`, `execute-phase.md`)
- Agents: gsd-{role}.md (`gsd-planner.md`, `gsd-executor.md`)
- Workflows: kebab-case.md (`execute-plan.md`, `verify-phase.md`)
- Templates: kebab-case.md matching output filename (`project.md`, `roadmap.md`)
- Hooks: kebab-case.js (`statusline.js`, `gsd-check-update.js`)

**Directories:**
- All lowercase, kebab-case where multi-word (`get-shit-done`, `research-project`)

**Planning Artifacts:**
- Phase directories: `{NN}-{name}` (e.g., `01-foundation`, `02-authentication`)
- Plan files: `{NN}-{NN}-PLAN.md` (e.g., `01-01-PLAN.md`)
- Summary files: `{NN}-{NN}-SUMMARY.md` (e.g., `01-01-SUMMARY.md`)
- Verification: `{NN}-VERIFICATION.md` (per phase, e.g., `01-VERIFICATION.md`)

## Where to Add New Code

**New Command:**
- Primary code: `commands/gsd/{command-name}.md`
- Tests: Not applicable (markdown-based system)
- Reference from: help.md should include command in list

**New Agent:**
- Implementation: `agents/gsd-{role}.md`
- Reference from: Commands spawn agents via Task tool

**New Workflow:**
- Implementation: `get-shit-done/workflows/{workflow-name}.md`
- Reference from: Commands/agents via @-reference

**New Template:**
- Implementation: `get-shit-done/templates/{artifact-name}.md`
- Reference from: Agents that create that artifact type

**Utilities:**
- Shared helpers: `get-shit-done/references/{topic}.md` for conceptual guidance
- Hooks: `hooks/{hook-name}.js` for Claude Code integrations

## Special Directories

**bin/**
- Purpose: npm package executable entry point
- Generated: No
- Committed: Yes

**commands/**
- Purpose: User-facing command definitions for Claude Code
- Generated: No (hand-written)
- Committed: Yes

**agents/**
- Purpose: Subagent definitions spawned by orchestrators
- Generated: No (hand-written)
- Committed: Yes

**get-shit-done/**
- Purpose: System resources installed to ~/.claude/ or ./.claude/
- Generated: No (hand-written templates and references)
- Committed: Yes

**hooks/**
- Purpose: Claude Code lifecycle hooks
- Generated: No (hand-written Node.js scripts)
- Committed: Yes

**.planning/**
- Purpose: Per-project workspace for planning artifacts
- Generated: Yes (created by new-project command)
- Committed: Yes (but in user's project repo, not GSD repo)

**.planning/codebase/**
- Purpose: Codebase analysis documents
- Generated: Yes (created by map-codebase command)
- Committed: Yes

**.planning/phases/**
- Purpose: Phase execution artifacts (PLAN.md, SUMMARY.md, VERIFICATION.md)
- Generated: Yes (created by plan-phase and execute-phase commands)
- Committed: Yes

**.planning/research/**
- Purpose: Domain research outputs
- Generated: Yes (optional, created by new-project if user chooses research)
- Committed: Yes

**assets/**
- Purpose: Marketing assets (terminal SVG, images)
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-01-19*
