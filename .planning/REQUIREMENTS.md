# Requirements: Multi-Platform GSD

**Defined:** 2026-01-19
**Core Value:** Platform independence - users choose AI platforms based on project needs, not tooling limitations

## v1 Requirements

Requirements for multi-platform support release. Each maps to roadmap phases.

### Platform Abstraction

- [ ] **PLAT-01**: Runtime platform detection (auto-detect Claude Code vs OpenCode)
- [ ] **PLAT-02**: Platform adapter interface defining common contract for all platforms
- [ ] **PLAT-03**: Platform registry with factory pattern for adapter loading
- [ ] **PLAT-04**: Claude Code adapter wrapping existing functionality (zero regression)
- [x] **PLAT-05**: OpenCode adapter implementing platform interface
- [ ] **PLAT-06**: Path resolution abstraction (~/.claude/ vs ~/.config/opencode/)
- [ ] **PLAT-07**: Configuration file abstraction (settings.json vs opencode.jsonc)

### Agent Spawning

- [x] **AGENT-01**: Abstract Task tool (Claude Code) vs CLI spawning (OpenCode) - TypeScript infrastructure complete
- [x] **AGENT-02**: Parallel agent spawning (4-7 agents simultaneously) - Promise.allSettled implementation
- [x] **AGENT-03**: Agent completion verification and status tracking - AgentInstance with waitForCompletion()
- [x] **AGENT-04**: Agent spawn failure detection with clear error messages - file validation + event listeners
- [x] **AGENT-05**: Agent output collection from .planning/ files - getOutput() method

*Note: Task() is a Claude Code platform feature. Commands using Task() for multi-agent spawning work on Claude Code. OpenCode support requires platform-level Task() equivalent.*

### Installation & Setup

- [ ] **INST-01**: Multi-select installer (checkbox for Claude Code, OpenCode, or both)
- [ ] **INST-02**: Platform-specific directory structure creation
- [ ] **INST-03**: Command collision detection (prevent duplicate registrations)
- [ ] **INST-04**: Orphaned file cleanup from previous versions
- [ ] **INST-05**: Configuration backup before modification
- [ ] **INST-06**: Non-interactive mode support (CI/Docker environments)
- [ ] **INST-07**: Installation verification (confirm commands registered)

### Command Portability

- [-] **CMD-01**: 15 of 24 slash commands work on both platforms (commands requiring Task tool are Claude Code only)
- [x] **CMD-02**: Command arguments passed correctly per platform
- [ ] **CMD-03**: Platform-agnostic command definitions (markdown + YAML)
- [ ] **CMD-04**: Zero command duplication across platforms

### Lifecycle Hooks

- [x] **HOOK-01**: SessionStart abstraction (update checking, state loading)
- [x] **HOOK-02**: StatusLine abstraction with graceful degradation
- [x] **HOOK-03**: Hook registration in platform-specific format
- [x] **HOOK-04**: Hook execution verification

### Project Portability

- [ ] **PORT-01**: .planning/ directories work across platforms without modification
- [ ] **PORT-02**: No platform-specific data in PROJECT.md, ROADMAP.md, or other planning artifacts
- [ ] **PORT-03**: Path references resolved at runtime (no hardcoded ~/.claude/)
- [ ] **PORT-04**: Projects switchable between platforms without migration tools

### Backward Compatibility

