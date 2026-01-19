# Technology Stack: Multi-Platform GSD

**Project:** Multi-Platform GSD (Platform Abstraction Layer)
**Researched:** 2026-01-19
**Domain:** Platform-agnostic AI development tool extensions
**Overall Confidence:** MEDIUM (based on established patterns, Node.js ecosystem verification needed)

## Executive Summary

Multi-platform plugin systems require **runtime abstraction** over platform-specific APIs. The standard 2025 approach uses **adapter pattern with dependency injection**, not compile-time conditionals. GSD's existing Node.js foundation (16.7.0+) is the correct choice - cross-platform runtimes like Node provide stable abstractions while TypeScript adds type safety for adapter contracts.

**Key architectural decision:** Abstract platform APIs behind interfaces, detect platform at runtime, inject appropriate adapter. This enables single codebase with platform-specific implementations swapped at initialization.

## Recommended Stack

### Core Runtime & Language

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Node.js** | >=16.7.0 (existing) | Runtime environment | Already used by GSD; cross-platform by default; stable fs/path/os APIs; no additional runtime needed | HIGH |
| **TypeScript** | ^5.3.0 | Type-safe adapter contracts | Enforces adapter interface compliance; catches platform integration bugs at compile time; industry standard for plugin systems | MEDIUM |
| **JavaScript (ES2022)** | - | Fallback option | If TypeScript overhead too high; lose compile-time safety but gain simpler build | MEDIUM |

**Rationale:** Node.js is already a dependency (package.json shows no runtime deps). TypeScript adds value specifically for adapter pattern - interface contracts prevent "forgot to implement method X on platform Y" bugs. The 5.3.0 version includes stable Decorator support useful for platform registry.

### Platform Detection & Registry

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **env-paths** | ^3.0.0 | Cross-platform config directory resolution | Handles `~/.claude/` vs `~/.config/opencode/` vs Windows `%APPDATA%` correctly; battle-tested (81M weekly downloads) | MEDIUM |
| **which** | ^4.0.0 | Runtime platform detection | Detect if `claude-code` or `opencode` CLI exists in PATH; fast check for installer | MEDIUM |
| Custom registry | - | Platform adapter factory | Map detected platform → adapter instance; simple JS object/Map, no library needed | HIGH |

**Rationale:** Don't reinvent cross-platform path resolution - `env-paths` solves the `~/.claude` vs `~/.config/opencode` vs Windows problem. Platform detection via `which` CLI tool check is more reliable than env var sniffing (works even if settings.json doesn't exist yet).

### Configuration Management

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **json5** | ^2.2.3 | Parse/write JSON with comments | Handle settings.json (strict JSON) and opencode.jsonc (JSON with comments) with single parser | MEDIUM |
| **yaml** | ^2.3.4 | YAML frontmatter parsing | Command files use YAML frontmatter; already implicit dependency | HIGH |
| Custom merger | - | Platform-specific config merging | Simple Object.assign for settings overlay; no library needed | HIGH |

**Rationale:** OpenCode uses `.jsonc` (JSON with comments), Claude Code uses strict JSON. `json5` handles both without separate parsers. YAML already required for command frontmatter.

### Build & Distribution

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **npm** | - | Package distribution | Already using (package.json exists); users expect `npx get-shit-done-cc` | HIGH |
| **esbuild** | ^0.19.0 | Fast bundling (optional) | If using TypeScript, bundle to single JS file; 100x faster than webpack | MEDIUM |
| Bash scripts | - | Installation orchestration | Existing install.js works; extend with platform selection prompts | HIGH |

**Rationale:** Continue npm distribution (1.6k+ downloads, proven). If TypeScript added, esbuild compiles/bundles fast. Keep install.js approach (readline prompts work well).

### Testing Multi-Platform

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Mock adapters** | - | Test without platform installed | Create FakePlatformAdapter implementing interface; test business logic without Claude Code/OpenCode | HIGH |
| **Docker containers** | - | Integration test both platforms | Run Claude Code container + OpenCode container; verify actual installation | MEDIUM |
| **Snapshot testing** | - | Verify config transformations | Jest/Vitest snapshots for settings.json generation per platform | MEDIUM |

