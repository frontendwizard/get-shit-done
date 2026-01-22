---
phase: quick
plan: 001
type: execute
wave: 1
depends_on: []
files_modified:
  - README.md
autonomous: true
---

<objective>
Rewrite README.md from the perspective of an OpenCode user who wants to try this fork.

Key changes:
1. Clear positioning as OpenCode fork of the original GSD
2. Link to original repo for Claude Code users
3. Focus on what this fork adds: OpenCode platform support
4. End-user audience (not contributors)
5. Installation instructions for OpenCode users
</objective>

<tasks>

<task type="auto">
  <name>Task 1: Rewrite README for OpenCode end users</name>
  <files>README.md</files>
  <action>
Rewrite README.md with this structure:

1. **Header** - Clear fork identification
   - "GSD for OpenCode" or "GSD (OpenCode Fork)"
   - Link to original repo for Claude Code users
   - Brief: "This fork adds OpenCode support to GSD"

2. **What This Fork Adds**
   - Platform abstraction layer supporting both Claude Code and OpenCode
   - OpenCode adapter implementation
   - Same GSD workflow, different platform
   - Link to PLATFORM-SUPPORT.md for compatibility matrix

3. **Quick Start for OpenCode Users**
   - Installation command
   - Verify with /gsd:help
   - Note about which commands work on OpenCode (14 of 24)

4. **Feature Limitations**
   - Be honest: Multi-agent commands require Task tool (Claude Code only)
   - List what DOES work on OpenCode
   - Link to full compatibility matrix

5. **Original GSD Documentation**
   - Link to original repo's README for full docs
   - "Everything else works the same"

6. **Contributing**
   - Link to CREATING-ADAPTERS.md for adding new platforms
   - Link to ARCHITECTURE.md for understanding the system

Keep it SHORT. This is a fork README, not the main project docs.
Remove: Star history, long explanations, Claude Code-specific details.
  </action>
  <verify>
README.md exists with:
- Clear fork identification in header
- Link to original glittercowboy/get-shit-done repo
- OpenCode-specific installation
- Honest feature limitations
- Under 200 lines (concise)
  </verify>
  <done>
README is rewritten for OpenCode end users with clear fork positioning.
  </done>
</task>

</tasks>

<verification>
README.md is focused, honest about limitations, and directs Claude Code users to the original repo.
</verification>
