# Creating Platform Adapters

This guide walks you through adding support for a new AI coding platform to GSD. By the end, you'll have a working adapter that enables GSD to run on your platform.

## Prerequisites

Before starting, ensure you have:

1. **Read [ARCHITECTURE.md](ARCHITECTURE.md)** - Understand the platform abstraction concepts:
   - Platform types and detection
   - Adapter pattern and why it's used
   - PathResolver interface contract
   - Behavioral contracts (10 requirements)

2. **TypeScript knowledge** - Familiarity with:
   - Interfaces and implementations
   - Union types and exhaustiveness checking
   - Async/await patterns
   - Node.js `fs`, `path`, and `os` modules

3. **GSD installed and working** - Test your development environment:
   ```bash
   npm install
   npm test  # Verify tests pass
   ```

## Quick Start Overview

Adding a new platform requires changes to **4 files**:

| Step | File | What You Add |
|------|------|--------------|
| 1 | `src/platform/types.ts` | Platform type to union |
| 2 | `src/platform/detection.ts` | Filesystem probing logic |
| 3 | `src/platform/paths.ts` | Path resolver class |
| 4 | `src/platform/adapters/{name}.ts` | Full adapter implementation |

The registry (`src/platform/registry.ts`) automatically handles your new type through TypeScript's exhaustiveness checking - no manual registration needed.

**High-level flow:**

```
Type Definition → Detection Logic → Path Resolution → Adapter Implementation
```

## Your First Adapter: Step-by-Step

This tutorial uses a fictional "ExamplePlatform" to demonstrate each step. Replace `example` with your actual platform name (e.g., `cursor`, `aider`, `continue`).

### Step 1: Add Platform Type

**File:** `src/platform/types.ts`

Add your platform to the `PlatformType` union:

```typescript
// Before
export type PlatformType = 'claude-code' | 'opencode' | 'unknown';

// After
export type PlatformType = 'claude-code' | 'opencode' | 'example' | 'unknown';
```

**Why this works:**

- TypeScript's union type makes the registry's switch statement exhaustive
- If you miss a case, TypeScript will error at compile time
- The `'unknown'` value remains last (handles ambiguous detection)

### Step 2: Add Detection Logic

**File:** `src/platform/detection.ts`

Add filesystem probing for your platform's configuration files. Find where the other platforms are checked (around line 50) and add your platform:

```typescript
// Inside detectPlatform(), after the existing filesystem probing:

// Check for ExamplePlatform
const exampleConfig = path.join(homeDir, '.example', 'config.json');
const hasExample = fs.existsSync(exampleConfig);
```

Then update the ambiguity handling section to include your platform:

```typescript
// Ambiguity handling: multiple platforms detected
const detectedCount = [hasClaudeCode, hasOpenCode, hasExample].filter(Boolean).length;
if (detectedCount > 1) {
  console.warn(
    'GSD: Multiple platforms detected. ' +
    'Set GSD_PLATFORM environment variable to choose explicitly ' +
    '(GSD_PLATFORM=claude-code, opencode, or example).'
  );
  return 'unknown';
}

// Return detected platform
if (hasClaudeCode) return 'claude-code';
if (hasOpenCode) return 'opencode';
if (hasExample) return 'example';
```

**Key considerations:**

- Choose a config file that ALWAYS exists when your platform is installed
- The file should be in a predictable location (typically `~/.{platform}/` or `~/.config/{platform}/`)
- Order of detection doesn't matter - ambiguity is handled separately

### Step 3: Create Path Resolver

**File:** `src/platform/paths.ts`

Create a new class implementing the `PathResolver` interface. Add it after the existing implementations:

