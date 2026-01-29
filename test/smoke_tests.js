/**
 * Test script for phantomwright-driver npm package
 * Run: npm install phantomwright-driver && node test/test_phantomwright.js
 */

const { chromium } = require('phantomwright-driver');
const { chromium: playwrightChromium } = require('playwright');

async function runTests() {
  console.log('🧪 Testing phantomwright-driver package...\n');

  let browser;
  let passed = 0;
  let failed = 0;

  try {
    // Test 1: Import check
    console.log('Test 1: Import phantomwright-driver...');
    if (chromium && typeof chromium.launch === 'function') {
      console.log('  ✅ Import successful\n');
      passed++;
    } else {
      throw new Error('chromium.launch is not a function');
    }

    // Test 2: Launch browser
    console.log('Test 2: Launch browser...');
    browser = await chromium.launch({ headless: true });
    console.log('  ✅ Browser launched\n');
    passed++;

    // Test 3: Create page
    console.log('Test 3: Create new page...');
    const page = await browser.newPage();
    console.log('  ✅ Page created\n');
    passed++;

    // Test 4: Navigate to page
    console.log('Test 4: Navigate to example.com...');
    await page.goto('https://example.com');
    const title = await page.title();
    if (title.includes('Example')) {
      console.log(`  ✅ Navigation successful (title: "${title}")\n`);
      passed++;
    } else {
      throw new Error(`Unexpected title: ${title}`);
    }

    // Test 5: Evaluate JavaScript
    console.log('Test 5: Evaluate JavaScript...');
    const result = await page.evaluate(() => {
      return navigator.userAgent;
    });
    if (result && result.length > 0) {
      console.log(`  ✅ JS evaluation successful\n`);
      console.log(`  User-Agent: ${result.substring(0, 80)}...\n`);
      passed++;
    } else {
      throw new Error('JS evaluation returned empty result');
    }

    // Test 6: Screenshot
    console.log('Test 6: Take screenshot...');
    const path = require('path');
    const screenshotPath = path.join(__dirname, 'screenshot.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`  ✅ Screenshot saved to ${screenshotPath}\n`);
    passed++;

    // Test 7: Locator waitFor()
    console.log('Test 7: Locator waitFor()...');
    await page.locator('h1').waitFor({ state: 'visible', timeout: 5000 });
    console.log('  ✅ waitFor() completed\n');
    passed++;

    // Test 8: Locator count
    console.log('Test 8: Locator count...');
    const count = await page.locator('h1').count();
    if (count === 1) {
      console.log(`  ✅ Locator count: ${count}\n`);
      passed++;
    } else {
      throw new Error(`Unexpected locator count: ${count}`);
    }

    await page.close();

    // Test 9: Compare with Playwright locator behavior
    console.log('Test 9: Compare with Playwright locator...');
    const pwBrowser = await playwrightChromium.launch({ headless: true });
    const pwPage = await pwBrowser.newPage();
    await pwPage.goto('https://example.com');
    await pwPage.locator('h1').waitFor({ state: 'visible', timeout: 5000 });
    const pwCount = await pwPage.locator('h1').count();
    await pwBrowser.close();
    if (pwCount === count) {
      console.log(`  ✅ Playwright locator matches (count: ${pwCount})\n`);
      passed++;
    } else {
      throw new Error(`Playwright count (${pwCount}) != phantomwright count (${count})`);
    }

  } catch (error) {
    console.log(`  ❌ Error: ${error.message}\n`);
    failed++;
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Summary
  console.log('━'.repeat(50));
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed\n`);
  
  if (failed === 0) {
    console.log('✅ All tests passed! phantomwright-driver is working correctly.\n');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed.\n');
    process.exit(1);
  }
}

runTests().catch(console.error);