**Rationale:** Unit test with mocks (fast, no platform needed). Integration test with Docker (slow, verifies real behavior). Snapshot test prevents config regressions.

## Platform Abstraction Pattern

### Recommended: Adapter Pattern + Factory

```typescript
// Core interface all platforms must implement
interface PlatformAdapter {
  // Identification
  readonly name: string;           // "claude-code" | "opencode" | "cursor"
  readonly version: string;         // Platform version

  // Path resolution
  getConfigDir(): string;           // ~/.claude vs ~/.config/opencode
  getCommandsDir(): string;         // commands/gsd vs commands
  getHooksDir(): string;            // hooks vs plugins

  // Configuration
  readConfig(): Promise<PlatformConfig>;
  writeConfig(config: PlatformConfig): Promise<void>;
  mergeConfig(updates: Partial<PlatformConfig>): Promise<void>;

  // Hook registration
  registerHook(event: HookEvent, script: string): Promise<void>;
  unregisterHook(event: HookEvent): Promise<void>;

  // Agent spawning
  spawnAgent(agentName: string, subtask: boolean): Promise<void>;

  // Command installation
  installCommand(commandFile: string, targetPath: string): Promise<void>;
}

// Platform-specific implementations
class ClaudeCodeAdapter implements PlatformAdapter {
  name = "claude-code";
  getConfigDir() { return path.join(os.homedir(), '.claude'); }
  getCommandsDir() { return 'commands/gsd'; }
  registerHook(event, script) {
    // settings.json manipulation
    const settings = this.readConfig();
    settings.hooks[event].push({ type: 'command', command: script });
    this.writeConfig(settings);
  }
  spawnAgent(agentName, subtask) {
    // Use Task tool with subagent_type
    return { tool: 'Task', params: { subagent_type: agentName } };
  }
}

class OpenCodeAdapter implements PlatformAdapter {
  name = "opencode";
  getConfigDir() { return path.join(os.homedir(), '.config', 'opencode'); }
  getCommandsDir() { return 'commands'; }
  registerHook(event, script) {
    // opencode.jsonc plugin event system
    const config = this.readConfig();
    config.plugins.push({ event, handler: script });
    this.writeConfig(config);
  }
  spawnAgent(agentName, subtask) {
    // Use YAML agent: field
    return { yaml: { agent: agentName, subtask } };
  }
}

// Factory for runtime detection
class PlatformFactory {
  static detect(): PlatformAdapter {
    // Check for config directories
    if (fs.existsSync(path.join(os.homedir(), '.claude', 'settings.json'))) {
      return new ClaudeCodeAdapter();
    }
    if (fs.existsSync(path.join(os.homedir(), '.config', 'opencode', 'opencode.jsonc'))) {
      return new OpenCodeAdapter();
    }

    // Fallback: check which CLI is in PATH
    try {
      execSync('which claude-code', { stdio: 'ignore' });
      return new ClaudeCodeAdapter();
    } catch {}

    try {
      execSync('which opencode', { stdio: 'ignore' });
      return new OpenCodeAdapter();
    } catch {}

    throw new Error('No supported AI platform detected');
  }

  static getAdapter(platformName: string): PlatformAdapter {
    switch (platformName) {
      case 'claude-code': return new ClaudeCodeAdapter();
      case 'opencode': return new OpenCodeAdapter();
      default: throw new Error(`Unsupported platform: ${platformName}`);
    }
  }
}
```

**Why this pattern:**
1. **Single interface** - All platforms implement same contract
2. **Runtime polymorphism** - Factory returns correct adapter based on detection
3. **Extensible** - Add CursorAdapter without changing existing code
4. **Testable** - Mock adapters for unit tests
5. **Type-safe** - TypeScript enforces interface compliance

### Alternative: Strategy Pattern