```typescript
/**
 * ExamplePlatform path resolver
 *
 * Resolves paths for ExamplePlatform.
 * [Add notes about your platform's directory conventions here]
 */
export class ExamplePaths implements PathResolver {
  readonly name: PlatformType = 'example';

  /**
   * Get ExamplePlatform config directory
   * Priority: EXAMPLE_CONFIG_DIR env var > default ~/.example
   */
  getConfigDir(): string {
    const envDir = process.env.EXAMPLE_CONFIG_DIR;
    if (envDir) {
      return this.expandTilde(envDir);
    }
    return path.join(os.homedir(), '.example');
  }

  /**
   * Get ExamplePlatform commands directory
   * Structure: {configDir}/commands/gsd/
   * 
   * Note: Adjust path structure to match your platform's conventions
   */
  getCommandsDir(): string {
    return path.join(this.getConfigDir(), 'commands', 'gsd');
  }

  /**
   * Get ExamplePlatform agents directory
   * Structure: {configDir}/agents/
   */
  getAgentsDir(): string {
    return path.join(this.getConfigDir(), 'agents');
  }

  /**
   * Get ExamplePlatform hooks directory
   * Structure: {configDir}/hooks/
   */
  getHooksDir(): string {
    return path.join(this.getConfigDir(), 'hooks');
  }

  /**
   * Expand tilde (~) in file paths to home directory
   * Helper for environment variable handling
   */
  private expandTilde(filePath: string): string {
    if (filePath.startsWith('~/')) {
      return path.join(os.homedir(), filePath.slice(2));
    }
    return filePath;
  }
}
```

**PathResolver requirements (from ARCHITECTURE.md):**

1. **All paths MUST be absolute** - Never return relative paths
2. **Environment variables take precedence** - Support config dir override
3. **Tilde expansion required** - Handle `~/path` in env vars
4. **Runtime resolution only** - No hardcoded paths at compile time

### Step 4: Create Adapter Implementation

**File:** `src/platform/adapters/example.ts` (create new file)

Create the full adapter by implementing `PlatformAdapter`. Use OpenCode adapter as a reference - it shows graceful degradation patterns:

```typescript
/**
 * ExamplePlatform Adapter
 *
 * Implements PlatformAdapter interface for ExamplePlatform.
 * [Add notes about your platform's specific features here]
 */

import * as fs from 'fs';
import * as path from 'path';
import { PlatformAdapter, AgentInstance, HookType } from '../adapter';
import { ExamplePaths } from '../paths';
import { PlatformType } from '../types';

export class ExampleAdapter implements PlatformAdapter {
  readonly name: PlatformType = 'example';
  readonly version: string = '1.0.0';

  private paths: ExamplePaths;

  constructor() {
    this.paths = new ExamplePaths();
  }

  // =========================================================================
  // Path methods - Pure delegation to ExamplePaths
  // =========================================================================

  getConfigDir(): string {
    return this.paths.getConfigDir();
  }

  getCommandsDir(): string {
    return this.paths.getCommandsDir();
  }

  getAgentsDir(): string {
    return this.paths.getAgentsDir();
  }

  getHooksDir(): string {
    return this.paths.getHooksDir();
  }

  // =========================================================================
  // Configuration - Implement based on your platform's config format
  // =========================================================================

  async readConfig(): Promise<Record<string, any>> {
    const configPath = path.join(this.getConfigDir(), 'config.json');
    
    if (!fs.existsSync(configPath)) {
      return {};
    }
    
    const content = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(content);
  }

  async writeConfig(config: Record<string, any>): Promise<void> {
    const configDir = this.getConfigDir();
    const configPath = path.join(configDir, 'config.json');

    // Ensure directory exists
    fs.mkdirSync(configDir, { recursive: true });
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  }

  async mergeConfig(updates: Record<string, any>): Promise<void> {
    const existing = await this.readConfig();
    const merged = { ...existing, ...updates };
    await this.writeConfig(merged);
  }

  // =========================================================================
  // Agent spawning - Implement if your platform supports it
  // =========================================================================

  async spawnAgent(agentPath: string, args?: Record<string, string>): Promise<AgentInstance> {
    // If your platform doesn't support agent spawning, throw a clear error:
    throw new Error(
      'ExamplePlatform does not support agent spawning. ' +
      'Use Claude Code for multi-agent workflows.'
    );
    
    // If your platform DOES support agent spawning, implement it here.
    // See opencode.ts for a child_process.spawn() based implementation.
  }

  // =========================================================================
  // Hook registration - Implement if your platform supports hooks
  // =========================================================================

  async registerHook(hookType: HookType, hookPath: string): Promise<void> {
    // Graceful degradation: silent no-op if platform doesn't support hooks
    // This is intentional - don't throw, don't log
    return;
  }

  async unregisterHook(hookType: HookType): Promise<void> {
    // Graceful degradation: silent no-op
    return;
  }

  // =========================================================================
  // Command registration - Typically handled by install.js
  // =========================================================================

  async registerCommand(commandPath: string): Promise<void> {
    // Most platforms: install.js handles command file copying
    throw new Error('registerCommand() not implemented - install.js handles command copying');
  }

  async unregisterCommand(commandName: string): Promise<void> {
    throw new Error('unregisterCommand() not implemented');
  }

  // =========================================================================
  // Capabilities - Report what your platform supports
  // =========================================================================

  supportsParallelAgents(): boolean {
    // Return true if platform can run multiple agents simultaneously
    return false;
  }

  supportsStatusLine(): boolean {
    // Return true if platform has status line integration
    return false;
  }

  supportsHooks(): boolean {
    // Return true if platform supports lifecycle hooks
    return false;
  }
}
```

