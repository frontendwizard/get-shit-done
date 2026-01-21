# GSD MCP Server Architecture

**Created:** 2025-01-21
**Question:** How should the MCP server be structured? Per-project? Global?

---

## The Core Question

MCP servers can be structured different ways:

1. **Global server** - One server, handles all projects
2. **Per-project server** - Each project runs its own instance
3. **Hybrid** - Global server that detects project context

Which fits GSD best?

---

## How GSD Currently Works (For Reference)

```
~/.claude/                          # Global Claude Code config
├── settings.json                   # Hooks, commands registered here
├── commands/gsd/                   # GSD commands (global)
├── agents/                         # GSD agents (global)
├── hooks/                          # GSD hooks (global)
└── get-shit-done/                  # Workflows, templates (global)

/path/to/my-project/                # A specific project
├── .planning/                      # Project-specific brain
│   ├── PROJECT.md
│   ├── REQUIREMENTS.md
│   ├── ROADMAP.md
│   ├── STATE.md
│   ├── intel/                      # Project-specific intelligence
│   │   ├── index.json
│   │   ├── graph.db
│   │   ├── summary.md
│   │   └── entities/
│   └── phases/
└── src/                            # Project source code
```

**Key insight:** GSD code is global, but project data is local.

The hooks already handle this:
```javascript
// gsd-intel-session.js finds project root dynamically
function findProjectRoot(startDir) {
  let dir = startDir;
  while (dir !== '/') {
    if (fs.existsSync(path.join(dir, '.planning', 'intel'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return null;
}
```

---

## Recommended Architecture: Global Server, Project-Aware

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         MCP SERVER ARCHITECTURE                          │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    GSD MCP SERVER (Global)                       │    │
│  │                                                                  │    │
│  │  Installed at: ~/.claude/mcp-servers/gsd/                       │    │
│  │  Started by: Claude Code on session start                       │    │
│  │  Lifecycle: Lives for duration of Claude session                │    │
│  │                                                                  │    │
│  │  ┌────────────────────────────────────────────────────────┐     │    │
│  │  │              PROJECT CONTEXT DETECTION                  │     │    │
│  │  │                                                         │     │    │
│  │  │  1. Get cwd from Claude's environment                  │     │    │
│  │  │  2. Walk up to find .planning/ directory               │     │    │
│  │  │  3. Load that project's intel data                     │     │    │
│  │  │  4. Cache for performance                              │     │    │
│  │  └────────────────────────────────────────────────────────┘     │    │
│  │                              │                                   │    │
│  │                              ▼                                   │    │
│  │  ┌────────────────────────────────────────────────────────┐     │    │
│  │  │                   DATA ADAPTERS                         │     │    │
│  │  │                                                         │     │    │
│  │  │  ProjectAdapter     - Reads PROJECT.md, REQUIREMENTS.md │     │    │
│  │  │  RoadmapAdapter     - Reads ROADMAP.md, STATE.md        │     │    │
│  │  │  IntelAdapter       - Reads index.json, graph.db        │     │    │
│  │  │  PhaseAdapter       - Reads phases/, PLAN.md, SUMMARY   │     │    │
│  │  └────────────────────────────────────────────────────────┘     │    │
│  │                              │                                   │    │
│  │                              ▼                                   │    │
│  │  ┌────────────────────────────────────────────────────────┐     │    │
│  │  │                   MCP INTERFACE                         │     │    │
│  │  │                                                         │     │    │
│  │  │  Tools:     gsd_query_intel, gsd_blast_radius, ...     │     │    │
│  │  │  Resources: gsd://project/vision, gsd://intel/...      │     │    │
│  │  │  Prompts:   spawn/planner, spawn/executor, ...         │     │    │
│  │  └────────────────────────────────────────────────────────┘     │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│                                    │ stdio                               │
│                                    ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                         CLAUDE CODE                              │    │
│  │                                                                  │    │
│  │  Working directory: /path/to/my-project/                        │    │
│  │                                                                  │    │
│  │  Claude/Agents call MCP tools:                                  │    │
│  │    mcp__gsd__query_intel({ query: "auth" })                     │    │
│  │    mcp__gsd__blast_radius({ file: "src/lib/db.ts" })            │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│                                    ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    PROJECT DATA (Local)                          │    │
│  │                                                                  │    │
│  │  /path/to/my-project/.planning/                                 │    │
│  │    ├── intel/index.json    ← MCP reads                          │    │
│  │    ├── intel/graph.db      ← MCP queries                        │    │
│  │    ├── PROJECT.md          ← MCP parses                         │    │
│  │    └── ...                                                      │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Why Global Server, Not Per-Project?

