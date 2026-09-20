/**
 * test-search-cli.ts — Standalone CLI tool to test Firecrawl Search API (v2)
 *
 * Usage:
 *   bun run scripts/test-search-cli.ts "Austin, TX" --when "this weekend"
 *   bun run scripts/test-search-cli.ts --lat 30.2672 --lon -97.7431 --deep
 *   bun run scripts/test-search-cli.ts "Brooklyn, NY" --country US --limit 5
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(resolve(process.cwd(), '.env.local'));
loadEnvFile(resolve(process.cwd(), '.env'));

const API_KEY = process.env.FIRECRAWL_API_KEY ?? '';
const SEARCH_URL = 'https://api.firecrawl.dev/v2/search';

if (!API_KEY || API_KEY.includes('your_firecrawl_api_key')) {
  console.error(
    'Error: FIRECRAWL_API_KEY is not configured.\n' +
      'Add it to .env.local (FIRECRAWL_API_KEY=fc-...) or export it in your shell.'
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------

interface CliArgs {
  location?: string;
  lat?: number;
  lon?: number;
  when: string;
  limit: number;
  country: string;
  sites: string[];
  deep: boolean;
  json: boolean;
  out?: string;
  timeout: number;
}

function usage(): never {
  console.error(`Discover local events via Firecrawl search.

USAGE:
  bun run scripts/test-search-cli.ts "<location name>" [options]
  bun run scripts/test-search-cli.ts --lat <number> --lon <number> [options]

MODES:
  (default)         Fast mode — search metadata only
  --deep            Deep search — scrapes result pages and extracts details

OPTIONS:
  --limit <n>       Max results (1-100, default 5)
  --when <phrase>   Time filter: "this weekend", "today", "this week", "this month"
  --country <code>  ISO country code (default: US or FIRECRAWL_COUNTRY)
  --sites <list>    Comma-separated domains to restrict results
  --json            Print raw JSON
  --out <file>      Save results to JSON file
  -h, --help        Show this help`);
  process.exit(1);
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    when: 'this weekend',
    limit: 5,
    country: process.env.FIRECRAWL_COUNTRY ?? 'US',
    sites: [],
    deep: false,
    json: false,
    timeout: 60_000,
  };
  const positionals: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    switch (arg) {
      case '-h':
      case '--help':
        usage();
      case '--deep':
        args.deep = true;
        break;
      case '--lat':
        args.lat = Number(next);
        if (Number.isNaN(args.lat)) usage();
        i++;
        break;
      case '--lon':
        args.lon = Number(next);
        if (Number.isNaN(args.lon)) usage();
        i++;
        break;
      case '--limit': {
        args.limit = Number(next);
        if (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > 100) usage();
        i++;
        break;
      }
      case '--when':
        args.when = next;
        i++;
        break;
      case '--country':
        args.country = next;
        i++;
        break;
      case '--sites':
        args.sites = next.split(',').map((s) => s.trim()).filter(Boolean);
        i++;
        break;
      case '--out':
        args.out = next;
        i++;
        break;
      case '--json':
        args.json = true;
        break;
      case '--timeout':
        args.timeout = Number(next);
        if (Number.isNaN(args.timeout)) usage();
        i++;
        break;
      default:
        if (arg.startsWith('-')) usage();
        positionals.push(arg);
    }
  }

  if (positionals.length === 1 && positionals[0].includes(',')) {
    const [latStr, lonStr] = positionals[0].split(',');
    const lat = Number(latStr);
    const lon = Number(lonStr);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      args.lat = lat;
      args.lon = lon;
    } else {
      args.location = positionals[0].trim();
    }
  } else {
    const loc = positionals.join(' ').trim();
    if (loc) args.location = loc;
  }

  if (!args.location && args.lat === undefined) {
    args.location = 'Brooklyn / New York City';
  }

  if (args.deep && args.timeout === 60_000) args.timeout = 90_000;
  return args;
}

// ---------------------------------------------------------------------------
// Reverse geocoding (OpenStreetMap Nominatim)
// ---------------------------------------------------------------------------

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=12`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'SideDoor-Scout/1.0 (local CLI tool)' },
  });
  if (!res.ok) throw new Error(`Reverse geocoding failed: HTTP ${res.status}`);
  const data = (await res.json()) as { address?: Record<string, string>; display_name?: string; name?: string };

  const a = data.address ?? {};
  const parts = [a.city ?? a.town ?? a.village ?? a.municipality ?? data.name, a.state, a.country].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : data.display_name ?? `${lat},${lon}`;
}

// ---------------------------------------------------------------------------
// Firecrawl search
// ---------------------------------------------------------------------------

interface WebResult {
  url: string;
  title?: string;
  description?: string;
  markdown?: string;
}

interface SearchResponse {
  success: boolean;
  data?: { web?: WebResult[] };
  warning?: string | null;
  error?: string;
}

async function searchEvents(args: CliArgs, location: string): Promise<SearchResponse> {
  const query = `${location} events ${args.when}`.trim();

  const body: Record<string, unknown> = {
    query,
    limit: args.limit,
    location,
    country: args.country,
    timeout: args.timeout,
    highlights: false,
  };
  if (args.sites.length > 0) body.includeDomains = args.sites;
  if (args.deep) {
    body.scrapeOptions = { formats: ['markdown'], onlyMainContent: true };
  }

  const res = await fetch(SEARCH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = (await res.json()) as SearchResponse;
  if (!res.ok || !payload.success) {
    const msg = payload.error ?? `HTTP ${res.status}`;
    throw new Error(`Firecrawl search failed: ${msg}`);
  }
  return payload;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  let location = args.location;
  if (!location && args.lat !== undefined && args.lon !== undefined) {
    console.log(`Resolving coordinates (${args.lat}, ${args.lon})...`);
    location = await reverseGeocode(args.lat, args.lon);
    console.log(`Resolved to: ${location}`);
  }

  console.log(
    `Searching for events in "${location}" (${args.when}) [Country: ${args.country}] — ${args.deep ? 'DEEP' : 'FAST'} mode...`
  );
  const response = await searchEvents(args, location!);
  const results = response.data?.web ?? [];
  if (response.warning) console.warn(`Warning: ${response.warning}`);

  const output = {
    query: `${location} events ${args.when}`.trim(),
    mode: args.deep ? 'deep' : 'fast',
    location: location!,
    country: args.country,
    when: args.when,
    count: results.length,
    results: results.map((r) => ({
      title: r.title,
      url: r.url,
      description: r.description,
    })),
  };

  if (args.json) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log(`\nEvents — ${output.location} (${output.when}) [${output.mode} mode]`);
    console.log('='.repeat(64));
    if (output.count === 0) {
      console.log('No results found.');
      return;
    }
    output.results.forEach((r, i) => {
      console.log(`\n${i + 1}. ${r.title ?? r.url}`);
      console.log(`   ${r.url}`);
      if (r.description) console.log(`   ${r.description.replace(/\s+/g, ' ').slice(0, 200)}`);
    });
    console.log(`\n${output.count} result(s) found.`);
  }

  if (args.out) {
    writeFileSync(resolve(args.out), JSON.stringify(output, null, 2));
    console.log(`Saved JSON to ${resolve(args.out)}`);
  }
}

main().catch((err: unknown) => {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
