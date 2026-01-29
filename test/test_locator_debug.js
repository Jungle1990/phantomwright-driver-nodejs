/**
 * Debug: locator.waitFor() comparison
 * Run: node test/test_locator_debug.js
 */

const { chromium: phantomChromium } = require('phantomwright-driver');
const { chromium: playwrightChromium } = require('playwright');

async function main() {
  // Test PHANTOMWRIGHT-DRIVER
  console.log(`\n═══ PHANTOMWRIGHT-DRIVER ═══`);
  const browser1 = await phantomChromium.launch({ headless: true });
  const page1 = await (await browser1.newContext()).newPage();
  
  page1.on('console', msg => console.log('  [PAGE LOG]', msg.text()));
  page1.on('pageerror', err => console.log('  [PAGE ERROR]', err.message));
  
  await page1.goto('https://example.com');
  console.log('  Page loaded, URL:', page1.url());
  
  // Debug: Check if h1 exists via evaluate
  const h1Text = await page1.evaluate(() => {
    const h1 = document.querySelector('h1');
    return h1 ? h1.textContent : 'NOT FOUND';
  });
  console.log('  H1 text via evaluate:', h1Text);
  
  // Debug: Check locator count
  const count = await page1.locator('h1').count();
  console.log('  Locator count:', count);
  
  await page1.locator('h1').waitFor({ state: 'visible', timeout: 5000 });
  console.log('  ✅ waitFor() completed');
  await browser1.close();

  // Test PLAYWRIGHT
  console.log(`\n═══ PLAYWRIGHT ═══`);
  const browser2 = await playwrightChromium.launch({ headless: true });
  const page2 = await (await browser2.newContext()).newPage();
  await page2.goto('https://example.com');
  await page2.locator('h1').waitFor({ state: 'visible', timeout: 5000 });
  console.log('  ✅ waitFor() completed');
  await browser2.close();
}

main();
