# Coding Conventions

**Analysis Date:** 2026-01-19

## Naming Patterns

**Files:**
- Markdown files: kebab-case (`execute-phase.md`, `new-project.md`, `gsd-executor.md`)
- JavaScript files: kebab-case (`install.js`, `statusline.js`, `gsd-check-update.js`)
- JSON files: kebab-case or plain (`config.json`, `package.json`, `agent-history.json`)

**Commands:**
- Slash commands: `gsd:kebab-case` (`gsd:execute-phase`, `gsd:new-project`)

**Functions:**
- camelCase for JavaScript functions (`expandTilde`, `readSettings`, `writeSettings`, `copyWithPathReplacement`)

**Variables:**
- Bash: CAPS_UNDERSCORES (`PHASE_ARG`, `PLAN_START_TIME`, `CODE_FILES`, `PLAN_COUNT`)
- JavaScript: camelCase (`settingsPath`, `claudeDir`, `configDir`, `hasExisting`)

**XML Tags:**
- kebab-case (`<execution_context>`, `<project_context>`, `<planning_context>`)
- Compound attributes: colon separator (`type="checkpoint:human-verify"`, `gate="blocking"`)

**Step Names:**
- snake_case in `name` attribute (`name="load_project_state"`, `name="execute_tasks"`)

## Code Style

**Formatting:**
- No ESLint or Prettier config detected
- JavaScript: Standard Node.js conventions
- Indentation: 2 spaces (visible in JavaScript files)
- String quotes: Single quotes for JavaScript

**Linting:**
- Not detected

**Markdown:**
- Structured with XML tags for semantic sections
- Code blocks use triple backticks with language hints
- YAML frontmatter for metadata in command and agent files

## Import Organization

**JavaScript:**
```javascript
// Node.js built-ins first
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const { execSync, spawn } = require('child_process');

// Local imports
const pkg = require('../package.json');
```

**Order:**
1. Node.js built-in modules
2. External dependencies (none in core files)
3. Local project files

**Path Aliases:**
- Not used (relative paths only)
- Tilde expansion for home directory in file paths (`~/.claude/`)

## Error Handling

**Patterns:**
- Try-catch for file operations and JSON parsing
- Silent failures in non-critical code (statusline, hooks)
- Explicit error messages with exit codes in critical paths

**Examples:**
```javascript
// Silent failure for optional features
try {
  const todos = JSON.parse(fs.readFileSync(path.join(todosDir, files[0].name), 'utf8'));
  const inProgress = todos.find(t => t.status === 'in_progress');
  if (inProgress) task = inProgress.activeForm || '';
} catch (e) {}

// Explicit error for required operations
if (!nextArg || nextArg.startsWith('-')) {
  console.error(`  ${yellow}--config-dir requires a path argument${reset}`);
  process.exit(1);
}
```

**Bash:**
- Check exit codes explicitly
- Error messages to stderr
- Bash conditionals for file existence checks

## Logging

**Framework:** console (JavaScript), echo (Bash)

**Patterns:**
```javascript
// ANSI color codes for visual hierarchy
const cyan = '\x1b[36m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const dim = '\x1b[2m';
const reset = '\x1b[0m';

// Structured output with colors
console.log(`  ${green}✓${reset} Installed commands/gsd`);
console.error(`  ${yellow}✗${reset} Failed to install ${description}`);
```

**When to Log:**
- Installation progress (checkmarks for success)
- User-facing errors (with color coding)
- Hook output suppressed (detached processes, silent failures)

## Comments

**When to Comment:**
- File-level purpose comments in hooks (`#!/usr/bin/env node` followed by description)
- Inline explanations for non-obvious logic
- Section headers for major code blocks

**JSDoc/TSDoc:**
- Not used
- Inline comments with `/** */` or `//` for function documentation

**Examples:**
```javascript
/**
 * Expand ~ to home directory (shell doesn't expand in env vars passed to node)
 */
function expandTilde(filePath) { ... }

/**
 * Clean up orphaned files from previous GSD versions
 */
function cleanupOrphanedFiles(claudeDir) { ... }
```

## Markdown Structure

**XML Tags:**
- Semantic containers only (not `<section>`, `<item>`, `<content>`)
- Purpose-driven tags: `<objective>`, `<process>`, `<step>`, `<task>`, `<context>`
- Self-closing tags avoided (always use paired tags)

**Markdown Inside XML:**
- Use markdown headers inside XML blocks
- Code blocks with language hints
- Lists for structured content

**Frontmatter:**
```yaml
---
name: gsd:command-name
description: One-line description
allowed-tools: [Read, Write, Bash]
---
```

**Template Placeholders:**
- Square brackets: `[Project Name]`, `[Description]`
- Curly braces for patterns: `{phase}-{plan}-PLAN.md`

## Function Design

**Size:** Functions are focused, typically 20-50 lines

**Parameters:**
- Minimal parameters (rely on closure for shared state)
- Options objects for complex configuration

**Return Values:**
- Objects for multiple values (`{ settingsPath, settings, statuslineCommand }`)
- Void for side-effect functions (file writers)
- Boolean for validation functions

## Module Design

**Exports:**
- Not used (single-file scripts)
- All functions defined in same file

**Barrel Files:**
- Not used

## File Headers

**Shebang for executables:**
```javascript
#!/usr/bin/env node
```

**Purpose comments:**
```javascript
// Claude Code Statusline - GSD Edition
// Shows: model | current task | directory | context usage
```

## Anti-Patterns (Explicitly Avoided)

**Temporal Language:**
- Banned in implementation docs (not CHANGELOG)
- Describe current state only ("Use X pattern" not "We changed to X")

**Enterprise Patterns:**
- No story points, sprint ceremonies, RACI matrices
- No human dev time estimates
- No team coordination artifacts

**Generic XML:**
- Banned: `<section>`, `<item>`, `<content>`
- Use: `<objective>`, `<verification>`, `<action>`

**Sycophancy:**
- No "Great!", "Awesome!", "Excellent!"
- Factual statements only

**Filler Words:**
- Absent: "Let me", "Just", "Simply", "Basically"
- Present: Direct instructions

## Commit Conventions

**Format:**
```
{type}({scope}): {description}
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `test`: Tests only (TDD RED)
- `refactor`: Code cleanup (TDD REFACTOR)
- `docs`: Documentation/metadata
- `chore`: Config/dependencies

**Examples:**
```
docs: initialize project
chore: add project config
docs: define v1 requirements
feat(01-01): implement login endpoint
```

**Rules:**
- One commit per task during execution
- Atomic commits (git history as context source)
- Include Co-Authored-By line for AI collaboration
- Use HEREDOC for multi-line messages

---

*Convention analysis: 2026-01-19*
