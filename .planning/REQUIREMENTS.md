# Requirements: Platform Installer Refactor

**Defined:** 2026-01-22
**Core Value:** Adding a new platform should require only adapter files, not scattered install.js modifications

## v2.2 Requirements

Requirements for this refactoring milestone. Each maps to roadmap phases.

### Interface Design

- [ ] **INTF-01**: PlatformInstaller interface defines copyCommands(), transformFrontmatter(), cleanupOrphans() methods
- [ ] **INTF-02**: Each adapter implements PlatformInstaller interface with platform-specific logic
- [ ] **INTF-03**: verifyInstall() method validates installation completed correctly

### Code Deduplication

- [ ] **DEDUP-01**: BasePlatformAdapter abstract class implements shared path delegation methods
- [ ] **DEDUP-02**: expandTilde() consolidated into single src/platform/utils.ts location
- [ ] **DEDUP-03**: mergeConfig() moved to BasePlatformAdapter (shared implementation)

### Install Script Refactor

- [ ] **INST-01**: bin/install.js delegates all platform-specific logic to adapter methods
- [ ] **INST-02**: No platform-specific conditionals (if/else on platform name) in main install flow
- [ ] **INST-03**: CLI interface preserved (TUI selection + --platform flag + --ci mode)
- [ ] **INST-04**: Per-adapter transforms handle command/agent frontmatter conversion

## Out of Scope

| Feature | Reason |
|---------|--------|
| Adding Cursor adapter | This milestone prepares the foundation; Cursor is next milestone |
| Changing CLI UX | Only refactoring internals, not user-facing behavior |
| New install features | Focus is consolidation, not new capabilities |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INTF-01 | TBD | Pending |
| INTF-02 | TBD | Pending |
| INTF-03 | TBD | Pending |
| DEDUP-01 | TBD | Pending |
| DEDUP-02 | TBD | Pending |
| DEDUP-03 | TBD | Pending |
| INST-01 | TBD | Pending |
| INST-02 | TBD | Pending |
| INST-03 | TBD | Pending |
| INST-04 | TBD | Pending |

**Coverage:**
- v2.2 requirements: 10 total
- Mapped to phases: 0
- Unmapped: 10 ⚠️

---
*Requirements defined: 2026-01-22*
*Last updated: 2026-01-22 after initial definition*
