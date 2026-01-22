# Pitfalls Research: Platform Documentation

**Domain:** Platform adapter/plugin documentation for contributors
**Researched:** 2026-01-22
**Confidence:** HIGH (based on GSD architecture analysis + SDK/plugin documentation patterns)

---

## Critical Pitfalls

Mistakes that cause major contributor confusion or abandoned PRs.

### Pitfall 1: Interface Documentation Without Behavioral Contracts

**What goes wrong:**

Documentation shows the `PlatformAdapter` interface methods but doesn't explain the behavioral expectations. Contributor implements `registerHook()` that adds hooks to config but doesn't check for idempotency. Result: Multiple installations create duplicate hooks.

**Warning signs:**

- Interface has JSDoc with method signatures only ("what") not behavior ("how")
- Contributors ask "is this idempotent?" or "should this throw or return null?"
- PRs implement same method differently across adapters
- Existing adapter code has `// Idempotency check` comments not mentioned in docs

**Why it happens:**

- Interface defines types but behavioral contracts live only in inline comments
- TypeScript types enforce structure, not behavior
- Contributors read interface declaration, not implementation
- "It's obvious" syndrome - author assumes behavior is self-evident

**Consequences:**

- Adapters pass type checks but behave inconsistently
- Subtle bugs: hooks duplicated, configs corrupted, agents spawn twice
- Contributors waste time reverse-engineering existing implementations
- Code review becomes behavioral specification review

**Prevention:**

Document ALL behavioral requirements explicitly in Architecture docs:

```markdown
### registerHook() Contract

**Idempotency:** Multiple calls with same (hookType, hookPath) MUST result
in single hook registration. Check existing hooks before adding.

**Error handling:**
- Hook file doesn't exist: Throw `Error("Hook file not found: {path}")`
- HookType unsupported: Throw `Error("Hook type {type} not supported")`
- Already registered: Return silently (success, no-op)

**Side effects:**
- MUST backup config before modification (per INST-05)
- MUST create hooks structure if not exists
```

**Doc section that should address it:** Architecture doc "Behavioral Contracts" section; each interface method gets contract specification table.

**Real example from GSD:**
```typescript
// adapter.ts lines 334-358 - BINDING REQUIREMENTS section
// This is exactly the content that needs to be in contributor docs,
// not hidden in implementation file comments
```

---

### Pitfall 2: Missing "Complete Example" Adapter

**What goes wrong:**

Documentation explains individual methods but no complete, working adapter example. Contributor implements methods correctly in isolation but misses integration: constructor doesn't initialize paths, spawnAgent doesn't use platform's getAgentsDir(), hooks registered but capability returns false.

**Warning signs:**

- Contributors submit PRs with "works for me" but fails integration tests
- Questions like "where do I initialize the Paths class?"
- Adapter methods work individually, fail when called in sequence
- Test coverage looks good but end-to-end fails

**Why it happens:**

- Tutorial shows pieces, not whole
- Existing adapters evolved incrementally, hard to copy
- No "starter template" to copy-paste
- Method explanations reference other methods vaguely

**Consequences:**

- Contributors piece together adapter from scattered examples
- Subtle ordering bugs (readConfig before paths initialized)
- Constructor boilerplate reinvented differently each time
- 3-4 review cycles to fix integration issues

**Prevention:**

Provide annotated complete adapter skeleton:

```typescript
/**
 * Starter template for new platform adapters.
 * Copy this file, rename, fill in implementations.
 * 
 * INTEGRATION CHECKLIST:
 * [ ] Constructor initializes paths
 * [ ] spawnAgent uses this.paths.getAgentsDir()
 * [ ] Capabilities return correct values for your platform
 * [ ] All async methods return Promises (even if trivial)
 */
export class NewPlatformAdapter implements PlatformAdapter {
  readonly name: PlatformType = 'new-platform';  // Add to PlatformType union
  readonly version: string = '1.0.0';
  
  private paths: NewPlatformPaths;  // Must create NewPlatformPaths class
  
  constructor() {
    // REQUIRED: Initialize paths before any method uses them
    this.paths = new NewPlatformPaths();
  }
  
  // Path delegation - just forward to paths class
  getConfigDir(): string { return this.paths.getConfigDir(); }
  getCommandsDir(): string { return this.paths.getCommandsDir(); }
  getAgentsDir(): string { return this.paths.getAgentsDir(); }
  getHooksDir(): string { return this.paths.getHooksDir(); }
  
  // IMPLEMENT: Platform-specific config management
  async readConfig(): Promise<Record<string, any>> {
    // Read from your platform's config file
    // Return {} if file doesn't exist
    // Throw if malformed
    throw new Error('TODO: Implement readConfig');
  }
  
  // ... rest of interface with TODO markers
}
```

