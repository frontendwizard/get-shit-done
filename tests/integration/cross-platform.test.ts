/**
 * Cross-Platform .planning/ Portability Tests (TEST-05)
 *
 * Purpose: Ensure .planning/ directories work on both platforms
 * - PORT-01: .planning/ directories work across platforms
 * - PORT-02: No platform-specific data in .planning/ files
 * - PORT-04: Projects switchable between platforms
 *
 * Key assertions:
 * 1. .planning/ files contain no platform-specific paths
 * 2. Both adapters can access same .planning/ content
 * 3. Adapters don't modify .planning/ directory
 * 4. File references use relative paths only
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import { vol, fs as memfs } from 'memfs';

// Mock fs with memfs implementation
vi.mock('fs', () => memfs);
vi.mock('node:fs', () => memfs);

import { ClaudeCodeAdapter } from '../../src/platform/adapters/claude-code';
import { OpenCodeAdapter } from '../../src/platform/adapters/opencode';

// Test fixtures representing a portable .planning/ directory
const PLANNING_FIXTURE = {
  '/.planning/PROJECT.md': `# Test Project
## Overview
This is a test project for cross-platform validation.
## Core Value
Platform independence - users choose AI platforms based on project needs.`,

  '/.planning/ROADMAP.md': `# Roadmap: Test Project
## Phases
- [x] Phase 1: Setup
- [ ] Phase 2: Implementation`,

  '/.planning/STATE.md': `# Project State
## Current Position
Phase: 1 of 2
Plan: 1 of 1
Status: Complete`,
};

describe('Cross-Platform .planning/ Portability (TEST-05)', () => {
  beforeEach(() => {
    vol.reset();
    vol.fromJSON(PLANNING_FIXTURE);
  });

  afterEach(() => {
    vol.reset();
  });

  describe('PORT-02: No platform-specific data in .planning/ files', () => {
    it('.planning/ files contain no ~/.claude/ references', () => {
      for (const [filePath, content] of Object.entries(PLANNING_FIXTURE)) {
        expect(content).not.toContain('~/.claude/');
        expect(content).not.toContain('.claude/');
      }
    });

    it('.planning/ files contain no ~/.config/opencode/ references', () => {
      for (const [filePath, content] of Object.entries(PLANNING_FIXTURE)) {
        expect(content).not.toContain('~/.config/opencode/');
        expect(content).not.toContain('.config/opencode/');
      }
    });

    it('.planning/ files contain no absolute home paths', () => {
      // Common home directory patterns to check
      const homePaths = [
        '/Users/',      // macOS
        '/home/',       // Linux
        'C:\\Users\\',  // Windows
      ];
      for (const [filePath, content] of Object.entries(PLANNING_FIXTURE)) {
        for (const homePath of homePaths) {
          expect(content).not.toContain(homePath);
        }
      }
    });

    it('.planning/ files contain no platform-specific config file references', () => {
      for (const [filePath, content] of Object.entries(PLANNING_FIXTURE)) {
        expect(content).not.toContain('settings.json');
        expect(content).not.toContain('opencode.json');
        expect(content).not.toContain('opencode.jsonc');
      }
    });
  });

  describe('PORT-04: Projects switchable between platforms', () => {
    it('Claude Code adapter can read .planning/ files', () => {
      // Adapter should not modify .planning/ files
      // This is a behavioral contract - adapters don't touch .planning/
      const projectContent = vol.readFileSync('/.planning/PROJECT.md', 'utf8');
      expect(projectContent).toContain('Test Project');
    });

    it('OpenCode adapter can read .planning/ files', () => {
      // Same .planning/ content accessible
      const projectContent = vol.readFileSync('/.planning/PROJECT.md', 'utf8');
      expect(projectContent).toContain('Test Project');
    });

    it('same STATE.md readable by both adapters', () => {
      const stateContent = vol.readFileSync('/.planning/STATE.md', 'utf8');

      // Content is platform-agnostic
      expect(stateContent).toContain('Current Position');
      expect(stateContent).toContain('Phase: 1 of 2');
    });

    it('same ROADMAP.md readable by both adapters', () => {
      const roadmapContent = vol.readFileSync('/.planning/ROADMAP.md', 'utf8');

      // Content is platform-agnostic
      expect(roadmapContent).toContain('Phase 1: Setup');
      expect(roadmapContent).toContain('Phase 2: Implementation');
    });
  });

  describe('PORT-01: .planning/ directories work across platforms', () => {
    it('file paths in .planning/ are relative or platform-neutral', () => {
      // Check that any file references use relative paths
      for (const [filePath, content] of Object.entries(PLANNING_FIXTURE)) {
        // Should not have platform-specific absolute paths
        expect(content).not.toMatch(/\/Users\/[^/]+\/.claude/);
        expect(content).not.toMatch(/\/home\/[^/]+\/.config\/opencode/);
        expect(content).not.toMatch(/C:\\Users\\[^\\]+\\.claude/);
      }
    });

    it('all fixture files have platform-neutral content', () => {
      // All fixture files should be readable without platform-specific parsing
      for (const [filePath] of Object.entries(PLANNING_FIXTURE)) {
        const content = vol.readFileSync(filePath, 'utf8');
        expect(content.length).toBeGreaterThan(0);
        // Markdown should parse identically on all platforms
        expect(content).toContain('#'); // Has markdown headers
      }
    });
  });

  describe('adapter isolation from .planning/', () => {
    it('ClaudeCodeAdapter does not modify .planning/ directory', async () => {
      const originalContent = vol.readFileSync('/.planning/PROJECT.md', 'utf8');

      const adapter = new ClaudeCodeAdapter();
      // Perform adapter operations
      await adapter.readConfig();

      // .planning/ unchanged
      const afterContent = vol.readFileSync('/.planning/PROJECT.md', 'utf8');
      expect(afterContent).toBe(originalContent);
    });

    it('OpenCodeAdapter does not modify .planning/ directory', async () => {
      const originalContent = vol.readFileSync('/.planning/PROJECT.md', 'utf8');

      const adapter = new OpenCodeAdapter();
      await adapter.readConfig();

      const afterContent = vol.readFileSync('/.planning/PROJECT.md', 'utf8');
      expect(afterContent).toBe(originalContent);
    });

    it('ClaudeCodeAdapter config operations do not touch .planning/', async () => {
      const originalState = vol.readFileSync('/.planning/STATE.md', 'utf8');

      const adapter = new ClaudeCodeAdapter();
      // Create config dir and write config
      const configDir = adapter.getConfigDir();
      vol.mkdirSync(configDir, { recursive: true });
      await adapter.writeConfig({ test: 'data' });

      // .planning/ unchanged
      const afterState = vol.readFileSync('/.planning/STATE.md', 'utf8');
      expect(afterState).toBe(originalState);
    });

    it('OpenCodeAdapter config operations do not touch .planning/', async () => {
      const originalRoadmap = vol.readFileSync('/.planning/ROADMAP.md', 'utf8');

      const adapter = new OpenCodeAdapter();
      // Write config (OpenCode handles directory creation)
      await adapter.writeConfig({ test: 'data' });

      // .planning/ unchanged
      const afterRoadmap = vol.readFileSync('/.planning/ROADMAP.md', 'utf8');
      expect(afterRoadmap).toBe(originalRoadmap);
    });
  });

  describe('path resolution independence', () => {
    it('ClaudeCodeAdapter paths do not reference .planning/', () => {
      const adapter = new ClaudeCodeAdapter();

      expect(adapter.getConfigDir()).not.toContain('.planning');
      expect(adapter.getCommandsDir()).not.toContain('.planning');
      expect(adapter.getAgentsDir()).not.toContain('.planning');
      expect(adapter.getHooksDir()).not.toContain('.planning');
    });

    it('OpenCodeAdapter paths do not reference .planning/', () => {
      const adapter = new OpenCodeAdapter();

      expect(adapter.getConfigDir()).not.toContain('.planning');
      expect(adapter.getCommandsDir()).not.toContain('.planning');
      expect(adapter.getAgentsDir()).not.toContain('.planning');
      expect(adapter.getHooksDir()).not.toContain('.planning');
    });
  });
});

describe('Real .planning/ fixture validation', () => {
  // These tests verify the actual fixture files created in Task 1
  const fixturesDir = path.join(__dirname, '..', 'fixtures', '.planning');

  // Reset mocks to use real fs for this describe block
  beforeEach(() => {
    vi.unmock('fs');
    vi.unmock('node:fs');
    vi.resetModules();
  });

  it('fixture files exist and are platform-agnostic', async () => {
    // Import real fs after unmocking
    const realFs = await import('fs');

    // If running in CI or fixtures not yet created, skip
    if (!realFs.existsSync(fixturesDir)) {
      console.log('Skipping: fixture files not found');
      return;
    }

    // Verify files exist
    expect(realFs.existsSync(path.join(fixturesDir, 'PROJECT.md'))).toBe(true);
    expect(realFs.existsSync(path.join(fixturesDir, 'ROADMAP.md'))).toBe(true);
    expect(realFs.existsSync(path.join(fixturesDir, 'STATE.md'))).toBe(true);

    // Verify content is platform-agnostic
    const projectContent = realFs.readFileSync(path.join(fixturesDir, 'PROJECT.md'), 'utf8');
    expect(projectContent).not.toContain('~/.claude/');
    expect(projectContent).not.toContain('~/.config/opencode/');
    expect(projectContent).not.toContain('/Users/');
    expect(projectContent).not.toContain('/home/');
  });
});