| Approach | Pros | Cons |
|----------|------|------|
| **Global** | Single install, one process, simpler config | Must detect project context |
| **Per-project** | Isolated config | Multiple installs, multiple processes, complex setup |

**Global wins because:**

1. **GSD is already global** - Commands, agents, hooks are in `~/.claude/`
2. **Project detection is solved** - Hooks already do this (find `.planning/`)
3. **Simpler UX** - Install once, works everywhere
4. **Resource efficient** - One process, not N processes

---

## Installation & Configuration

### During GSD Install (`npx get-shit-done-cc`)

```javascript
// bin/install.js additions

// 1. Create MCP server directory
const mcpServerDir = path.join(claudeConfigDir, 'mcp-servers', 'gsd');
fs.mkdirSync(mcpServerDir, { recursive: true });

// 2. Copy MCP server files
copyDir(path.join(__dirname, '../mcp-server'), mcpServerDir);

// 3. Register in settings.json
const settings = readSettings();
settings.mcpServers = settings.mcpServers || {};
settings.mcpServers.gsd = {
  command: 'node',
  args: [path.join(mcpServerDir, 'index.js')],
  env: {}
};
writeSettings(settings);
```

### Resulting Configuration

```json
// ~/.claude/settings.json
{
  "hooks": {
    "PostToolUse": [...],
    "SessionStart": [...],
    "Stop": [...]
  },
  "mcpServers": {
    "gsd": {
      "command": "node",
      "args": ["~/.claude/mcp-servers/gsd/index.js"],
      "env": {}
    }
  }
}
```

---

## Server Implementation

### Directory Structure

```
~/.claude/mcp-servers/gsd/
├── index.js                 # Entry point
├── package.json
├── lib/
│   ├── server.js           # MCP server setup
│   ├── project-detector.js # Find .planning/ from cwd
│   ├── adapters/
│   │   ├── project.js      # Read PROJECT.md, REQUIREMENTS.md
│   │   ├── roadmap.js      # Read ROADMAP.md, STATE.md
│   │   ├── intel.js        # Read index.json, query graph.db
│   │   └── phase.js        # Read phases/, plans, summaries
│   ├── tools/
│   │   ├── query-intel.js
│   │   ├── blast-radius.js
│   │   ├── verify-behavior.js
│   │   ├── phase-status.js
│   │   └── ...
│   └── resources/
│       ├── project.js      # gsd://project/*
│       ├── intel.js        # gsd://intel/*
│       └── phase.js        # gsd://phase/*
└── node_modules/
    ├── @anthropic/mcp-sdk
    └── sql.js              # For graph queries
```

### Core Server Code

```typescript
// index.js
import { McpServer } from '@anthropic/mcp-sdk';
import { detectProject } from './lib/project-detector.js';
import { registerTools } from './lib/tools/index.js';
import { registerResources } from './lib/resources/index.js';

class GsdMcpServer {
  private server: McpServer;
  private projectRoot: string | null = null;
  private adapters: Adapters | null = null;

  constructor() {
    this.server = new McpServer({
      name: 'gsd',
      version: '1.0.0',
      description: 'GSD Codebase Intelligence Server'
    });
  }

  async initialize() {
    // Detect project from cwd
    this.projectRoot = detectProject(process.cwd());

    if (this.projectRoot) {
      // Load adapters for this project
      this.adapters = await loadAdapters(this.projectRoot);
    }

    // Register tools (always available, but may return "no project" errors)
    registerTools(this.server, () => this.adapters);

    // Register resources
    registerResources(this.server, () => this.adapters);

    // Start listening
    await this.server.listen();
  }
}

const server = new GsdMcpServer();
server.initialize();
```

### Project Detection

```typescript
// lib/project-detector.js

import * as fs from 'fs';
import * as path from 'path';

export function detectProject(startDir: string): string | null {
  let dir = startDir;

  while (dir !== '/' && dir !== '') {
    const planningDir = path.join(dir, '.planning');

    if (fs.existsSync(planningDir)) {
      // Verify it's a GSD project (has expected structure)
      const hasProject = fs.existsSync(path.join(planningDir, 'PROJECT.md'));
      const hasIntel = fs.existsSync(path.join(planningDir, 'intel'));

      if (hasProject || hasIntel) {
        return dir;
      }
    }

    dir = path.dirname(dir);
  }

  return null;
}
```

### Adapters (Data Access Layer)