Similar to Adapter but focuses on behavior variation rather than interface translation. **Recommendation: Use Adapter** - GSD needs API translation (settings.json format differs from opencode.jsonc format), not just algorithm variation.

### Anti-Pattern: Conditional Compilation

```typescript
// DON'T DO THIS
if (process.env.PLATFORM === 'claude-code') {
  // Claude-specific code
} else if (process.env.PLATFORM === 'opencode') {
  // OpenCode-specific code
}
```

**Why avoid:**
- Scatters platform logic throughout codebase
- Hard to test (need env var manipulation)
- Doesn't support runtime detection
- Breaks when adding third platform

## File Structure Recommendation

```
get-shit-done/
├── package.json
├── tsconfig.json (if TypeScript)
├── src/ (or lib/ if TS compiles here)
│   ├── platforms/
│   │   ├── index.ts              # PlatformAdapter interface + PlatformFactory
│   │   ├── claude-code.ts        # ClaudeCodeAdapter implementation
│   │   ├── opencode.ts           # OpenCodeAdapter implementation
│   │   └── cursor.ts             # Future: CursorAdapter
│   ├── installer/
│   │   ├── index.ts              # Multi-platform installer orchestrator
│   │   ├── prompts.ts            # Checkbox UI for platform selection
│   │   └── verify.ts             # Post-install verification
│   └── commands/
│       └── adapter.ts            # Runtime adapter injection for commands
├── bin/
│   └── install.js                # Entry point (calls src/installer)
├── commands/
│   └── gsd/
│       └── *.md                  # Platform-agnostic command definitions
├── hooks/
│   ├── claude-code/              # Claude-specific hook implementations
│   │   ├── statusline.js
│   │   └── gsd-check-update.js
│   └── opencode/                 # OpenCode-specific hook implementations
│       ├── statusline.js         # Best-effort equivalent
│       └── session-start.js
└── agents/
    └── gsd-*.md                  # Platform-agnostic agent definitions
```

**Key principles:**
- `src/platforms/` contains all platform-specific code
- `commands/` and `agents/` remain platform-agnostic (Markdown + YAML)
- `hooks/` split by platform (implementations differ)
- Install.js delegates to `src/installer/` which uses PlatformFactory

## Dependency Injection Strategy

**At installation time:**
```javascript
// bin/install.js
const { PlatformFactory } = require('./src/platforms');
const { Installer } = require('./src/installer');

// User selects platforms via checkbox
const selectedPlatforms = await promptPlatforms(); // ["claude-code", "opencode"]

for (const platformName of selectedPlatforms) {
  const adapter = PlatformFactory.getAdapter(platformName);
  const installer = new Installer(adapter);
  await installer.install();
}
```

**At runtime (in commands):**
```javascript
// Commands receive adapter via context injection
const adapter = PlatformFactory.detect(); // Auto-detect current platform
const configDir = adapter.getConfigDir();
const planPath = path.join(configDir, '.planning', 'PLAN.md');
```

**In agent definitions:**
```yaml
# Agent spawning becomes platform-agnostic
# Adapter translates to Task tool vs agent: YAML field
spawn:
  agent: gsd-executor
  subtask: true
```

## Migration Path (Backward Compatibility)

### Phase 1: Add Abstraction Layer (No Breaking Changes)
1. Create `src/platforms/` with ClaudeCodeAdapter
2. ClaudeCodeAdapter wraps existing logic (same behavior)
3. Update install.js to use ClaudeCodeAdapter internally
4. Existing users see no change (paths still ~/.claude, same hooks)

### Phase 2: Add OpenCode Support
1. Implement OpenCodeAdapter
2. Add platform selection to installer (defaults to auto-detect)
3. Existing Claude Code users auto-detect, new users see checkbox
4. Zero migration needed (`.planning/` directories platform-agnostic)

### Phase 3: Runtime Platform Switching
1. Commands auto-detect platform (no config file needed)
2. Same `.planning/` works on both platforms
3. User can `npx get-shit-done-cc --platform opencode` to install second platform

