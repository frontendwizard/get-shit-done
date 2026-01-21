# Phase 6: Testing & Validation - Research

**Researched:** 2026-01-21
**Domain:** TypeScript testing infrastructure, cross-platform validation, contract testing
**Confidence:** HIGH

## Summary

Phase 6 requires establishing a test infrastructure from scratch for a TypeScript project with platform adapters, cross-platform filesystem operations, and CLI installer integration. The project currently has no testing infrastructure, using TypeScript 5.3 with CommonJS modules targeting Node.js 16.7+.

The research identified Vitest as the optimal testing framework due to its native TypeScript support, zero-config setup, and superior performance over Jest. For the specific requirements (filesystem mocking, child_process testing, contract testing), Vitest with memfs provides the best developer experience.

**Primary recommendation:** Use Vitest with memfs for filesystem mocking and snapshot testing for regression prevention. Implement adapter contract tests using a shared test suite pattern that runs against both ClaudeCodeAdapter and OpenCodeAdapter.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | ^3.0.0 | Test runner | Native TypeScript, 10x faster than Jest, zero-config |
| @vitest/coverage-v8 | ^3.0.0 | Code coverage | V8 native coverage with AST-based remapping, accurate as Istanbul |
| memfs | ^4.0.0 | Filesystem mocking | Official Vitest recommendation, in-memory fs operations |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @vitest/ui | ^3.0.0 | Visual test UI | Local development, debugging test failures |
| vitest-mock-extended | ^2.0.0 | Enhanced mocking | Complex mock scenarios with type safety |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vitest | Jest | Jest requires ts-jest setup, slower for TypeScript, more config |
| memfs | mock-fs | mock-fs is unmaintained, memfs is actively developed |
| @vitest/coverage-v8 | @vitest/coverage-istanbul | Istanbul is slower, V8 now has equal accuracy since v3.2.0 |

**Installation:**
```bash
npm install -D vitest @vitest/coverage-v8 memfs @vitest/ui
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── platform/
│   ├── adapters/
│   │   ├── claude-code.ts
│   │   └── opencode.ts
│   └── ...
tests/
├── unit/                    # Unit tests for isolated components
│   ├── platform/
│   │   ├── detection.test.ts
│   │   ├── paths.test.ts
│   │   └── registry.test.ts
├── contract/                # Adapter contract compliance tests
│   ├── adapter.contract.ts  # Shared test suite (abstract)
│   ├── claude-code.contract.test.ts
│   └── opencode.contract.test.ts
├── integration/             # Integration tests
│   ├── installation.test.ts
│   └── cross-platform.test.ts
├── regression/              # Regression tests for Claude Code 1.x behavior
│   └── claude-code-1x.test.ts
├── __mocks__/               # Manual mocks
│   ├── fs.cjs
│   └── fs/promises.cjs
└── fixtures/                # Test fixtures
    ├── .planning/           # Mock .planning directory
    └── configs/             # Mock config files
vitest.config.ts
```

### Pattern 1: Adapter Contract Testing

**What:** Shared test suite that validates both adapters implement the PlatformAdapter interface correctly
**When to use:** For TEST-02 (platform adapter contract tests)

```typescript
// tests/contract/adapter.contract.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { PlatformAdapter } from '../../src/platform/adapter';

export function runAdapterContractTests(
  adapterName: string,
  createAdapter: () => PlatformAdapter
) {
  describe(`${adapterName} - Contract Tests`, () => {
    let adapter: PlatformAdapter;

    beforeEach(() => {
      adapter = createAdapter();
    });

    describe('Path Resolution Contract', () => {
      it('getConfigDir() returns absolute path', () => {
        const configDir = adapter.getConfigDir();
        expect(configDir).toMatch(/^\//); // Starts with /
        expect(configDir).not.toContain('~'); // No tilde
      });

      it('getCommandsDir() returns absolute path', () => {
        const commandsDir = adapter.getCommandsDir();
        expect(commandsDir).toMatch(/^\//);
      });

      // ... more contract tests
    });

    describe('Capability Contract', () => {
      it('supportsHooks() returns boolean', () => {
        expect(typeof adapter.supportsHooks()).toBe('boolean');
      });

      it('supportsStatusLine() returns boolean', () => {
        expect(typeof adapter.supportsStatusLine()).toBe('boolean');
      });
    });
  });
}
```