**Doc section that should address it:** "Creating Your First Adapter" tutorial with complete, annotated example; "Adapter Template" reference file in repo.

---

### Pitfall 3: Undocumented Registration in Registry/Detection

**What goes wrong:**

Contributor creates perfect `CursorAdapter` class but GSD doesn't use it. Platform detection returns 'unknown', registry doesn't know about new platform. Contributor doesn't realize they need to touch 3 files.

**Warning signs:**

- "I created the adapter but nothing happens"
- PRs with adapter only, missing registry/detection/types changes
- New platform tests pass in isolation but fail in integration
- Contributors ask "how do I make GSD use my adapter?"

**Why it happens:**

- Adapter creation tutorial ends at adapter file
- Registration spread across multiple files (types.ts, detection.ts, registry.ts)
- No checklist of "files to modify"
- Integration points not linked in adapter docs

**Consequences:**

- PRs require multiple rounds of "also update X"
- Contributors frustrated by "hidden requirements"
- Incomplete PRs that add adapter but forget detection

**Prevention:**

Document the complete registration flow:

```markdown
## New Adapter Registration Checklist

Adding a new platform requires changes to 4 files:

### 1. src/platform/types.ts
Add platform to union type:
```typescript
export type PlatformType = 'claude-code' | 'opencode' | 'cursor' | 'unknown';
```

### 2. src/platform/detection.ts
Add detection logic (priority: env var → marker file → filesystem):
```typescript
// Check for Cursor
const cursorConfig = path.join(homeDir, '.cursor', 'config.json');
const hasCursor = fs.existsSync(cursorConfig);
```

### 3. src/platform/registry.ts
Add case in createPathResolver:
```typescript
case 'cursor':
  return new CursorPaths();
```

### 4. src/platform/adapters/cursor.ts
Create adapter implementation (see template above)

## Validation

After registration, verify:
```bash
GSD_PLATFORM=cursor npm test -- --grep "Cursor"
```
```

**Doc section that should address it:** "Adding a New Platform" guide with explicit checklist; registration diagram showing file relationships.

---

### Pitfall 4: Testing Guide Without Contract Test Pattern

**What goes wrong:**

Documentation says "write tests for your adapter" but doesn't explain the shared contract test pattern. Contributor writes their own test suite that doesn't cover contract requirements, or duplicates tests that exist in shared test file.

**Warning signs:**

- New adapter tests don't run `runAdapterContractTests()`
- Duplicate assertions across adapter test files
- Contract violations not caught until integration
- PRs with extensive tests that miss behavioral requirements

**Why it happens:**

- Shared contract tests exist but not mentioned in docs
- "Just look at the other test files" - but which parts to copy?
- Contract tests vs platform-specific tests not distinguished
- Test file organization not explained

**Consequences:**

- Contract violations slip through (path not absolute, config not preserved)
- Duplicated test maintenance
- Inconsistent test coverage across adapters
- Test suite grows without adding value

**Prevention:**

Document the two-tier testing strategy explicitly:

```markdown
## Testing Your Adapter

GSD uses a two-tier testing strategy:

### Tier 1: Contract Tests (Shared)

Every adapter MUST pass the shared contract tests. These verify the
`PlatformAdapter` interface behavioral requirements.

```typescript
// tests/contract/cursor.contract.test.ts
import { runAdapterContractTests } from './adapter.contract';
import { CursorAdapter } from '../../src/platform/adapters/cursor';

// This runs ALL shared contract tests
runAdapterContractTests('CursorAdapter', () => new CursorAdapter());
```

Contract tests verify:
- Path methods return absolute paths (never relative)
- Config methods preserve existing settings
- Hook registration is idempotent
- All async methods return Promises

### Tier 2: Platform-Specific Tests

After contract tests pass, add platform-specific behavior tests:

```typescript
describe('CursorAdapter - Platform-Specific', () => {
  it('reads from .cursor/config.json (not settings.json)', async () => {
    // Test Cursor-specific config location
  });
  
  it('supports native Cursor agent spawning', () => {
    // Test Cursor-specific spawning mechanism
  });
});
```

### Test Isolation

All adapter tests use temp directories to avoid touching real config:

```typescript
beforeAll(() => {
  testTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-cursor-test-'));
  process.env.CURSOR_CONFIG_DIR = testTmpDir;  // Redirect adapter
});
```
```

