#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const { getInstallPaths } = require('../dist/platform/install-adapter');
const { ClaudeCodeAdapter, OpenCodeAdapter } = require('../dist/platform');

// Dynamic import for ESM module (checkbox is ESM-only)
let checkbox;
async function loadCheckbox() {
  if (!checkbox) {
    const module = await import('@inquirer/checkbox');
    checkbox = module.default;
  }
  return checkbox;
}

// Colors
const cyan = '\x1b[36m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const dim = '\x1b[2m';
const reset = '\x1b[0m';

// Get version from package.json
const pkg = require('../package.json');

const banner = `
${cyan}   ██████╗ ███████╗██████╗
  ██╔════╝ ██╔════╝██╔══██╗
  ██║  ███╗███████╗██║  ██║
  ██║   ██║╚════██║██║  ██║
  ╚██████╔╝███████║██████╔╝
   ╚═════╝ ╚══════╝╚═════╝${reset}

  Get Shit Done ${dim}v${pkg.version}${reset}
  A meta-prompting, context engineering and spec-driven
  development system for Claude Code by TÂCHES.
`;

// Parse args
const args = process.argv.slice(2);
const hasGlobal = args.includes('--global') || args.includes('-g');
const hasLocal = args.includes('--local') || args.includes('-l');

// Parse --config-dir argument
function parseConfigDirArg() {
  const configDirIndex = args.findIndex(arg => arg === '--config-dir' || arg === '-c');
  if (configDirIndex !== -1) {
    const nextArg = args[configDirIndex + 1];
    // Error if --config-dir is provided without a value or next arg is another flag
    if (!nextArg || nextArg.startsWith('-')) {
      console.error(`  ${yellow}--config-dir requires a path argument${reset}`);
      process.exit(1);
    }
    return nextArg;
  }
  // Also handle --config-dir=value format
  const configDirArg = args.find(arg => arg.startsWith('--config-dir=') || arg.startsWith('-c='));
  if (configDirArg) {
    const value = configDirArg.split('=')[1];
    if (!value) {
      console.error(`  ${yellow}--config-dir requires a non-empty path${reset}`);
      process.exit(1);
    }
    return value;
  }
  return null;
}
const explicitConfigDir = parseConfigDirArg();

// Parse --platform argument
function parsePlatformArg() {
  const platformIndex = args.findIndex(arg => arg === '--platform' || arg === '-p');
  if (platformIndex !== -1) {
    const nextArg = args[platformIndex + 1];
    if (!nextArg || nextArg.startsWith('-')) {
      console.error(`  ${yellow}--platform requires a value (claude-code, opencode, or both)${reset}`);
      process.exit(1);
    }
    return nextArg;
  }
  const platformArg = args.find(arg => arg.startsWith('--platform=') || arg.startsWith('-p='));
  if (platformArg) {
    return platformArg.split('=')[1];
  }
  return null;
}
const explicitPlatform = parsePlatformArg();

const hasHelp = args.includes('--help') || args.includes('-h');
const forceStatusline = args.includes('--force-statusline');

console.log(banner);

// Show help if requested
if (hasHelp) {
  console.log(`  ${yellow}Usage:${reset} npx get-shit-done-cc [options]

  ${yellow}Options:${reset}
    ${cyan}-g, --global${reset}              Install globally (to Claude config directory)
    ${cyan}-l, --local${reset}               Install locally (to ./.claude in current directory)
    ${cyan}-c, --config-dir <path>${reset}   Specify custom Claude config directory
    ${cyan}-p, --platform <value>${reset}    Platform to install for (claude-code, opencode, or both)
    ${cyan}-h, --help${reset}                Show this help message
    ${cyan}--force-statusline${reset}        Replace existing statusline config

  ${yellow}Examples:${reset}
    ${dim}# Install to default ~/.claude directory${reset}
    npx get-shit-done-cc --global

    ${dim}# Install to custom config directory (for multiple Claude accounts)${reset}
    npx get-shit-done-cc --global --config-dir ~/.claude-bc

    ${dim}# Using environment variable${reset}
    CLAUDE_CONFIG_DIR=~/.claude-bc npx get-shit-done-cc --global

    ${dim}# Install to current project only${reset}
    npx get-shit-done-cc --local

    ${dim}# Install for both platforms${reset}
    npx get-shit-done-cc --global --platform=both

  ${yellow}Notes:${reset}
    The --config-dir option is useful when you have multiple Claude Code
    configurations (e.g., for different subscriptions). It takes priority
    over the CLAUDE_CONFIG_DIR environment variable.
`);
  process.exit(0);
}

/**
 * Expand ~ to home directory (shell doesn't expand in env vars passed to node)
 */
function expandTilde(filePath) {
  if (filePath && filePath.startsWith('~/')) {
    return path.join(os.homedir(), filePath.slice(2));
  }
  return filePath;
}

/**
 * Build a hook command path using forward slashes for cross-platform compatibility.
 * On Windows, $HOME is not expanded by cmd.exe/PowerShell, so we use the actual path.
 */
function buildHookCommand(claudeDir, hookName) {
  // Use forward slashes for Node.js compatibility on all platforms
  const hooksPath = claudeDir.replace(/\\/g, '/') + '/hooks/' + hookName;
  return `node "${hooksPath}"`;
}

/**
 * Prompt for platform selection (multi-select checkbox)
 * Returns array of platforms: ['claude-code'] or ['opencode'] or ['claude-code', 'opencode']
 */
async function promptPlatformSelection() {
  // Non-interactive: use flag or default
  if (!process.stdin.isTTY) {
    if (explicitPlatform === 'both') {
      console.log(`  ${yellow}Installing for both platforms (--platform=both)${reset}\n`);
      return ['claude-code', 'opencode'];
    } else if (explicitPlatform === 'opencode') {
      console.log(`  ${yellow}Installing for OpenCode (--platform=opencode)${reset}\n`);
      return ['opencode'];
    } else {
      console.log(`  ${yellow}Non-interactive mode, defaulting to Claude Code${reset}`);
      console.log(`  ${dim}Use --platform=opencode or --platform=both to override${reset}\n`);
      return ['claude-code'];
    }
  }

  // Explicit flag provided in interactive mode
  if (explicitPlatform) {
    if (explicitPlatform === 'both') {
      return ['claude-code', 'opencode'];
    } else if (explicitPlatform === 'opencode') {
      return ['opencode'];
    } else if (explicitPlatform === 'claude-code') {
      return ['claude-code'];
    } else {
      console.error(`  ${yellow}Invalid --platform value: ${explicitPlatform}${reset}`);
      console.error(`  ${dim}Valid values: claude-code, opencode, both${reset}\n`);
      process.exit(1);
    }
  }

  // Interactive: show checkbox UI
  const cb = await loadCheckbox();
  console.log(`  ${yellow}Which platform(s) would you like to install for?${reset}\n`);

  const platforms = await cb({
    message: 'Select platform(s):',
    choices: [
      { name: 'Claude Code', value: 'claude-code', checked: false },
      { name: 'OpenCode', value: 'opencode', checked: false }
    ],
    required: true,
    instructions: '(Press space to select, enter to confirm)'
  });

  console.log(''); // Blank line after selection
  return platforms;
}

/**
 * Check if hooks are enabled in config
 *
 * Users can disable hooks by setting:
 *   { "gsd": { "hooks": { "enabled": false } } }
 *
 * Default: true (hooks enabled if not specified)
 */
function areHooksEnabled(settings) {
  // Default to enabled if not specified
  if (!settings.gsd || !settings.gsd.hooks) {
    return true;
  }
  // Explicitly false disables hooks
  return settings.gsd.hooks.enabled !== false;
}

/**
 * Read and parse settings.json, returning empty object if doesn't exist
 */
function readSettings(settingsPath) {
  if (fs.existsSync(settingsPath)) {
    try {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch (e) {
      return {};
    }
  }
  return {};
}

/**
 * Write settings.json with proper formatting
 */
function writeSettings(settingsPath, settings) {
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
}

/**
 * Create backup of settings.json before modification
 * Backup is overwritten on each install (single recovery point)
 */
function backupSettings(settingsPath) {
  if (fs.existsSync(settingsPath)) {
    const backupPath = settingsPath + '.backup';
    fs.copyFileSync(settingsPath, backupPath);
    return backupPath;
  }
  return null;
}

/**
 * Create backup of config file before modification
 * Uses platform-specific backup filename
 */
function backupConfigFile(configPath, platform) {
  if (fs.existsSync(configPath)) {
    const backupPath = configPath + '.backup';
    fs.copyFileSync(configPath, backupPath);
    return backupPath;
  }
  return null;
}

/**
 * Recursively copy directory, replacing paths in .md files
 * Deletes existing destDir first to remove orphaned files from previous versions
 */
function copyWithPathReplacement(srcDir, destDir, pathPrefix) {
  // Clean install: remove existing destination to prevent orphaned files
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true });
  }
  fs.mkdirSync(destDir, { recursive: true });

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      copyWithPathReplacement(srcPath, destPath, pathPrefix);
    } else if (entry.name.endsWith('.md')) {
      // Replace ~/.claude/ with the appropriate prefix in markdown files
      let content = fs.readFileSync(srcPath, 'utf8');
      content = content.replace(/~\/\.claude\//g, pathPrefix);
      fs.writeFileSync(destPath, content);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Copy commands for OpenCode platform
 * 
 * Copies commands as flat files with gsd- prefix:
 * - commands/gsd/help.md -> command/gsd-help.md
 * - commands/gsd/plan-phase.md -> command/gsd-plan-phase.md
 * 
 * OpenCode command names derive from filename:
 * - command/gsd-help.md becomes /gsd-help
 * 
 * Also transforms frontmatter to remove Claude Code-specific fields.
 * Clears existing gsd-*.md files and gsd/ directory before copying.
 */
function copyCommandsForOpenCode(srcDir, destDir, pathPrefix) {
  // Clean install: remove existing gsd-*.md files
  if (fs.existsSync(destDir)) {
    for (const file of fs.readdirSync(destDir)) {
      if (file.startsWith('gsd-') && file.endsWith('.md')) {
        fs.unlinkSync(path.join(destDir, file));
      }
    }
  }
  
  // Also clean up old gsd/ subdirectory from previous versions
  const gsdSubDir = path.join(destDir, 'gsd');
  if (fs.existsSync(gsdSubDir)) {
    fs.rmSync(gsdSubDir, { recursive: true });
  }
  
  fs.mkdirSync(destDir, { recursive: true });

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  let commandCount = 0;

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.md')) {
      const srcPath = path.join(srcDir, entry.name);
      // Prefix filename with gsd- (help.md -> gsd-help.md)
      const destPath = path.join(destDir, `gsd-${entry.name}`);

      let content = fs.readFileSync(srcPath, 'utf8');
      // Replace path references
      content = content.replace(/~\/\.claude\//g, pathPrefix);
      // Transform frontmatter for OpenCode
      content = transformCommandForOpenCode(content);

      fs.writeFileSync(destPath, content);
      commandCount++;
    }
  }
  
  return commandCount;
}

/**
 * Clean up orphaned files from previous GSD versions
 * Platform-specific cleanup
 */
function cleanupOrphanedFiles(claudeDir, platform) {
  const orphanedFiles = platform === 'claude-code'
    ? [
        'hooks/gsd-notify.sh',  // Removed in v1.6.x
        'hooks/statusline.js',  // Renamed to gsd-statusline.js in v1.9.0
      ]
    : [];  // OpenCode orphan files handled below

  for (const relPath of orphanedFiles) {
    const fullPath = path.join(claudeDir, relPath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`  ${green}✓${reset} Removed orphaned ${relPath}`);
    }
  }

  // OpenCode-specific: remove old gsd/ subdirectory from previous versions
  // (commands now use flat gsd-*.md files for simplicity)
  if (platform === 'opencode') {
    const commandDir = path.join(claudeDir, 'command');
    if (fs.existsSync(commandDir)) {
      // Remove gsd/ subdirectory if it exists
      const gsdSubDir = path.join(commandDir, 'gsd');
      if (fs.existsSync(gsdSubDir)) {
        fs.rmSync(gsdSubDir, { recursive: true });
        console.log(`  ${green}✓${reset} Removed orphaned command/gsd/ directory`);
      }
    }
    
    // Also clean up gsd commands from config.json (from previous versions that hardcoded them)
    cleanupOpenCodeConfigCommands(claudeDir);
  }
}

