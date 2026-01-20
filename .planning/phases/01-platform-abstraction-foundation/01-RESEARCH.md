# Phase 1: Platform Abstraction Foundation - Research

**Researched:** 2026-01-20
**Domain:** Platform abstraction, adapter pattern, runtime detection
**Confidence:** HIGH

## Summary

This phase requires building a robust platform abstraction layer to support both Claude Code (existing platform) and OpenCode (target platform) without breaking existing users. The research identifies the adapter pattern as the established approach, with runtime platform detection, factory-based registry, and interface-driven contracts.

The existing codebase has 10 Claude Code integration points that need abstraction: installation paths, hook systems, settings.json manipulation, slash command registration, agent spawning, JSON stdin protocols, todo storage, context file references, MCP tool dependencies, and parallel execution patterns. The target OpenCode platform has similar capabilities but different APIs and configuration formats.

**Primary recommendation:** Use TypeScript adapter pattern with factory registry, runtime detection via filesystem probing, and interface contracts defining the common platform capabilities. Avoid service locator anti-pattern; use dependency injection for adapter access.

## Standard Stack

The established libraries/tools for platform abstraction in Node.js/TypeScript:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.x | Type safety and interface contracts | Industry standard for Node.js projects requiring type safety; enables compile-time contract verification |
| Node.js stdlib | 16.7.0+ | Path resolution, filesystem operations | Zero dependencies approach; all needed APIs built-in (fs, path, os) |
| JSON Schema | 2020-12 | Configuration validation | Standard for validating JSON/JSONC config files across platforms |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| write-file-atomic | 7.0.0+ | Atomic config file writes | When manipulating settings.json to prevent race conditions |
| @folder/xdg | Latest | XDG Base Directory paths | For proper Linux path resolution (but avoid on macOS/Windows per XDG spec) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zero dependencies | xdg-basedir package | Package provides XDG paths but violates platform conventions on macOS/Windows; manual implementation better for cross-platform |
| Manual type checking | Zod/io-ts runtime validation | Adds dependency; current needs met by TypeScript interfaces + JSON validation |
| Service Locator | Dependency Injection container | DI container overkill for 2-3 platform adapters; manual factory sufficient |

**Installation:**
```bash
# For development (TypeScript compilation)
npm install --save-dev typescript @types/node

# For atomic file operations (optional)
npm install write-file-atomic
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── platform/
│   ├── interface.ts          # PlatformAdapter interface contract
│   ├── registry.ts            # Factory pattern for adapter loading
│   ├── detection.ts           # Runtime platform detection logic
│   ├── adapters/
│   │   ├── claude-code.ts    # Claude Code implementation
│   │   └── opencode.ts       # OpenCode implementation
│   └── types.ts               # Shared type definitions
├── install/
│   └── installer.ts           # Uses PlatformAdapter for installation
└── commands/
    └── orchestrator.ts        # Uses PlatformAdapter for spawning agents
```

### Pattern 1: Adapter Pattern with Interface Contract
**What:** Define PlatformAdapter interface that all platform implementations must satisfy
**When to use:** When you need to abstract multiple platforms with different APIs but similar capabilities

**Example:**
```typescript
// Source: Adapter pattern best practices (Refactoring Guru, TypeScript)
// Combined with Azure SDK TypeScript design guidelines

// platform/interface.ts
export interface PlatformAdapter {
  // Platform identification
  readonly name: 'claude-code' | 'opencode' | 'unknown';
  readonly version: string;

  // Path resolution (PLAT-06)
  getConfigDir(): string;
  getCommandsDir(): string;
  getAgentsDir(): string;
  getHooksDir(): string;

  // Configuration management (PLAT-07)
  readConfig(): Promise<PlatformConfig>;
  writeConfig(config: PlatformConfig): Promise<void>;

  // Command registration (CMD-03)
  registerCommand(command: CommandDefinition): Promise<void>;
  unregisterCommand(commandName: string): Promise<void>;

  // Agent spawning (future phase)
  spawnAgent(agentName: string, context: AgentContext): Promise<AgentHandle>;

  // Hook registration (future phase)
  registerHook(event: HookEvent, handler: HookHandler): Promise<void>;
}

export interface PlatformConfig {
  // Platform-agnostic config structure
  // Each adapter translates to/from platform-specific format
  statusLine?: StatusLineConfig;
  hooks?: Record<string, HookConfig[]>;
}

export interface CommandDefinition {
  name: string;
  description: string;
  allowedTools: string[];
  content: string; // Markdown with YAML frontmatter
}
```

