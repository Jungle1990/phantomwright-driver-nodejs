/**
 * framesPatchPatch.js - Fixes bugs in driver_patches/framesPatch.js
 * 
 * This script patches the framesPatch.js file BEFORE it's used to patch Playwright.
 * It fixes two bugs:
 *   1. setContent uses this._waitForLoadState instead of this.waitForLoadState
 *   2. _retryWithProgressIfNotConnected callers use inconsistent calling conventions
 * 
 * Run: node framesPatchPatch.js
 * 
 * NOTE: This should run AFTER driver_patches is copied from the external repo
 * and BEFORE patchright_nodejs_patch.js is executed.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const framesPatchPath = path.join(__dirname, 'driver_patches/framesPatch.js');

console.log('🔧 Patching framesPatch.js to fix upstream bugs...\n');

if (!fs.existsSync(framesPatchPath)) {
  console.log('❌ Error: driver_patches/framesPatch.js not found');
  console.log('   Make sure to run this after copying driver_patches from the external repo');
  process.exit(1);
}

let content = fs.readFileSync(framesPatchPath, 'utf8');
let patchCount = 0;

// ----------------------------
// FIX #1: setContent method
// Bug: this._waitForLoadState should be this.waitForLoadState (no underscore prefix)
// ----------------------------
if (content.includes('this._waitForLoadState(')) {
  content = content.replace(/this\._waitForLoadState\(/g, 'this.waitForLoadState(');
  console.log('✓ Fix #1 applied: Changed this._waitForLoadState to this.waitForLoadState');
  patchCount++;
} else {
  console.log('⚠ Fix #1 skipped: this._waitForLoadState not found');
}

// ----------------------------
// FIX #2: _retryWithProgressIfNotConnected - Extract strict/performActionPreChecks from options
// Bug: The method body uses 'strict' and 'performActionPreChecks' directly,
//      but they should be extracted from the 'options' parameter
// ----------------------------
const brokenMethodBody = `retryWithProgressIfNotConnectedMethod.setBodyText(\`
      progress.log("waiting for " + this._asLocator(selector));
      return this.retryWithProgressAndTimeouts(progress, [0, 20, 50, 100, 100, 500], async continuePolling => {
        return this._retryWithoutProgress(progress, selector, strict, performActionPreChecks, action, returnAction, continuePolling);
      });
    \`);`;

const fixedMethodBody = `retryWithProgressIfNotConnectedMethod.setBodyText(\`
      const strict = options.strict;
      const performActionPreChecks = options.performActionPreChecks;
      progress.log("waiting for " + this._asLocator(selector));
      return this.retryWithProgressAndTimeouts(progress, [0, 20, 50, 100, 100, 500], async continuePolling => {
        return this._retryWithoutProgress(progress, selector, strict, performActionPreChecks, action, returnAction, continuePolling);
      });
    \`);`;

if (content.includes(brokenMethodBody)) {
  content = content.replace(brokenMethodBody, fixedMethodBody);
  console.log('✓ Fix #2 applied: Added extraction of strict/performActionPreChecks from options');
  patchCount++;
} else {
  console.log('⚠ Fix #2 skipped: _retryWithProgressIfNotConnected body pattern not found');
}

// ----------------------------
// FIX #3: Update callers to use options object instead of separate parameters
// ----------------------------

// Fix waitForSelector caller
const oldWaitForSelectorCall = 'this._retryWithProgressIfNotConnected(progress, selector, options.strict, true, async handle => {';
const newWaitForSelectorCall = 'this._retryWithProgressIfNotConnected(progress, selector, { strict: options.strict, performActionPreChecks: true }, async handle => {';

if (content.includes(oldWaitForSelectorCall)) {
  content = content.replace(oldWaitForSelectorCall, newWaitForSelectorCall);
  console.log('✓ Fix #3a applied: Fixed waitForSelector caller');
  patchCount++;
} else {
  console.log('⚠ Fix #3a skipped: waitForSelector caller pattern not found');
}

// Fix expect caller
const oldExpectCall = 'this._retryWithProgressIfNotConnected(progress, selector, !isArray, false, action, \'returnAll\')';
const newExpectCall = 'this._retryWithProgressIfNotConnected(progress, selector, { strict: !isArray, performActionPreChecks: false }, action, \'returnAll\')';

if (content.includes(oldExpectCall)) {
  content = content.replace(oldExpectCall, newExpectCall);
  console.log('✓ Fix #3b applied: Fixed expect caller');
  patchCount++;
} else {
  console.log('⚠ Fix #3b skipped: expect caller pattern not found');
}

// Fix _callOnElementOnceMatches caller
const oldCallOnElementCall = 'this._retryWithProgressIfNotConnected(progress, selector, options.strict, false, async (handle) => {';
const newCallOnElementCall = 'this._retryWithProgressIfNotConnected(progress, selector, { strict: options.strict, performActionPreChecks: false }, async (handle) => {';

if (content.includes(oldCallOnElementCall)) {
  content = content.replace(oldCallOnElementCall, newCallOnElementCall);
  console.log('✓ Fix #3c applied: Fixed _callOnElementOnceMatches caller');
  patchCount++;
} else {
  console.log('⚠ Fix #3c skipped: _callOnElementOnceMatches caller pattern not found');
}

// Write the patched content back
fs.writeFileSync(framesPatchPath, content, 'utf8');

console.log(`\n✓ framesPatch.js patching completed! ${patchCount} fix(es) applied.`);

if (patchCount === 0) {
  console.log('\n⚠ Warning: No fixes were applied. The framesPatch.js may have a different structure.');
  console.log('   Check if the upstream repo has already fixed these issues or if patterns have changed.');
}
