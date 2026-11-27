import { readdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';
async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else if (full.endsWith('.html')) files.push(full);
  }
  return files;
}
const files = await walk('dist');
const missing = new Set();
const structural = [];
for (const file of files) {
  const html = await readFile(file, 'utf8');
  if ((html.match(/<h1(?:\s|>)/g) ?? []).length !== 1) structural.push(`${file}: expected one h1`);
  const ids = [...html.matchAll(/\sid=["']([^"']+)["']/g)].map((item) => item[1]);
  if (new Set(ids).size !== ids.length) structural.push(`${file}: duplicate id`);
  for (const match of html.matchAll(/\shref=["'](\/[^"']*)["']/g)) {
    const url = new URL(match[1], 'https://example.test');
    if (/\.[a-z0-9]+$/i.test(url.pathname)) continue;
    const target = path.join('dist', decodeURIComponent(url.pathname), 'index.html');
    try {
      await access(target);
    } catch {
      missing.add(`${file}: ${url.pathname}`);
    }
  }
}
if (missing.size || structural.length) {
  console.error([...structural, ...missing].join('\n'));
  process.exitCode = 1;
} else console.log('Rendered HTML: internal page links, unique IDs and one h1 verified.');