### Pattern 2: Factory Registry with Runtime Detection
**What:** Use factory pattern to instantiate correct adapter based on runtime platform detection
**When to use:** When platform cannot be determined at compile time and must be detected at runtime

**Example:**
```typescript
// Source: Factory pattern with DI best practices (Code Maze, GeeksforGeeks)

// platform/detection.ts
export type PlatformType = 'claude-code' | 'opencode' | 'unknown';

export function detectPlatform(): PlatformType {
  const homeDir = os.homedir();

  // Priority order: explicit env var > filesystem probing
  const explicit = process.env.GSD_PLATFORM;
  if (explicit === 'claude-code' || explicit === 'opencode') {
    return explicit;
  }

  // Probe for Claude Code
  const claudeConfig = path.join(homeDir, '.claude', 'settings.json');
  if (fs.existsSync(claudeConfig)) {
    return 'claude-code';
  }

  // Probe for OpenCode
  const opencodeConfig = path.join(homeDir, '.config', 'opencode', 'opencode.json');
  if (fs.existsSync(opencodeConfig)) {
    return 'opencode';
  }

  return 'unknown';
}

// platform/registry.ts
export class PlatformRegistry {
  private static instance: PlatformAdapter | null = null;

  static getAdapter(): PlatformAdapter {
    if (!this.instance) {
      const platformType = detectPlatform();
      this.instance = this.createAdapter(platformType);
    }
    return this.instance;
  }

  private static createAdapter(type: PlatformType): PlatformAdapter {
    switch (type) {
      case 'claude-code':
        return new ClaudeCodeAdapter();
      case 'opencode':
        return new OpenCodeAdapter();
      case 'unknown':
        throw new Error('No supported AI platform detected. Install Claude Code or OpenCode.');
    }
  }

  // For testing: inject custom adapter
  static setAdapter(adapter: PlatformAdapter): void {
    this.instance = adapter;
  }

  // For testing: reset singleton
  static reset(): void {
    this.instance = null;
  }
}
```

### Pattern 3: Path Resolution Abstraction
**What:** Abstract away hardcoded ~/.claude/ paths with runtime resolution per platform
**When to use:** Everywhere that currently uses path.join(os.homedir(), '.claude')

**Example:**
```typescript
// Source: XDG Base Directory specification + cross-platform path patterns

// platform/adapters/claude-code.ts
export class ClaudeCodeAdapter implements PlatformAdapter {
  readonly name = 'claude-code' as const;

  getConfigDir(): string {
    // Priority: CLAUDE_CONFIG_DIR env var > default ~/.claude
    const envDir = process.env.CLAUDE_CONFIG_DIR;
    if (envDir) {
      return this.expandTilde(envDir);
    }
    return path.join(os.homedir(), '.claude');
  }

  getCommandsDir(): string {
    return path.join(this.getConfigDir(), 'commands', 'gsd');
  }

  getAgentsDir(): string {
    return path.join(this.getConfigDir(), 'agents');
  }

  private expandTilde(filePath: string): string {
    if (filePath.startsWith('~/')) {
      return path.join(os.homedir(), filePath.slice(2));
    }
    return filePath;
  }
}

// platform/adapters/opencode.ts
export class OpenCodeAdapter implements PlatformAdapter {
  readonly name = 'opencode' as const;

  getConfigDir(): string {
    // OpenCode uses ~/.config/opencode (XDG-style on all platforms)
    const envDir = process.env.OPENCODE_CONFIG;
    if (envDir) {
      return path.dirname(envDir); // Config env points to file, not dir
    }

    // Follow XDG Base Directory on Linux, equivalent on macOS/Windows
    const configHome = process.env.XDG_CONFIG_HOME ||
                      path.join(os.homedir(), '.config');
    return path.join(configHome, 'opencode');
  }

  getCommandsDir(): string {
    // OpenCode: ~/.config/opencode/commands/ (no 'gsd' subdirectory)
    return path.join(this.getConfigDir(), 'commands');
  }

  getAgentsDir(): string {
    return path.join(this.getConfigDir(), 'agents');
  }
}
```

### Pattern 4: Atomic Configuration Updates
**What:** Read-modify-write config files atomically to prevent race conditions
**When to use:** When manipulating settings.json or opencode.json

