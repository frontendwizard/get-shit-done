# Codebase Concerns

**Analysis Date:** 2026-01-19

## Tech Debt

**Large install.js monolith:**
- Issue: Single 569-line installation script handles all installation logic, path replacement, cleanup, verification, and settings management
- Files: `bin/install.js`
- Impact: Difficult to test individual installation steps, hard to debug when specific parts fail, fragile when adding new installation features
- Fix approach: Extract modules for path replacement, verification, settings management, and cleanup into separate files with unit tests

**No automated testing:**
- Issue: Zero test files detected across entire codebase (no `.test.*`, `.spec.*`, or `test/` directories)
- Files: Entire codebase
- Impact: Changes to installer, hooks, or core workflows carry high regression risk, refactoring requires extensive manual testing
- Fix approach: Add integration tests for installer, unit tests for hook scripts, validation tests for markdown template structure

**Manual version management:**
- Issue: Version number exists in `package.json` but must be manually synced to VERSION file during installation, CHANGELOG.md updates are manual
- Files: `package.json`, `bin/install.js` (lines 343-344), `CHANGELOG.md`
- Impact: Version drift between package and installed VERSION file, easy to forget CHANGELOG updates during releases
- Fix approach: Add pre-publish npm script to auto-generate VERSION file, consider conventional commits for automated CHANGELOG generation

**Orphaned file cleanup requires manual tracking:**
- Issue: Each deprecated file must be manually added to orphanedFiles array in installer
- Files: `bin/install.js` (lines 158-169)
- Impact: Easy to forget adding files to cleanup list, old files accumulate in user installations
- Fix approach: Consider manifest-based approach where installer compares installed files against current package manifest

## Known Bugs

**Non-TTY installation fixed but edge cases remain:**
- Symptoms: Installation on WSL2/non-TTY terminals previously failed, fix added in v1.6.4
- Files: `bin/install.js`
- Trigger: Running installer in Docker, CI pipelines, or piped contexts
- Workaround: Fixed in current version, but stdin detection logic may have edge cases in exotic terminal environments

**Statusline silent failure on parse errors:**
- Symptoms: Statusline hook swallows all errors silently (line 82-83 in `hooks/statusline.js`)
- Files: `hooks/statusline.js`
- Trigger: Malformed JSON from Claude Code stdin, corrupt cache files, permission errors reading todos
- Workaround: None - failures are invisible to user, statusline simply doesn't appear

**Update check network timeout:**
- Symptoms: Background update check has 10s timeout but runs detached, failures invisible
- Files: `hooks/gsd-check-update.js` (line 35)
- Trigger: Slow network, npm registry down, firewall blocking npm access
- Workaround: Cache file not written on failure, update indicator never appears but doesn't break workflow

## Security Considerations

**Path injection risk in installer:**
- Risk: Installer uses `expandTilde()` and environment variables for paths without sanitization
- Files: `bin/install.js` (lines 96-101, 250)
- Current mitigation: Only processes user-provided `--config-dir` arg and `CLAUDE_CONFIG_DIR` env var
- Recommendations: Add path validation to prevent directory traversal attacks, validate paths are within expected directories before writing files

**Arbitrary command execution in hooks:**
- Risk: Hook scripts execute with user permissions, statusline reads arbitrary JSON from stdin
- Files: `hooks/statusline.js`, `hooks/gsd-check-update.js`
- Current mitigation: Hooks only read from trusted Claude Code stdin and local cache files
- Recommendations: Add JSON schema validation for stdin data, verify cache file integrity before parsing

**No checksum verification for installed files:**
- Risk: Installer copies files without verifying integrity post-install
- Files: `bin/install.js` (copyWithPathReplacement function, lines 128-152)
- Current mitigation: Basic existence checks via `verifyInstalled()` and `verifyFileInstalled()`
- Recommendations: Add content hash verification to ensure files copied correctly, detect corruption or tampering

## Performance Bottlenecks

**Synchronous file operations in installer:**
- Problem: Installer uses synchronous fs operations for all file copying, can block on large directory trees
- Files: `bin/install.js` (lines 128-152, 278-327)
- Cause: `fs.readFileSync`, `fs.writeFileSync`, `fs.copyFileSync` called repeatedly in loops
- Improvement path: Use async/await with fs.promises for parallel file operations, significantly faster on large installs

**Statusline reads filesystem on every render:**
- Problem: Statusline hook reads todos directory and cache file on every statusline update (potentially many times per second)
- Files: `hooks/statusline.js` (lines 44-72)
- Cause: No caching layer, filesystem I/O on every stdin event
- Improvement path: Add in-memory cache with TTL, only refresh todos/cache every 5-10 seconds

