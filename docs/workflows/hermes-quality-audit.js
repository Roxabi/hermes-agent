export const meta = {
  name: 'hermes-quality-audit',
  description: 'Run multi-agent code quality audit on roxabi-hermes',
  phases: [
    { title: 'Wave 1: Axial + Architecture', detail: 'Architecture analysis for P1-P5' },
    { title: 'Wave 2: Security', detail: 'Security audit for P1-P5' },
    { title: 'Wave 3: Code Smells', detail: 'Code smell detection for P1-P5' },
    { title: 'Wave 4: Tech Debt + Synthesis', detail: 'Tech debt scan and summary synthesis' },
  ],
}

const REPO = '/home/mickael/projects/roxabi-hermes'
const OUT = `${REPO}/artifacts/analyses/quality-audit`

const partitions = [
  { id: 'P1', name: 'agent+cli', patterns: 'agent/**/*.py hermes_cli/**/*.py', desc: 'Agent core + CLI (199 files)' },
  { id: 'P2', name: 'tools+scripts+root', patterns: 'tools/**/*.py scripts/**/*.py *.py', desc: 'Tools, scripts, root modules (130 files)' },
  { id: 'P3', name: 'gateway+infra', patterns: 'gateway/**/*.py acp_adapter/**/*.py tui_gateway/**/*.py providers/**/*.py cron/**/*.py', desc: 'Gateway, adapters, infra (80 files)' },
  { id: 'P4', name: 'plugins', patterns: 'plugins/**/*.py', desc: 'Plugins (122 files)' },
  { id: 'P5', name: 'skills', patterns: 'skills/**/*.py optional-skills/**/*.py', desc: 'Skills (91 files)' },
  { id: 'P6', name: 'deploy+docs', patterns: 'deploy/ docs/ docker/ website/ Dockerfile docker-compose.yml Makefile', desc: 'Roxabi-owned deploy + docs' },
]

function buildPrompt(domain, partition, extraFocus) {
  return `You are a ${domain} auditor for the Hermes Agent codebase (fork of nousresearch/hermes-agent).

Analyze partition: ${partition.id} — ${partition.desc}
Files: ${partition.patterns}
Repository root: ${REPO}

Focus areas:
${extraFocus}

Instructions:
1. Read the relevant files in the partition.
2. Identify issues and classify severity: P0 (critical), P1 (high), P2 (medium), P3 (low).
3. Output a markdown report with:
   - Summary
   - Findings table (severity | file | line | description | recommendation)
   - Metrics count
   - Top 3 quick wins

Write the report to: ${OUT}/${domain.toLowerCase().replace(/ /g, '-')}/${partition.id}.md
Return a JSON object with: { "issueCount": number, "p0": number, "p1": number, "p2": number, "p3": number, "quickWins": [string] }`
}

phase('Wave 1: Axial + Architecture')

const archResults = await parallel(partitions.map(p => () =>
  agent(buildPrompt('Architecture', p, `- Layer violations (e.g., CLI calling internals directly)
- Circular imports
- God modules / files > 1000 lines
- Coupling between agent/ and hermes_cli/`), {
    label: `arch-${p.id}`,
    phase: 'Wave 1: Axial + Architecture',
    schema: {
      type: 'object',
      properties: {
        issueCount: { type: 'integer' },
        p0: { type: 'integer' },
        p1: { type: 'integer' },
        p2: { type: 'integer' },
        p3: { type: 'integer' },
        quickWins: { type: 'array', items: { type: 'string' } }
      },
      required: ['issueCount', 'p0', 'p1', 'p2', 'p3', 'quickWins']
    }
  })
))

log(`Architecture wave complete. Results: ${archResults.filter(Boolean).map(r => `${r.issueCount} issues`).join(' | ')}`)

phase('Wave 2: Security')