### Pattern 2: Filesystem Mocking with memfs

**What:** In-memory filesystem for testing file operations without touching disk
**When to use:** For all tests involving config files, command registration, hook installation

```typescript
// tests/__mocks__/fs.cjs
const { fs } = require('memfs');
module.exports = fs;

// tests/__mocks__/fs/promises.cjs
const { fs } = require('memfs');
module.exports = fs.promises;
```

```typescript
// tests/unit/platform/adapters/claude-code.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { vol } from 'memfs';

vi.mock('node:fs');
vi.mock('node:fs/promises');

describe('ClaudeCodeAdapter', () => {
  beforeEach(() => {
    vol.reset();
    // Set up virtual filesystem
    vol.fromJSON({
      '/Users/test/.claude/settings.json': JSON.stringify({ existing: true }),
    });
  });

  it('reads existing settings.json', async () => {
    const adapter = new ClaudeCodeAdapter();
    const config = await adapter.readConfig();
    expect(config.existing).toBe(true);
  });
});
```

### Pattern 3: Snapshot Testing for Regression Prevention

**What:** Capture known-good output and compare against it
**When to use:** For TEST-04 (regression tests for Claude Code behavior)

```typescript
// tests/regression/claude-code-1x.test.ts
import { describe, it, expect } from 'vitest';
import { vol } from 'memfs';

describe('Claude Code 1.x Regression', () => {
  it('preserves settings.json structure after upgrade', async () => {
    const originalSettings = {
      hooks: {
        SessionStart: [{ hooks: [{ type: 'command', command: 'existing-hook' }] }]
      },
      statusLine: { type: 'command', command: 'existing-status' },
      customSetting: 'preserved'
    };

    vol.fromJSON({
      '/Users/test/.claude/settings.json': JSON.stringify(originalSettings, null, 2)
    });

    // Run upgrade/installation
    // ...

    const updatedSettings = JSON.parse(
      vol.readFileSync('/Users/test/.claude/settings.json', 'utf8')
    );

    // Snapshot the structure
    expect(updatedSettings).toMatchSnapshot();

    // Explicit regression checks
    expect(updatedSettings.customSetting).toBe('preserved');
    expect(updatedSettings.hooks.SessionStart).toBeDefined();
  });
});
```

### Pattern 4: Cross-Platform Workflow Validation

**What:** Same .planning/ directory tested on both platforms
**When to use:** For TEST-05 (cross-platform validation)

```typescript
// tests/integration/cross-platform.test.ts
import { describe, it, expect } from 'vitest';
import { vol } from 'memfs';

const PLANNING_FIXTURE = {
  '/.planning/PROJECT.md': '# Test Project\nNo platform-specific content',
  '/.planning/ROADMAP.md': '# Roadmap\nPhases here',
  '/.planning/STATE.md': '# State\nCurrent position',
};

describe('Cross-Platform .planning/ Portability', () => {
  beforeEach(() => {
    vol.reset();
    vol.fromJSON(PLANNING_FIXTURE);
  });

  it('Claude Code adapter reads .planning/ without modification', async () => {
    const claudeAdapter = new ClaudeCodeAdapter();
    // Verify adapter doesn't modify .planning/
    // ...
  });

  it('OpenCode adapter reads same .planning/ without modification', async () => {
    const openCodeAdapter = new OpenCodeAdapter();
    // Verify adapter doesn't modify .planning/
    // ...
  });

  it('.planning/ contains no platform-specific paths', () => {
    for (const [path, content] of Object.entries(PLANNING_FIXTURE)) {
      expect(content).not.toContain('~/.claude/');
      expect(content).not.toContain('~/.config/opencode/');
    }
  });
});
```

### Anti-Patterns to Avoid