/**
 * Remove GSD commands from OpenCode config.json
 * Previous versions registered commands in config - now we use directory namespacing
 */
function cleanupOpenCodeConfigCommands(configDir) {
  const { parse } = require('jsonc-parser');
  
  // Check for config files
  const candidates = [
    path.join(configDir, 'opencode.json'),
    path.join(configDir, 'opencode.jsonc'),
    path.join(configDir, 'config.json'),
  ];
  
  for (const configPath of candidates) {
    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, 'utf8');
        const config = parse(content);
        
        if (config.command) {
          let cleaned = false;
          for (const key of Object.keys(config.command)) {
            if (key.startsWith('gsd:') || key.startsWith('gsd-')) {
              delete config.command[key];
              cleaned = true;
            }
          }
          
          if (cleaned) {
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
            console.log(`  ${green}✓${reset} Removed gsd commands from ${path.basename(configPath)}`);
          }
        }
        return; // Only process first found config
      } catch (e) {
        // If parsing fails, continue to next candidate
      }
    }
  }
}

/**
 * Clean up orphaned hook registrations from settings.json
 */
function cleanupOrphanedHooks(settings) {
  const orphanedHookPatterns = [
    'gsd-notify.sh',  // Removed in v1.6.x
    'hooks/statusline.js',  // Renamed to gsd-statusline.js in v1.9.0
    'gsd-intel-index.js',  // Removed in v1.9.2
    'gsd-intel-session.js',  // Removed in v1.9.2
    'gsd-intel-prune.js',  // Removed in v1.9.2
  ];

  let cleaned = false;

  // Check all hook event types (Stop, SessionStart, etc.)
  if (settings.hooks) {
    for (const eventType of Object.keys(settings.hooks)) {
      const hookEntries = settings.hooks[eventType];
      if (Array.isArray(hookEntries)) {
        // Filter out entries that contain orphaned hooks
        const filtered = hookEntries.filter(entry => {
          if (entry.hooks && Array.isArray(entry.hooks)) {
            // Check if any hook in this entry matches orphaned patterns
            const hasOrphaned = entry.hooks.some(h =>
              h.command && orphanedHookPatterns.some(pattern => h.command.includes(pattern))
            );
            if (hasOrphaned) {
              cleaned = true;
              return false;  // Remove this entry
            }
          }
          return true;  // Keep this entry
        });
        settings.hooks[eventType] = filtered;
      }
    }
  }

  if (cleaned) {
    console.log(`  ${green}✓${reset} Removed orphaned hook registrations`);
  }

  return settings;
}

