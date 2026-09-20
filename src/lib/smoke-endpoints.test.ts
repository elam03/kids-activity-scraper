import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import sitemap from '../app/sitemap';
import robots from '../app/robots';
import manifest from '../app/manifest';
import { getSiteIcons, SITE_URL } from './seo-utils';
import { middleware } from '../middleware';
import { NextRequest } from 'next/server';

test('Smoke Test 1: Sitemap configuration produces valid XML URLs', async () => {
  const entries = await sitemap();
  assert.ok(Array.isArray(entries) && entries.length > 0);

  const rootEntry = entries.find((e) => e.url === SITE_URL || e.url === `${SITE_URL}/`);
  assert.ok(rootEntry, 'Root URL must be present in sitemap');
  assert.equal(rootEntry.changeFrequency, 'daily');
  assert.ok(rootEntry.priority !== undefined && rootEntry.priority >= 0.9);
});

test('Smoke Test 2: Robots.txt produces valid crawler directives', () => {
  const robotsConfig = robots();
  assert.ok(robotsConfig.rules);
  assert.equal(robotsConfig.sitemap, `${SITE_URL}/sitemap.xml`);
});

test('Smoke Test 3: Web App Manifest includes valid standalone PWA configuration', () => {
  const pwaManifest = manifest();
  assert.equal(pwaManifest.display, 'standalone');
  assert.equal(pwaManifest.start_url, '/');
  assert.equal(pwaManifest.theme_color, '#064e3b');
  assert.ok(Array.isArray(pwaManifest.icons) && pwaManifest.icons.length >= 3);
  assert.ok(pwaManifest.icons.some((i) => i.src === '/icon.png'));
  assert.ok(pwaManifest.icons.some((i) => i.src === '/icon-192.png'));
  assert.ok(pwaManifest.icons.some((i) => i.src === '/icon.svg'));
});

test('Smoke Test 4: Static public icon assets exist on filesystem', () => {
  const publicDir = path.join(process.cwd(), 'public');
  const requiredAssets = [
    'favicon.ico',
    'icon.png',
    'icon.svg',
    'icon-192.png',
    'apple-icon.png',
    'apple-touch-icon.png',
  ];

  for (const asset of requiredAssets) {
    const assetPath = path.join(publicDir, asset);
    assert.equal(fs.existsSync(assetPath), true, `Asset ${asset} must exist in public/`);
    const stats = fs.statSync(assetPath);
    assert.ok(stats.size > 0, `Asset ${asset} must not be empty`);
  }
});

test('Smoke Test 5: Route security middleware smoke tests', async () => {
  // Case A: Unauthenticated request to /api/admin/events returns 401 JSON
  const apiReq = new NextRequest(new Request('http://localhost/api/admin/events'));
  const apiRes = await middleware(apiReq);
  assert.equal(apiRes.status, 401);

  // Case B: Unauthenticated request to /admin redirects to /admin/login
  const adminPageReq = new NextRequest(new Request('http://localhost/admin'));
  const adminPageRes = await middleware(adminPageReq);
  assert.equal(adminPageRes.status, 307);
  assert.ok(adminPageRes.headers.get('location')?.endsWith('/admin/login'));

  // Case C: Authenticated request to /admin passes through
  const authAdminReq = new NextRequest(new Request('http://localhost/admin'), {
    headers: {
      cookie: 'admin-session=authenticated',
    },
  });
  const authAdminRes = await middleware(authAdminReq);
  assert.equal(authAdminRes.status, 200);
});
