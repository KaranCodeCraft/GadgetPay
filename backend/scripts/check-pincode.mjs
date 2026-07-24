#!/usr/bin/env node
/**
 * CLI tool to check pincode serviceability metadata.
 *
 * Usage:
 *   node backend/scripts/check-pincode.mjs <pincode>
 *   node backend/scripts/check-pincode.mjs 560001
 *
 * Optional env vars:
 *   API_BASE  — default: http://localhost:4000/api/v1
 */

const pincode = process.argv[2];

if (!pincode) {
  console.error("Usage: node backend/scripts/check-pincode.mjs <pincode>");
  process.exit(1);
}

const base = process.env.API_BASE ?? "http://localhost:4000/api/v1";
const url = `${base}/serviceability/availability/${encodeURIComponent(pincode)}`;

console.log(`\nFetching: ${url}\n`);

let res;
try {
  res = await fetch(url);
} catch (err) {
  console.error(`Network error – is the backend running on ${base}?`);
  console.error(err.message);
  process.exit(1);
}

const body = await res.json().catch(() => null);

if (!res.ok) {
  console.error(`HTTP ${res.status} ${res.statusText}`);
  if (body) console.error(JSON.stringify(body, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(body, null, 2));
