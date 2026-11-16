#!/usr/bin/env node
// Tilføjer attributten `data-edit` til alle tekst-elementer, der kun indeholder ren tekst,
// så de kan redigeres via edit.js. Kan køres igen og igen uden at gøre skade.
//
//   node tools/tag-editable.js           -> markerer alle sider
//   node tools/tag-editable.js --check   -> skriver kun ud, ændrer intet (exit 1 hvis noget mangler)

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TAGS = 'h1|h2|h3|h4|h5|h6|p|li|a|span|figcaption|blockquote|td|th|dt|dd';
const OPEN_TAG = new RegExp('<(' + TAGS + ')(\\s[^>]*)?>', 'gi');
// Områder, hvor der aldrig skal markeres noget
const EXCLUDE = [
  /<!--[\s\S]*?-->/g,
  /<head[\s>][\s\S]*?<\/head>/gi,
  /<script[\s>][\s\S]*?<\/script>/gi,
  /<style[\s>][\s\S]*?<\/style>/gi,
  /<header[\s>][\s\S]*?<\/header>/gi,
  /<nav[\s>][\s\S]*?<\/nav>/gi,
  /<button[\s>][\s\S]*?<\/button>/gi,
];

function excludedRanges(src) {
  const ranges = [];
  EXCLUDE.forEach(function (re) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src))) ranges.push([m.index, m.index + m[0].length]);
  });
  return ranges;
}

function tagFile(src) {
  const ranges = excludedRanges(src);
  const inserts = [];
  let m;
  OPEN_TAG.lastIndex = 0;
  while ((m = OPEN_TAG.exec(src))) {
    const start = m.index;
    if (ranges.some(function (r) { return start >= r[0] && start < r[1]; })) continue;
    const attrs = m[2] || '';
    if (/\sdata-edit(?=[\s=>\/]|$)/.test(attrs)) continue;
    const contentStart = start + m[0].length;
    const nextLt = src.indexOf('<', contentStart);
    if (nextLt === -1) continue;
    const closing = '</' + m[1].toLowerCase() + '>';
    if (src.substr(nextLt, closing.length).toLowerCase() !== closing) continue; // ikke ren tekst
    if (!src.slice(contentStart, nextLt).trim()) continue; // tomt element
    // indsæt lige før '>' (eller før '/' i '/>')
    let at = contentStart - 1;
    if (src[at - 1] === '/') at -= 1;
    inserts.push(at);
  }
  let out = src;
  for (let i = inserts.length - 1; i >= 0; i--) {
    out = out.slice(0, inserts[i]) + ' data-edit' + out.slice(inserts[i]);
  }
  return { out: out, count: inserts.length };
}

function htmlFiles() {
  const files = [];
  [ROOT, path.join(ROOT, 'blog')].forEach(function (dir) {
    fs.readdirSync(dir).forEach(function (f) {
      if (f.endsWith('.html') && f !== 'login.html') files.push(path.join(dir, f));
    });
  });
  return files;
}

const checkOnly = process.argv.includes('--check');
let total = 0;
htmlFiles().forEach(function (file) {
  const src = fs.readFileSync(file, 'utf8');
  const res = tagFile(src);
  if (res.count) {
    total += res.count;
    console.log((checkOnly ? 'mangler ' : 'markerede ') + res.count + '\t' + path.relative(ROOT, file));
    if (!checkOnly) fs.writeFileSync(file, res.out);
  }
});
console.log(total ? 'I alt: ' + total : 'Alt er allerede markeret.');
if (checkOnly && total) process.exit(1);