- **Testing with real filesystem:** Never write to actual ~/.claude/ or ~/.config/opencode/ in tests. Use memfs.
- **Platform-specific test logic:** Tests should run identically on any developer machine. Never use `process.platform` conditionally in tests.
- **Testing implementation details:** Contract tests verify behavior, not internal implementation.
- **Flaky async tests:** Always use proper async/await, avoid setTimeout in tests.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Filesystem mocking | Manual vi.mock('fs') | memfs | Edge cases with streams, watchers, promises |
| Test coverage | Manual line counting | @vitest/coverage-v8 | Accurate source mapping, branch coverage |
| Snapshot testing | Manual JSON.stringify comparison | toMatchSnapshot() | Handles updates, formatting, review workflow |
| Mock cleanup | Manual beforeEach/afterEach | vi.resetAllMocks() | Handles nested mocks, spies automatically |
| Process spawn mocking | Manual event emitters | vi.mock with custom child_process | Event timing, error handling edge cases |

**Key insight:** Vitest provides mature utilities for all common testing scenarios. Rolling custom solutions leads to edge case bugs and maintenance burden.

## Common Pitfalls

### Pitfall 1: memfs Module Resolution

**What goes wrong:** Vitest mocks fs but external libraries (like jsonc-parser) use their own require('fs') that isn't intercepted.
**Why it happens:** `vi.mock` only intercepts imports in files processed by Vite, not third-party libraries.
**How to avoid:** For tests involving third-party libraries, use real filesystem in isolated temp directories, or use dependency injection.
**Warning signs:** Tests pass in isolation but fail when library code touches filesystem.

### Pitfall 2: Async Hook Testing

**What goes wrong:** registerHook() completes but settings.json not updated in test assertions.
**Why it happens:** Node.js event loop hasn't flushed; async operations pending.
**How to avoid:** Always await async operations; use proper assertion order; check filesystem state after await.
**Warning signs:** Flaky tests that pass sometimes, fail sometimes.

### Pitfall 3: Child Process Mock Timing

**What goes wrong:** spawn() mock doesn't emit events in correct order, tests timeout.
**Why it happens:** Real spawn() has complex event ordering ('error', 'close', 'exit'); mocks often oversimplify.
**How to avoid:** Use process.nextTick() or setImmediate() to defer event emissions in mocks.
**Warning signs:** Tests hang waiting for events that never fire.

### Pitfall 4: Environment Variable Leakage

**What goes wrong:** Tests pass locally, fail in CI because env vars differ.
**Why it happens:** Tests rely on CLAUDE_CONFIG_DIR or OPENCODE_CONFIG without mocking.
**How to avoid:** Always mock process.env in tests; reset env vars in beforeEach.
**Warning signs:** Works on your machine, fails in CI.

### Pitfall 5: Snapshot Brittleness

**What goes wrong:** Every small change breaks 50 snapshots, team starts blindly updating.
**Why it happens:** Snapshots too large, include irrelevant data, capture implementation details.
**How to avoid:** Keep snapshots small and focused; use custom serializers; review snapshot diffs carefully.
**Warning signs:** PR reviews skip snapshot changes; `vitest -u` run without examination.

## Code Examples

Verified patterns from official sources:

### Vitest Configuration for TypeScript + CommonJS
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,              // Use describe/it/expect without imports
    environment: 'node',        // Node.js environment (not jsdom)
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',           // Use V8 native coverage
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts'],
    },
    // Reset mocks between tests
    mockReset: true,
    restoreMocks: true,
  },
});
```

### Package.json Test Scripts
```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}
```

### TypeScript Configuration for Tests
```json
// tsconfig.json addition
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