## Installation Flow (Multi-Platform)

```javascript
// Proposed installer UX
console.log('Which platforms would you like to install?');
console.log('[x] Claude Code (detected)');
console.log('[ ] OpenCode');
console.log('[ ] Cursor (coming soon)');
console.log('[ ] Windsurf (coming soon)');

const selected = await checkbox({
  message: 'Select platforms',
  choices: [
    { name: 'Claude Code', value: 'claude-code', checked: claudeDetected },
    { name: 'OpenCode', value: 'opencode', checked: openCodeDetected },
    { name: 'Cursor', value: 'cursor', disabled: true },
  ]
});

// Install to each platform
for (const platform of selected) {
  const adapter = PlatformFactory.getAdapter(platform);
  await installToPlatform(adapter);
}
```

**Benefits:**
- Auto-detects installed platforms (pre-checks boxes)
- User can select multiple
- One `npx` command installs to all selected platforms
- Each platform gets appropriate paths/config format

## Configuration Management Strategy

### Settings Overlay Pattern

```typescript
// Base GSD configuration (platform-agnostic)
interface GSDConfig {
  statusLine: boolean;
  updateCheck: boolean;
  hooks: {
    sessionStart: boolean;
  };
}

// Platform adapter translates to platform-specific format
class ClaudeCodeAdapter {
  applyConfig(gsdConfig: GSDConfig): void {
    const settings = this.readConfig();

    if (gsdConfig.statusLine) {
      settings.statusLine = {
        type: 'command',
        command: 'node "$HOME/.claude/hooks/statusline.js"'
      };
    }

    if (gsdConfig.hooks.sessionStart) {
      settings.hooks.SessionStart.push({
        hooks: [{ type: 'command', command: '...' }]
      });
    }

    this.writeConfig(settings);
  }
}

class OpenCodeAdapter {
  applyConfig(gsdConfig: GSDConfig): void {
    const config = this.readConfig();

    if (gsdConfig.statusLine) {
      // OpenCode equivalent (plugin event handler)
      config.plugins.push({
        event: 'statusUpdate',
        handler: '$HOME/.config/opencode/plugins/gsd-status.js'
      });
    }

    this.writeConfig(config);
  }
}
```

**Why overlay pattern:**
- GSD defines what to configure (statusLine: yes/no)
- Adapter defines how to configure it (settings.json format vs plugin format)
- Same GSD config works across platforms
- Platform differences hidden behind adapter

## Testing Strategy

### 1. Unit Tests (Fast, No Platform)
```typescript
// tests/platforms/claude-code.test.ts
import { ClaudeCodeAdapter } from '../src/platforms/claude-code';

describe('ClaudeCodeAdapter', () => {
  let adapter: ClaudeCodeAdapter;
  let mockFs: MockFileSystem;

  beforeEach(() => {
    mockFs = new MockFileSystem();
    adapter = new ClaudeCodeAdapter(mockFs);
  });

  it('should resolve config dir to ~/.claude', () => {
    expect(adapter.getConfigDir()).toBe('/home/user/.claude');
  });

  it('should register hook in settings.json', async () => {
    await adapter.registerHook('SessionStart', 'node hook.js');
    const settings = mockFs.readJSON('/home/user/.claude/settings.json');
    expect(settings.hooks.SessionStart).toContainEqual({
      hooks: [{ type: 'command', command: 'node hook.js' }]
    });
  });
});
```

### 2. Integration Tests (Slow, Real Platform)
```typescript
// tests/integration/install.test.ts
import { exec } from 'child_process';
import Docker from 'dockerode';

describe('Installation', () => {
  it('should install to Claude Code', async () => {
    const docker = new Docker();
    const container = await docker.createContainer({
      Image: 'claude-code:latest',
      Cmd: ['npx', 'get-shit-done-cc', '--global', '--platform', 'claude-code']
    });

    await container.start();
    const result = await container.wait();

    expect(result.StatusCode).toBe(0);

    // Verify installation
    const files = await container.exec({
      Cmd: ['ls', '-la', '/root/.claude/commands/gsd']
    });
    expect(files).toContain('new-project.md');
  });
});
```

