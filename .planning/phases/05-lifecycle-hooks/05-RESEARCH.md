# Phase 5: Lifecycle Hooks - Research

**Researched:** 2026-01-21
**Domain:** Lifecycle hooks, session management, status line display
**Confidence:** MEDIUM

## Summary

Lifecycle hooks in GSD consist of two main features: SessionStart (update checking, state loading at session initialization) and StatusLine (real-time context display). Claude Code natively supports both through its hooks configuration in settings.json. OpenCode has a fundamentally different plugin-based architecture that provides session events but lacks direct equivalents for command-based hooks and status line display.

The key finding is that OpenCode uses an event-driven plugin system (`session.created`, `session.idle`, etc.) rather than Claude Code's declarative hook configuration (`hooks.SessionStart[]`). This means implementing GSD's SessionStart functionality on OpenCode requires either writing a plugin or accepting that the feature will gracefully degrade.

**Primary recommendation:** Implement full hook support for Claude Code (matching current behavior exactly), and graceful degradation for OpenCode (skip hook registration silently). OpenCode plugin development is out of Phase 5 scope - a native plugin would be a v2 enhancement.

## Standard Stack

### Core (Claude Code)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js fs | built-in | Hook script file operations | No dependencies needed |
| child_process | built-in | Spawn detached background processes | Update check runs asynchronously |
| JSON | built-in | Parse settings.json configuration | Native JSON support sufficient |

### Core (OpenCode)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| jsonc-parser | 3.x+ | Parse OpenCode's JSONC config | Already installed in Phase 3, handles comments |
| N/A | N/A | Plugin would require @opencode-ai/plugin | Deferred to v2 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Command hooks | OpenCode plugin | Would require npm package, significantly more complex, not backward compatible |
| Graceful degradation | Force hooks on OpenCode | OpenCode doesn't support SessionStart natively, would cause errors |
| Silent skip | Log warning on skip | User decisions prefer silent skip over noisy warnings |

**Installation:**
No additional dependencies needed - all libraries already available from Phase 3.

## Architecture Patterns

### Recommended Project Structure

```
hooks/
  gsd-check-update.js    # SessionStart hook - update checking
  statusline.js          # StatusLine hook - context display
src/platform/adapters/
  claude-code.ts         # registerHook() implementation
  opencode.ts            # registerHook() stub with graceful no-op
```

### Pattern 1: Capability-Based Hook Registration

**What:** Check adapter capabilities before attempting hook registration.

**When to use:** During installation to avoid errors on platforms that don't support hooks.

**Example:**
```typescript
// Source: Derived from user decisions in 05-CONTEXT.md
async function registerHooksIfSupported(adapter: PlatformAdapter, hookPath: string) {
  // Check capabilities before registration
  if (!adapter.supportsHooks()) {
    // Silent skip - no log, no error (per user decision)
    return;
  }

  try {
    await adapter.registerHook('SessionStart', hookPath);
  } catch (error) {
    // Log error but continue - GSD works without hooks
    console.error(`  Warning: Hook registration failed: ${error.message}`);
  }
}
```

### Pattern 2: Claude Code Hook Configuration Format

**What:** Claude Code uses a specific nested array structure for hook registration.

**When to use:** ClaudeCodeAdapter.registerHook() implementation.

**Example:**
```typescript
// Source: https://code.claude.com/docs/en/settings
// Claude Code settings.json hooks structure:
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node ~/.claude/hooks/gsd-check-update.js"
          }
        ]
      }
    ]
  },
  "statusLine": {
    "type": "command",
    "command": "node ~/.claude/hooks/statusline.js"
  }
}
```

Note: SessionStart hooks are nested array of objects. StatusLine is a separate top-level config object, NOT in the hooks array.

### Pattern 3: Background Process for Update Checking

**What:** Spawn detached child process for network operations to avoid blocking session start.

**When to use:** gsd-check-update.js SessionStart hook.

