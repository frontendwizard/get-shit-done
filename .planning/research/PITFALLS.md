# Multi-Platform Extension Development Pitfalls

**Domain:** Multi-platform AI coding tool extensions
**Researched:** 2026-01-19
**Confidence:** HIGH (based on GSD architecture analysis + multi-platform development patterns)

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or break existing users.

### Pitfall 1: Installation Path Hardcoding Breaking Backward Compatibility

**What goes wrong:**

When adding multi-platform support, developers change installation paths (`~/.claude/` → `~/.config/opencode/`) which breaks existing installations. Existing users upgrade and their `.planning/` directories stop working because file references now point to wrong locations.

**Why it happens:**

- Installer changes paths globally without migration logic
- File references (`@~/.claude/get-shit-done/...`) hardcoded in existing `.planning/` files
- No detection of "already installed on another platform" scenario

**Consequences:**

- Existing users (1.6k+ npm downloads for GSD) lose access to active projects
- `.planning/PROJECT.md` references break (commands can't load templates/workflows)
- Hooks stop firing (settings.json points to old paths)
- Silent failures — commands run but can't find referenced files

**Prevention:**

1. **Symlink strategy:** Install to platform-specific paths but symlink shared content
   ```bash
   # OpenCode install
   ~/.config/opencode/get-shit-done/ → ~/.claude/get-shit-done/ (symlink)
   ~/.config/opencode/agents/gsd-*.md → ~/.claude/agents/gsd-*.md (symlinks)
   ```

2. **Path resolution at runtime:** Commands resolve `@~/.claude/` dynamically based on platform
   ```javascript
   // Platform adapter determines config root
   const configRoot = platform.getConfigRoot(); // ~/.claude or ~/.config/opencode
   const skillPath = path.join(configRoot, 'get-shit-done');
   ```

3. **Install-time path rewriting only for NEW installations:** Don't rewrite paths for existing `.planning/` directories

4. **Multi-platform coexistence:** Allow Claude Code AND OpenCode installations simultaneously
   ```
   ~/.claude/get-shit-done/          # shared content (symlink target)
   ~/.claude/commands/gsd/           # Claude Code commands
   ~/.config/opencode/commands/      # OpenCode commands (symlink to shared)
   ~/.claude/agents/gsd-*.md         # shared agents
   ```

**Detection:**

- Run `grep -r "~/.claude/" .planning/` on existing projects
- Check if installer modifies existing `.planning/` file references
- Test upgrade path: install v1.x, create project, upgrade to v2.x, verify commands still work

**Phase mapping:** Phase 1 (Platform Abstraction Layer) MUST solve this before any installation logic changes

**Real example:** GSD installer already does path replacement for `.md` files during install (`content.replace(/~\/\.claude\//g, pathPrefix)`), but this only affects newly installed files, not existing `.planning/` directories. Multi-platform expansion must preserve this safety.

---

### Pitfall 2: Platform Detection Race Conditions

**What goes wrong:**

Runtime platform detection fails intermittently because detection logic runs before platform APIs are available. Commands spawn on Claude Code but try to use OpenCode APIs, or vice versa.

**Why it happens:**

- Async initialization — platform APIs not ready when detection runs
- Environment variable race conditions (CLAUDE_SESSION_ID vs OPENCODE_SESSION)
- Multiple detection strategies that conflict (check API availability vs check env vars vs check file paths)

**Consequences:**

- Commands fail with cryptic errors ("Task tool not available")
- Agent spawning silently fails (Task tool called on OpenCode, no error thrown)
- Hooks registered but never fire (SessionStart event doesn't exist on other platform)
- Intermittent failures — works 80% of time, fails 20%

**Prevention:**

1. **Eager detection at module load:** Run detection synchronously before any async operations
   ```javascript
   // platform-detector.js (loaded first)
   const PLATFORM = detectPlatformSync(); // must be sync

   function detectPlatformSync() {
     // Check in order of reliability:
     if (typeof claudeAPI !== 'undefined') return 'claudecode';
     if (typeof opencodeAPI !== 'undefined') return 'opencode';
     if (process.env.CLAUDE_CONFIG_DIR) return 'claudecode';
     if (fs.existsSync(path.join(os.homedir(), '.config/opencode'))) return 'opencode';
     throw new Error('Unknown platform');
   }
   ```

2. **Single source of truth:** One detection function, called once, cached globally
   ```javascript
   // Anti-pattern: detecting in every adapter
   class ClaudeAdapter {
     isCurrentPlatform() { return detectPlatform() === 'claudecode'; } // BAD
   }

   // Pattern: global detection, adapters trust it
   const platform = PLATFORM_REGISTRY.getCurrent(); // detected once at startup
   ```

3. **Fail-fast on unknown platform:** Don't guess, don't default, throw clear error
   ```javascript
   if (!PLATFORM) {
     throw new Error(`
       GSD cannot detect platform. Are you running in Claude Code or OpenCode?
       If you're using a different platform, file an issue: github.com/...
     `);
   }
   ```

4. **Development override:** Allow explicit platform for testing
   ```bash
   GSD_PLATFORM=opencode /gsd:new-project  # force OpenCode adapter in Claude Code
   ```

**Detection:**

- Add logging: `console.error('[GSD] Detected platform:', PLATFORM)`
- Test in both platforms with same `.planning/` directory
- Check for "tool not available" errors in different execution contexts

**Phase mapping:** Phase 1 (Platform Abstraction Layer) — detection must be bulletproof before building adapters

---

### Pitfall 3: Agent Spawning API Incompatibility

**What goes wrong:**

Agent spawning works on one platform but silently fails on another. Claude Code uses `Task(subagent_type="gsd-planner")`, OpenCode uses YAML `agent: gsd-planner` + `subtask: true`. Commands spawn agents using wrong syntax, agents never execute, orchestrator waits forever.

**Why it happens:**

- Two completely different APIs for same operation
- No error when wrong API used (Claude Code ignores unknown YAML, OpenCode ignores Task calls)
- Commands have hundreds of agent spawn points (4 parallel researchers in new-project, waves in execute-phase)
- Copy-paste from examples without platform context

**Consequences:**

- **Silent failures:** Command says "spawning researcher agents..." but nothing happens
- **Stuck workflows:** Orchestrator waits for agent output that never arrives
- **Data loss:** Partial agent completions not detected (3 of 4 researchers complete, 4th silent fail)
- **Impossible debugging:** No error message, just timeout or hang

**Prevention:**

1. **Adapter pattern for agent spawning:** Abstract platform-specific syntax
   ```javascript
   // platform-adapter.js
   class ClaudeCodeAdapter {
     spawnAgent(agentType, prompt, description) {
       return `Task(prompt="${prompt}", subagent_type="${agentType}", description="${description}")`;
     }
   }

   class OpenCodeAdapter {
     spawnAgent(agentType, prompt, description) {
       // OpenCode uses YAML in prompt content
       return `Execute this as subtask using agent ${agentType}:\n\n${prompt}`;
     }
   }
   ```

2. **Command template variables:** Commands use placeholders, platform injects syntax
   ```markdown
   ## Phase 6: Research (Parallel)

   {{SPAWN_AGENT agent="gsd-project-researcher" description="Stack research"}}
   Research the technology stack for {{PROJECT_DESCRIPTION}}.
   Write to: .planning/research/STACK.md
   {{END_AGENT}}
   ```

   At runtime:
   ```javascript
   content = content.replace(/{{SPAWN_AGENT.*?}}/g, (match) => {
     return platform.spawnAgent(extractParams(match));
   });
   ```

3. **Verification after spawn:** Don't assume spawn succeeded
   ```bash
   # After spawning 4 parallel researchers
   sleep 2  # give agents time to start
   if [ $(ps aux | grep gsd-project-researcher | wc -l) -lt 4 ]; then
     echo "ERROR: Not all researchers spawned"
     exit 1
   fi
   ```

4. **Timeout with clear error:** Don't wait forever
   ```bash
   timeout 600 wait-for-research-files || {
     echo "ERROR: Research agents didn't complete within 10min"
     echo "Expected: STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md"
     echo "Found: $(ls .planning/research/)"
     exit 1
   }
   ```

**Detection:**

- Test every command that spawns agents on both platforms
- Add debug mode: `GSD_DEBUG=1 /gsd:new-project` logs agent spawn attempts
- Check for "waiting for..." messages that never resolve

**Phase mapping:** Phase 2 (Agent Spawning Abstraction) — MUST verify both platforms spawn agents successfully

**Real example:** GSD spawns 4 parallel researchers + 1 synthesizer in new-project (lines 334-512 of new-project.md). If OpenCode version doesn't handle Task tool, all 5 agents silently fail.

---

### Pitfall 4: Hook System Impedance Mismatch

**What goes wrong:**

Claude Code hooks (SessionStart, StatusLine) have no equivalent on OpenCode, or use completely different event systems. StatusLine shows task progress on Claude Code, but nothing appears on OpenCode. SessionStart loads project state on Claude Code, but OpenCode users start every session from scratch.

**Why it happens:**

- Platform philosophy differences (Claude Code: hook-based, OpenCode: plugin events)
- Rich platform features (StatusLine) vs minimal platform (no statusline concept)
- No graceful degradation strategy
- Assuming platform feature parity

**Consequences:**

- **UX regression:** Features disappear on other platform (no task progress indicator)
- **Workflow breaks:** SessionStart hook critical for loading `.planning/STATE.md`, OpenCode users have no state memory
- **User confusion:** "Why doesn't it show my current task?" (worked on Claude Code, broken on OpenCode)
- **Maintenance divergence:** StatusLine logic in hooks/statusline.js never ported to OpenCode

**Prevention:**

1. **Best-effort equivalents:** Implement approximations when exact feature unavailable
   ```javascript
   // Claude Code: native statusline
   class ClaudeCodeAdapter {
     showTaskProgress(task) {
       // hooks/statusline.js handles this via SessionStart event
     }
   }

   // OpenCode: fallback to console output
   class OpenCodeAdapter {
     showTaskProgress(task) {
       console.log(`\n[GSD] Current task: ${task}\n`);
     }
   }
   ```

2. **Feature detection, not platform detection:**
   ```javascript
   if (platform.supports('statusline')) {
     platform.registerStatusLine(statuslineScript);
   } else {
     console.warn('[GSD] Statusline not supported on this platform');
   }
   ```

3. **Critical features fail loudly, nice-to-haves degrade gracefully:**
   ```javascript
   // Critical: state loading (required for GSD to work)
   if (!platform.supports('session-start')) {
     throw new Error('Platform must support session initialization hooks');
   }

   // Nice-to-have: statusline (improves UX but not required)
   if (!platform.supports('statusline')) {
     console.warn('[GSD] No statusline support - progress shown in console only');
   }
   ```

4. **Document platform feature matrix:**
   ```markdown
   | Feature | Claude Code | OpenCode | Fallback |
   |---------|-------------|----------|----------|
   | StatusLine | Native hook | None | Console output |
   | SessionStart | settings.json | Plugin event | Manual /gsd:resume-work |
   | Parallel agents | Task tool | YAML subtask | Sequential execution |
   ```

**Detection:**

- Test full workflow on both platforms
- Check for "expected behavior X didn't happen" reports
- Monitor feature usage: if statusline doesn't update, investigate

**Phase mapping:** Phase 3 (Hook System Abstraction) — map features, build equivalents, document gaps

**Real example:** GSD statusline (hooks/statusline.js) reads todos, shows context usage, current task. OpenCode has 20+ plugin events but no statusline equivalent. Must find closest match or gracefully degrade.

---

### Pitfall 5: Configuration File Format Divergence

**What goes wrong:**

Installer writes `settings.json` for Claude Code but OpenCode uses `opencode.jsonc` with different schema. Hooks registered in wrong file, commands don't load, slash command registration fails.

**Why it happens:**

- Different config formats (JSON vs JSONC with comments)
- Different schemas (Claude Code: `hooks: { SessionStart: [...] }`, OpenCode: `plugins: [...]`)
- Installer hardcodes settings.json manipulation
- No schema validation

**Consequences:**

- **Installer succeeds but nothing works:** Files copied, config written, but platform ignores it
- **Silent registration failures:** Slash commands don't appear in autocomplete
- **Hook registration in wrong file:** settings.json modified but platform reads opencode.jsonc
- **Config corruption:** Writing JSON to JSONC file breaks comments/formatting

**Prevention:**

1. **Platform-specific config writers:**
   ```javascript
   class ClaudeCodeAdapter {
     registerCommands(commandsDir) {
       const settingsPath = path.join(this.configRoot, 'settings.json');
       const settings = JSON.parse(fs.readFileSync(settingsPath));
       settings.customCommandsDirectory = commandsDir;
       fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
     }
   }

   class OpenCodeAdapter {
     registerCommands(commandsDir) {
       const configPath = path.join(this.configRoot, 'opencode.jsonc');
       // JSONC requires preserving comments
       const config = parseJSONC(fs.readFileSync(configPath));
       config.commandsPath = commandsDir;
       fs.writeFileSync(configPath, stringifyJSONC(config));
     }
   }
   ```

2. **Schema validation after write:**
   ```javascript
   platform.registerCommands(commandsDir);

   // Verify registration worked
   if (!platform.isCommandRegistered('gsd:new-project')) {
     throw new Error('Command registration failed - settings not updated correctly');
   }
   ```

3. **Backup before modification:**
   ```javascript
   function safeConfigUpdate(configPath, updateFn) {
     const backup = configPath + '.backup';
     fs.copyFileSync(configPath, backup);
     try {
       updateFn(configPath);
       fs.unlinkSync(backup);
     } catch (e) {
       fs.copyFileSync(backup, configPath);
       throw e;
     }
   }
   ```

4. **Don't assume config exists:**
   ```javascript
   const settingsPath = path.join(claudeDir, 'settings.json');
   if (!fs.existsSync(settingsPath)) {
     // Create minimal settings.json
     fs.writeFileSync(settingsPath, JSON.stringify({
       customCommandsDirectory: 'commands',
       hooks: {}
     }, null, 2));
   }
   ```

**Detection:**

- After install, verify commands appear in platform UI
- Test hook firing: trigger SessionStart, check if hook executes
- Parse config after write to verify valid JSON/JSONC

**Phase mapping:** Phase 1 (Platform Abstraction Layer) — config manipulation must be platform-aware from day 1

---

### Pitfall 6: Version Drift Between Platform Implementations

**What goes wrong:**

Feature added to Claude Code version but forgotten in OpenCode implementation. Version 1.7.0 ships with feature X working on Claude Code, broken on OpenCode. Users on different platforms have different experiences.

**Why it happens:**

- Code duplication across platform adapters
- No shared test suite
- Platform-specific branches in git (merge conflicts)
- "Fix it on one platform" without updating others
- Solo maintainer forgetting which platform last tested

**Consequences:**

- **Fragmented user experience:** "Works for me" (on Claude Code) vs "broken" (on OpenCode)
- **Hard-to-reproduce bugs:** Only happens on one platform
- **Regression introduction:** Fix for Claude Code breaks OpenCode
- **Maintenance nightmare:** 2x the testing for every change

**Prevention:**

1. **Shared test suite, platform-agnostic assertions:**
   ```javascript
   describe('new-project command', () => {
     it('creates PROJECT.md', async () => {
       await runCommand('gsd:new-project', platform);
       expect(fs.existsSync('.planning/PROJECT.md')).toBe(true);
     });

     it('spawns 4 research agents', async () => {
       const agents = await runCommand('gsd:new-project', platform);
       expect(agents.spawned.length).toBe(4);
     });
   });
   ```

2. **Feature flags for platform-specific behavior:**
   ```javascript
   if (platform.supports('parallel-agents')) {
     spawnInParallel(researchers);
   } else {
     for (const researcher of researchers) {
       await spawnSequential(researcher);
     }
   }
   ```

3. **Platform matrix in CI:**
   ```yaml
   # .github/workflows/test.yml
   strategy:
     matrix:
       platform: [claudecode, opencode]
   steps:
     - run: npm test -- --platform=${{ matrix.platform }}
   ```

4. **Changelog enforcement:**
   ```markdown
   ## [1.7.0] - 2026-01-20

   ### Added
   - Feature X [Claude Code ✓] [OpenCode ✓]

   ### Fixed
   - Bug Y [Claude Code ✓] [OpenCode: not applicable]
   ```

5. **Single source of truth for command logic:**
   ```
   commands/
     gsd/
       new-project.md          # platform-agnostic prompt
   src/
     adapters/
       claudecode-adapter.js   # only spawning/config differences
       opencode-adapter.js
     commands/
       new-project.js          # shared orchestration logic
   ```

**Detection:**

- Run same command on both platforms, compare output
- Automated diff: `.planning/PROJECT.md` should be identical regardless of platform
- Version compatibility matrix in README

**Phase mapping:** Phase 4 (Testing & Validation) — build test suite that runs on both platforms before shipping

---

## Moderate Pitfalls

Mistakes that cause delays or technical debt.

### Pitfall 7: Path Separator Hardcoding

**What goes wrong:**

Commands use Unix path separators (`/`) which break on Windows. Paths like `~/.claude/get-shit-done/templates/project.md` fail to resolve.

**Why it happens:**

- Development on Mac/Linux, testing on Mac/Linux
- Assuming POSIX paths
- Not testing on Windows (WSL2 support added in 1.6.4 suggests Windows was afterthought)

**Consequences:**

- Windows users can't install
- File references break (templates not found)
- Commands fail with ENOENT errors

**Prevention:**

1. **Use path.join() everywhere:**
   ```javascript
   // BAD
   const templatePath = configRoot + '/get-shit-done/templates/project.md';

   // GOOD
   const templatePath = path.join(configRoot, 'get-shit-done', 'templates', 'project.md');
   ```

2. **Normalize in installer:**
   ```javascript
   function expandTilde(filePath) {
     if (filePath && filePath.startsWith('~/')) {
       return path.join(os.homedir(), filePath.slice(2)); // path.join handles separators
     }
     return filePath;
   }
   ```

**Phase mapping:** Phase 1 — path handling in abstraction layer

---

### Pitfall 8: Assuming Interactive Terminal

**What goes wrong:**

Installer prompts for input but runs in CI/automated environment without TTY. Install hangs waiting for stdin.

**Why it happens:**

- Using readline without checking `process.stdin.isTTY`
- No fallback for non-interactive mode

**Consequences:**

- CI pipelines hang
- Docker builds fail
- Automated deploys broken

**Prevention:**

```javascript
// Detect non-interactive and fallback to global install
if (!process.stdin.isTTY) {
  console.log('  Non-interactive terminal detected, installing globally');
  return install(true);
}
```

**Phase mapping:** Phase 2 (Installer) — detect environment

**Real example:** GSD 1.6.4 changelog: "Installation on WSL2/non-TTY terminals now works correctly - detects non-interactive stdin and falls back to global install automatically"

---

### Pitfall 9: Orphaned Files From Previous Versions

**What goes wrong:**

Platform abstraction changes file structure. Old files remain after upgrade, causing conflicts. `gsd-notify.sh` removed in 1.6.x but not cleaned up, hook registration remains in settings.json.

**Why it happens:**

- Installer copies new files but doesn't remove old ones
- Hook registrations persist in settings.json even if file deleted
- No migration logic

**Consequences:**

- Hooks try to execute non-existent files
- Disk space waste (minor)
- Confusion about which version is active

**Prevention:**

```javascript
function cleanupOrphanedFiles(claudeDir) {
  const orphanedFiles = [
    'hooks/gsd-notify.sh',
  ];
  for (const relPath of orphanedFiles) {
    const fullPath = path.join(claudeDir, relPath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`✓ Removed orphaned ${relPath}`);
    }
  }
}
```

**Phase mapping:** Phase 2 (Installer) — add cleanup step

**Real example:** GSD 1.6.4 changelog: "Orphaned `gsd-notify.sh` hook from previous versions is now automatically removed during install (both file and settings.json registration)"

---

### Pitfall 10: Command Name Collisions

**What goes wrong:**

Claude Code uses `commands/gsd/*.md` directory structure, OpenCode uses flat `commands/*.md`. Installing on both platforms causes `/gsd:new-project` to collide with `/new-project`.

**Why it happens:**

- Different command namespacing conventions
- Installer doesn't check for existing commands
- Both platforms try to register same slash command

**Consequences:**

- Command registration fails
- Wrong command executes
- Autocomplete shows duplicates

**Prevention:**

1. **Namespace preservation:**
   ```
   Claude Code: commands/gsd/new-project.md → /gsd:new-project
   OpenCode: commands/gsd-new-project.md → /gsd-new-project (or /gsd:new-project if supported)
   ```

2. **Pre-install collision check:**
   ```javascript
   function checkCommandCollisions(platform) {
     const existingCommands = platform.listRegisteredCommands();
     const gsdCommands = ['gsd:new-project', 'gsd:plan-phase', ...];
     const collisions = gsdCommands.filter(c => existingCommands.includes(c));
     if (collisions.length > 0) {
       throw new Error(`Commands already registered: ${collisions.join(', ')}`);
     }
   }
   ```

**Phase mapping:** Phase 2 (Installer) — validate before registration

---

### Pitfall 11: Hardcoded Agent Names in Commands

**What goes wrong:**

Commands reference `~/.claude/agents/gsd-planner.md` but OpenCode expects agents in different location.

**Why it happens:**

- Agent paths hardcoded in command prompts
- No runtime resolution

**Consequences:**

- Agent spawning fails (agent file not found)
- Commands break on OpenCode

**Prevention:**

```markdown
## Spawn Planner Agent

{{AGENT_PATH "gsd-planner"}}  <!-- runtime resolution -->

Instead of:

@~/.claude/agents/gsd-planner.md  <!-- hardcoded -->
```

**Phase mapping:** Phase 2 (Agent Spawning Abstraction)

---

### Pitfall 12: Platform-Specific Tool Dependencies

**What goes wrong:**

Commands assume MCP tools available (Context7, WebSearch) but OpenCode doesn't support MCP.

**Why it happens:**

- Commands written for Claude Code ecosystem
- No tool availability detection

**Consequences:**

- Research agents fail (Context7 not available)
- Features silently degraded

**Prevention:**

```javascript
if (platform.supports('mcp-tools')) {
  await queryContext7(library);
} else {
  console.warn('[GSD] Context7 not available, falling back to WebSearch');
  await webSearch(library);
}
```

**Phase mapping:** Phase 3 (Tool Abstraction)

---

## Minor Pitfalls

Mistakes that cause annoyance but are fixable.

### Pitfall 13: Inconsistent File Naming Between Platforms

**What goes wrong:**

Claude Code creates `01-setup/` (zero-padded), OpenCode creates `1-setup/` (unpadded). Commands expect one format, fail on other.

**Why it happens:**

- Different phase directory creation logic
- No normalization

**Consequences:**

- Phase not found errors
- Manual renaming required

**Prevention:**

```javascript
function normalizePhaseDir(phase) {
  const padded = String(phase).padStart(2, '0');
  // Check both formats
  const dirs = [
    `.planning/${padded}-*`,
    `.planning/${phase}-*`
  ];
  for (const pattern of dirs) {
    const matches = glob.sync(pattern);
    if (matches.length > 0) return matches[0];
  }
  throw new Error(`Phase ${phase} directory not found`);
}
```

**Phase mapping:** Phase 4 (Validation)

**Real example:** GSD 1.5.23 changelog: "Consistent zero-padding for phase directories (01-name, not 1-name)"

---

### Pitfall 14: Platform-Specific Error Messages

**What goes wrong:**

Error says "Run settings.json check" on OpenCode (which has no settings.json).

**Why it happens:**

- Hardcoded error messages
- No platform context in errors

**Consequences:**

- User confusion
- Support burden

**Prevention:**

```javascript
throw new Error(`
  Configuration error. Check ${platform.configFile()}:
  ${platform.configFile() === 'settings.json'
    ? 'Ensure customCommandsDirectory is set'
    : 'Ensure commandsPath is configured'}
`);
```

**Phase mapping:** Phase 4 (Polish)

---

### Pitfall 15: Update Mechanism Breaks Multi-Platform

**What goes wrong:**

`/gsd:update` command assumes single installation location. User has both Claude Code and OpenCode installed, update only updates one.

**Why it happens:**

- Update script uses hardcoded path
- No multi-install detection

**Consequences:**

- Version skew between platforms
- Features work on one, broken on other

**Prevention:**

```javascript
function detectInstallations() {
  const locations = [
    path.join(os.homedir(), '.claude'),
    path.join(os.homedir(), '.config/opencode'),
  ];
  return locations.filter(loc =>
    fs.existsSync(path.join(loc, 'get-shit-done'))
  );
}

async function updateAllInstallations() {
  const installs = detectInstallations();
  console.log(`Found ${installs.length} installations`);
  for (const install of installs) {
    await updateInstallation(install);
  }
}
```

**Phase mapping:** Phase 5 (Update Mechanism)

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Platform Abstraction Layer | Hardcoded paths breaking existing .planning/ references | Use symlinks + runtime path resolution |
| Installer | Config format divergence (settings.json vs opencode.jsonc) | Platform-specific config writers with schema validation |
| Agent Spawning | Silent failures when Task tool doesn't exist on OpenCode | Adapter pattern + verification after spawn + timeouts |
| Hook System | StatusLine/SessionStart missing on OpenCode | Feature detection + graceful degradation + best-effort equivalents |
| Testing | Version drift between platform implementations | Shared test suite + platform matrix CI + feature flags |
| Command Migration | 24 commands using hardcoded agent paths | Template variables + runtime resolution |
| .planning/ Portability | Platform-specific data in state files | Store only platform-agnostic data in .planning/ |
| Update Mechanism | Updating one platform but not others | Detect all installations + update all |

---

## Confidence Assessment

| Area | Confidence | Source |
|------|------------|--------|
| Installation pitfalls | HIGH | GSD codebase analysis (install.js, changelog) + training data |
| Agent spawning issues | HIGH | GSD command analysis (new-project.md Task calls) + platform comparison in PROJECT.md |
| Hook system incompatibility | MEDIUM | GSD hooks/ directory + PROJECT.md platform comparison (20+ OpenCode events) |
| Configuration divergence | HIGH | GSD installer settings.json manipulation + OpenCode docs mention of opencode.jsonc |
| Version drift patterns | HIGH | Standard multi-platform development patterns from training |
| Path handling issues | HIGH | GSD changelog (WSL2 fix in 1.6.4) + installer path expansion logic |

---

## Research Limitations

**What I couldn't verify:**

1. OpenCode's exact API for agent spawning (need actual OpenCode documentation)
2. OpenCode's plugin event system details (PROJECT.md mentions "20+ events" but doesn't enumerate)
3. Whether OpenCode supports MCP tools (affects research agent functionality)
4. OpenCode command registration mechanism (flat vs directory structure confirmed but not registration API)

**Recommended phase-specific research:**

- **Phase 1-2:** Deep dive into OpenCode agent spawning API (test if YAML `subtask: true` actually works)
- **Phase 3:** Map OpenCode plugin events to Claude Code hooks (which events exist, what data available)
- **Phase 4:** Test full 24-command workflow on OpenCode (find platform-specific bugs early)

**Low confidence claims flagged for validation:**

- OpenCode plugin event system has 20+ events (from PROJECT.md, not verified)
- OpenCode uses YAML `agent: name` + `subtask: true` syntax (from PROJECT.md comparison table, not verified with official docs)
- OpenCode config file is opencode.jsonc (inferred from pattern, not confirmed)

---

## Sources

**GSD Codebase Analysis:**
- `/Users/juliano.farias/code/github/get-shit-done/bin/install.js` (installation logic, path handling, settings.json manipulation)
- `/Users/juliano.farias/code/github/get-shit-done/hooks/statusline.js` (Claude Code hook implementation)
- `/Users/juliano.farias/code/github/get-shit-done/commands/gsd/new-project.md` (agent spawning via Task tool)
- `/Users/juliano.farias/code/github/get-shit-done/CHANGELOG.md` (historical issues: WSL2, orphaned files, path bugs)
- `/Users/juliano.farias/code/github/get-shit-done/.planning/PROJECT.md` (platform comparison table, integration points)

**Pattern Recognition (Training Data):**
- Multi-platform CLI tool development patterns (path handling, config management)
- Extension system architecture (VSCode, Sublime Text, IDE plugins)
- Backward compatibility strategies (migration paths, symlink usage)
- Cross-platform Node.js development (path.join, os.homedir, TTY detection)
