import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootPath = fileURLToPath(new URL('../', import.meta.url));
const ignoredDirectories = new Set(['.git', 'node_modules']);
const javascriptFiles = findJavaScriptFiles(rootPath);

for (const file of javascriptFiles) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
}

const manifestPath = join(rootPath, 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const referencedAssets = [
  manifest.background.service_worker,
  manifest.action.default_popup,
  ...Object.values(manifest.icons),
  ...manifest.content_scripts.flatMap((script) => [
    ...script.js,
    ...script.css
  ])
];

for (const asset of referencedAssets) {
  if (!existsSync(join(rootPath, asset))) {
    throw new Error(`Manifest references missing asset: ${asset}`);
  }
}

const popupPath = join(rootPath, manifest.action.default_popup);
const popupHtml = readFileSync(popupPath, 'utf8');
const popupDirectory = dirname(popupPath);
const popupAssets = [
  ...popupHtml.matchAll(/(?:href|src)=["']([^"']+)["']/g)
]
  .map((match) => match[1])
  .filter((asset) => !/^(?:[a-z]+:|#)/i.test(asset));

for (const asset of popupAssets) {
  const path = normalize(join(popupDirectory, asset));
  if (!existsSync(path)) {
    throw new Error(`Popup references missing asset: ${asset}`);
  }
}

const sharedRuntimeEntries = manifest.content_scripts.filter((script) =>
  script.js.includes('content/shared.js')
);

if (
  sharedRuntimeEntries.length !== 1 ||
  sharedRuntimeEntries[0].run_at !== 'document_start'
) {
  throw new Error(
    'content/shared.js must be loaded exactly once at document_start.'
  );
}

console.log(`Checked ${javascriptFiles.length} JavaScript files.`);
console.log('Manifest and referenced assets are valid.');

function findJavaScriptFiles(directory) {
  const files = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) continue;

    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...findJavaScriptFiles(path));
    } else if (extname(entry.name) === '.js' || extname(entry.name) === '.mjs') {
      files.push(path);
    }
  }

  return files;
}
