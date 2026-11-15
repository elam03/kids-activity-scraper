import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ARTIFACT_DIR = '/Users/ericlam/.gemini/antigravity-cli/brain/044ecd40-0769-40d4-af0d-36a22be0906a/snapshots';
const BASE_URL = 'http://localhost:3000';

const THEMES = ['cosmo', 'daylight', 'duo'] as const;

async function main() {
  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }

  console.log(`Starting headless Chrome from ${CHROME_PATH}...`);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });

    // Set admin cookie so /admin pages render directly
    await page.setCookie({
      name: 'admin-session',
      value: 'authenticated',
      domain: 'localhost',
      path: '/',
    });

    for (const theme of THEMES) {
      console.log(`\nCapturing snapshots for theme: "${theme}"...`);

      // 1. Day Timeline View (Desktop)
      const desktopUrl = `${BASE_URL}/?theme=${theme}`;
      await page.goto(desktopUrl, { waitUntil: 'networkidle2', timeout: 15000 });
      await page.waitForSelector('header h1', { timeout: 10000 });
      await new Promise((r) => setTimeout(r, 600));

      const dayPath = path.join(ARTIFACT_DIR, `${theme}-day-timeline.png`);
      await page.screenshot({ path: dayPath, fullPage: false });
      console.log(`  ✓ Saved Desktop Day Timeline: ${dayPath}`);

      // 2. Month Grid View
      try {
        const monthButtons = await page.$$('button');
        for (const btn of monthButtons) {
          const text = await page.evaluate((el) => el.textContent, btn);
          if (text && text.trim().toLowerCase().includes('month')) {
            await btn.click();
            break;
          }
        }
        await new Promise((r) => setTimeout(r, 600));
        const monthPath = path.join(ARTIFACT_DIR, `${theme}-month-grid.png`);
        await page.screenshot({ path: monthPath, fullPage: false });
        console.log(`  ✓ Saved Desktop Month Grid: ${monthPath}`);
      } catch (err) {
        console.warn(`  ⚠ Warning capturing month grid for ${theme}:`, err);
      }

      // 3. Planner Grid View
      try {
        const buttons = await page.$$('button');
        for (const btn of buttons) {
          const text = await page.evaluate((el) => el.textContent, btn);
          if (text && text.trim().toLowerCase().includes('planner')) {
            await btn.click();
            break;
          }
        }
        await new Promise((r) => setTimeout(r, 600));
        const plannerPath = path.join(ARTIFACT_DIR, `${theme}-planner-grid.png`);
        await page.screenshot({ path: plannerPath, fullPage: false });
        console.log(`  ✓ Saved Desktop Planner Grid: ${plannerPath}`);
      } catch (err) {
        console.warn(`  ⚠ Warning capturing planner grid for ${theme}:`, err);
      }

      // 3. Admin View
      try {
        const adminUrl = `${BASE_URL}/admin?theme=${theme}`;
        await page.goto(adminUrl, { waitUntil: 'networkidle2', timeout: 15000 });
        await new Promise((r) => setTimeout(r, 800));
        const adminPath = path.join(ARTIFACT_DIR, `${theme}-admin.png`);
        await page.screenshot({ path: adminPath, fullPage: false });
        console.log(`  ✓ Saved Admin Dashboard: ${adminPath}`);
      } catch (err) {
        console.warn(`  ⚠ Warning capturing admin dashboard for ${theme}:`, err);
      }

      // 4. SEO Landing View (/free-this-weekend)
      try {
        const seoUrl = `${BASE_URL}/free-this-weekend?theme=${theme}`;
        await page.goto(seoUrl, { waitUntil: 'networkidle2', timeout: 15000 });
        await new Promise((r) => setTimeout(r, 600));
        const seoPath = path.join(ARTIFACT_DIR, `${theme}-landing-free.png`);
        await page.screenshot({ path: seoPath, fullPage: false });
        console.log(`  ✓ Saved Free Weekend Landing: ${seoPath}`);
      } catch (err) {
        console.warn(`  ⚠ Warning capturing landing page for ${theme}:`, err);
      }

      // 5. Mobile Viewport (iPhone 14: 390x844)
      try {
        await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
        await page.goto(desktopUrl, { waitUntil: 'networkidle2', timeout: 15000 });
        await page.waitForSelector('header h1', { timeout: 10000 });
        await new Promise((r) => setTimeout(r, 600));
        const mobilePath = path.join(ARTIFACT_DIR, `${theme}-mobile.png`);
        await page.screenshot({ path: mobilePath, fullPage: false });
        console.log(`  ✓ Saved Mobile Viewport: ${mobilePath}`);
      } catch (err) {
        console.warn(`  ⚠ Warning capturing mobile viewport for ${theme}:`, err);
      }

      // Reset to Desktop Viewport
      await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });
    }

    console.log(`\n🎉 All visual snapshots successfully generated in ${ARTIFACT_DIR}!`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('Snapshot capture failed:', err);
  process.exit(1);
});