**Example:**
```javascript
// Source: Existing hooks/gsd-check-update.js
const child = spawn(process.execPath, ['-e', `
  // Background update check script
  const latest = execSync('npm view get-shit-done-cc version', { timeout: 10000 }).trim();
  fs.writeFileSync(cacheFile, JSON.stringify({ update_available: installed !== latest }));
`], {
  detached: true,
  stdio: 'ignore'
});
child.unref();  // Parent doesn't wait for child
```

### Anti-Patterns to Avoid

- **Anti-pattern: Registering hooks on unsupported platforms**
  - Why bad: Causes installation errors or runtime failures
  - Do instead: Check supportsHooks() capability first, skip silently if false

- **Anti-pattern: Blocking session start with network calls**
  - Why bad: Slow session initialization, poor UX
  - Do instead: Spawn detached background process, write results to cache file

- **Anti-pattern: StatusLine registered in hooks.StatusLine array**
  - Why bad: Claude Code uses top-level `statusLine` config, NOT `hooks.StatusLine[]`
  - Do instead: Set `settings.statusLine = { type: "command", command: "..." }` directly

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Update version check | HTTP library calls | `npm view` CLI command | Already works, handles registry auth, timeouts, retries |
| JSON with comments | Regex comment stripping | jsonc-parser | Edge cases with strings containing // or /* |
| Background process | setTimeout/setInterval | child_process.spawn with detached | Survives parent process exit |
| Platform detection | File existence checks | Existing detectPlatform() | Already handles env vars, markers, filesystem probing |

**Key insight:** GSD's existing hook scripts (gsd-check-update.js, statusline.js) already solve the core problems. Phase 5 is about making hook registration work cross-platform, not rewriting the hooks themselves.

## Common Pitfalls

### Pitfall 1: Confusing StatusLine Config Location

**What goes wrong:** Trying to register StatusLine via `hooks.StatusLine[]` like SessionStart.

**Why it happens:** Both are called "hooks" in GSD terminology, but Claude Code handles them differently.

**How to avoid:**
- StatusLine is a TOP-LEVEL config key: `settings.statusLine = { type, command }`
- SessionStart is in hooks array: `settings.hooks.SessionStart = [{ hooks: [...] }]`
- Current install.js already handles this correctly (lines 529-533)

**Warning signs:**
- StatusLine not appearing in Claude Code UI
- Hook registration "succeeds" but nothing displays

### Pitfall 2: OpenCode Plugin Complexity

**What goes wrong:** Attempting to create a full OpenCode plugin for SessionStart equivalent.

**Why it happens:** OpenCode supports plugins with `session.created` event that seems equivalent.

**How to avoid:**
- OpenCode plugins require npm package structure
- Plugin development is significant scope increase
- Graceful degradation is the Phase 5 approach (per user decisions)
- Full OpenCode plugin support is deferred to v2

**Warning signs:**
- Scope creep into plugin development
- Dependencies on @opencode-ai/plugin type definitions
- Need to publish npm package

### Pitfall 3: Hook Registration Idempotency

**What goes wrong:** Multiple installations create duplicate hook entries in settings.json.

**Why it happens:** Simple array.push() without checking for existing entries.

**How to avoid:**
- Check if hook already exists before adding
- Match on command path, not entire object
- Current install.js already has deduplication logic (lines 507-514)

**Warning signs:**
- Multiple gsd-check-update entries in settings.json
- Update check runs multiple times per session

### Pitfall 4: Network Timeout in SessionStart

**What goes wrong:** Slow/failing npm registry makes session start slow or hang.

**Why it happens:** Network operations in synchronous SessionStart hook.

**How to avoid:**
- Use detached child process for network operations
- Set explicit timeout (current: 10 seconds)
- Write results to cache file for later reading
- Silent continue on network errors (per user decision)

**Warning signs:**
- Claude Code session start takes >5 seconds
- Error logs about npm registry timeouts

### Pitfall 5: Hardcoded Paths in Hook Scripts

**What goes wrong:** Hook scripts use `~/.claude/` paths that don't work for local installs.

**Why it happens:** Easy to forget local install mode uses `./.claude/` not `~/.claude/`.

