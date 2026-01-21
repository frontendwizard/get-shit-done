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
 * Clean up orphaned files from previous GSD versions
 * Platform-specific cleanup
 */
function cleanupOrphanedFiles(claudeDir, platform) {
  const orphanedFiles = platform === 'claude-code'
    ? [
        'hooks/gsd-notify.sh',  // Removed in v1.6.x
        'hooks/statusline.js',  // Renamed to gsd-statusline.js in v1.9.0
      ]
    : [];  // No OpenCode orphans yet

  for (const relPath of orphanedFiles) {
    const fullPath = path.join(claudeDir, relPath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`  ${green}✓${reset} Removed orphaned ${relPath}`);
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

  // Create commands directory and copy commands/gsd with path replacement
  fs.mkdirSync(commandsDir, { recursive: true });
  const gsdSrc = path.join(src, 'commands', 'gsd');
  copyWithPathReplacement(gsdSrc, commandsDir, pathPrefix);
  if (verifyInstalled(commandsDir, 'commands/gsd')) {
    console.log(`  ${green}✓${reset} Installed commands/gsd`);
  } else {
    failures.push('commands/gsd');
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

  // Configure statusline and hooks in settings.json (Claude Code) or opencode.json (OpenCode)
  const configFileName = platform === 'opencode' ? 'opencode.json' : 'settings.json';
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

  // Register hooks only for Claude Code (OpenCode hooks deferred to Phase 5)
  if (platform === 'claude-code') {
    const hasGsdUpdateHook = settings.hooks?.SessionStart?.some(entry =>
      entry.hooks && entry.hooks.some(h => h.command && h.command.includes('gsd-check-update'))
    );

    if (!hasGsdUpdateHook) {
      await adapter.registerHook('SessionStart', updateCheckCommand);
      console.log(`  ${green}✓${reset} Configured update check hook`);
    }
  }

  // Re-read settings.json after adapter modifications to avoid data race
  // (adapter.registerHook() writes to disk, we need the updated state)
  const freshSettings = readSettings(settingsPath);

  return { settingsPath, settings: freshSettings, statuslineCommand };
}

/**
 * Apply statusline config, then print completion message
 */
function finishInstall(settingsPath, settings, statuslineCommand, shouldInstallStatusline, platform) {
  if (shouldInstallStatusline) {
    settings.statusLine = {
      type: 'command',
      command: statuslineCommand
    };
    console.log(`  ${green}✓${reset} Configured statusline`);
  }

  // Always write settings (hooks were already configured in install())
  writeSettings(settingsPath, settings);

  const platformName = platform === 'opencode' ? 'OpenCode' : 'Claude Code';
  const helpCommand = platform === 'opencode' ? '/gsd:help' : '/gsd:help';
  console.log(`
  ${green}Done!${reset} Launch ${platformName} and run ${cyan}${helpCommand}${reset}.
`);
}

/**
 * Handle statusline configuration with optional prompt
 */
function handleStatusline(settings, isInteractive, callback) {
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

  // Only handle statusline for Claude Code (OpenCode may not support it)
  if (platform === 'claude-code') {
    return new Promise((resolve) => {
      handleStatusline(settings, isInteractive, (shouldInstallStatusline) => {
        finishInstall(settingsPath, settings, statuslineCommand, shouldInstallStatusline, platform);
        resolve();
      });
    });
  } else {
    // OpenCode: just write config and finish
    writeSettings(settingsPath, settings);
    console.log(`\n  ${green}Done!${reset} OpenCode installation complete.\n`);
  }
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