**Example:**
```typescript
// Source: write-file-atomic package, race condition prevention patterns

import writeFileAtomic from 'write-file-atomic';

export class ClaudeCodeAdapter implements PlatformAdapter {
  async readConfig(): Promise<PlatformConfig> {
    const settingsPath = path.join(this.getConfigDir(), 'settings.json');

    if (!fs.existsSync(settingsPath)) {
      return {};
    }

    const content = await fs.promises.readFile(settingsPath, 'utf8');
    const settings = JSON.parse(content);

    // Translate Claude Code format to platform-agnostic format
    return {
      statusLine: settings.statusLine,
      hooks: settings.hooks,
    };
  }

  async writeConfig(config: PlatformConfig): Promise<void> {
    const settingsPath = path.join(this.getConfigDir(), 'settings.json');

    // Read existing to preserve unrelated settings
    let existing = {};
    if (fs.existsSync(settingsPath)) {
      existing = JSON.parse(await fs.promises.readFile(settingsPath, 'utf8'));
    }

    // Merge platform-agnostic config into existing settings
    const merged = {
      ...existing,
      statusLine: config.statusLine,
      hooks: config.hooks,
    };

    // Atomic write prevents corruption from concurrent access
    await writeFileAtomic(
      settingsPath,
      JSON.stringify(merged, null, 2) + '\n'
    );
  }
}
```

### Anti-Patterns to Avoid

