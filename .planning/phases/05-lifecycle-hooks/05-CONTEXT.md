# Phase 5: Lifecycle Hooks - Context

**Gathered:** 2026-01-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Abstract lifecycle hook behavior (SessionStart, StatusLine) across both Claude Code and OpenCode platforms with graceful degradation. Hooks should work where supported and degrade silently where not.

**Core principle:** Match current Claude Code behavior exactly, then adapt to OpenCode capabilities with graceful degradation.

</domain>

<decisions>
## Implementation Decisions

### SessionStart Behavior
- Match current Claude Code behavior exactly (investigate what it does now)
- Identical behavior on both platforms (same actions, same outputs)
- Silent continue on errors (e.g., network failure during update check) — log warning but don't interrupt session
- Match current output behavior (investigate what Claude Code shows, replicate)

### StatusLine Content & Format
- Match current Claude Code content (investigate what it displays now)
- Show nothing when no .planning/ directory exists (no placeholder, no version display)
- Update frequency: Claude's discretion based on platform capabilities and performance
- Best effort equivalent format on OpenCode — try to match Claude Code, adapt to what OpenCode supports

### Graceful Degradation
- Silent skip when hook not supported — don't register, don't error, don't log
- Use capabilities object: `adapter.capabilities = { statusLine: boolean, sessionStart: boolean }`
- Register what works — if SessionStart works but StatusLine doesn't, register SessionStart only
- Allow users to disable hooks via config file (for troubleshooting)

### Hook Registration & Verification
- Match current Claude Code timing for when hooks are registered (investigate)
- Trust registration — if registration call succeeds, assume it works (no additional verification)
- Log error on registration failure but continue install — GSD works without hooks
- Re-registration on update: match current Claude Code behavior (investigate)

### Claude's Discretion
- Exact hook script implementation details
- StatusLine update frequency optimization
- Config file schema for disabling hooks
- Error message wording and logging verbosity
- Platform-specific adaptations for OpenCode

</decisions>

<specifics>
## Specific Ideas

- "Match current Claude Code behavior" — recurring theme for all four areas
- Hooks are nice-to-have, not essential — GSD should work even if all hooks fail
- Graceful degradation is the priority over feature parity
- Silent failures preferred over noisy warnings for unsupported features

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. No new hook types or capabilities suggested.

</deferred>

---

*Phase: 05-lifecycle-hooks*
*Context gathered: 2026-01-21*
