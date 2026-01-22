# Roadmap: Multi-Platform GSD

## Milestones

- ✅ **v2.0 Multi-Platform** - Phases 1-6 (shipped 2026-01-22)
- ✅ **v2.1 Platform Documentation** - Phases 7-8 (shipped 2026-01-22)
- 🔄 **v2.2 Platform Installer Refactor** - Phases 9-11 (active)

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

<details>
<summary>✅ v2.1 Platform Documentation (Phases 7-8) - SHIPPED 2026-01-22</summary>

See .planning/MILESTONES.md for details.

2 plans completed across 2 phases:
- Platform architecture documentation with Mermaid diagrams
- Step-by-step adapter creation guide with checklists

</details>

## v2.2 Platform Installer Refactor

**Goal:** Extract platform-specific install logic from bin/install.js into adapters so adding a new platform requires only adapter files, not scattered modifications.

### Phase 9: Foundation

**Goal:** Establish shared infrastructure that eliminates code duplication across adapters.

**Dependencies:** None (entry point)

**Requirements:** DEDUP-01, DEDUP-02, DEDUP-03

**Success Criteria:**
1. expandTilde() exists in single src/platform/utils.ts location and all adapters import from there
2. BasePlatformAdapter abstract class exists with shared path delegation methods
3. mergeConfig() is implemented once in BasePlatformAdapter and inherited by all adapters
4. Existing tests pass after consolidation (no behavioral changes)

---

### Phase 10: PlatformInstaller Interface

**Goal:** Define and implement the platform-agnostic installation contract.

**Dependencies:** Phase 9 (BasePlatformAdapter provides inheritance target)

**Requirements:** INTF-01, INTF-02, INTF-03

**Success Criteria:**
1. PlatformInstaller interface exists with copyCommands(), transformFrontmatter(), cleanupOrphans() methods
2. ClaudeCodeAdapter and OpenCodeAdapter both implement PlatformInstaller interface
3. verifyInstall() method on each adapter validates installation completed correctly
4. Interface is documented with JSDoc describing contract expectations

---

### Phase 11: Install Script Refactor

**Goal:** bin/install.js delegates all platform-specific logic to adapter methods with no hardcoded conditionals.

**Dependencies:** Phase 10 (adapters must implement PlatformInstaller interface)

**Requirements:** INST-01, INST-02, INST-03, INST-04

**Success Criteria:**
1. bin/install.js contains zero `if (platform === 'claude-code')` or similar platform-specific conditionals
2. Running `npm run install -- --platform opencode` works identically to before refactor
3. Running `npm run install` (TUI mode) presents same selection experience as before
4. Claude Code commands have correct frontmatter (no agent: prefix), OpenCode commands have agent: prefix
5. --ci mode continues to work for automated installs

---

## Progress

| Phase | Status | Plans | Key Outcome |
|-------|--------|-------|-------------|
| 9 - Foundation | Pending | 0/? | Shared utils.ts and BasePlatformAdapter |
| 10 - Interface | Pending | 0/? | PlatformInstaller contract implemented |
| 11 - Refactor | Pending | 0/? | bin/install.js delegates to adapters |

---
*Roadmap created: 2026-01-22*
*v2.2 phases added: 2026-01-22*