- **Service Locator:** Don't make registry a global service locator that creates objects on-demand. Use factory pattern to create adapter once, then pass via DI.
- **Single Implementation:** Don't create interfaces before you have 2+ implementations. Wait until Phase 2 to create PlatformAdapter interface after extracting Claude Code logic.
- **Hardcoded Paths in Templates:** Don't use ~/.claude/ in markdown files. Use ${PLATFORM_CONFIG_DIR} placeholder and resolve at installation time.
- **Leaking Implementation Details:** Platform interface should not expose Claude Code-specific concepts (e.g., don't put "Task tool" in interface; use abstract "spawnAgent" method).
- **Over-Abstraction:** Don't abstract things that won't vary between platforms (e.g., .planning/ directory structure is platform-agnostic, no abstraction needed).

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic file writes | Custom file locking with fs.writeFile | write-file-atomic package | Race conditions in concurrent writes are subtle; package handles edge cases (partial writes, SIGKILL during write, cross-platform temp files) |
| JSON schema validation | Manual property checking | JSON Schema validator | Complex nested validation logic; standard schema format enables tooling support |
| Runtime type checking | Manual instanceof checks | TypeScript interfaces + runtime assertion helpers | Type guards provide compile-time safety; manual checks miss edge cases |
| Configuration merging | Deep object spread | Structured merge with precedence | Arrays need special handling (merge vs replace); nested objects need recursive merge |
| Platform detection | Try/catch around platform APIs | Filesystem probing with fallback | API errors don't distinguish "not installed" from "permission denied"; filesystem reliable |

**Key insight:** The platform abstraction itself is the custom solution. But within it, use standard patterns for file I/O, validation, and type safety. Don't invent new solutions for these cross-cutting concerns.

## Common Pitfalls

### Pitfall 1: Creating Illusions Instead of Abstractions
**What goes wrong:** Abstraction layer claims to hide platform differences but actually just renames platform-specific concepts, forcing consumers to know which platform they're on.

**Why it happens:** Adapter interface includes platform-specific methods (e.g., `getTaskToolSyntax()` for Claude Code) instead of platform-agnostic operations (e.g., `spawnAgent()`).

**How to avoid:**
- Define interface methods in terms of WHAT, not HOW (spawn an agent, not "invoke Task tool")
- Each adapter translates platform-agnostic calls to platform-specific APIs
- Consumers never import platform-specific types or check platform name

**Warning signs:**
- Interface has methods like `getClaudeCodeSettings()` and `getOpenCodeConfig()`
- Consumers check `adapter.name === 'claude-code'` to branch logic
- Error messages leak platform-specific terminology to users

### Pitfall 2: Single Implementation Before Second Platform
**What goes wrong:** Creating PlatformAdapter interface and ClaudeCodeAdapter in Phase 1 before OpenCode exists, resulting in interface that perfectly fits Claude Code but requires major changes for OpenCode.

**Why it happens:** It's tempting to "design ahead" and create the abstraction before knowing what varies between platforms.

**How to avoid:**
- Phase 1: Define detection and registry structure, but keep Claude Code logic inline
- Phase 2: Extract Claude Code to adapter while building OpenCode adapter simultaneously
- Let the differences between platforms inform the interface design
- Alternatively: Build minimal interface in Phase 1 with only getConfigDir(), defer agent/hook abstraction

**Warning signs:**
- Interface has 20+ methods in Phase 1 before seeing second platform
- Interface methods map 1:1 to Claude Code APIs without translation
- Comments say "we'll refactor this when adding OpenCode"

### Pitfall 3: Hardcoded Paths in Markdown Files
**What goes wrong:** Command and agent markdown files contain ~/.claude/ references that break on OpenCode.

**Why it happens:** Current codebase has @~/.claude/get-shit-done/references/... throughout markdown files.

**How to avoid:**
- Installation script rewrites paths in markdown during file copy (current approach)
- Use variable substitution: @${PLATFORM_BASE}/get-shit-done/references/...
- Store markdown in platform-agnostic format, resolve @ references at runtime

**Warning signs:**
- Grep for '~/.claude/' returns hits in commands/gsd/*.md after installation
- Projects fail when moved between platforms
- Installation script has complex regex path replacement logic

### Pitfall 4: Registry as Service Locator Anti-Pattern
**What goes wrong:** PlatformRegistry grows into a service locator that creates and manages multiple service instances, obscuring dependencies.

**Why it happens:** It's easy to add `registry.getFileSystemService()`, `registry.getConfigService()`, etc., making registry the central dependency hub.

**How to avoid:**
- Registry creates ONE thing: the platform adapter
- All other services receive adapter via constructor injection
- No `registry.get(serviceName)` dynamic lookup
- Registry pattern stays focused on factory responsibility

**Warning signs:**
- Registry has methods for multiple service types
- Services call `PlatformRegistry.get('something')` instead of receiving dependencies
- Tests are difficult because registry hides what services depend on

### Pitfall 5: Assuming Filesystem Atomicity
**What goes wrong:** Config file corruption when multiple processes read-modify-write settings.json simultaneously.

**Why it happens:** `fs.writeFile()` is not atomic; concurrent writers can interleave bytes, producing invalid JSON.

**How to avoid:**
- Use write-file-atomic for all config modifications
- Consider file locking for critical operations
- Fail gracefully when config is malformed (restore from backup)

**Warning signs:**
- Intermittent "Unexpected token in JSON" errors
- Config corruption after parallel installs or hook executions
- No backup/restore mechanism for settings.json

### Pitfall 6: Over-Abstracting Stable Contracts
**What goes wrong:** Abstracting things that don't vary between platforms (e.g., .planning/ directory structure, PLAN.md format) adds complexity without benefit.

**Why it happens:** Enthusiasm for abstraction after identifying need for platform adapter.

**How to avoid:**
- Only abstract integration points that differ between platforms
- .planning/ directory is a contract both platforms honor (no abstraction needed)
- Command markdown format is standardized across platforms (no abstraction needed)
- Focus abstraction on installation, config files, and agent spawning

**Warning signs:**
- Adapter interface has methods for reading/writing PLAN.md files
- "Planning artifact adapter" or "markdown format adapter" in design docs
- Every file operation goes through platform adapter

### Pitfall 7: Runtime Detection False Positives
**What goes wrong:** Platform detection identifies wrong platform (e.g., detects Claude Code when OpenCode is intended).

**Why it happens:** Filesystem probing finds ~/.claude/ directory from old installation while user wants to use OpenCode.

**How to avoid:**
- Priority order: explicit env var > filesystem probes > error
- GSD_PLATFORM env var allows user override
- Multi-select installer creates marker file indicating user choice
- Detection only runs during installation; installed files know their platform

**Warning signs:**
- Users report "installed for OpenCode but commands registered in Claude Code"
- Detection logic has complex heuristics (file age, version checks)
- No way for user to explicitly choose platform

## Code Examples

Verified patterns from official sources and established practices:

### Runtime Platform Detection
```typescript
// Source: VS Code extension platform detection patterns
// Combined with filesystem-based probing approach

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export type PlatformType = 'claude-code' | 'opencode' | 'unknown';

export function detectPlatform(): PlatformType {
  // Priority 1: Explicit environment variable
  const explicit = process.env.GSD_PLATFORM;
  if (explicit === 'claude-code' || explicit === 'opencode') {
    return explicit;
  }

  // Priority 2: Marker file from installation (most reliable)
  const markerPath = path.join(__dirname, '..', '.platform');
  if (fs.existsSync(markerPath)) {
    const platform = fs.readFileSync(markerPath, 'utf8').trim();
    if (platform === 'claude-code' || platform === 'opencode') {
      return platform;
    }
  }

  // Priority 3: Filesystem probing
  const homeDir = os.homedir();

  // Check Claude Code
  const claudeSettings = path.join(homeDir, '.claude', 'settings.json');
  const hasClaudeCode = fs.existsSync(claudeSettings);

  // Check OpenCode
  const opencodeConfig = path.join(homeDir, '.config', 'opencode', 'opencode.json');
  const hasOpenCode = fs.existsSync(opencodeConfig);

  // Ambiguous: both platforms installed
  if (hasClaudeCode && hasOpenCode) {
    // Fall back to env var or error
    console.warn('Both Claude Code and OpenCode detected. Set GSD_PLATFORM env var to choose.');
    return 'unknown';
  }

  if (hasClaudeCode) return 'claude-code';
  if (hasOpenCode) return 'opencode';

  return 'unknown';
}
```

### Adapter Interface Contract
```typescript
// Source: TypeScript interface design best practices (Azure SDK, AWS Guidelines)

export interface PlatformAdapter {
  /**
   * Platform identification
   */
  readonly name: 'claude-code' | 'opencode';
  readonly version: string;

  /**
   * Path resolution (PLAT-06)
   * Returns absolute paths to platform-specific directories
   */
  getConfigDir(): string;
  getCommandsDir(): string;
  getAgentsDir(): string;

  /**
   * Configuration management (PLAT-07)
   * Platform-agnostic config structure; adapter handles translation
   */
  readConfig(): Promise<PlatformConfig>;
  writeConfig(config: Partial<PlatformConfig>): Promise<void>;
  mergeConfig(config: Partial<PlatformConfig>): Promise<void>;

  /**
   * Command registration (CMD-03)
   */
  registerCommands(commands: CommandDefinition[]): Promise<void>;
  listCommands(): Promise<string[]>;

  /**
   * Installation support
   */
  backupConfig(): Promise<string>; // Returns backup path
  restoreConfig(backupPath: string): Promise<void>;
  cleanOrphanedFiles(knownFiles: string[]): Promise<void>;
}