/**
 * Transform Claude Code agent frontmatter to OpenCode format
 * 
 * Claude Code format:
 *   ---
 *   name: gsd-executor
 *   description: ...
 *   tools: Read, Write, Edit, Bash
 *   color: yellow
 *   ---
 * 
 * OpenCode format:
 *   ---
 *   description: ...
 *   mode: subagent
 *   tools:
 *     read: true
 *     write: true
 *     edit: true
 *     bash: true
 *   ---
 */
function transformAgentForOpenCode(content) {
  // Match the frontmatter block
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return content; // No frontmatter, return as-is
  }

  const frontmatter = frontmatterMatch[1];
  const body = content.slice(frontmatterMatch[0].length);

  // Parse frontmatter fields
  const descMatch = frontmatter.match(/^description:\s*(.+)$/m);
  const toolsMatch = frontmatter.match(/^tools:\s*(.+)$/m);

  if (!descMatch) {
    return content; // No description, return as-is
  }

  const description = descMatch[1].trim();
  
  // Parse tools string (e.g., "Read, Write, Edit, Bash, Grep, Glob")
  const toolsObj = {};
  if (toolsMatch) {
    const toolsList = toolsMatch[1].split(',').map(t => t.trim().toLowerCase());
    // Map tool names (some need normalization)
    const toolMapping = {
      'read': 'read',
      'write': 'write',
      'edit': 'edit',
      'bash': 'bash',
      'grep': 'grep',
      'glob': 'glob',
      'webfetch': 'webfetch',
      'websearch': 'webfetch', // WebSearch maps to webfetch in OpenCode
    };
    
    for (const tool of toolsList) {
      // Handle MCP tool wildcards (e.g., mcp__context7__*)
      if (tool.startsWith('mcp_')) {
        continue; // Skip MCP tools for now
      }
      const mappedTool = toolMapping[tool];
      if (mappedTool) {
        toolsObj[mappedTool] = true;
      }
    }
  }

  // Build new frontmatter in OpenCode format
  let newFrontmatter = `---
description: ${description}
mode: subagent`;

  // Add tools if any
  if (Object.keys(toolsObj).length > 0) {
    newFrontmatter += '\ntools:';
    for (const [tool, enabled] of Object.entries(toolsObj)) {
      newFrontmatter += `\n  ${tool}: ${enabled}`;
    }
  }

  newFrontmatter += '\n---';

  return newFrontmatter + body;
}