**Adapter implementation notes:**

1. **Start minimal** - Stub methods can throw "not implemented" errors
2. **Graceful degradation for hooks** - Use silent no-op if unsupported (see OpenCode adapter)
3. **Config read/write first** - These are required for basic operation
4. **Agent spawning optional** - Only implement if platform supports subagent workflows
5. **Reference OpenCode adapter** - Shows patterns for simpler platforms

### Step 5: Register in Factory

**File:** `src/platform/registry.ts`

Add your platform to the `createPathResolver` switch statement:

```typescript
private static createPathResolver(platform: PlatformType): PathResolver {
  switch (platform) {
    case 'claude-code':
      return new ClaudeCodePaths();

    case 'opencode':
      return new OpenCodePaths();

    case 'example':       // Add this case
      return new ExamplePaths();

    case 'unknown':
      throw new Error(
        'No supported AI platform detected. ' +
        'Install Claude Code, OpenCode, or ExamplePlatform, or set GSD_PLATFORM environment variable.'
      );

    default:
      const exhaustiveCheck: never = platform;
      throw new Error(`Unhandled platform type: ${exhaustiveCheck}`);
  }
}
```

**Also update the import at the top:**

```typescript
import { PathResolver, ClaudeCodePaths, OpenCodePaths, ExamplePaths } from './paths';
```

**Why TypeScript helps here:**

If you add a new type to `PlatformType` but forget to add a case to the switch, TypeScript will error at the `exhaustiveCheck` line. This compile-time safety ensures you can't accidentally miss a platform.

## Registration Checklist

Before testing, verify all 4 files are updated:

- [ ] `src/platform/types.ts` - Added `'example'` to PlatformType union
- [ ] `src/platform/detection.ts` - Added filesystem probing for your config file
- [ ] `src/platform/paths.ts` - Created `ExamplePaths` class implementing PathResolver
- [ ] `src/platform/adapters/example.ts` - Created `ExampleAdapter` class implementing PlatformAdapter
- [ ] `src/platform/registry.ts` - Added case in switch (TypeScript enforces this via exhaustiveness)

## Testing Your Adapter

### Run Contract Tests

GSD has tests that verify all adapters satisfy the behavioral contracts:

```bash
# Run all platform tests
npm test -- --grep "platform"

# Run specific path resolver tests
npm test -- --grep "PathResolver"
```

### Manual Testing

Test your adapter by setting the environment variable:

```bash
# Force GSD to use your platform
export GSD_PLATFORM=example

# Run a GSD command
npm run dev

# Check that paths resolve correctly
node -e "
const { PlatformRegistry } = require('./dist/platform/registry');
const resolver = PlatformRegistry.getPathResolver();
console.log('Config dir:', resolver.getConfigDir());
console.log('Commands dir:', resolver.getCommandsDir());
"
```

