# Features Research: Platform Adapter Documentation

**Domain:** Multi-platform adapter documentation for contributors
**Researched:** 2026-01-22
**Research Type:** Features dimension for platform documentation milestone

## Table Stakes (Must Have)

Features every platform adapter documentation needs. Missing any of these = documentation feels incomplete, contributors will struggle.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Interface Contract Reference** | Contributors need to know WHAT methods to implement | Low | Already exists in `adapter.ts` - needs extraction to docs |
| **Method-by-Method Specification** | Each interface method needs purpose, params, return types, error conditions | Medium | JSDoc exists; needs prose documentation |
| **Complete Working Example** | See a real adapter from start to finish | Low | Claude Code adapter exists - annotate it as canonical example |
| **Directory Structure Diagram** | Where files go, what they're called | Low | Visual showing `src/platform/adapters/`, `src/platform/paths.ts`, etc. |
| **Behavioral Contracts** | What the adapter MUST do (idempotency, path format, etc.) | Medium | Critical - already documented in adapter.ts comments |
| **Quick Start: "Your First Adapter"** | Step 1, 2, 3 to get a minimal adapter running | Medium | Reduce time-to-first-success to <30 minutes |
| **Testing Requirements** | What tests must pass before PR accepted | Medium | Unit tests, integration tests, idempotency checks |
| **Installation/Setup Prerequisites** | Dev environment, dependencies, how to run tests | Low | npm install, test commands, TypeScript setup |

### Rationale (Table Stakes)

Based on analysis of excellent plugin/adapter documentation (Gatsby source plugins, VS Code extensions, Auth0 SDKs):

1. **Interface reference is non-negotiable** - Contributors can't implement what they can't see. The current `adapter.ts` has excellent JSDoc but no standalone documentation.

2. **Working example is proven essential** - VS Code, Gatsby, and every successful plugin system provides annotated real examples. GSD has `claude-code.ts` as a working adapter.

3. **Quick start reduces abandonment** - Auth0's research shows developers abandon complex SDKs within 30 minutes if they can't get something working. A "Your First Adapter" guide prevents this.

## Differentiators (Excellence)

Features that separate great documentation from adequate. Not strictly required, but significantly improve contributor success.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Decision Flowchart: "Do I Need an Adapter?"** | Prevents wasted effort on adapters for platforms that won't work | Low | Not every AI tool can support GSD |
| **Platform Capability Matrix** | Shows what each platform supports (hooks, agents, status line) | Low | Exists partially in PLATFORM-SUPPORT.md |
| **Common Mistakes Section** | "Don't do X because Y" with real examples | Medium | Saves debugging time; builds trust |
| **Path Resolution Deep Dive** | Explains env var overrides, tilde expansion, XDG compliance | Medium | Critical for cross-platform correctness |
| **Config Management Patterns** | JSON vs JSONC, merge vs replace, backup strategies | Medium | Platform configs differ significantly |
| **Annotated Source Code Walkthrough** | Line-by-line explanation of claude-code.ts with WHY comments | High | Like Gatsby's tutorial style |
| **Testing Strategy Guide** | How to mock platform detection, test idempotency, etc. | Medium | Reduces flaky tests and CI failures |
| **Checklist: "Is My Adapter Ready?"** | Pre-PR checklist contributors can self-verify | Low | Reduces review cycles |
| **Troubleshooting FAQ** | Common errors and solutions | Medium | Builds over time from real issues |
| **Architecture Decision Records** | WHY the interface is designed this way | Medium | Helps contributors make consistent decisions |
| **Code Snippets Library** | Copy-paste patterns for common scenarios | Medium | Accelerates implementation |

### Rationale (Differentiators)

From Auth0's SDK building principles and VS Code extension documentation:

1. **"Do I Need an Adapter?" flowchart** - Prevents contributors from starting doomed projects. Not every AI tool has the extension points GSD requires.

2. **Common mistakes** - Auth0 emphasizes "describe the problem first, then the solution." Documenting mistakes prevents them.

3. **Annotated walkthrough** - Gatsby's source plugin tutorial is the gold standard here. Each part builds on the previous, with thoroughly commented code.

4. **Pre-PR checklist** - Reduces both contributor frustration and maintainer review burden.

## Anti-Features (Avoid)

Features to deliberately NOT include. These hurt more than they help.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Auto-generated API docs only** | JSDoc extraction without prose is useless for learning | Write explanatory documentation that references the code |
| **Exhaustive edge case coverage upfront** | Overwhelms contributors, most won't need it | Start minimal, add edge cases to FAQ as they arise |
| **Multiple "correct" ways to do things** | Creates confusion, inconsistent codebase | Pick one pattern, document it, enforce it |
| **Platform-specific tutorials for each platform** | Maintenance nightmare, goes stale | One generic tutorial + platform-specific notes sections |
| **Video-only documentation** | Can't be searched, skimmed, or copy-pasted from | Written docs primary, videos supplementary |
| **Assumption of identity/auth expertise** | GSD adapters are about platform integration, not domain expertise | Explain what hooks/commands are; don't assume |
| **Deep internals documentation** | Contributors don't need to understand scheduler/orchestrator | Document interface contract only; internals are implementation detail |
| **Version-specific documentation branches** | GSD is pre-1.0, too early for this complexity | Single living document, note breaking changes inline |