- [ ] **COMPAT-01**: Existing Claude Code installations upgrade without breaking
- [ ] **COMPAT-02**: Active .planning/ projects continue working after upgrade
- [ ] **COMPAT-03**: settings.json preserved during upgrade (merge, don't replace)
- [ ] **COMPAT-04**: Existing hooks remain functional
- [ ] **COMPAT-05**: Zero changes required to existing projects

### Testing & Validation

- [x] **TEST-01**: Shared test suite running on both platforms
- [x] **TEST-02**: Platform adapter contract tests (interface compliance)
- [x] **TEST-03**: Integration tests for installations
- [x] **TEST-04**: Regression tests for Claude Code (prevent breaking existing users)
- [x] **TEST-05**: Cross-platform workflow validation (same .planning/ on both platforms)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Third Platform Support

- **PLAT-08**: Cursor platform adapter
- **PLAT-09**: Windsurf platform adapter
- **PLAT-10**: Platform capability detection (feature flags)

### Advanced UX

- **UX-01**: Platform-specific optimizations (leverage unique platform features)
- **UX-02**: Visual platform switcher UI
- **UX-03**: Platform feature matrix documentation
- **UX-04**: Migration guide for switching platforms

### Developer Experience

- **DEV-01**: TypeScript type definitions for adapter interface
- **DEV-02**: Platform adapter development guide
- **DEV-03**: Mock platform adapter for testing
- **DEV-04**: Platform adapter validator tool

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Per-command platform selection | Breaks project portability; runtime detection sufficient |
| Platform markers in .planning/ files | Violates zero-migration portability requirement |
| Separate packages per platform | Complicates maintenance; single package with multi-select installer better |
| Lowest-common-denominator UX | Degrades experience; implement best UX per platform instead |
| Manual platform configuration | Installer handles all config automatically |
| Migration tools for .planning/ | If needed, architecture failed; goal is zero migration |
| Third-party extension platform support | Focus on AI coding platforms only |
| Platform version lock-in | Feature detection over version checking |
| Compile-time platform selection | Runtime detection enables portability |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PLAT-01 | Phase 1 | Complete |
| PLAT-02 | Phase 1 | Complete |
| PLAT-03 | Phase 1 | Complete |
| PLAT-04 | Phase 2 | Pending |
| PLAT-05 | Phase 3 | Complete |
| PLAT-06 | Phase 1 | Complete |
| PLAT-07 | Phase 2 | Pending |
| AGENT-01 | Phase 4 | Complete |
| AGENT-02 | Phase 4 | Complete |
| AGENT-03 | Phase 4 | Complete |
| AGENT-04 | Phase 4 | Complete |
| AGENT-05 | Phase 4 | Complete |
| INST-01 | Phase 2 | Pending |
| INST-02 | Phase 2 | Pending |
| INST-03 | Phase 2 | Pending |
| INST-04 | Phase 2 | Pending |
| INST-05 | Phase 2 | Pending |
| INST-06 | Phase 2 | Pending |
| INST-07 | Phase 2 | Pending |
| CMD-01 | Phase 4 | Partial (15/24) |
| CMD-02 | Phase 4 | Complete |
| CMD-03 | Phase 1 | Complete |
| CMD-04 | Phase 2 | Pending |
| HOOK-01 | Phase 5 | Complete |
| HOOK-02 | Phase 5 | Complete |
| HOOK-03 | Phase 5 | Complete |
| HOOK-04 | Phase 5 | Complete |
| PORT-01 | Phase 1 | Complete |
| PORT-02 | Phase 1 | Complete |
| PORT-03 | Phase 1 | Complete |
| PORT-04 | Phase 1 | Complete |
| COMPAT-01 | Phase 2 | Pending |
| COMPAT-02 | Phase 2 | Pending |
| COMPAT-03 | Phase 2 | Pending |
| COMPAT-04 | Phase 2 | Pending |
| COMPAT-05 | Phase 2 | Pending |
| TEST-01 | Phase 6 | Complete |
| TEST-02 | Phase 6 | Complete |
| TEST-03 | Phase 6 | Complete |
| TEST-04 | Phase 6 | Complete |
| TEST-05 | Phase 6 | Complete |

**Coverage:**
- v1 requirements: 35 total
- Mapped to phases: 35
- Unmapped: 0 ✓

---
*Requirements defined: 2026-01-19*
*Last updated: 2026-01-21 after Phase 6 completion*