### Write Platform-Specific Tests

Create a test file for your adapter at `src/platform/adapters/example.test.ts`:

```typescript
import { ExampleAdapter } from './example';
import { ExamplePaths } from '../paths';

describe('ExampleAdapter', () => {
  let adapter: ExampleAdapter;

  beforeEach(() => {
    adapter = new ExampleAdapter();
  });

  describe('path resolution', () => {
    it('returns absolute paths', () => {
      expect(adapter.getConfigDir().startsWith('/')).toBe(true);
      expect(adapter.getCommandsDir().startsWith('/')).toBe(true);
    });
  });

  describe('capabilities', () => {
    it('reports supported features', () => {
      // Update these based on your platform
      expect(adapter.supportsParallelAgents()).toBe(false);
      expect(adapter.supportsStatusLine()).toBe(false);
      expect(adapter.supportsHooks()).toBe(false);
    });
  });
});
```

## Pre-PR Checklist

Before submitting your pull request:

### Code Quality

- [ ] All 10 behavioral contracts satisfied (see [ARCHITECTURE.md](ARCHITECTURE.md#behavioral-contracts))
- [ ] Tests pass: `npm test`
- [ ] Lint passes: `npm run lint`
- [ ] TypeScript compiles: `npm run build`

### Documentation

- [ ] New adapter documented in [PLATFORM-SUPPORT.md](../PLATFORM-SUPPORT.md)
- [ ] Platform capabilities accurately reflected in support matrix
- [ ] Any platform-specific quirks documented in code comments

### Integration Testing

- [ ] Detection works: `GSD_PLATFORM=example npm run dev`
- [ ] Path resolution returns correct platform directories
- [ ] Config read/write works with your platform's format
- [ ] Graceful degradation for unsupported features (no crashes)

## Troubleshooting FAQ

### "TypeError: Cannot read property 'getConfigDir' of null"

**Cause:** Registry returned null, usually because platform detection returned 'unknown'.

**Fix:** 
1. Check that your config file exists at the expected location
2. Verify detection.ts probes the correct path
3. Try explicit: `export GSD_PLATFORM=example`

### "Platform detection returns 'unknown'"

**Cause:** Your config file path doesn't match what detection.ts checks.

**Fix:**
1. Verify the exact path to your platform's config file
2. Update detection.ts to check the correct path
3. Check file permissions (the file must be readable)

### "Hook registration silently fails"

**Cause:** Your `supportsHooks()` returns false, so hooks are skipped.

**This is expected behavior** - graceful degradation means hooks are silently skipped on platforms that don't support them. If your platform DOES support hooks:
1. Implement `registerHook()` and `unregisterHook()` properly
2. Return `true` from `supportsHooks()`

### "Command not found after installation"

**Cause:** `getCommandsDir()` returns wrong path.

**Fix:**
1. Check your platform's actual command directory structure
2. Verify the path in your PathResolver
3. Ensure install.js copies to the correct location

### "Config file has wrong format"

**Cause:** Your platform uses JSONC (JSON with comments) but you're using `JSON.parse()`.

**Fix:** Use `jsonc-parser` library like OpenCode does:
```typescript
import { parse } from 'jsonc-parser';
const config = parse(content);  // Handles comments
```

## Reference Implementation

**Recommended reference:** [OpenCode adapter](../../src/platform/adapters/opencode.ts)

Why OpenCode is a better reference than Claude Code:

1. **Simpler** - Fewer platform-specific features to understand
2. **Added later** - Shows the "new platform" pattern clearly
3. **Graceful degradation** - Demonstrates silent no-op for unsupported features
4. **JSONC handling** - Shows how to handle JSON with comments

The OpenCode adapter (~200 lines) demonstrates:
- Path delegation to PathResolver
- JSONC config parsing
- Graceful hook degradation (silent no-op)
- Capability detection
- Agent spawning via child_process

Study this implementation before writing your own. Most new adapters will follow the same structure.

---

*Guide for creating new GSD platform adapters*
*See [ARCHITECTURE.md](ARCHITECTURE.md) for design rationale*