```typescript
// lib/adapters/intel.js

import * as fs from 'fs';
import * as path from 'path';
import initSqlJs from 'sql.js';

export class IntelAdapter {
  private intelDir: string;
  private index: IndexData | null = null;
  private db: Database | null = null;

  constructor(projectRoot: string) {
    this.intelDir = path.join(projectRoot, '.planning', 'intel');
  }

  async initialize() {
    // Load index.json
    const indexPath = path.join(this.intelDir, 'index.json');
    if (fs.existsSync(indexPath)) {
      this.index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    }

    // Load graph.db
    const graphPath = path.join(this.intelDir, 'graph.db');
    if (fs.existsSync(graphPath)) {
      const SQL = await initSqlJs();
      const buffer = fs.readFileSync(graphPath);
      this.db = new SQL.Database(buffer);
    }
  }

  // Query methods
  getHotspots(limit: number = 10): Hotspot[] {
    if (!this.db) return [];

    const result = this.db.exec(`
      SELECT n.id, n.path, json_extract(n.body, '$.purpose') as purpose,
             COUNT(e.source) as dependents
      FROM nodes n
      LEFT JOIN edges e ON n.id = e.target
      GROUP BY n.id
      ORDER BY dependents DESC
      LIMIT ?
    `, [limit]);

    return result[0]?.values.map(row => ({
      id: row[0],
      path: row[1],
      purpose: row[2],
      dependents: row[3]
    })) || [];
  }

  getBlastRadius(fileId: string, maxDepth: number = 3): BlastRadius {
    if (!this.db) return { directDependents: [], transitiveDependents: [] };

    // Recursive CTE for transitive dependents
    const result = this.db.exec(`
      WITH RECURSIVE affected AS (
        SELECT source as id, 1 as depth
        FROM edges WHERE target = ?
        UNION ALL
        SELECT e.source, a.depth + 1
        FROM edges e
        JOIN affected a ON e.target = a.id
        WHERE a.depth < ?
      )
      SELECT DISTINCT a.id, n.path, json_extract(n.body, '$.purpose') as purpose,
             MIN(a.depth) as depth
      FROM affected a
      JOIN nodes n ON a.id = n.id
      GROUP BY a.id
      ORDER BY depth, a.id
    `, [fileId, maxDepth]);

    // ... process results
  }

  searchByKeywords(keywords: string[]): SearchResult[] {
    if (!this.db) return [];

    const conditions = keywords.map(k =>
      `(n.path LIKE '%${k}%' OR json_extract(n.body, '$.purpose') LIKE '%${k}%')`
    ).join(' OR ');

    const result = this.db.exec(`
      SELECT n.id, n.path, json_extract(n.body, '$.purpose') as purpose,
             json_extract(n.body, '$.type') as type
      FROM nodes n
      WHERE ${conditions}
      ORDER BY n.id
    `);

    // ... process results
  }

  getEntityPurpose(fileId: string): string | null {
    const entityPath = path.join(this.intelDir, 'entities', `${fileId}.md`);
    if (!fs.existsSync(entityPath)) return null;

    const content = fs.readFileSync(entityPath, 'utf8');
    const purposeMatch = content.match(/## Purpose\n\n([\s\S]*?)(?=\n## |$)/);
    return purposeMatch?.[1]?.trim() || null;
  }
}
```

### Tool Implementations

```typescript
// lib/tools/query-intel.js

import { z } from 'zod';

export const queryIntelTool = {
  name: 'gsd_query_intel',
  description: 'Search codebase intelligence for files matching a query',

  inputSchema: z.object({
    query: z.string().describe('Keywords or natural language query'),
    include_purposes: z.boolean().default(true),
    include_blast_radius: z.boolean().default(false),
    max_results: z.number().default(10),
    type_filter: z.enum(['service', 'api', 'util', 'component', 'model', 'config', 'all']).default('all')
  }),

  async handler(input: QueryIntelInput, adapters: Adapters) {
    if (!adapters) {
      return {
        error: 'No GSD project detected. Run /gsd:new-project or /gsd:analyze-codebase first.'
      };
    }

    const keywords = extractKeywords(input.query);
    let results = adapters.intel.searchByKeywords(keywords);

    // Apply type filter
    if (input.type_filter !== 'all') {
      results = results.filter(r => r.type === input.type_filter);
    }

    // Limit results
    results = results.slice(0, input.max_results);

    // Enrich with purposes
    if (input.include_purposes) {
      for (const result of results) {
        result.purpose = adapters.intel.getEntityPurpose(result.id) || result.purpose;
      }
    }

    // Add blast radius
    if (input.include_blast_radius) {
      for (const result of results) {
        const blast = adapters.intel.getBlastRadius(result.id, 1);
        result.directDependents = blast.directDependents.length;
      }
    }

    return { files: results };
  }
};
```