### 3. Snapshot Tests (Config Format)
```typescript
// tests/snapshots/config.test.ts
import { ClaudeCodeAdapter } from '../src/platforms/claude-code';

it('should generate correct settings.json', () => {
  const adapter = new ClaudeCodeAdapter();
  const config = adapter.buildConfig({
    statusLine: true,
    hooks: { sessionStart: true }
  });

  expect(config).toMatchSnapshot(); // Prevents regressions
});
```

## Alternatives Considered

### Alternative 1: Monorepo with Separate Packages

**Structure:**
```
packages/
├── get-shit-done-core/      # Shared logic
├── get-shit-done-claude/    # Claude Code specific
└── get-shit-done-opencode/  # OpenCode specific
```

**Why not:**
- Users would need `npx get-shit-done-claude` vs `npx get-shit-done-opencode`
- Command duplication (24 commands × 2 packages)
- Harder to maintain (changes need syncing)
- Doesn't support "install to both platforms" UX

**Verdict:** REJECTED - Violates "simple installer UX" constraint

### Alternative 2: Plugin System (Each Platform is Plugin)

**Structure:** Core GSD + platform plugins loaded dynamically

**Why not:**
- Adds complexity (plugin discovery, loading, versioning)
- Users confused about which plugin to install
- Doesn't reduce code (still need adapters)
- Over-engineering for 2-3 platforms

**Verdict:** REJECTED - Unnecessary abstraction for current scope

### Alternative 3: Compile-Time Conditionals

**Structure:** `#ifdef` equivalents via build flags

**Why not:**
- Need separate builds per platform (gsd-claude.js, gsd-opencode.js)
- Can't support runtime detection (can't auto-detect platform)
- Can't support multi-platform install (one binary per platform)

**Verdict:** REJECTED - Breaks "runtime detection" requirement

## Recommended: Adapter Pattern (Single Build, Runtime Polymorphism)

**Why this wins:**
- ✅ Single codebase (easier maintenance)
- ✅ Runtime detection (`.planning/` portable)
- ✅ Multi-platform install (one `npx` command)
- ✅ Extensible (add Cursor without refactor)
- ✅ Testable (mock adapters)
- ✅ Type-safe (TypeScript interfaces)

## Technology Versions (Verified)

**CRITICAL:** These versions are based on training data (January 2025). Verify with npm registry before implementation.

| Package | Recommended | Verify With |
|---------|-------------|-------------|
| typescript | ^5.3.0 | `npm info typescript version` |
| env-paths | ^3.0.0 | `npm info env-paths version` |
| which | ^4.0.0 | `npm info which version` |
| json5 | ^2.2.3 | `npm info json5 version` |
| yaml | ^2.3.4 | `npm info yaml version` |
| esbuild | ^0.19.0 | `npm info esbuild version` |

**Node.js:** Keep existing `>=16.7.0` requirement (LTS, widely deployed)

## Installation Dependencies

```json
{
  "dependencies": {
    "env-paths": "^3.0.0",
    "which": "^4.0.0",
    "json5": "^2.2.3",
    "yaml": "^2.3.4"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "esbuild": "^0.19.0",
    "@types/node": "^20.0.0"
  }
}
```

**Total size impact:** ~2-3MB (acceptable for developer tool)

## What NOT to Use

| Technology | Why Avoid |
|------------|-----------|
| **Webpack** | Slow builds (10-100x slower than esbuild); unnecessary features for CLI tool |
| **Babel** | Unneeded - Node 16+ supports ES2022 natively; adds build complexity |
| **Electron** | GSD is CLI tool, not GUI app; 100MB+ overhead unacceptable |
| **Rust/Go rewrites** | High migration cost; loses existing npm ecosystem; adds compilation step for users |
| **Platform-specific branches** | Creates divergent codebases; maintenance nightmare; breaks portability |
| **Dynamic plugin loading** | Over-engineering for 2-3 known platforms; adds security concerns |
| **Config files for platform selection** | Violates "runtime detection" requirement; breaks `.planning/` portability |
| **Separate npm packages** | `get-shit-done-claude` vs `get-shit-done-opencode` confuses users; violates "simple UX" |