/**
 * Transform Claude Code command frontmatter to OpenCode format
 * 
 * Claude Code format:
 *   ---
 *   name: gsd:help
 *   description: Show available GSD commands
 *   argument-hint: <phase>
 *   allowed-tools:
 *     - Read
 *     - Write
 *   ---
 * 
 * OpenCode format (only keeps valid fields):
 *   ---
 *   description: Show available GSD commands
 *   ---
 * 
 * OpenCode derives command name from filepath, doesn't use argument-hint or allowed-tools
 */
function transformCommandForOpenCode(content) {
  // Match the frontmatter block
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return content; // No frontmatter, return as-is
  }

  const frontmatter = frontmatterMatch[1];
  const body = content.slice(frontmatterMatch[0].length);

  // Parse only the fields OpenCode recognizes
  const descMatch = frontmatter.match(/^description:\s*(.+)$/m);
  const agentMatch = frontmatter.match(/^agent:\s*(.+)$/m);
  const modelMatch = frontmatter.match(/^model:\s*(.+)$/m);
  const subtaskMatch = frontmatter.match(/^subtask:\s*(.+)$/m);

  // Helper to quote YAML values containing colons (prevents OpenCode's preprocessor
  // from converting to block scalar, which adds trailing newline)
  const quoteIfNeeded = (value) => {
    const trimmed = value.trim();
    // Already quoted
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed;
    }
    // Contains colon - quote it
    if (trimmed.includes(':')) {
      // Escape any double quotes in the value
      return `"${trimmed.replace(/"/g, '\\"')}"`;
    }
    return trimmed;
  };

  // Build new frontmatter with only valid OpenCode fields
  let newFrontmatter = '---';
  
  if (descMatch) {
    newFrontmatter += `\ndescription: ${quoteIfNeeded(descMatch[1])}`;
  }
  if (agentMatch) {
    newFrontmatter += `\nagent: ${agentMatch[1].trim()}`;
  }
  if (modelMatch) {
    newFrontmatter += `\nmodel: ${modelMatch[1].trim()}`;
  }
  if (subtaskMatch) {
    newFrontmatter += `\nsubtask: ${subtaskMatch[1].trim()}`;
  }

  newFrontmatter += '\n---';

  return newFrontmatter + body;
}

