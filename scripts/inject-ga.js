#!/usr/bin/env node
/**
 * inject-ga.js
 *
 * Post-build script: injects Google Analytics 4 tracking into the Expo Metro
 * generated dist/index.html.  Expo Metro (output: "single") auto-generates the
 * HTML file and ignores web/index.html, so GA4 must be injected after the
 * export step.
 *
 * Usage:
 *   node scripts/inject-ga.js [dist/index.html]
 *
 * Env vars:
 *   EXPO_PUBLIC_GA_ID  — GA4 Measurement ID (default: G-X09N3J8X17)
 */

const fs = require('fs');
const path = require('path');

const GA_ID = process.env.EXPO_PUBLIC_GA_ID || 'G-X09N3J8X17';
const target = process.argv[2] || path.join(__dirname, '..', 'dist', 'index.html');

if (!fs.existsSync(target)) {
  console.error(`inject-ga: target file not found: ${target}`);
  process.exit(1);
}

const html = fs.readFileSync(target, 'utf8');

if (html.includes('googletagmanager.com')) {
  console.log('inject-ga: GA4 already present, skipping.');
  process.exit(0);
}

const gaSnippet = `
  <!-- Google Analytics — ${GA_ID} (injected by scripts/inject-ga.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${GA_ID}');
  </script>`;

const injected = html.replace('</head>', `${gaSnippet}\n</head>`);

if (injected === html) {
  console.error('inject-ga: could not find </head> tag in', target);
  process.exit(1);
}

fs.writeFileSync(target, injected, 'utf8');
console.log(`inject-ga: GA4 (${GA_ID}) injected into ${target}`);