## Build Pipeline (If TypeScript Adopted)

```bash
# Development
npm run dev    # tsc --watch (type checking)

# Build
npm run build  # esbuild src/index.ts --bundle --platform=node --outfile=dist/index.js

# Test
npm run test   # jest or vitest with ts-node

# Publish
npm publish    # Publishes dist/ compiled JS (not TS source)
```

**Build outputs:**
- `dist/index.js` - Bundled JS (single file, all imports inlined)
- `dist/index.d.ts` - Type definitions (if publishing as library)
- `bin/install.js` - Entry point (thin wrapper calling dist/index.js)

**Alternative: Stay JavaScript**
- If TypeScript overhead too high (build step, IDE setup)
- Use JSDoc for type hints: `/** @type {PlatformAdapter} */`
- Lose compile-time safety but keep simplicity
- Decision point: Prototype in JS, migrate to TS if adapter bugs occur

## Confidence Levels Summary

| Area | Confidence | Reasoning |
|------|------------|-----------|
| **Adapter Pattern** | HIGH | Established pattern for plugin systems; used by VSCode, Babel, Webpack |
| **Node.js Runtime** | HIGH | Already in use; proven cross-platform |
| **TypeScript for Adapters** | MEDIUM | Standard for this problem, but could use JSDoc instead |
| **npm Packages (env-paths, which)** | MEDIUM | Popular packages but versions need verification (training data Jan 2025) |
| **Factory Pattern** | HIGH | Standard DI approach for adapter selection |
| **Testing Strategy** | HIGH | Unit (mocks) + Integration (docker) is industry standard |
| **File Structure** | MEDIUM | Proposed structure logical but untested with GSD codebase |
| **Migration Path** | HIGH | Wrapper approach proven for backward compatibility |

## Next Steps for Implementation

1. **Verify package versions** - Run `npm info [package] version` for each dependency
2. **Prototype adapter interface** - Define TypeScript interface or JSDoc comments for PlatformAdapter
3. **Implement ClaudeCodeAdapter** - Wrap existing logic, prove no regression
4. **Add platform detection** - Test auto-detection logic on real systems
5. **Build installer UI** - Checkbox selection for multiple platforms
6. **Implement OpenCodeAdapter** - Verify format differences (opencode.jsonc, plugin events)
7. **Integration test** - Docker containers for both platforms

## Research Gaps (Flag for Phase-Specific Research)

- **OpenCode plugin event system details** - Need official docs on 20+ events mentioned in PROJECT.md (LOW confidence on exact event names)
- **Cursor/Windsurf extensibility APIs** - Unknown if they support custom commands/agents (research when adding these platforms)
- **Platform version detection** - How to detect Claude Code v1 vs v2 if breaking changes (may need version-specific adapters)
- **Hook execution context** - Verify if OpenCode passes JSON stdin like Claude Code (PROJECT.md assumes similarity, needs verification)

## Sources

**Confidence levels:**
- HIGH: Established patterns (Adapter, Factory), existing GSD codebase analysis
- MEDIUM: npm package ecosystem (versions need verification against 2026 npm registry)
- LOW: Platform-specific details for OpenCode, Cursor, Windsurf (need official documentation)

**Key verification needed:**
- npm package versions (training data from Jan 2025, may be outdated)
- OpenCode plugin event system (PROJECT.md mentions 20+ events, need official list)
- Cursor/Windsurf extension APIs (not researched yet)

---

**Recommendation:** Use Adapter Pattern + TypeScript + npm packages listed above. Prototype ClaudeCodeAdapter first (wraps existing logic, proves no regression), then add OpenCodeAdapter. Keep commands/agents platform-agnostic (Markdown + YAML). Platform detection at runtime enables `.planning/` portability.