export interface PlatformConfig {
  statusLine?: {
    type: 'command';
    command: string;
  };
  hooks?: {
    [event: string]: Array<{
      type: 'command';
      command: string;
    }>;
  };
}

export interface CommandDefinition {
  name: string;              // e.g., 'gsd:new-project'
  description: string;
  allowedTools: string[];    // e.g., ['Read', 'Write', 'Bash', 'Task']
  filePath: string;          // Path to markdown file
}
```

### Factory Registry Pattern
```typescript
// Source: Factory pattern with DI (Code Maze, LinkedIn)

export class PlatformRegistry {
  private static instance: PlatformAdapter | null = null;

  /**
   * Get the platform adapter for the current environment.
   * Singleton pattern ensures one adapter per process.
   */
  static getAdapter(): PlatformAdapter {
    if (!this.instance) {
      const platformType = detectPlatform();
      this.instance = this.createAdapter(platformType);
    }
    return this.instance;
  }

  /**
   * Factory method for creating adapters.
   * @throws Error if platform is unknown
   */
  private static createAdapter(type: PlatformType): PlatformAdapter {
    switch (type) {
      case 'claude-code':
        // Lazy-load to avoid importing unused adapters
        const ClaudeCodeAdapter = require('./adapters/claude-code').ClaudeCodeAdapter;
        return new ClaudeCodeAdapter();

      case 'opencode':
        const OpenCodeAdapter = require('./adapters/opencode').OpenCodeAdapter;
        return new OpenCodeAdapter();

      case 'unknown':
        throw new Error(
          'No supported AI platform detected. ' +
          'Install Claude Code or OpenCode, or set GSD_PLATFORM environment variable.'
        );
    }
  }

  /**
   * For testing: inject custom adapter
   */
  static setAdapter(adapter: PlatformAdapter): void {
    this.instance = adapter;
  }

  /**
   * For testing: reset singleton
   */
  static reset(): void {
    this.instance = null;
  }
}

// Usage in application code
export class Installer {
  private adapter: PlatformAdapter;