**How to avoid:**
- Current gsd-check-update.js uses `os.homedir()` + '.claude' construction
- For local installs, commands already use relative paths
- Install.js generates correct path prefix during installation

**Warning signs:**
- Local install hooks can't find cache files
- Version file path mismatch

## Code Examples

Verified patterns from official sources:

### Claude Code SessionStart Hook Registration

```typescript
// Source: https://code.claude.com/docs/en/settings
// Current ClaudeCodeAdapter.registerHook() implementation:
async registerHook(hookType: HookType, hookPath: string): Promise<void> {
  const config = await this.readConfig();

  // Initialize hooks structure if needed
  if (!config.hooks) {
    config.hooks = {};
  }
  if (!config.hooks[hookType]) {
    config.hooks[hookType] = [];
  }

  // Add hook entry with nested structure
  config.hooks[hookType].push({
    hooks: [{ type: 'command', command: hookPath }]
  });

  await this.writeConfig(config);
}
```

### Claude Code StatusLine Configuration

```typescript
// Source: https://code.claude.com/docs/en/settings
// StatusLine is NOT registered via registerHook() - it's top-level config
settings.statusLine = {
  type: 'command',
  command: 'node "$HOME/.claude/hooks/statusline.js"'
};
```

### OpenCode Graceful Degradation

```typescript
// Source: Phase 5 decision - graceful degradation
export class OpenCodeAdapter implements PlatformAdapter {
  supportsHooks(): boolean {
    // OpenCode uses plugin system, not command hooks
    return false;
  }

  supportsStatusLine(): boolean {
    // OpenCode TUI doesn't have configurable status line
    return false;
  }

  async registerHook(hookType: HookType, hookPath: string): Promise<void> {
    // Silent no-op per user decision (don't register, don't error, don't log)
    // OpenCode would need a plugin for equivalent functionality
    return;
  }
}
```

### Idempotent Hook Registration

```typescript
// Source: Existing bin/install.js deduplication pattern
const hasGsdUpdateHook = settings.hooks?.SessionStart?.some(entry =>
  entry.hooks && entry.hooks.some(h =>
    h.command && h.command.includes('gsd-check-update')
  )
);

if (!hasGsdUpdateHook) {
  await adapter.registerHook('SessionStart', updateCheckCommand);
  console.log(`  ${green}ok${reset} Configured update check hook`);
}
```

### StatusLine Content Generation