/**
 * Verify a directory exists and contains files
 */
function verifyInstalled(dirPath, description) {
  if (!fs.existsSync(dirPath)) {
    console.error(`  ${yellow}✗${reset} Failed to install ${description}: directory not created`);
    return false;
  }
  try {
    const entries = fs.readdirSync(dirPath);
    if (entries.length === 0) {
      console.error(`  ${yellow}✗${reset} Failed to install ${description}: directory is empty`);
      return false;
    }
  } catch (e) {
    console.error(`  ${yellow}✗${reset} Failed to install ${description}: ${e.message}`);
    return false;
  }
  return true;
}

/**
 * Verify a file exists
 */
function verifyFileInstalled(filePath, description) {
  if (!fs.existsSync(filePath)) {
    console.error(`  ${yellow}✗${reset} Failed to install ${description}: file not created`);
    return false;
  }
  return true;
}

/**
 * Install to the specified directory
 */
async function install(isGlobal, platform = 'claude-code') {
  const src = path.join(__dirname, '..');

  // Get platform-aware installation paths
  const paths = getInstallPaths(isGlobal, explicitConfigDir, platform);
  const { configDir, commandsDir, agentsDir, hooksDir, pathPrefix } = paths;
  const claudeDir = configDir;  // Alias for backward compatibility with existing code

  // Create adapter for hook registration (platform-specific)
  const adapter = platform === 'opencode'
    ? new OpenCodeAdapter()
    : new ClaudeCodeAdapter();

  const locationLabel = isGlobal
    ? claudeDir.replace(os.homedir(), '~')
    : claudeDir.replace(process.cwd(), '.');

  console.log(`  Installing to ${cyan}${locationLabel}${reset}\n`);

  // Track installation failures
  const failures = [];

  // Clean up orphaned files from previous versions
  cleanupOrphanedFiles(claudeDir, platform);

  // Create commands directory and copy commands
  fs.mkdirSync(commandsDir, { recursive: true });
  const gsdSrc = path.join(src, 'commands', 'gsd');
  
  let commandCount = 0;
  if (platform === 'opencode') {
    // OpenCode: copy commands to gsd/ subdirectory for namespacing
    // e.g., commands/gsd/help.md -> command/gsd/help.md -> /gsd:help
    commandCount = copyCommandsForOpenCode(gsdSrc, commandsDir, pathPrefix);
  } else {
    // Claude Code: keep nested structure (commands/gsd/)
    copyWithPathReplacement(gsdSrc, commandsDir, pathPrefix);
  }
  
  // Verify commands directory for OpenCode (check for gsd-*.md files)
  if (platform === 'opencode') {
    const gsdFiles = fs.readdirSync(commandsDir).filter(f => f.startsWith('gsd-') && f.endsWith('.md'));
    if (gsdFiles.length > 0) {
      console.log(`  ${green}✓${reset} Installed ${commandCount} commands (as /gsd-*)`);
    } else {
      console.log(`  ${yellow}✗${reset} Failed to install commands: no gsd-*.md files found`);
      failures.push('commands');
    }
  } else {
    // Claude Code: keep nested structure (commands/gsd/)
    if (verifyInstalled(commandsDir, 'commands')) {
      console.log(`  ${green}✓${reset} Installed commands`);
    } else {
      failures.push('commands');
    }
  }

  // Copy get-shit-done skill with path replacement
  const skillSrc = path.join(src, 'get-shit-done');
  const skillDest = path.join(claudeDir, 'get-shit-done');
  copyWithPathReplacement(skillSrc, skillDest, pathPrefix);
  if (verifyInstalled(skillDest, 'get-shit-done')) {
    console.log(`  ${green}✓${reset} Installed get-shit-done`);
  } else {
    failures.push('get-shit-done');
  }

  // Copy agents to agents directory (subagents must be at root level)
  // Only delete gsd-*.md files to preserve user's custom agents
  const agentsSrc = path.join(src, 'agents');
  if (fs.existsSync(agentsSrc)) {
    fs.mkdirSync(agentsDir, { recursive: true });

    // Remove old GSD agents (gsd-*.md) before copying new ones
    if (fs.existsSync(agentsDir)) {
      for (const file of fs.readdirSync(agentsDir)) {
        if (file.startsWith('gsd-') && file.endsWith('.md')) {
          fs.unlinkSync(path.join(agentsDir, file));
        }
      }
    }

    // Copy new agents (don't use copyWithPathReplacement which would wipe the folder)
    const agentEntries = fs.readdirSync(agentsSrc, { withFileTypes: true });
    for (const entry of agentEntries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        let content = fs.readFileSync(path.join(agentsSrc, entry.name), 'utf8');
        content = content.replace(/~\/\.claude\//g, pathPrefix);
        
        // Transform frontmatter for OpenCode platform
        if (platform === 'opencode') {
          content = transformAgentForOpenCode(content);
        }
        
        fs.writeFileSync(path.join(agentsDir, entry.name), content);
      }
    }
    if (verifyInstalled(agentsDir, 'agents')) {
      console.log(`  ${green}✓${reset} Installed agents`);
    } else {
      failures.push('agents');
    }
  }

  // Copy CHANGELOG.md with path replacement
  const changelogSrc = path.join(src, 'CHANGELOG.md');
  const changelogDest = path.join(claudeDir, 'get-shit-done', 'CHANGELOG.md');
  if (fs.existsSync(changelogSrc)) {
    let content = fs.readFileSync(changelogSrc, 'utf8');
    // Replace actionable path references (CHANGELOG is historical, so only minimal replacement)
    content = content.replace(/~\/\.claude\//g, pathPrefix);
    fs.writeFileSync(changelogDest, content);
    if (verifyFileInstalled(changelogDest, 'CHANGELOG.md')) {
      console.log(`  ${green}✓${reset} Installed CHANGELOG.md`);
    } else {
      failures.push('CHANGELOG.md');
    }
  }

  // Write VERSION file for whats-new command
  const versionDest = path.join(claudeDir, 'get-shit-done', 'VERSION');
  fs.writeFileSync(versionDest, pkg.version);
  if (verifyFileInstalled(versionDest, 'VERSION')) {
    console.log(`  ${green}✓${reset} Wrote VERSION (${pkg.version})`);
  } else {
    failures.push('VERSION');
  }

  // Copy hooks from dist/ (bundled with dependencies)
  const hooksSrc = path.join(src, 'hooks', 'dist');
  if (fs.existsSync(hooksSrc)) {
    fs.mkdirSync(hooksDir, { recursive: true });
    const hookEntries = fs.readdirSync(hooksSrc);
    for (const entry of hookEntries) {
      const srcFile = path.join(hooksSrc, entry);
      // Only copy files, not directories
      if (fs.statSync(srcFile).isFile()) {
        const destFile = path.join(hooksDir, entry);
        fs.copyFileSync(srcFile, destFile);
      }
    }
    if (verifyInstalled(hooksDir, 'hooks')) {
      console.log(`  ${green}✓${reset} Installed hooks (bundled)`)
    } else {
      failures.push('hooks');
    }
  }

  // If critical components failed, exit with error
  if (failures.length > 0) {
    console.error(`\n  ${yellow}Installation incomplete!${reset} Failed: ${failures.join(', ')}`);
    console.error(`  Try running directly: node ~/.npm/_npx/*/node_modules/get-shit-done-cc/bin/install.js --global\n`);
    process.exit(1);
  }

  // Configure statusline and hooks in settings.json (Claude Code only)
  // OpenCode config is not modified by GSD - we only install commands/agents
  if (platform === 'claude-code') {
    const configFileName = 'settings.json';
    const settingsPath = path.join(claudeDir, configFileName);

    // Backup existing settings before any modifications (INST-05)
    const backupPath = backupConfigFile(settingsPath, platform);
    if (backupPath) {
      console.log(`  ${green}✓${reset} Backed up ${configFileName}`);
    }

    const settings = cleanupOrphanedHooks(readSettings(settingsPath));
    const statuslineCommand = isGlobal
      ? buildHookCommand(claudeDir, 'gsd-statusline.js')
      : 'node .claude/hooks/gsd-statusline.js';
    const updateCheckCommand = isGlobal
      ? buildHookCommand(claudeDir, 'gsd-check-update.js')
      : 'node .claude/hooks/gsd-check-update.js';

    // Register hooks using adapter capability check (platform-agnostic)
    // Also check if user has disabled hooks via config
    if (adapter.supportsHooks() && areHooksEnabled(settings)) {
      const hasGsdUpdateHook = settings.hooks?.SessionStart?.some(entry =>
        entry.hooks && entry.hooks.some(h => h.command && h.command.includes('gsd-check-update'))
      );

      if (!hasGsdUpdateHook) {
        await adapter.registerHook('SessionStart', updateCheckCommand);
        console.log(`  ${green}✓${reset} Configured update check hook`);
      }
    } else if (adapter.supportsHooks() && !areHooksEnabled(settings)) {
      console.log(`  ${dim}Hooks disabled via config (gsd.hooks.enabled: false)${reset}`);
    }

    // Re-read settings.json after adapter modifications to avoid data race
    const freshSettings = readSettings(settingsPath);

    return { settingsPath, settings: freshSettings, statuslineCommand };
  }

  // OpenCode: no config modifications needed
  return { settingsPath: null, settings: {}, statuslineCommand: null };
}

/**
 * Apply statusline config, then print completion message
 */
function finishInstall(settingsPath, settings, statuslineCommand, shouldInstallStatusline, platform, adapter) {
  // Only configure statusline if platform supports it and hooks are enabled
  if (shouldInstallStatusline && adapter.supportsStatusLine() && areHooksEnabled(settings)) {
    settings.statusLine = {
      type: 'command',
      command: statuslineCommand
    };
    console.log(`  ${green}✓${reset} Configured statusline`);
  } else if (shouldInstallStatusline && adapter.supportsStatusLine() && !areHooksEnabled(settings)) {
    console.log(`  ${dim}Statusline disabled via config (gsd.hooks.enabled: false)${reset}`);
  }

  // Only write settings for Claude Code (which uses hooks/statusline)
  // OpenCode config is already modified during command registration
  if (platform === 'claude-code') {
    writeSettings(settingsPath, settings);
  }

  const platformName = platform === 'opencode' ? 'OpenCode' : 'Claude Code';
  const helpCommand = '/gsd:help';  // Now consistent across both platforms
  console.log(`
  ${green}Done!${reset} Launch ${platformName} and run ${cyan}${helpCommand}${reset}.
`);
}

/**
 * Handle statusline configuration with optional prompt
 */
function handleStatusline(settings, isInteractive, adapter, callback) {
  // Skip statusline entirely if platform doesn't support it
  if (!adapter.supportsStatusLine()) {
    callback(false);
    return;
  }

  const hasExisting = settings.statusLine != null;

  // No existing statusline - just install it
  if (!hasExisting) {
    callback(true);
    return;
  }

  // Has existing and --force-statusline flag
  if (forceStatusline) {
    callback(true);
    return;
  }

  // Has existing, non-interactive mode - skip
  if (!isInteractive) {
    console.log(`  ${yellow}⚠${reset} Skipping statusline (already configured)`);
    console.log(`    Use ${cyan}--force-statusline${reset} to replace\n`);
    callback(false);
    return;
  }

  // Has existing, interactive mode - prompt user
  const existingCmd = settings.statusLine.command || settings.statusLine.url || '(custom)';

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log(`
  ${yellow}⚠${reset} Existing statusline detected

  Your current statusline:
    ${dim}command: ${existingCmd}${reset}

  GSD includes a statusline showing:
    • Model name
    • Current task (from todo list)
    • Context window usage (color-coded)

  ${cyan}1${reset}) Keep existing
  ${cyan}2${reset}) Replace with GSD statusline
`);

  rl.question(`  Choice ${dim}[1]${reset}: `, (answer) => {
    rl.close();
    const choice = answer.trim() || '1';
    callback(choice === '2');
  });
}

/**
 * Install for a single platform with statusline handling
 */
async function installForPlatform(isGlobal, platform, isInteractive) {
  const platformLabel = platform === 'opencode' ? 'OpenCode' : 'Claude Code';
  console.log(`\n  Installing for ${cyan}${platformLabel}${reset}...\n`);

  const { settingsPath, settings, statuslineCommand } = await install(isGlobal, platform);

  // Create adapter for capability checks (platform-specific)
  const adapter = platform === 'opencode'
    ? new OpenCodeAdapter()
    : new ClaudeCodeAdapter();

  // Handle statusline via adapter capability check (skips prompt if unsupported)
  return new Promise((resolve) => {
    handleStatusline(settings, isInteractive, adapter, (shouldInstallStatusline) => {
      finishInstall(settingsPath, settings, statuslineCommand, shouldInstallStatusline, platform, adapter);
      resolve();
    });
  });
}

/**
 * Prompt for install location
 */
async function promptLocation() {
  // Check if stdin is a TTY - if not, fall back to global install
  // This handles npx execution in environments like WSL2 where stdin may not be properly connected
  if (!process.stdin.isTTY) {
    console.log(`  ${yellow}Non-interactive terminal detected, defaulting to global install${reset}\n`);
    const selectedPlatforms = await promptPlatformSelection();
    for (const platform of selectedPlatforms) {
      await installForPlatform(true, platform, false);
    }
    return;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  // Track whether we've processed the answer to prevent double-execution
  let answered = false;

  // Handle readline close event to detect premature stdin closure
  rl.on('close', async () => {
    if (!answered) {
      answered = true;
      console.log(`\n  ${yellow}Input stream closed, defaulting to global install${reset}\n`);
      const selectedPlatforms = await promptPlatformSelection();
      for (const platform of selectedPlatforms) {
        await installForPlatform(true, platform, false);
      }
    }
  });

  const configDir = expandTilde(explicitConfigDir) || expandTilde(process.env.CLAUDE_CONFIG_DIR);
  const globalPath = configDir || path.join(os.homedir(), '.claude');
  const globalLabel = globalPath.replace(os.homedir(), '~');

  console.log(`  ${yellow}Where would you like to install?${reset}

  ${cyan}1${reset}) Global ${dim}(${globalLabel})${reset} - available in all projects
  ${cyan}2${reset}) Local  ${dim}(./.claude)${reset} - this project only
`);

  rl.question(`  Choice ${dim}[1]${reset}: `, async (answer) => {
    answered = true;
    rl.close();
    const choice = answer.trim() || '1';
    const isGlobal = choice !== '2';

    // Get platform selection
    const selectedPlatforms = await promptPlatformSelection();

    // Install for each selected platform
    for (const platform of selectedPlatforms) {
      await installForPlatform(isGlobal, platform, true);
    }
  });
}

// Main
(async () => {
  if (hasGlobal && hasLocal) {
    console.error(`  ${yellow}Cannot specify both --global and --local${reset}`);
    process.exit(1);
  } else if (explicitConfigDir && hasLocal) {
    console.error(`  ${yellow}Cannot use --config-dir with --local${reset}`);
    process.exit(1);
  } else if (hasGlobal) {
    // Get platform selection
    const selectedPlatforms = await promptPlatformSelection();

    // Install for each selected platform
    for (const platform of selectedPlatforms) {
      await installForPlatform(true, platform, false);
    }
  } else if (hasLocal) {
    // Get platform selection
    const selectedPlatforms = await promptPlatformSelection();

    // Install for each selected platform
    for (const platform of selectedPlatforms) {
      await installForPlatform(false, platform, false);
    }
  } else {
    await promptLocation();
  }
})();