  constructor() {
    this.adapter = PlatformRegistry.getAdapter();
  }

  async install(): Promise<void> {
    const configDir = this.adapter.getConfigDir();
    const commandsDir = this.adapter.getCommandsDir();
    // ... installation logic using adapter
  }
}
```

### Atomic Config Writes
```typescript
// Source: write-file-atomic package, Node.js race condition prevention

import writeFileAtomic from 'write-file-atomic';
import * as fs from 'fs';
import * as path from 'path';

export class ClaudeCodeAdapter implements PlatformAdapter {
  private readonly settingsPath: string;

  constructor() {
    this.settingsPath = path.join(this.getConfigDir(), 'settings.json');
  }

  async readConfig(): Promise<PlatformConfig> {
    if (!fs.existsSync(this.settingsPath)) {
      return {};
    }

    try {
      const content = await fs.promises.readFile(this.settingsPath, 'utf8');
      const settings = JSON.parse(content);

      // Translate Claude Code format to platform-agnostic
      return {
        statusLine: settings.statusLine,
        hooks: settings.hooks,
      };
    } catch (error) {
      // Corrupt config - try to restore from backup
      const backup = await this.findLatestBackup();
      if (backup) {
        await this.restoreConfig(backup);
        return this.readConfig();
      }
      throw error;
    }
  }

  async writeConfig(config: Partial<PlatformConfig>): Promise<void> {
    // Backup before modification
    await this.backupConfig();

    // Read existing to preserve unrelated settings
    let existing: any = {};
    if (fs.existsSync(this.settingsPath)) {
      const content = await fs.promises.readFile(this.settingsPath, 'utf8');
      existing = JSON.parse(content);
    }

    // Merge new config
    const merged = {
      ...existing,
      ...(config.statusLine && { statusLine: config.statusLine }),
      ...(config.hooks && { hooks: config.hooks }),
    };

    // Atomic write prevents corruption
    await writeFileAtomic(
      this.settingsPath,
      JSON.stringify(merged, null, 2) + '\n',
      { encoding: 'utf8' }
    );
  }

  async mergeConfig(config: Partial<PlatformConfig>): Promise<void> {
    const existing = await this.readConfig();

    // Deep merge hooks (arrays need special handling)
    const mergedHooks = { ...existing.hooks };
    if (config.hooks) {
      for (const [event, handlers] of Object.entries(config.hooks)) {
        mergedHooks[event] = [
          ...(mergedHooks[event] || []),
          ...handlers,
        ];
      }
    }

    await this.writeConfig({
      statusLine: config.statusLine || existing.statusLine,
      hooks: mergedHooks,
    });
  }

