#!/usr/bin/env node
/**
 * Injects BACKEND_URL into website/config.js at build time.
 * Used by Netlify to point frontend at Railway backend.
 */
const fs = require('fs');
const path = require('path');

const backendUrl = process.env.BACKEND_URL || process.env.VITE_API_URL || '';
const configPath = path.join(__dirname, '..', 'website', 'config.js');
const content = `/**
 * API base URL for backend.
 * Injected at build time from BACKEND_URL env var.
 */
window.API_BASE = '${backendUrl.replace(/'/g, "\\'")}';
`;

fs.writeFileSync(configPath, content);
console.log('[inject-env] Wrote config.js with API_BASE =', backendUrl || '(empty)');