```javascript
// Source: Existing hooks/statusline.js
// Key behaviors to maintain:
// 1. Read JSON from stdin (Claude Code provides session data)
// 2. Show: model | current task | directory | context usage
// 3. Check update cache and show notification if update available
// 4. Silent fail on errors (don't break statusline on parse errors)

process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    // ... format output
    process.stdout.write(`${model} | ${task} | ${dirname}${ctx}`);
  } catch (e) {
    // Silent fail
  }
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual update checking | SessionStart hook | GSD v1.x | Automatic background updates |
| No status context | StatusLine hook | GSD v1.x | Always-visible phase/task info |
| Platform-specific hooks only | Capability-based registration | Phase 5 | Cross-platform with graceful degradation |
| Error on unsupported platform | Silent skip | Phase 5 | Better UX on OpenCode |

**Deprecated/outdated:**
- **gsd-notify.sh:** Removed in v1.6.x, replaced by StatusLine hook
- **Direct network calls in SessionStart:** Use background process to avoid blocking

## Open Questions

Things that couldn't be fully resolved:

1. **OpenCode StatusLine equivalent**
   - What we know: OpenCode TUI has built-in session/model display but no configurable status line
   - What's unclear: Whether plugin could inject custom UI elements
   - Recommendation: Accept graceful degradation for Phase 5, research plugin UI capabilities for v2

2. **OpenCode plugin for SessionStart equivalent**
   - What we know: `session.created` event fires on new sessions, could trigger update check
   - What's unclear: Whether plugin infrastructure is stable enough for production use
   - Recommendation: Defer to v2, graceful degradation for Phase 5

3. **Config file schema for disabling hooks**
   - What we know: User decision allows disabling hooks via config
   - What's unclear: Exact schema location and format
   - Recommendation: Claude's discretion per CONTEXT.md - suggest `gsd.hooks.enabled: boolean` in settings

4. **Hook re-registration on GSD update**
   - What we know: Current install.js has deduplication logic
   - What's unclear: Whether to replace or append on version upgrade
   - Recommendation: Match current behavior (append-with-dedupe), investigate full cleanup in v2

## Sources

### Primary (HIGH confidence)

- [Claude Code Settings Documentation](https://code.claude.com/docs/en/settings) - Official hook configuration schema
- [Claude Code Hooks Blog Post](https://claude.com/blog/how-to-configure-hooks) - Hook types and examples
- Existing codebase files:
  - `hooks/gsd-check-update.js` - Current SessionStart implementation
  - `hooks/statusline.js` - Current StatusLine implementation
  - `bin/install.js` - Hook registration logic (lines 506-521)
  - `src/platform/adapters/claude-code.ts` - registerHook() implementation

### Secondary (MEDIUM confidence)

- [OpenCode Plugins Documentation](https://opencode.ai/docs/plugins/) - Plugin event types
- [OpenCode Config Documentation](https://opencode.ai/docs/config/) - Configuration schema
- [OpenCode Plugins Guide (Gist)](https://gist.github.com/johnlindquist/0adf1032b4e84942f3e1050aba3c5e4a) - Plugin API reference
- [OpenCode SessionStart Feature Request](https://github.com/sst/opencode/issues/5409) - SessionStart hook status

### Tertiary (LOW confidence)

- WebSearch results on OpenCode hooks - Plugin system still evolving, some APIs experimental
- DeepWiki documentation aggregations - Secondary sources, defer to official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies needed, existing patterns sufficient
- Architecture: HIGH for Claude Code (well-documented), MEDIUM for OpenCode (graceful degradation)
- Pitfalls: HIGH - Based on existing codebase analysis and user decisions
- OpenCode equivalent: LOW - Plugin system experimental, SessionStart feature request still open

**Research date:** 2026-01-21
**Valid until:** ~60 days (Claude Code hooks stable, OpenCode plugin system still evolving)

## Critical Path Items for Planner

**MUST IMPLEMENT in Phase 5:**

1. **Verify/fix ClaudeCodeAdapter.registerHook()**
   - Current implementation exists but needs idempotency verification
   - Must handle both SessionStart and StatusLine differently (StatusLine is top-level, not in hooks array)

2. **Implement OpenCodeAdapter graceful degradation**
   - `supportsHooks()` returns false (already done in Phase 3)
   - `registerHook()` should be silent no-op, not throw error
   - `supportsStatusLine()` returns false (already done)

3. **Update install.js for cross-platform hook registration**
   - Check `adapter.supportsHooks()` before registration
   - Skip hook registration silently on OpenCode
   - StatusLine registration only for Claude Code

4. **Verify existing hook scripts work unchanged**
   - gsd-check-update.js - SessionStart update checker
   - statusline.js - StatusLine context display
   - Both should require no changes (platform-agnostic by design)

5. **Add config option to disable hooks**
   - User decision: Allow disabling hooks via config file
   - Suggested schema: Check for `gsd.hooks.enabled: false` in settings
   - Claude's discretion on exact format

**SCOPE BOUNDARIES:**

- IN SCOPE: Hook registration on supported platforms
- IN SCOPE: Graceful degradation on unsupported platforms
- IN SCOPE: Config option to disable hooks
- OUT OF SCOPE: OpenCode plugin development
- OUT OF SCOPE: New hook types beyond SessionStart/StatusLine
- OUT OF SCOPE: Hook content changes (existing scripts work)

**VERIFICATION CRITERIA (from requirements):**

- [ ] HOOK-01: SessionStart hook executes on both platforms (or gracefully degrades)
- [ ] HOOK-02: StatusLine shows phase/plan context on Claude Code
- [ ] HOOK-03: Hook registration succeeds on both platforms with verification
- [ ] HOOK-04: Hook execution verification (update check runs, statusline displays)
