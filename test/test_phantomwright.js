/**
 * Test script for phantomwright-driver npm package
 * Run: npm install phantomwright-driver && node test/test_phantomwright.js
 */

const { chromium } = require('phantomwright-driver');

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

    // Test 6: Check webdriver detection (should be undefined/false)
    console.log('Test 6: Check navigator.webdriver...');
    const webdriver = await page.evaluate(() => navigator.webdriver);
    if (webdriver === false || webdriver === undefined) {
      console.log(`  ✅ navigator.webdriver = ${webdriver} (undetected)\n`);
      passed++;
    } else {
      console.log(`  ⚠️ navigator.webdriver = ${webdriver} (may be detected)\n`);
      failed++;
    }

    // Test 7: Screenshot
    console.log('Test 7: Take screenshot...');
    await page.screenshot({ path: 'test/screenshot.png' });
    console.log('  ✅ Screenshot saved to test/screenshot.png\n');
    passed++;

    await page.close();

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
