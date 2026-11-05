// Read-only refresh of the on-screen numbers for VibeMonitorDataFilm.
// Usage: node refresh-neon-data.mjs <path-to-.env> [--dry]
// Reads ONLY DATABASE_URL from the env file, runs aggregate SELECTs inside a READ ONLY transaction,
// and writes src/projects/vibe-monitor-1-0-data-20261103/data.json. Never prints the URL; no per-user rows leave the DB.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const [envPath, flag] = process.argv.slice(2);
if (!envPath) { console.error('usage: node refresh-neon-data.mjs <.env path> [--dry]'); process.exit(2); }
const line = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).find((l) => /^\s*(export\s+)?DATABASE_URL\s*=/.test(l));
if (!line) { console.error('DATABASE_URL not found in env file'); process.exit(2); }
const url = line.replace(/^\s*(export\s+)?DATABASE_URL\s*=\s*/, '').replace(/^['"]|['"]$/g, '').trim();

const require = createRequire(process.env.PG_MODULE_DIR ? path.join(process.env.PG_MODULE_DIR, 'x.js') : import.meta.url);
const {Client} = require('pg');
const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, '../../src/projects/vibe-monitor-1-0-data-20261103/data.json');

const client = new Client({connectionString: url, ssl: {rejectUnauthorized: true}});
await client.connect();
try {
  await client.query('BEGIN TRANSACTION READ ONLY');
  const one = async (sql) => (await client.query(sql)).rows[0];
  const inst = await one(`SELECT count(*)::int AS total,
      count(*) FILTER (WHERE last_seen_at > now() - interval '7 days')::int AS active7d FROM installations`);
  const ev = await one(`SELECT count(*)::bigint AS events,
      count(DISTINCT project_id)::int AS projects,
      count(*) FILTER (WHERE event = 'finding.observed')::bigint AS observed,
      count(*) FILTER (WHERE event = 'finding.improved')::bigint AS improved,
      count(*) FILTER (WHERE event = 'notice.surfaced')::bigint AS surfaced FROM events`);
  const agents = (await client.query(`SELECT coalesce(nullif(lower(agent), ''), 'unknown') AS agent, count(*)::bigint AS n
      FROM events GROUP BY 1 ORDER BY 2 DESC`)).rows;
  await client.query('ROLLBACK');

  const total = agents.reduce((a, r) => a + Number(r.n), 0) || 1;
  const top = agents[0];
  const label = (a) => ({codex: 'Codex', claude: 'Claude Code', 'claude-code': 'Claude Code', cursor: 'Cursor', antigravity: 'Antigravity', trae: 'TRAE'}[a] || a);
  const prev = JSON.parse(fs.readFileSync(out, 'utf8'));
  const next = {
    ...prev,
    live: true,
    asOf: new Date().toISOString().slice(0, 10),
    source: 'Neon 生产库只读聚合（refresh-neon-data.mjs, READ ONLY 事务）',
    installations: inst.total,
    active7d: inst.active7d,
    projects: ev.projects,
    events: Number(ev.events),
    findingObserved: Number(ev.observed),
    findingImproved: Number(ev.improved),
    noticeSurfaced: Number(ev.surfaced),
    agents: [
      {name: label(top.agent), share: Number(top.n) / total},
      {name: '其他 Agent', share: 1 - Number(top.n) / total},
    ],
  };
  console.log(JSON.stringify({...next, agentsRaw: agents.map((r) => ({agent: r.agent, n: Number(r.n)}))}, null, 2));
  if (flag !== '--dry') { fs.writeFileSync(out, JSON.stringify(next, null, 2) + '\n'); console.log('wrote', out); }
} finally {
  await client.end();
}