### Integration Test for Installation (TEST-03)
```typescript
// tests/integration/installation.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { vol } from 'memfs';

vi.mock('node:fs');
vi.mock('node:fs/promises');

describe('Installation Integration', () => {
  const homeDir = '/Users/testuser';

  beforeEach(() => {
    vol.reset();
    vi.stubEnv('HOME', homeDir);
  });

  describe('Claude Code Installation', () => {
    it('creates commands/gsd directory with all commands', async () => {
      vol.fromJSON({
        [`${homeDir}/.claude/`]: null,
      });

      // Run installation
      // ...

      const commandsDir = vol.readdirSync(`${homeDir}/.claude/commands/gsd`);
      expect(commandsDir).toContain('help.md');
      expect(commandsDir).toContain('progress.md');
      expect(commandsDir.length).toBe(24);
    });

    it('registers hooks in settings.json', async () => {
      vol.fromJSON({
        [`${homeDir}/.claude/settings.json`]: '{}',
      });

      // Run installation
      // ...

      const settings = JSON.parse(
        vol.readFileSync(`${homeDir}/.claude/settings.json`, 'utf8')
      );
      expect(settings.hooks?.SessionStart).toBeDefined();
    });
  });

  describe('OpenCode Installation', () => {
    it('creates command/gsd directory with all commands', async () => {
      vol.fromJSON({
        [`${homeDir}/.config/opencode/`]: null,
      });

      // Run installation
      // ...

      const commandsDir = vol.readdirSync(`${homeDir}/.config/opencode/command/gsd`);
      expect(commandsDir).toContain('help.md');
      expect(commandsDir.length).toBe(24);
    });

    it('does not register hooks (graceful degradation)', async () => {
      vol.fromJSON({
        [`${homeDir}/.config/opencode/opencode.json`]: '{}',
      });

      // Run installation
      // ...

      const config = JSON.parse(
        vol.readFileSync(`${homeDir}/.config/opencode/opencode.json`, 'utf8')
      );
      expect(config.hooks).toBeUndefined();
    });
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Jest with ts-jest | Vitest native TypeScript | 2023+ | 10x faster, zero config |
| @vitest/coverage-c8 | @vitest/coverage-v8 | Vitest 3.2.0 (2025) | AST-based remapping, accurate coverage |
| mock-fs package | memfs package | 2024 | mock-fs unmaintained, memfs active |
| Manual snapshot comparison | toMatchSnapshot/toMatchInlineSnapshot | Vitest 1.0+ | Built-in update workflow |

**Deprecated/outdated:**
- **@vitest/coverage-c8:** Deprecated, use @vitest/coverage-v8 instead
- **mock-fs:** Unmaintained, use memfs as drop-in replacement
- **ts-jest:** Not needed with Vitest (native TypeScript support)

## Open Questions

Things that couldn't be fully resolved:

1. **Child process mocking depth**
   - What we know: vi.mock('child_process') works for tests in files processed by Vite
   - What's unclear: How to mock spawn() for the actual bin/install.js which runs as external process
   - Recommendation: Use integration tests that run installer in subprocess with real filesystem in temp directory

2. **Coverage threshold targets**
   - What we know: 90%+ unit coverage is industry standard
   - What's unclear: Appropriate coverage targets for contract tests vs integration tests
   - Recommendation: Start with 80% overall, adjust based on test stability

3. **CI matrix testing**
   - What we know: Tests should run on multiple Node.js versions (16, 18, 20, 22)
   - What's unclear: Whether to test on multiple OS (macOS, Linux, Windows)
   - Recommendation: Start with Linux CI only; add macOS if cross-platform issues emerge

## Sources

### Primary (HIGH confidence)
- [Vitest Official Guide](https://vitest.dev/guide/) - Configuration, features, mocking
- [Vitest Coverage Guide](https://vitest.dev/guide/coverage.html) - v8 vs istanbul providers
- [Vitest Mocking File System](https://vitest.dev/guide/mocking/file-system) - memfs recommendation

### Secondary (MEDIUM confidence)
- [Jest vs Vitest comparison](https://medium.com/@ruverd/jest-vs-vitest-which-test-runner-should-you-use-in-2025-5c85e4f2bda9) - Performance benchmarks
- [Node.js Testing Best Practices](https://github.com/goldbergyoni/nodejs-testing-best-practices) - General patterns
- [Vitest child_process discussion](https://github.com/vitest-dev/vitest/discussions/2075) - Spawn mocking challenges

### Tertiary (LOW confidence)
- [memfs with vitest setup](https://kschaul.com/til/2024/06/26/mock-fs-with-vitest-and-memfs/) - Community example, may need validation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Vitest documentation verified all recommendations
- Architecture: HIGH - Patterns derived from official guides and established testing practices
- Pitfalls: MEDIUM - Based on GitHub issues and community reports; validate during implementation

**Research date:** 2026-01-21
**Valid until:** 60 days (Vitest is stable, patterns well-established)