```typescript
// lib/tools/blast-radius.js

export const blastRadiusTool = {
  name: 'gsd_blast_radius',
  description: 'Analyze what would be affected by changing a file',

  inputSchema: z.object({
    file: z.string().describe('File path or entity ID'),
    max_depth: z.number().default(3).describe('How many levels of dependencies to trace'),
    change_type: z.enum(['any', 'signature_change', 'behavior_change', 'deletion']).default('any')
  }),

  async handler(input: BlastRadiusInput, adapters: Adapters) {
    if (!adapters) {
      return { error: 'No GSD project detected.' };
    }

    const fileId = pathToEntityId(input.file);
    const blast = adapters.intel.getBlastRadius(fileId, input.max_depth);

    // Categorize by risk
    const critical = blast.transitiveDependents.filter(d =>
      d.path.includes('service') || d.path.includes('api')
    );
    const tests = blast.transitiveDependents.filter(d =>
      d.path.includes('.test.') || d.path.includes('.spec.')
    );

    return {
      file: input.file,
      directDependents: blast.directDependents.length,
      transitiveDependents: blast.transitiveDependents.length,
      totalAffected: blast.directDependents.length + blast.transitiveDependents.length,
      criticalFiles: critical.map(c => c.path),
      testFiles: tests.map(t => t.path),
      recommendation: generateRecommendation(input.change_type, blast),
      details: blast
    };
  }
};
```

---

## Resource Implementation

```typescript
// lib/resources/intel.js

export const intelResources = {
  'gsd://intel/summary': {
    description: 'Codebase intelligence summary',
    async handler(adapters: Adapters) {
      const summaryPath = path.join(adapters.projectRoot, '.planning', 'intel', 'summary.md');
      if (fs.existsSync(summaryPath)) {
        return fs.readFileSync(summaryPath, 'utf8');
      }
      return 'No intelligence summary available. Run /gsd:analyze-codebase.';
    }
  },

  'gsd://intel/hotspots': {
    description: 'Top 10 most-depended files',
    async handler(adapters: Adapters) {
      const hotspots = adapters.intel.getHotspots(10);
      return formatHotspots(hotspots);
    }
  },

  'gsd://intel/conventions': {
    description: 'Detected naming and structural conventions',
    async handler(adapters: Adapters) {
      return adapters.intel.getConventions();
    }
  },

  'gsd://intel/entity/:id': {
    description: 'Semantic entity details for a specific file',
    async handler(adapters: Adapters, params: { id: string }) {
      const entityPath = path.join(
        adapters.projectRoot, '.planning', 'intel', 'entities', `${params.id}.md`
      );
      if (fs.existsSync(entityPath)) {
        return fs.readFileSync(entityPath, 'utf8');
      }
      return `Entity not found: ${params.id}`;
    }
  }
};
```

```typescript
// lib/resources/project.js

export const projectResources = {
  'gsd://project/vision': {
    description: 'Project vision and core value from PROJECT.md',
    async handler(adapters: Adapters) {
      const project = adapters.project.read();
      return extractSection(project, 'Vision') + '\n\n' + extractSection(project, 'Core Value');
    }
  },

  'gsd://project/requirements/pending': {
    description: 'Requirements not yet completed',
    async handler(adapters: Adapters) {
      const reqs = adapters.requirements.read();
      return reqs.filter(r => r.status !== 'completed');
    }
  },

  'gsd://project/decisions': {
    description: 'Key decisions made during project',
    async handler(adapters: Adapters) {
      const project = adapters.project.read();
      return extractSection(project, 'Key Decisions');
    }
  }
};
```

---

## How Agents Would Use MCP

### gsd-planner Agent Update

```markdown
# gsd-planner agent (updated)

<role>
You create executable PLAN.md files for GSD phases.
</role>

<mcp_tools>
You have access to these MCP tools - USE THEM before creating plans:

**gsd_phase_relevant_files**
Query files relevant to the current phase goal. Always call this first.
```typescript
mcp__gsd__phase_relevant_files({
  phase_goal: "Add rate limiting to auth endpoints",
  include_purposes: true,
  include_blast_radius: true
})
```

**gsd_codebase_patterns**
Discover existing patterns in the codebase for consistency.
```typescript
mcp__gsd__codebase_patterns({
  query: "middleware patterns",
  include_examples: true
})
```

**gsd_similar_past_work**
Learn from previous phases that did similar work.
```typescript
mcp__gsd__similar_past_work({
  current_goal: "Add Stripe integration"
})
```
</mcp_tools>

<planning_process>
1. **FIRST**: Call gsd_phase_relevant_files to understand what exists
2. **SECOND**: Call gsd_codebase_patterns to learn conventions
3. **THIRD**: Check gsd_similar_past_work for lessons learned
4. **THEN**: Create plans based on actual codebase knowledge
</planning_process>
```