**Doc section that should address it:** "Testing Guide" with contract vs platform-specific sections; template test file; test isolation pattern.

---

### Pitfall 5: Implicit Knowledge About Capability Differences

**What goes wrong:**

Documentation shows capability methods (`supportsHooks()`, `supportsParallelAgents()`) without explaining that capabilities affect which commands work. Contributor implements adapter where `supportsHooks() = false` but doesn't realize this disables 9 GSD commands.

**Warning signs:**

- "Why don't hooks work on my platform?"
- Contributor returns `false` for capabilities without understanding impact
- PRs with incorrect capability values (returning true when feature doesn't work)
- Feature works in isolation but fails in GSD workflow

**Why it happens:**

- Capability methods look like simple boolean getters
- Impact of capabilities not documented
- No command-capability matrix
- "Just return false if unsupported" oversimplifies

**Consequences:**

- Silent feature degradation (commands skip behavior, no error)
- User confusion ("worked on Claude Code, not on Cursor")
- Contributors hardcode wrong capability values
- Feature testing incomplete (didn't test with capability=false)

**Prevention:**

Document capability impact explicitly:

```markdown
## Capability Methods

Each capability method controls feature availability. Return values affect
which GSD features work on your platform.

### supportsParallelAgents()

**Returns:** `true` if platform can spawn multiple agents concurrently

**Impact when false:**
- `/gsd:new-project` spawns researchers sequentially (slower)
- `/gsd:execute-phase` runs tasks one-at-a-time
- 4-agent parallel research becomes 4 sequential calls

**How to determine:** Can your platform run multiple AI instances
simultaneously? Claude Code: Task tool supports parallel. OpenCode: 
CLI spawn supports parallel.

### supportsHooks()

**Returns:** `true` if platform has lifecycle hook system

**Impact when false:**
- SessionStart hooks don't run (no auto-context loading)
- StatusLine not available (no progress indicator)
- Users must manually run `/gsd:resume-work` each session

**How to determine:** Does your platform have pre-session or
post-session hooks? Claude Code: settings.json hooks. OpenCode: no
equivalent (graceful degradation).

### supportsStatusLine()

**Returns:** `true` if platform can display persistent status

**Impact when false:**
- Progress shown in console only, not status bar
- No context usage indicator
- Purely cosmetic - no workflow impact

## Command-Capability Matrix

| Command | Requires Parallel | Requires Hooks | Requires StatusLine |
|---------|-------------------|----------------|---------------------|
| /gsd:new-project | Optimal but works | Works without | Works without |
| /gsd:resume-work | No | Automatic with, manual without | No |
| /gsd:execute-phase | Optimal but works | No | No |
```

**Doc section that should address it:** "Capabilities" reference section; command-capability matrix; graceful degradation explanation.

---

## Common Pitfalls

Frequent but less severe issues.

### Pitfall 6: Config File Format Not Specified

**What goes wrong:**

Documentation mentions "read and write platform config" but doesn't specify format. Contributor writes JSON to a platform expecting JSONC (comments get stripped), or writes with wrong indentation, or doesn't handle missing file.

**Warning signs:**

- "My config file got corrupted after GSD install"
- PRs with `JSON.stringify()` for platforms using JSONC
- Contributors ask "what format should I use?"
- Config methods work but break platform's native config reading

**Prevention:**

Specify config requirements per platform:

```markdown
### Config File Requirements

Each platform has specific config format requirements:

| Platform | File | Format | Comments | Creation |
|----------|------|--------|----------|----------|
| Claude Code | settings.json | JSON | No | Create if missing |
| OpenCode | opencode.json | JSONC | Preserve | Create if missing |
| Cursor | config.json | JSON | No | Never create |

**JSONC platforms:** Use `jsonc-parser` to read/write:
```typescript
import { parse, modify, applyEdits } from 'jsonc-parser';
// Preserves comments when modifying
```

**Missing config:** Return `{}` from `readConfig()`, don't throw.
```

**Doc section that should address it:** "Configuration Management" section with format table.

---

### Pitfall 7: Path Resolution Edge Cases Undocumented

**What goes wrong:**

Documentation shows `getConfigDir()` returns path but doesn't explain environment variable overrides or tilde expansion. Contributor hardcodes `~/.cursor/` instead of checking `CURSOR_CONFIG_DIR`.

**Warning signs:**

- Tests pass locally, fail in CI (different home dir)
- Contributor doesn't implement env var override
- Tilde in paths breaks Windows

**Prevention:**

Document path resolution requirements:

```markdown
### Path Resolution Requirements

All path methods MUST:

1. **Check environment variable first:**
   ```typescript
   const envDir = process.env.CURSOR_CONFIG_DIR;
   if (envDir) return this.expandTilde(envDir);
   ```

2. **Expand tilde (~) in paths:**
   ```typescript
   private expandTilde(filePath: string): string {
     if (filePath.startsWith('~/')) {
       return path.join(os.homedir(), filePath.slice(2));
     }
     return filePath;
   }
   ```

3. **Return absolute paths (never relative):**
   ```typescript
   // WRONG: return '.cursor'
   // RIGHT: return path.join(os.homedir(), '.cursor')
   ```

4. **Use path.join() for cross-platform:**
   ```typescript
   // WRONG: return configDir + '/commands'
   // RIGHT: return path.join(configDir, 'commands')
   ```
```

**Doc section that should address it:** "Path Resolution" section with code examples.

---

### Pitfall 8: Error Handling Philosophy Unclear

**What goes wrong:**

Some adapter methods throw errors, others return null/empty, others silently succeed. Contributor inconsistent with error handling, leading to unpredictable behavior.

**Warning signs:**

- PRs mix throw/return-null for similar errors
- "Should this throw or return empty object?"
- Silent failures in production

**Prevention:**

Document error handling philosophy:

```markdown
### Error Handling Convention

**Throw when:**
- File exists but malformed (config parse error)
- Required operation fails (can't write config)
- Agent file not found (spawnAgent)

**Return empty/null when:**
- File doesn't exist yet (config not created = `{}`)
- No-op success (unregisterHook on non-existent hook)

**Silent success when:**
- Idempotent operation already done (hook already registered)
- Graceful degradation (registerHook on unsupported platform)

### Error Messages

Include context in errors:
```typescript
// WRONG
throw new Error('File not found');

// RIGHT  
throw new Error(`Agent file not found: ${agentPath}`);
```
```

**Doc section that should address it:** "Error Handling" section in adapter guide.

---

### Pitfall 9: Stub Methods Without Migration Plan

**What goes wrong:**

Contributor sees existing adapters have `throw new Error('Not implemented in Phase X')` stubs. Copies pattern but doesn't understand: stubs are legacy, new adapters should implement. Submits adapter with stubs that will never be filled in.

**Warning signs:**

- PRs with `throw new Error('TODO')` for optional methods
- Contributor assumes stubs are acceptable
- Copied stub patterns from v1.0 adapters in v2.0 adapter

**Prevention:**

Document stub status explicitly:

```markdown
### Method Implementation Status

| Method | Required | Notes |
|--------|----------|-------|
| readConfig | YES | Must implement |
| writeConfig | YES | Must implement |
| registerHook | Conditional | Implement OR return silently if !supportsHooks() |
| spawnAgent | YES | Must implement |
| registerCommand | NO* | Handled by installer, stub OK |

*Methods marked with stubs in existing adapters are legacy from phased
implementation. New adapters should implement fully or use graceful
degradation pattern.

### Graceful Degradation Pattern

For unsupported features, don't throw - silently succeed:
```typescript
async registerHook(hookType: HookType, hookPath: string): Promise<void> {
  // Platform doesn't support hooks - silent no-op (not an error)
  return;
}
```
```

**Doc section that should address it:** "Implementation Status" table in adapter guide.

---

### Pitfall 10: Unclear Contribution Scope

**What goes wrong:**

Contributor wants to add Cursor support. Unclear if they should: (a) just create adapter, (b) also update installer, (c) also create Cursor-specific commands, (d) also add Cursor to CI. Scope creep or incomplete PRs.

**Warning signs:**

- "Is this PR done or do I need to do more?"
- PRs either too minimal (adapter only) or too ambitious (installer rewrite)
- Contributors don't know when to stop

**Prevention:**

Define clear contribution boundaries:

```markdown
### Contribution Scope Guide

**Minimal viable adapter contribution:**
- [ ] New adapter class implementing PlatformAdapter
- [ ] New paths class implementing PathResolver
- [ ] Detection logic addition
- [ ] Registry update
- [ ] Contract tests passing
- [ ] Platform-specific tests

**Separate PRs (not required for adapter):**
- Installer multi-platform TUI (separate PR)
- CI platform matrix (separate PR)
- Platform-specific commands (separate PR)
- Documentation updates (can include)

**What reviewers check:**
1. Contract tests pass
2. Detection reliable
3. No regression to existing platforms
4. Code follows existing patterns
```

**Doc section that should address it:** "Contributing a New Adapter" guide with scope checklist.

---

## Prevention Matrix

| Pitfall | Warning Sign | Prevention | Doc Section |
|---------|--------------|------------|-------------|
| 1. Interface without behavioral contracts | "Should this throw?" questions | Document ALL behavioral requirements explicitly | Architecture: Behavioral Contracts |
| 2. Missing complete example | Integration fails, pieces work | Provide annotated adapter skeleton template | Tutorial: Creating Your First Adapter |
| 3. Undocumented registration | "Adapter works but GSD ignores it" | 4-file registration checklist | Guide: Adding a New Platform |
| 4. Testing without contract pattern | Custom tests miss contract requirements | Document two-tier testing strategy | Testing Guide |
| 5. Implicit capability impact | Wrong capability values, silent failures | Capability-command matrix | Reference: Capabilities |
| 6. Config format not specified | Config corruption | Format requirements table per platform | Reference: Configuration |
| 7. Path edge cases | Tests fail in CI | Path resolution requirements checklist | Reference: Path Resolution |
| 8. Error handling unclear | Inconsistent throw/return | Error handling philosophy doc | Reference: Error Handling |
| 9. Stub methods copied | PRs with unfilled stubs | Implementation status table | Adapter Guide |
| 10. Unclear contribution scope | Scope creep or incomplete PRs | Contribution scope checklist | Contributing Guide |

---

## Documentation Structure Recommendation

Based on pitfalls, documentation should include:

### 1. Architecture Overview (addresses #1, #5)
- System component diagram
- Adapter pattern explanation  
- **Behavioral Contracts section** (critical)
- Capability impact matrix

### 2. Creating Your First Adapter (addresses #2, #3)
- **Complete annotated template** (critical)
- Step-by-step with screenshots
- **Registration checklist** (critical)
- Common mistakes section

### 3. Testing Guide (addresses #4)
- **Two-tier testing strategy** (critical)
- Contract test usage
- Test isolation pattern
- Coverage expectations

### 4. Reference Documentation (addresses #6, #7, #8)
- Configuration format table
- Path resolution requirements
- Error handling convention
- Method implementation status

### 5. Contributing Guide (addresses #9, #10)
- PR scope definition
- Review checklist
- What's required vs optional

---

## Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Behavioral contract pitfall | HIGH | Direct observation: adapter.ts has 50+ lines of contract comments not in docs |
| Missing example pitfall | HIGH | Two existing adapters, no template or tutorial |
| Registration pitfall | HIGH | Registration spans 4 files, not documented |
| Testing pitfall | HIGH | Contract tests exist but not mentioned anywhere |
| Capability pitfall | MEDIUM | Impact inferred from code, not tested |
| Config format pitfall | HIGH | OpenCode JSONC requirement visible in code |
| Path resolution pitfall | HIGH | Both adapters implement env var override |
| Error handling pitfall | MEDIUM | Inferred from inconsistencies in adapters |
| Stub pattern pitfall | HIGH | Phase 2/3 stubs visible in both adapters |
| Scope pitfall | MEDIUM | General open-source contribution pattern |

**Overall confidence: HIGH** - Pitfalls derived from direct GSD codebase analysis and established SDK/plugin documentation patterns.

---

## Sources

**GSD Codebase Analysis:**
- `src/platform/adapter.ts` - Interface with behavioral contracts in comments
- `src/platform/adapters/claude-code.ts` - Example implementation patterns
- `src/platform/adapters/opencode.ts` - Graceful degradation patterns
- `tests/contract/adapter.contract.ts` - Shared contract test pattern
- `tests/contract/*.contract.test.ts` - Two-tier test structure
- `src/platform/registry.ts` - Registration pattern
- `src/platform/detection.ts` - Detection logic
- `src/platform/paths.ts` - Path resolution patterns

**Documentation Pattern Sources:**
- Microsoft VSCode Extension Samples: README guidelines, test requirements
- NGINX Documentation: Prerequisites placement, getting started best practices
- Strapi Plugin SDK: Local plugin configuration pitfalls
- Claude Code documentation-patterns.md: Documentation principles
- Caido Developer Docs: Code example requirements
