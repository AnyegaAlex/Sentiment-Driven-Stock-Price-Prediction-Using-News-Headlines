import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const publicFile = (name) => resolve(globalThis.process.cwd(), 'public', name);
const manifest = JSON.parse(readFileSync(publicFile('manifest.webmanifest'), 'utf8'));
const serviceWorker = readFileSync(publicFile('sw.js'), 'utf8');

describe('PWA assets', () => {
  it('provides an installable standalone manifest with 192px and 512px icons', () => {
    expect(manifest.name).toBe('TickFlow Intelligence');
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.map(({ sizes }) => sizes)).toEqual(['192x192', '512x512']);

    for (const [name, width] of [['pwa-icon-192.png', 192], ['pwa-icon-512.png', 512]]) {
      const png = readFileSync(publicFile(name));
      expect(png.readUInt32BE(16)).toBe(width);
      expect(png.readUInt32BE(20)).toBe(width);
    }
  });

  it('keeps API and account requests out of the offline cache', () => {
    expect(serviceWorker).toContain("request.method !== 'GET'");
    expect(serviceWorker).toContain('url.origin !== self.location.origin');
    expect(serviceWorker).toContain("url.pathname.startsWith('/api/')");
    expect(serviceWorker).toContain("url.pathname.startsWith('/auth/')");
    expect(serviceWorker).toContain("caches.match('/index.html')");
    expect(() => new Function(serviceWorker)).not.toThrow();
  });

  it('links the manifest and registers the production service worker', () => {
    const html = readFileSync(resolve(globalThis.process.cwd(), 'index.html'), 'utf8');
    const main = readFileSync(resolve(globalThis.process.cwd(), 'src/main.jsx'), 'utf8');

    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest" />');
    expect(main).toContain("navigator.serviceWorker.register('/sw.js')");
  });
});
