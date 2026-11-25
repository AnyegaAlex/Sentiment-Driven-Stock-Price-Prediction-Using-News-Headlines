import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Regression guard: the legal gate must be mounted once, at root level, so it renders on
// both the auth-route layout and the main app layout.
describe('App mounts the legal gate', () => {
  it('renders LegalAcceptanceGate exactly once at root, outside any layout branch', () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const src = fs.readFileSync(path.join(here, '..', 'App.jsx'), 'utf-8');
    const mounts = src.match(/<LegalAcceptanceGate\s*\/>/g) || [];
    expect(mounts).toHaveLength(1);
    expect(src.indexOf('<LegalAcceptanceGate />')).toBeGreaterThan(src.indexOf('<AppContent />'));
  });
});
