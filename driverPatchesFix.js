/**
 * Fix patch for phantomwright-driver waitForSelector bug
 * 
 * This script fixes two bugs in frames.js:
 * 1. Missing `options` argument in _retryWithProgressIfNotConnected call
 * 2. Invalid visibility check that tries to pass ElementHandle into browser context
 * 
 * Run after: "Patch Playwright-NodeJS Package" step
 * Usage: node driverPatchesFix.js
 */

const fs = require('fs');
const path = require('path');

const FRAMES_JS_PATH = path.join(__dirname, 'playwright/packages/playwright-core/src/server/frames.ts');

// The broken code pattern to find
const BROKEN_CODE = `const promise = this._retryWithProgressIfNotConnected(progress, selector, options.strict, true, async (handle) => {
      const attached = !!handle;
      var visible = false;
      if (attached) {
        if (handle.parentNode.constructor.name == "ElementHandle") {
          visible = await handle.parentNode.evaluateInUtility(([injected, node, { handle: handle2 }]) => {
            return handle2 ? injected.utils.isElementVisible(handle2) : false;
          }, { handle });
        } else {
          visible = await handle.parentNode.evaluate((injected, { handle: handle2 }) => {
            return handle2 ? injected.utils.isElementVisible(handle2) : false;
          }, { handle });
        }
      }`;

// The fixed code replacement
const FIXED_CODE = `const promise = this._retryWithProgressIfNotConnected(progress, selector, options, options.strict, true, async (handle) => {
      const attached = !!handle;
      var visible = false;
      if (attached) {
        try {
          visible = await handle.evaluate((element) => {
            if (!element) return false;
            const style = window.getComputedStyle(element);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0')
              return false;
            const rect = element.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          });
        } catch (e) {
          return "internal:continuepolling";
        }
      }`;

function applyFix() {
  console.log('🔧 Applying waitForSelector fix patch...\n');

  // Check if file exists
  if (!fs.existsSync(FRAMES_JS_PATH)) {
    console.error('❌ Error: frames.ts not found at:', FRAMES_JS_PATH);
    process.exit(1);
  }

  // Read the file
  let content = fs.readFileSync(FRAMES_JS_PATH, 'utf8');
  console.log('📖 Read frames.ts successfully');

  // Check if the broken code exists
  if (!content.includes(BROKEN_CODE)) {
    // Maybe already fixed or different version - try a more flexible search
    if (content.includes('handle.parentNode.constructor.name == "ElementHandle"') && 
        content.includes('handle.parentNode.evaluateInUtility')) {
      console.log('⚠️  Found broken pattern but with different whitespace, attempting flexible fix...');
      
      // Use regex for more flexible matching
      const brokenRegex = /const promise = this\._retryWithProgressIfNotConnected\(progress, selector, options\.strict, true, async \(handle\) => \{[\s\S]*?if \(handle\.parentNode\.constructor\.name == "ElementHandle"\) \{[\s\S]*?visible = await handle\.parentNode\.evaluateInUtility[\s\S]*?\}, \{ handle \}\);[\s\S]*?\} else \{[\s\S]*?visible = await handle\.parentNode\.evaluate[\s\S]*?\}, \{ handle \}\);[\s\S]*?\}[\s\S]*?\}/;
      
      if (brokenRegex.test(content)) {
        content = content.replace(brokenRegex, FIXED_CODE);
        console.log('✅ Applied fix using flexible matching');
      } else {
        console.error('❌ Could not match broken code pattern');
        process.exit(1);
      }
    } else if (content.includes('handle.evaluate((element)') && content.includes('getComputedStyle(element)')) {
      console.log('✅ Fix already applied, skipping...');
      process.exit(0);
    } else {
      console.error('❌ Could not find broken code pattern to fix');
      console.log('   This may be a different version of playwright');
      process.exit(1);
    }
  } else {
    // Exact match found, apply fix
    content = content.replace(BROKEN_CODE, FIXED_CODE);
    console.log('✅ Applied fix using exact matching');
  }

  // Write the fixed content back
  fs.writeFileSync(FRAMES_JS_PATH, content, 'utf8');
  console.log('💾 Saved fixed frames.ts');

  console.log('\n🎉 waitForSelector fix patch applied successfully!');
}

// Run the fix
applyFix();