**Background update check spawns node process every session:**
- Problem: Each Claude Code session spawns detached Node.js process to check npm for updates
- Files: `hooks/gsd-check-update.js` (lines 21-51)
- Cause: SessionStart hook runs full update check with execSync npm call
- Improvement path: Check cache file age first, only spawn process if cache is older than 6-12 hours

## Fragile Areas

**Settings.json hook management:**
- Files: `bin/install.js` (lines 346-450)
- Why fragile: Reads, modifies, and writes user's settings.json with complex hook registration logic, must preserve existing hooks while cleaning orphaned ones
- Safe modification: Always backup settings.json before modifying, test on fresh install and upgrade scenarios, verify JSON structure remains valid
- Test coverage: None - high risk area with no automated testing

**Path replacement in markdown files:**
- Files: `bin/install.js` (lines 143-147)
- Why fragile: Regex replacement of `~/.claude/` paths in all .md files, breaks if path appears in code blocks or examples where it should be literal
- Safe modification: Use more targeted replacement (only in specific template sections), add markers in source files for replacement boundaries
- Test coverage: None - could silently corrupt documentation

**Orphaned hook cleanup logic:**
- Files: `bin/install.js` (lines 174-210)
- Why fragile: Iterates nested settings.json structure, filters arrays based on pattern matching, easy to accidentally remove user's custom hooks
- Safe modification: Add dry-run mode, log all hooks being removed, be very specific with pattern matching (full hook command, not substring)
- Test coverage: None - requires manual testing against various settings.json configurations

## Scaling Limits

**Markdown-based system has no size limits:**
- Current capacity: Works fine for current use (dozens of commands, ~12 agents)
- Limit: If GSD grows to hundreds of commands or massive template files, file I/O and path replacement could become slow
- Scaling path: Consider lazy-loading commands, compress/minify templates, cache parsed markdown in memory

**No cleanup of old .planning directories:**
- Current capacity: Each project creates `.planning/` with codebase docs, phases, todos, debug sessions
- Limit: Long-running projects accumulate hundreds of phase directories, thousands of files
- Scaling path: Add archive command to move completed phases to compressed archive, prune resolved debug sessions older than N days

## Dependencies at Risk

**Node.js version requirement (>=16.7.0):**
- Risk: Relatively old minimum version, but no upper bound specified
- Impact: Could break on future Node.js versions with breaking changes
- Migration plan: Test on Node.js LTS versions regularly, consider adding upper bound or testing matrix

**No dependency pinning:**
- Risk: Package has zero runtime dependencies (good), but npm/npx version could affect installation
- Impact: New npx behavior could break installation flow
- Migration plan: Monitor npm breaking changes, consider shipping as standalone executable

**Relies on Claude Code stdin/hook system:**
- Risk: Undocumented Claude Code internal API for hooks and stdin JSON format
- Impact: Claude Code updates could break statusline or hook system
- Migration plan: Monitor Claude Code releases, maintain compatibility layer, add fallback for graceful degradation

## Missing Critical Features

**No rollback mechanism:**
- Problem: Installer wipes existing GSD folders on install (lines 130-132 in install.js)
- Blocks: Safe experimentation with pre-release versions, recovery from bad updates
- Priority: High - users report installer replaced everything with no backup

**No installation verification tests:**
- Problem: Installer verifies directories/files exist but not that they're functional
- Blocks: Detection of broken installations, corrupt file copies, permission issues
- Priority: Medium - silent failures possible

**No migration system for breaking changes:**
- Problem: CHANGELOG documents breaking changes but no automated migration
- Blocks: Smooth upgrades when commands removed/renamed (v1.6.0 removed 4 commands)
- Priority: Medium - users must manually discover removed commands

## Test Coverage Gaps

**Installer script untested:**
- What's not tested: Path replacement, orphaned file cleanup, settings.json manipulation, verification logic
- Files: `bin/install.js` (all 569 lines)
- Risk: Breaking changes ship to production, silent corruption of user settings
- Priority: High

**Hook scripts untested:**
- What's not tested: Statusline rendering, update checking, cache file handling, error paths
- Files: `hooks/statusline.js`, `hooks/gsd-check-update.js`
- Risk: Hooks fail silently, updates not detected, statusline shows wrong info
- Priority: Medium

**Template structure unvalidated:**
- What's not tested: Markdown templates have required sections, placeholders are valid, cross-references between templates resolve
- Files: All files in `get-shit-done/templates/`, `agents/*.md`, `commands/gsd/*.md`
- Risk: Templates with typos or broken structure cause agent failures at runtime
- Priority: Medium - caught during usage but could validate earlier

---

*Concerns audit: 2026-01-19*
