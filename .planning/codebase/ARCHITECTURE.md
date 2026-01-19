# Architecture

**Analysis Date:** 2026-01-19

## Pattern Overview

**Overall:** Command-orchestrated agent system with spec-driven execution

**Key Characteristics:**
- Orchestrator pattern: Commands spawn specialized subagents via Task tool
- Document-driven state: Planning artifacts (PROJECT.md, ROADMAP.md, STATE.md) contain all project context
- Fresh context per agent: Each subagent spawned with clean 200k context window
- Meta-prompting architecture: Agent definitions are prompts that spawn other agents
- Markdown-based protocol: Commands and agents communicate via structured markdown files

## Layers

**Command Layer:**
- Purpose: User-facing entry points that orchestrate workflows
- Location: `commands/gsd/`
- Contains: Markdown files with YAML frontmatter defining commands
- Depends on: Agent layer, workflow layer, template layer
- Used by: Claude Code command invocation system

**Agent Layer:**
- Purpose: Specialized subagents spawned by commands to perform focused tasks
- Location: `agents/`
- Contains: Agent definition files (gsd-*.md) with role, process, and success criteria
- Depends on: Workflow layer, reference layer, template layer
- Used by: Commands via Task tool spawning

**Workflow Layer:**
- Purpose: Reusable execution patterns referenced by commands and agents
- Location: `get-shit-done/workflows/`
- Contains: Detailed process definitions (execute-phase.md, execute-plan.md, etc.)
- Depends on: Reference layer, template layer
- Used by: Commands and agents via @-references

**Template Layer:**
- Purpose: Document structure templates for consistent output
- Location: `get-shit-done/templates/`
- Contains: Template files for PROJECT.md, ROADMAP.md, requirements, research outputs
- Depends on: Nothing (leaf nodes)
- Used by: Agents when creating planning artifacts

**Reference Layer:**
- Purpose: Shared knowledge and patterns referenced throughout system
- Location: `get-shit-done/references/`
- Contains: Questioning techniques, verification patterns, git integration, TDD patterns
- Depends on: Nothing (leaf nodes)
- Used by: Commands and agents via @-references

**Hook Layer:**
- Purpose: Integration points with Claude Code lifecycle
- Location: `hooks/`
- Contains: Node.js scripts for statusline, update checking
- Depends on: Node.js runtime
- Used by: Claude Code hook system (SessionStart, StatusLine events)

**Installation Layer:**
- Purpose: Package installation and configuration
- Location: `bin/`
- Contains: install.js (npm package entry point)
- Depends on: Node.js runtime, file system
- Used by: npx get-shit-done-cc command

## Data Flow

**Project Initialization Flow:**

1. User runs `/gsd:new-project` command
2. Command orchestrator (`commands/gsd/new-project.md`) loads
3. Orchestrator performs deep questioning to gather project context
4. Orchestrator spawns 4 parallel `gsd-project-researcher` agents (stack, features, architecture, pitfalls)
5. Researchers write directly to `.planning/research/*.md`
6. Orchestrator spawns `gsd-research-synthesizer` to create SUMMARY.md
7. Orchestrator creates REQUIREMENTS.md based on research
8. Orchestrator spawns `gsd-roadmapper` to create ROADMAP.md and STATE.md
9. Output: `.planning/` directory with PROJECT.md, REQUIREMENTS.md, ROADMAP.md, STATE.md, config.json

**Phase Execution Flow:**

1. User runs `/gsd:plan-phase {N}` command
2. Command spawns `gsd-planner` agent with phase context
3. Planner creates multiple PLAN.md files (2-3 tasks each, wave-organized)
4. User runs `/gsd:execute-phase {N}` command
5. Execute-phase orchestrator discovers incomplete plans
6. Orchestrator spawns `gsd-executor` agents in parallel per wave
7. Each executor writes code, commits per task, creates SUMMARY.md
8. Orchestrator spawns `gsd-verifier` to check phase goal against actual code
9. Verifier creates VERIFICATION.md with pass/gaps_found/human_needed status
10. Orchestrator updates ROADMAP.md, STATE.md, REQUIREMENTS.md
11. Output: Code changes committed, phase metadata updated

**State Management:**

- STATE.md is the single source of truth for project status
- Every command/agent reads STATE.md first to load context
- STATE.md updated after each phase completes
- Contains: current position, accumulated decisions, blockers, alignment status

## Key Abstractions

**Command Definition:**
- Purpose: Declares a user-facing command with allowed tools and process
- Examples: `commands/gsd/new-project.md`, `commands/gsd/execute-phase.md`
- Pattern: YAML frontmatter (name, description, tools) + markdown process definition

**Agent Definition:**
- Purpose: Declares a specialized subagent that can be spawned
- Examples: `agents/gsd-planner.md`, `agents/gsd-executor.md`, `agents/gsd-verifier.md`
- Pattern: YAML frontmatter (name, tools, color) + role + process + success criteria

**Planning Artifact:**
- Purpose: Structured markdown documents containing project/phase/plan state
- Examples: `.planning/PROJECT.md`, `.planning/ROADMAP.md`, `.planning/phases/01-foundation/01-01-PLAN.md`
- Pattern: Markdown with specific sections (Objective, Context, Tasks, Success Criteria)

**Wave-Based Execution:**
- Purpose: Parallel execution of independent plans within a phase
- Implementation: PLAN.md frontmatter contains `wave: N`, plans in same wave spawn in parallel
- Pattern: Dependency analysis → wave assignment → parallel Task spawning per wave

**Checkpoint Protocol:**
- Purpose: Human approval gates within autonomous plans
- Implementation: PLAN.md contains `type="checkpoint"` tasks that pause execution
- Pattern: Execute → pause → return state to orchestrator → user decides → spawn continuation agent

## Entry Points

**npm Package Entry:**
- Location: `bin/install.js`
- Triggers: `npx get-shit-done-cc` command
- Responsibilities: Copy files to ~/.claude/, configure settings.json, register hooks

**Command Entry:**
- Location: `commands/gsd/*.md`
- Triggers: User invokes `/gsd:command-name` in Claude Code
- Responsibilities: Orchestrate workflows, spawn subagents, manage state

**Hook Entry:**
- Location: `hooks/statusline.js`, `hooks/gsd-check-update.js`
- Triggers: Claude Code SessionStart event, StatusLine rendering
- Responsibilities: Display project status, check for updates

## Error Handling

**Strategy:** Fail fast with clear error messages, preserve state on failure

**Patterns:**
- Orchestrator validation: Commands check prerequisites (project exists, phase exists) before spawning agents
- Agent isolation: Subagent failures don't corrupt orchestrator state
- Atomic commits: Each task commits individually, partial progress preserved on failure
- State recovery: STATE.md always reflects last successful completion
- Verification layer: Every phase verified against actual code, not claimed completion

## Cross-Cutting Concerns

**Logging:** Orchestrators output structured banners (━━━ GSD ► STAGE), agents output confirmations only

**Validation:** Every command validates inputs before spawning expensive agents (phase exists, plans exist, etc.)

**Authentication:** Not applicable (local file system operations only)

---

*Architecture analysis: 2026-01-19*
