# Testing Patterns

**Analysis Date:** 2026-01-19

## Test Framework

**Runner:**
- Not detected

**Assertion Library:**
- Not detected

**Run Commands:**
```bash
# No test commands found in package.json
```

## Test File Organization

**Location:**
- No test files detected in codebase

**Naming:**
- Not applicable

**Structure:**
- Not applicable

## Testing Philosophy

**GSD uses verification-based quality assurance instead of traditional unit tests:**

The system validates work through:
- Goal-backward verification (must_haves in frontmatter)
- Checkpoint protocols (human verification at key moments)
- Verification reports (systematic code analysis)
- UAT (User Acceptance Testing) for phase completion

## Verification Patterns

**Goal-Backward Verification:**
```yaml
must_haves:
  truths: []                # Observable behaviors that must be true
  artifacts: []             # Files that must exist with real implementation
  key_links: []             # Critical connections between artifacts
```

**Verification Commands:**
```bash
# Check for incomplete implementations
grep -E "(TODO|FIXME|XXX|HACK|PLACEHOLDER)" "$file"

# Count stub implementations
grep -c -E "TODO|FIXME|placeholder|not implemented|coming soon" "$path"

# Validate environment configuration
grep -E "^$VAR_NAME=.+" .env .env.local 2>/dev/null | grep -v "your-.*-here|xxx|placeholder|TODO" -i
```

## Quality Gates

**Incomplete Code Detection:**
```bash
# Patterns that indicate incomplete work
- TODO comments
- FIXME comments
- Placeholder implementations
- "Not implemented" strings
- "Coming soon" strings
- Empty return statements with no logic
```

**Code Quality Checks:**
```markdown
| Pattern | Severity | Meaning |
|---------|----------|---------|
| TODO/FIXME | ⚠️ Warning | Indicates incomplete |
| console.log | ⚠️ Warning | Debug code left in |
| Stub function | 🔴 Critical | Not implemented |
| Missing env var | 🔴 Critical | Config incomplete |
```

## Verification Reports

**Template Structure:**
```markdown
# Verification Report: [Phase Name]

## Executive Summary

**Goal:** [What this phase was supposed to accomplish]
**Outcome:** [Pass/Fail]

## Artifact Verification

| Artifact | Expected | Actual | Status |
|----------|----------|--------|--------|
| path/to/file.ts | Real implementation | Found | ✓ |

## Behavior Verification

**[Behavior description]:**
- Command: `[test command]`
- Expected: [expected output]
- Actual: [actual output]
- Status: [✓/✗]

## Code Quality Analysis

| File | Line | Pattern | Severity | Notes |
|------|------|---------|----------|-------|
| src/app/api/chat/route.ts | 12 | `// TODO: implement` | ⚠️ Warning | Incomplete |
```

## TDD Support

**TDD Detection Heuristic:**
> Can you write `expect(fn(input)).toBe(output)` before writing `fn`?

**TDD Plan Structure:**
```yaml
---
type: tdd
---
```

**TDD Commits:**
- RED: `test({phase}-{plan}): add failing test for [feature]`
- GREEN: `feat({phase}-{plan}): implement [feature]`
- REFACTOR: `refactor({phase}-{plan}): clean up [feature]`

## Manual Testing Protocols

**Checkpoint: Human Verify:**
```xml
<task type="checkpoint:human-verify" gate="blocking">
  <what-built>[What Claude just built]</what-built>
  <how-to-verify>
    1. Run: [command to start dev server/app]
    2. Visit: [URL to check]
    3. Test: [specific user action]
    4. Verify: [expected behavior]
  </how-to-verify>
  <resume-signal>[How to indicate completion]</resume-signal>
</task>
```

**When to Use:**
- Visual UI elements (layout, styling, interactions)
- Complex user flows requiring human judgment
- Integration with external services
- Browser-specific behavior

## UAT (User Acceptance Testing)

**Structure:**
```markdown
# UAT: Phase [N]

## Must Work

- [ ] [User capability 1]
- [ ] [User capability 2]
- [ ] [User capability 3]

## Must Not Happen

- [ ] [Anti-pattern 1]
- [ ] [Anti-pattern 2]

## Status

**Tested:** [date]
**Outcome:** [Pass/Fail]
```

**Trigger:**
- After phase completion (all plans executed)
- Before marking phase as complete in ROADMAP.md

## Coverage Expectations

**Requirements:**
- No numerical coverage targets
- Verification focused on "does it work?" not "is it tested?"

**Strategy:**
- Automated verification for atomic behaviors (file exists, function returns value)
- Human verification for complex interactions
- Goal-backward validation (work backwards from success criteria)

## Integration Testing

**External Services:**
- Verified through checkpoint protocols
- Env var validation before API calls
- Graceful degradation patterns

**Stub Detection:**
```bash
# Find incomplete integrations
grep -n "placeholder" src/**/*.ts
grep -n "mock.*data" src/**/*.ts
grep -n "// TODO.*API" src/**/*.ts
```

## Verification Workflow

**During Execution:**
1. Task completes
2. `<verify>` command runs
3. Output checked against `<done>` criteria
4. Commit only if verification passes

**After Plan:**
1. Check goal-backward must_haves
2. Run verification report generator
3. Review for incomplete implementations
4. Flag gaps for UAT

**After Phase:**
1. UAT checklist created
2. User tests "Must Work" behaviors
3. User confirms "Must Not Happen" avoided
4. Phase marked complete or gaps addressed

## Common Verification Patterns

**File Exists:**
```bash
[ -f src/path/to/file.ts ] && echo "✓ File exists"
```

**Function Works:**
```bash
node -e "require('./src/module').functionName('input')" && echo "✓ Function callable"
```

**Server Responds:**
```bash
curl -s http://localhost:3000/api/endpoint | grep -q "expected" && echo "✓ Endpoint works"
```

**Environment Configured:**
```bash
grep -q "^API_KEY=.+" .env && echo "✓ API_KEY configured"
```

## Test Data / Fixtures

**Pattern:**
- Not used (no test suite)

**Verification uses:**
- Live development data
- Manual test scenarios
- Real environment configuration

---

*Testing analysis: 2026-01-19*
