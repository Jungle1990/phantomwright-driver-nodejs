/**
 * Debug: locator.waitFor() comparison
 * Run: node test/test_locator_debug.js
 */

const { chromium: phantomChromium } = require('phantomwright-driver');
const { chromium: playwrightChromium } = require('playwright');

async function testWaitFor(name, chromium) {
  console.log(`\n═══ ${name} ═══`);
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  await page.goto('https://example.com');

  try {
    await page.locator('h1').waitFor({ state: 'visible', timeout: 5000 });
    console.log('  ✅ waitFor() completed');
    return true;
  } catch (e) {
    console.log('  ❌ Failed: ' + e.message);
    return false;
  } finally {
    await browser.close();
  }
}

async function main() {
  const results = await Promise.all([
    testWaitFor('PHANTOMWRIGHT-DRIVER', phantomChromium),
    testWaitFor('PLAYWRIGHT', playwrightChromium)
  ]);
  const passed = results.filter(r => r).length;
  console.log(`\n📊 Results: ${passed}/2 passed\n`);
  process.exit(passed === 2 ? 0 : 1);
}

main();