### gsd-executor Agent Update

```markdown
# gsd-executor agent (updated)

<mcp_tools>
Before editing high-impact files, check blast radius:

**gsd_blast_radius**
```typescript
mcp__gsd__blast_radius({
  file: "src/lib/db.ts",
  change_type: "signature_change"
})
```

If blast_radius > 10, consider:
- Making change backward-compatible
- Adding deprecation instead of breaking change
- Documenting migration path
</mcp_tools>
```

### gsd-verifier Agent Update

```markdown
# gsd-verifier agent (updated)

<mcp_tools>
Use structured queries instead of manual file reads:

**gsd_verify_behavior**
```typescript
mcp__gsd__verify_behavior({
  must_have: "Users can reset password via email",
  check_type: "behavior"
})
```

**gsd_verify_artifact**
```typescript
mcp__gsd__verify_artifact({
  must_exist: "POST /api/auth/reset-password endpoint",
  check_type: "endpoint"
})
```

**gsd_requirement_status**
```typescript
mcp__gsd__requirement_status({
  requirement_id: "AUTH-03"
})
```
</mcp_tools>
```

---

## Data Flow Summary

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           DATA FLOW                                      │
│                                                                          │
│  ┌─────────────┐                                                        │
│  │   Hooks     │                                                        │
│  │             │                                                        │
│  │ Write/Edit  │──▶ gsd-intel-index.js ──▶ .planning/intel/            │
│  │             │                              ├── index.json            │
│  │             │                              ├── graph.db              │
│  │             │                              └── entities/*.md         │
│  └─────────────┘                                                        │
│        │                                              │                  │
│        │ Captures                                     │ Reads            │
│        ▼                                              ▼                  │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      MCP SERVER                                  │    │
│  │                                                                  │    │
│  │   Adapters read .planning/ ──▶ Tools return structured data     │    │
│  │                                                                  │    │
│  │   IntelAdapter.getHotspots() ──▶ gsd_query_intel response       │    │
│  │   IntelAdapter.getBlastRadius() ──▶ gsd_blast_radius response   │    │
│  │   ProjectAdapter.getVision() ──▶ gsd://project/vision resource  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│                                    │ MCP Protocol                        │
│                                    ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                         AGENTS                                   │    │
│  │                                                                  │    │
│  │   gsd-planner:  mcp__gsd__phase_relevant_files(...)             │    │
│  │   gsd-executor: mcp__gsd__blast_radius(...)                     │    │
│  │   gsd-verifier: mcp__gsd__verify_behavior(...)                  │    │
│  │                                                                  │    │
│  │   Receive: Structured, queryable intelligence                   │    │
│  │   Instead of: Raw file reads                                    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## File Structure After Implementation

```
~/.claude/
├── settings.json                    # Registers MCP server
├── commands/gsd/                    # GSD commands (unchanged)
├── agents/                          # GSD agents (updated with MCP tools)
│   ├── gsd-planner.md              # + MCP tool instructions
│   ├── gsd-executor.md             # + MCP tool instructions
│   └── gsd-verifier.md             # + MCP tool instructions
├── hooks/                           # GSD hooks (unchanged - still capture)
│   ├── gsd-intel-index.js
│   ├── gsd-intel-session.js
│   └── gsd-intel-prune.js
├── mcp-servers/
│   └── gsd/                         # NEW: MCP server
│       ├── index.js
│       ├── package.json
│       └── lib/
│           ├── server.js
│           ├── project-detector.js
│           ├── adapters/
│           ├── tools/
│           └── resources/
└── get-shit-done/                   # Workflows, templates (unchanged)

/path/to/project/
└── .planning/                       # Project data (unchanged structure)
    ├── intel/                       # MCP reads this
    ├── PROJECT.md                   # MCP reads this
    ├── REQUIREMENTS.md              # MCP reads this
    └── ...
```

---

## Summary

| Question | Answer |
|----------|--------|
| **Per-project or global?** | Global server, project-aware |
| **How detect project?** | Walk up from cwd to find `.planning/` |
| **Where installed?** | `~/.claude/mcp-servers/gsd/` |
| **How configured?** | Via `settings.json` mcpServers entry |
| **What reads data?** | Adapters that understand GSD file formats |
| **Who consumes?** | GSD agents (planner, executor, verifier) |
| **Relationship to hooks?** | Hooks capture → MCP serves |

**The MCP server is the query layer for data that hooks capture.**
