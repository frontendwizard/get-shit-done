# Roadmap: GSD Platform Documentation

## Milestones

- ✅ **v2.0 Multi-Platform** - Phases 1-6 (shipped 2026-01-22)
- 🚧 **v2.1 Platform Documentation** - Phases 7-8 (in progress)

## Phases

<details>
<summary>✅ v2.0 Multi-Platform (Phases 1-6) - SHIPPED 2026-01-22</summary>

See .planning/MILESTONES.md for details.

32 plans completed across 6 phases:
- Platform abstraction layer with runtime detection
- Multi-platform installer with TUI selection
- Agent spawning infrastructure
- Lifecycle hooks with graceful degradation
- Comprehensive test suite (176 tests, 81% coverage)

</details>

### 🚧 v2.1 Platform Documentation (In Progress)

**Milestone Goal:** Enable contributors to create new platform adapters without reverse-engineering

**Phase Numbering:**
- Integer phases (7, 8): Planned milestone work
- Decimal phases (7.1, 7.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 7: Architecture Documentation** - Explain system design and patterns
- [ ] **Phase 8: Adapter Creation Guide** - Step-by-step tutorial with checklists

## Phase Details

### Phase 7: Architecture Documentation
**Goal**: Contributors understand the platform abstraction design and can reason about component relationships
**Depends on**: Phase 6 (v2.0 shipped platform system to document)
**Requirements**: ARCH-01, ARCH-02, ARCH-03
**Success Criteria** (what must be TRUE):
  1. Reader can explain the adapter pattern and why it was chosen over alternatives
  2. Reader can trace the detection → registry → adapter flow from entry point to method call
  3. Mermaid diagrams render correctly on GitHub showing component relationships
  4. Design rationale document explains trade-offs (why not conditionals, why not inheritance)
**Plans**: 1 plan

Plans:
- [x] 07-01-PLAN.md — Create platform architecture documentation with Mermaid diagrams

### Phase 8: Adapter Creation Guide
**Goal**: Contributors can implement a new platform adapter end-to-end using the guide
**Depends on**: Phase 7 (uses architecture vocabulary)
**Requirements**: GUIDE-01, GUIDE-02, GUIDE-03, GUIDE-04, INTEG-01
**Success Criteria** (what must be TRUE):
  1. A new contributor can follow "Your First Adapter" from zero to working adapter
  2. Registration checklist explicitly lists all 4 files requiring changes
  3. Testing section shows how to run contract tests and write platform-specific tests
  4. Pre-PR checklist allows self-verification before submitting
  5. Links exist from main docs and PLATFORM-SUPPORT.md to new platform docs
**Plans**: TBD

Plans:
- [ ] 08-01: TBD (determined during plan-phase)

## Progress

**Execution Order:**
Phases execute in numeric order: 7 → 7.1 (if inserted) → 8

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-6 | v2.0 | 32/32 | Complete | 2026-01-22 |
| 7. Architecture Documentation | v2.1 | 1/1 | Complete | 2026-01-22 |
| 8. Adapter Creation Guide | v2.1 | 0/TBD | Not started | - |

---
*Roadmap created: 2026-01-22*
*Milestone: v2.1 Platform Documentation*
