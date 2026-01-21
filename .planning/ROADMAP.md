# Roadmap: Multi-Platform GSD

## Overview

Transform GSD from Claude Code-specific to platform-agnostic workflow orchestration. Build adapter pattern infrastructure, extract Claude Code logic to adapter (ensuring backward compatibility), add OpenCode support, abstract agent spawning and hooks, then validate cross-platform behavior. Existing 1.6k+ users upgrade seamlessly while new users get multi-platform choice from installation.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Platform Abstraction Foundation** - Build core adapter infrastructure and registry
- [x] **Phase 2: Claude Code Adapter & Backward Compatibility** - Extract existing logic to adapter with zero regression
- [ ] **Phase 3: OpenCode Adapter & Multi-Platform Installation** - Add second platform and installer
- [ ] **Phase 4: Agent Spawning Abstraction** - Abstract parallel agent orchestration across platforms
- [ ] **Phase 5: Lifecycle Hooks** - StatusLine and SessionStart abstraction with graceful degradation
- [ ] **Phase 6: Testing & Validation** - Cross-platform test suite and regression prevention

## Phase Details

### Phase 1: Platform Abstraction Foundation
**Goal**: Core platform abstraction infrastructure exists and enables platform-agnostic business logic
**Depends on**: Nothing (first phase)
**Requirements**: PLAT-01, PLAT-02, PLAT-03, PLAT-06, CMD-03, PORT-01, PORT-02, PORT-03, PORT-04
**Success Criteria** (what must be TRUE):
  1. Platform can be detected at runtime (Claude Code vs OpenCode vs unknown)
  2. Platform registry returns correct adapter for detected platform
  3. Path resolution works without hardcoded ~/.claude/ (runtime resolution)
  4. Command definitions are platform-agnostic (markdown + YAML with no platform coupling)
  5. Platform interface contract is defined and documented
**Plans**: 5 plans

Plans:
- [x] 01-01-PLAN.md — Platform detection and type definitions
- [x] 01-02-PLAN.md — Path resolution abstraction and registry factory
- [x] 01-03-PLAN.md — Install script integration with platform abstraction
- [x] 01-04-PLAN.md — TypeScript build infrastructure
- [x] 01-05-PLAN.md — Verification checkpoint

### Phase 2: Claude Code Adapter & Backward Compatibility
**Goal**: Existing Claude Code installations work identically through new adapter layer with zero regression
**Depends on**: Phase 1
**Requirements**: PLAT-04, PLAT-07, INST-01, INST-02, INST-03, INST-04, INST-05, INST-06, INST-07, CMD-04, COMPAT-01, COMPAT-02, COMPAT-03, COMPAT-04, COMPAT-05
**Success Criteria** (what must be TRUE):
  1. Existing GSD users can upgrade from 1.x to 2.x without breaking active projects
  2. All 24 slash commands execute identically to pre-refactor behavior on Claude Code
  3. Active .planning/ projects continue working without modification after upgrade
  4. Installation handles configuration backup, orphaned file cleanup, and collision detection
  5. Non-interactive mode supports CI/Docker environments
**Plans**: 5 plans

Plans:
- [x] 02-01-PLAN.md — Lean ClaudeCodeAdapter implementation
- [x] 02-02-PLAN.md — Minimal install.js integration
- [x] 02-03-PLAN.md — Simple verification checkpoint
- [x] 02-04-PLAN.md — [GAP CLOSURE] Fix hook registration data race
- [x] 02-05-PLAN.md — [GAP CLOSURE] Add configuration backup mechanism

### Phase 3: OpenCode Adapter & Multi-Platform Installation
**Goal**: Users can install GSD for OpenCode and execute basic workflows on both platforms
**Depends on**: Phase 2
**Requirements**: PLAT-05
**Success Criteria** (what must be TRUE):
  1. Installer presents checkbox selection for Claude Code, OpenCode, or both
  2. OpenCode adapter implements platform interface contract
  3. Basic slash commands execute on OpenCode (new-project, status, help)
  4. OpenCode config file (opencode.json) is created and commands registered
  5. Installation verifies commands registered successfully on selected platforms
**Plans**: 5 plans

Plans:
- [ ] 03-01-PLAN.md — Dependencies and OpenCodePaths fix
- [ ] 03-02-PLAN.md — OpenCodeAdapter implementation
- [ ] 03-03-PLAN.md — Multi-platform install-adapter
- [ ] 03-04-PLAN.md — Multi-platform installer TUI
- [ ] 03-05-PLAN.md — Verification checkpoint

### Phase 4: Agent Spawning Abstraction
**Goal**: GSD workflows can spawn parallel agents (4-7 simultaneously) on both platforms transparently
**Depends on**: Phase 3
**Requirements**: AGENT-01, AGENT-02, AGENT-03, AGENT-04, AGENT-05, CMD-01, CMD-02
**Success Criteria** (what must be TRUE):
  1. new-project workflow spawns 4 researcher agents + 1 synthesizer on Claude Code
  2. new-project workflow spawns 4 researcher agents + 1 synthesizer on OpenCode
  3. Agent spawn failures are detected with clear error messages (no silent failures)
  4. Agent completion is verified and output collected from .planning/ files
  5. All 24 commands work on both platforms with correct argument passing
**Plans**: TBD

Plans:
- [ ] TBD during plan-phase

### Phase 5: Lifecycle Hooks
**Goal**: StatusLine and SessionStart equivalents work (or gracefully degrade) on both platforms
**Depends on**: Phase 4
**Requirements**: HOOK-01, HOOK-02, HOOK-03, HOOK-04
**Success Criteria** (what must be TRUE):
  1. SessionStart hook executes on both platforms (update checking, state loading)
  2. StatusLine shows phase/plan context on Claude Code
  3. OpenCode displays equivalent context (best-effort, graceful degradation if unavailable)
  4. Hook registration succeeds on both platforms with verification
**Plans**: TBD

Plans:
- [ ] TBD during plan-phase

### Phase 6: Testing & Validation
**Goal**: Cross-platform behavior is verified, regressions prevented, and documentation complete
**Depends on**: Phase 5
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04, TEST-05
**Success Criteria** (what must be TRUE):
  1. Shared test suite runs on both platforms with identical assertions
  2. Platform adapter contract tests verify interface compliance
  3. Integration tests validate installation on both platforms
  4. Regression tests confirm Claude Code behavior unchanged from 1.x
  5. Same .planning/ directory works on both platforms (cross-platform validation)
**Plans**: TBD

Plans:
- [ ] TBD during plan-phase

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Platform Abstraction Foundation | 5/5 | Complete | 2026-01-20 |
| 2. Claude Code Adapter & Backward Compatibility | 5/5 | Complete | 2026-01-21 |
| 3. OpenCode Adapter & Multi-Platform Installation | 0/5 | Not started | - |
| 4. Agent Spawning Abstraction | 0/? | Not started | - |
| 5. Lifecycle Hooks | 0/? | Not started | - |
| 6. Testing & Validation | 0/? | Not started | - |