### Rationale (Anti-Features)

From documentation writing principles (ConvoyPanel, Mattermost guidelines) and Auth0's empathy-driven approach:

1. **The curse of knowledge** - Documentation writers know too much. They document internals contributors don't need, overwhelming them.

2. **Cognitive load** - Every unnecessary concept depletes reader's mental capacity. Auth0: "Cognitive capacity is depleted faster by complex sentences, having to learn more than one concept at a time."

3. **Maintenance burden** - Platform-specific tutorials multiply maintenance. One tutorial with conditional sections is sustainable.

## Feature Dependencies

```
Interface Contract Reference
         │
         ├──> Method-by-Method Specification
         │              │
         │              └──> Behavioral Contracts
         │
         └──> Complete Working Example
                       │
                       ├──> Quick Start Guide
                       │
                       └──> Annotated Walkthrough (differentiator)
                                    │
                                    └──> Common Mistakes Section

Testing Requirements
         │
         └──> Testing Strategy Guide (differentiator)
                       │
                       └──> Pre-PR Checklist (differentiator)
```

## MVP Documentation Recommendation

For MVP, prioritize these in order:

1. **Interface Contract Reference** - Extract from `adapter.ts` to markdown
2. **Quick Start: "Your First Adapter"** - 30-minute path to working minimal adapter  
3. **Complete Working Example** - Annotate `claude-code.ts` as canonical
4. **Testing Requirements** - What tests exist, how to run them
5. **Directory Structure Diagram** - Where files go
6. **Behavioral Contracts** - Extract the 10 requirements from `adapter.ts` comments

**Defer to post-MVP:**
- Annotated walkthrough (high effort)
- Troubleshooting FAQ (needs real issues first)
- Architecture Decision Records (nice-to-have)
- Code snippets library (build over time)

## Reference Examples

Open source projects with excellent adapter/plugin documentation worth studying:

| Project | What They Do Well | Link |
|---------|-------------------|------|
| **Gatsby Source Plugins** | Multi-part tutorial, builds progressively, real working example | [gatsbyjs.com/docs/tutorial/creating-a-source-plugin](https://www.gatsbyjs.com/docs/tutorial/creating-a-source-plugin/) |
| **VS Code Extensions** | Clear capability overview, extensive samples repo, thorough API reference | [code.visualstudio.com/api](https://code.visualstudio.com/api) |
| **Auth0 SDKs** | Empathy-first, quick starts, language-specific idioms | [auth0.com/docs/libraries](https://auth0.com/docs/libraries) |
| **Solana Wallet Adapter** | Separate docs for apps vs wallet implementers | [github.com/anza-xyz/wallet-adapter](https://github.com/anza-xyz/wallet-adapter) |

### Key Patterns from References

1. **Gatsby**: "By the end of this part... you will:" at the start of each section. Clear outcomes.

2. **VS Code**: Exhaustive samples repo (vscode-extension-samples) with one sample per capability. Contributors learn by reading working code.

3. **Auth0**: "Listen to developers. Don't assume." They discovered developers struggled with token management and built a utility class. Empathy-driven.

4. **Solana**: Separate WALLET.md and APP.md for different audiences. GSD might need similar split (using adapters vs building adapters).

## Confidence

**Overall: HIGH**

| Aspect | Confidence | Rationale |
|--------|------------|-----------|
| Table Stakes | HIGH | Based on multiple authoritative sources (Gatsby, VS Code, Auth0) that converge on same patterns |
| Differentiators | HIGH | Directly derived from what separates "okay" docs from "excellent" docs in studied examples |
| Anti-Features | HIGH | Explicitly documented in writing guidelines (ConvoyPanel principles, Mattermost style guide) |
| MVP Priority | MEDIUM | Ordering is judgment call; may need adjustment based on contributor feedback |

### Sources

- Gatsby Source Plugin Tutorial: [gatsbyjs.com/docs/tutorial/creating-a-source-plugin](https://www.gatsbyjs.com/docs/tutorial/creating-a-source-plugin/)
- VS Code Extension API: [code.visualstudio.com/api](https://code.visualstudio.com/api)
- Auth0 "Guiding Principles for Building SDKs": [auth0.com/blog/guiding-principles-for-building-sdks](https://auth0.com/blog/guiding-principles-for-building-sdks/)
- liblab "How to Build an SDK": [liblab.com/blog/how-to-build-an-sdk](https://liblab.com/blog/how-to-build-an-sdk/)
- ConvoyPanel Documentation Principles: GitHub contributing guidelines
- Mattermost Developer Documentation Writing Guide
- Solana Wallet Adapter: [github.com/anza-xyz/wallet-adapter](https://github.com/anza-xyz/wallet-adapter)
- GSD codebase analysis: `src/platform/adapter.ts`, `src/platform/adapters/claude-code.ts`, `src/platform/paths.ts`