const secResults = await parallel(partitions.map(p => () =>
  agent(buildPrompt('Security', p, `- OWASP Top 10 vectors
- Hardcoded credentials, API keys, tokens
- Path traversal in file operations
- SQL/command injection via tool calls
- Unsafe eval / exec
- Input validation gaps
- SSRF / open redirects
- Insecure deserialization`), {
    label: `sec-${p.id}`,
    phase: 'Wave 2: Security',
    schema: {
      type: 'object',
      properties: {
        issueCount: { type: 'integer' },
        p0: { type: 'integer' },
        p1: { type: 'integer' },
        p2: { type: 'integer' },
        p3: { type: 'integer' },
        quickWins: { type: 'array', items: { type: 'string' } }
      },
      required: ['issueCount', 'p0', 'p1', 'p2', 'p3', 'quickWins']
    }
  })
))

log(`Security wave complete. Results: ${secResults.filter(Boolean).map(r => `${r.issueCount} issues`).join(' | ')}`)

phase('Wave 3: Code Smells')

const smellResults = await parallel(partitions.map(p => () =>
  agent(buildPrompt('Code Smells', p, `- God classes / functions > 200 lines
- DRY violations (duplicate logic)
- Long parameter lists
- Feature envy
- Primitive obsession
- Dead code / unreachable branches
- Magic numbers / strings
- Deep nesting (> 4 levels)`), {
    label: `smell-${p.id}`,
    phase: 'Wave 3: Code Smells',
    schema: {
      type: 'object',
      properties: {
        issueCount: { type: 'integer' },
        p0: { type: 'integer' },
        p1: { type: 'integer' },
        p2: { type: 'integer' },
        p3: { type: 'integer' },
        quickWins: { type: 'array', items: { type: 'string' } }
      },
      required: ['issueCount', 'p0', 'p1', 'p2', 'p3', 'quickWins']
    }
  })
))

log(`Code Smells wave complete. Results: ${smellResults.filter(Boolean).map(r => `${r.issueCount} issues`).join(' | ')}`)

phase('Wave 4: Tech Debt + Synthesis')

const debtResults = await parallel(partitions.map(p => () =>
  agent(buildPrompt('Tech Debt', p, `- TODO / FIXME / HACK markers
- Deprecated API usage
- Type: ignore count
- Missing docstrings on public functions
- Outdated dependencies in pyproject.toml
- Hardcoded configuration`), {
    label: `debt-${p.id}`,
    phase: 'Wave 4: Tech Debt + Synthesis',
    schema: {
      type: 'object',
      properties: {
        issueCount: { type: 'integer' },
        p0: { type: 'integer' },
        p1: { type: 'integer' },
        p2: { type: 'integer' },
        p3: { type: 'integer' },
        quickWins: { type: 'array', items: { type: 'string' } }
      },
      required: ['issueCount', 'p0', 'p1', 'p2', 'p3', 'quickWins']
    }
  })
))

log(`Tech Debt wave complete. Results: ${debtResults.filter(Boolean).map(r => `${r.issueCount} issues`).join(' | ')}`)

// Synthesis
const allResults = {
  architecture: archResults.filter(Boolean),
  security: secResults.filter(Boolean),
  codeSmells: smellResults.filter(Boolean),
  techDebt: debtResults.filter(Boolean)
}

const totalIssues = Object.values(allResults).flat().reduce((s, r) => s + r.issueCount, 0)
const totalP0 = Object.values(allResults).flat().reduce((s, r) => s + r.p0, 0)
const totalP1 = Object.values(allResults).flat().reduce((s, r) => s + r.p1, 0)
const totalP2 = Object.values(allResults).flat().reduce((s, r) => s + r.p2, 0)
const totalP3 = Object.values(allResults).flat().reduce((s, r) => s + r.p3, 0)

log(`Synthesis: ${totalIssues} total issues | P0=${totalP0} P1=${totalP1} P2=${totalP2} P3=${totalP3}`)

return {
  totalIssues,
  totalP0,
  totalP1,
  totalP2,
  totalP3,
  allResults
}
