# Quick Task 002 Summary

**Task:** Unify OpenCode command naming from `/gsd-*` to `/gsd:*`
**Date:** 2026-01-22
**Duration:** ~15 min

## What Was Done

Implemented OpenCode command registration with `gsd:` prefix to match Claude Code's naming convention.

### Problem

- Claude Code uses `/gsd:help` syntax
- OpenCode was using `/gsd-help` (hyphen) because colons in filenames cause Windows issues
- Inconsistent UX between platforms

### Solution

OpenCode supports registering commands in its JSON config file, not just as `.md` files. The installer now:

1. Copies `.md` files to `~/.config/opencode/command/gsd-*.md` (as reference)
2. Reads each `.md` file and extracts description + template
3. Registers commands in OpenCode config with `gsd:` prefix keys
4. OpenCode uses config-registered commands, enabling `/gsd:help` syntax

### Changes Made

**`bin/install.js`** (+130 lines)
- Added `readOpenCodeConfig()` — finds and parses OpenCode config (supports `opencode.json`, `opencode.jsonc`, `config.json`)
- Added `registerOpenCodeCommands()` — writes commands to config with `gsd:` prefix
- Modified `copyCommandsForOpenCode()` — returns command list for registration
- Updated install flow to call registration after copying files
- Cleans up old `gsd:` and `gsd-` entries before adding new ones

**`src/platform/adapters/opencode.ts`** (+13 lines)
- Updated `readConfig()` to check multiple config file names for backwards compatibility

### Testing

```bash
$ node bin/install.js --global --platform=opencode
# Output: ✓ Registered 27 commands in config.json (as /gsd:*)

$ grep -c '"gsd:' ~/.config/opencode/config.json
27
```

All 136 unit tests pass.

## Commits

| Hash | Message |
|------|---------|
| 72fbd53 | feat(opencode): register commands with gsd: prefix in config |

## Files Modified

- `bin/install.js` — Added command registration functions (+130 lines)
- `src/platform/adapters/opencode.ts` — Multi-config file support (+13 lines)

## Verification

- [x] Commands register with `gsd:` prefix in OpenCode config
- [x] 27 commands registered successfully
- [x] All 136 tests pass
- [x] Docs already use `/gsd:` syntax (no updates needed)
- [x] Backwards compatible with existing config file names