  async backupConfig(): Promise<string> {
    if (!fs.existsSync(this.settingsPath)) {
      return '';
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(this.getConfigDir(), 'backups');
    fs.mkdirSync(backupDir, { recursive: true });

    const backupPath = path.join(backupDir, `settings-${timestamp}.json`);
    await fs.promises.copyFile(this.settingsPath, backupPath);

    return backupPath;
  }

  async restoreConfig(backupPath: string): Promise<void> {
    await fs.promises.copyFile(backupPath, this.settingsPath);
  }

  private async findLatestBackup(): Promise<string | null> {
    const backupDir = path.join(this.getConfigDir(), 'backups');
    if (!fs.existsSync(backupDir)) {
      return null;
    }

    const backups = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('settings-') && f.endsWith('.json'))
      .sort()
      .reverse();

    return backups.length > 0
      ? path.join(backupDir, backups[0])
      : null;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded ~/.claude/ paths | Runtime path resolution via adapter | 2025 (multi-platform trend) | Enables platform portability; users can switch platforms |
| settings.json direct manipulation | Adapter-based config abstraction | 2025 (abstraction layer pattern) | Settings structure hidden from business logic; platform changes don't break code |
| Platform-specific command syntax | Markdown + YAML standard | 2024-2025 (convergence) | Both Claude Code and OpenCode use markdown files; portability achieved |
| Service Locator pattern | Dependency Injection | 2023-2025 (DI consensus) | Better testability; explicit dependencies; DI preferred over service locator anti-pattern |
| Manual JSON writes | Atomic file operations | Ongoing | Prevents corruption from concurrent access; critical for config files |

**Deprecated/outdated:**
- Service Locator pattern: Now considered anti-pattern for TypeScript/Node.js; DI preferred
- Global singletons without reset: Breaks tests; modern pattern includes reset() for testing
- Platform detection via try/catch: Unreliable; filesystem probing more robust
- XDG on Windows/macOS: Violates platform conventions; each OS has preferred paths

## Open Questions

Things that couldn't be fully resolved:

1. **OpenCode plugin/MCP loading mechanism**
   - What we know: OpenCode supports plugins in .opencode/plugins/ and MCP servers in config
   - What's unclear: How plugins are loaded at runtime, lifecycle hooks available
   - Recommendation: Defer plugin integration to Phase 5 (hooks); focus Phase 1 on path/config abstraction

2. **Concurrent installation handling**
   - What we know: Users may install for both platforms simultaneously
   - What's unclear: File locking strategy across multi-select installation
   - Recommendation: Sequential installation with user prompt; avoid parallel writes to same directories

3. **Platform capability detection vs version detection**
   - What we know: Requirements specify feature flags, not version checking
   - What's unclear: How to detect if platform supports specific features (e.g., statusline) at runtime
   - Recommendation: Start with platform name detection; add capability detection in Phase 5 when implementing hooks

4. **Migration from Phase 1 inline code to Phase 2 adapter**
   - What we know: Phase 1 should avoid premature abstraction; Phase 2 extracts to adapter
   - What's unclear: Exact refactoring strategy when adapter interface emerges
   - Recommendation: Phase 1 creates detection + registry skeleton; Phase 2 defines full interface after seeing both platforms

## Sources

### Primary (HIGH confidence)
- [Adapter Design Pattern - Refactoring Guru](https://refactoring.guru/design-patterns/adapter/typescript/example) - TypeScript adapter pattern canonical reference
- [Ts.ED Platform Adapter](https://tsed.dev/docs/platform-adapter.html) - Real-world platform abstraction implementation
- [OpenCode Agents Documentation](https://opencode.ai/docs/agents/) - Official OpenCode agent system
- [OpenCode Commands Documentation](https://opencode.ai/docs/commands/) - Official OpenCode command format
- [OpenCode Configuration](https://opencode.ai/docs/config/) - Official OpenCode config system
- [TypeScript Handbook - Interfaces](https://www.typescriptlang.org/docs/handbook/interfaces.html) - Official TypeScript interface contracts
- [Azure SDK TypeScript Guidelines](https://azure.github.io/azure-sdk/typescript_design.html) - API design best practices

### Secondary (MEDIUM confidence)
- [write-file-atomic npm package](https://www.npmjs.com/package/write-file-atomic) - Atomic file operations verified solution (v7.0.0, 1598+ projects)
- [Factory Pattern with DI - Code Maze](https://code-maze.com/dotnet-factory-pattern-dependency-injection/) - Factory + DI patterns (verified with multiple sources)
- [Dependency Injection vs Service Locator - GeeksforGeeks](https://www.geeksforgeeks.org/system-design/dependency-injection-vs-factory-pattern/) - Anti-pattern warnings
- [Platform Abstraction Pitfalls](https://blog.chinaza.dev/the-double-edged-sword-of-abstraction-in-software-engineering) - Common mistakes and anti-patterns
- [API Backward Compatibility - Zuplo](https://zuplo.com/blog/2025/04/11/api-versioning-backward-compatibility-best-practices) - Migration strategies (2025)

### Tertiary (LOW confidence, for context)
- [Node.js Plugin Architecture](https://www.n-school.com/plugin-based-architecture-in-node-js/) - General patterns, not platform-specific
- [XDG Base Directory packages](https://github.com/sindresorhus/xdg-basedir) - Noted but avoid on macOS/Windows per docs
- [TypeScript Runtime Type Checking](https://blog.logrocket.com/methods-for-typescript-runtime-type-checking/) - Options explored; interfaces sufficient for this phase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - TypeScript + Node.js stdlib is established pattern; zero dependencies validated by current codebase
- Architecture: HIGH - Adapter pattern verified from multiple authoritative sources; OpenCode docs confirm compatibility
- Pitfalls: HIGH - Multiple sources (2025) confirm service locator anti-pattern, over-abstraction risks, atomic writes necessity
- OpenCode specifics: MEDIUM - Official docs provide structure but some runtime behavior details unclear until implementation

**Research date:** 2026-01-20
**Valid until:** 30 days (stable domain; patterns unlikely to change rapidly)
