/**
 * driverPatchesFix.js - Fixes bugs in driver_patches/* files
 * 
 * This script patches the driver patch files BEFORE they're used to patch Playwright.
 * It fixes compatibility issues and bugs in the upstream patches.
 * 
 * Run: node driverPatchesFix.js
 * 
 * NOTE: This should run AFTER driver_patches is copied from the external repo
 * and BEFORE patchright_nodejs_patch.js is executed.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Patching driver_patches to fix upstream bugs...\n');

let totalPatchCount = 0;

// ============================================================
// PART 1: Fix framesPatch.js
// ============================================================
const framesPatchPath = path.join(__dirname, 'driver_patches/framesPatch.js');

if (fs.existsSync(framesPatchPath)) {
  console.log('--- Patching framesPatch.js ---');
  let content = fs.readFileSync(framesPatchPath, 'utf8');
  let patchCount = 0;

  // FIX #1: setContent method - this._waitForLoadState should be this.waitForLoadState
  if (content.includes('this._waitForLoadState(')) {
    content = content.replace(/this\._waitForLoadState\(/g, 'this.waitForLoadState(');
    console.log('✓ Fix #1 applied: Changed this._waitForLoadState to this.waitForLoadState');
    patchCount++;
  }

  // FIX #2: _retryWithProgressIfNotConnected - Extract strict/performActionPreChecks from options
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
  }

  // FIX #3: Update callers to use options object
  const callerFixes = [
    {
      old: 'this._retryWithProgressIfNotConnected(progress, selector, options.strict, true, async handle => {',
      new: 'this._retryWithProgressIfNotConnected(progress, selector, { strict: options.strict, performActionPreChecks: true }, async handle => {',
      name: 'waitForSelector caller'
    },
    {
      old: "this._retryWithProgressIfNotConnected(progress, selector, !isArray, false, action, 'returnAll')",
      new: "this._retryWithProgressIfNotConnected(progress, selector, { strict: !isArray, performActionPreChecks: false }, action, 'returnAll')",
      name: 'expect caller'
    },
    {
      old: 'this._retryWithProgressIfNotConnected(progress, selector, options.strict, false, async (handle) => {',
      new: 'this._retryWithProgressIfNotConnected(progress, selector, { strict: options.strict, performActionPreChecks: false }, async (handle) => {',
      name: '_callOnElementOnceMatches caller'
    }
  ];

  for (const fix of callerFixes) {
    if (content.includes(fix.old)) {
      content = content.replace(fix.old, fix.new);
      console.log(`✓ Fix #3 applied: Fixed ${fix.name}`);
      patchCount++;
    }
  }

  fs.writeFileSync(framesPatchPath, content, 'utf8');
  console.log(`framesPatch.js: ${patchCount} fix(es) applied\n`);
  totalPatchCount += patchCount;
} else {
  console.log('⚠ framesPatch.js not found\n');
}

// ============================================================
// PART 2: Fix crNetworkManagerPatch.js
// ============================================================
const crNetworkManagerPatchPath = path.join(__dirname, 'driver_patches/crNetworkManagerPatch.js');

if (fs.existsSync(crNetworkManagerPatchPath)) {
  console.log('--- Patching crNetworkManagerPatch.js ---');
  let content = fs.readFileSync(crNetworkManagerPatchPath, 'utf8');
  let patchCount = 0;

  // FIX: Make RouteImpl constructor lookup more flexible
  // The old code looks for exact signature: constructor(session: CRSession, interceptionId: string)
  // But Playwright versions may have different signatures
  const oldConstructorLookup = `.find((ctor) =>
        ctor
          .getText()
          .includes("constructor(session: CRSession, interceptionId: string)"),
      );`;
  
  const newConstructorLookup = `.find((ctor) => {
        const text = ctor.getText();
        // Match various constructor signatures across Playwright versions
        return text.includes("constructor(") && 
               text.includes("session") && 
               text.includes("interceptionId");
      });`;

  if (content.includes(oldConstructorLookup)) {
    content = content.replace(oldConstructorLookup, newConstructorLookup);
    console.log('✓ Fix applied: Made RouteImpl constructor lookup more flexible');
    patchCount++;
  }

  // Add safety check for undefined constructorDeclaration
  const oldParametersLine = 'const parameters = constructorDeclaration.getParameters();';
  const newParametersLine = `if (!constructorDeclaration) {
      console.warn('⚠ Warning: RouteImpl constructor not found, skipping RouteImpl patches');
    } else {
    const parameters = constructorDeclaration.getParameters();`;

  if (content.includes(oldParametersLine) && !content.includes('Warning: RouteImpl constructor not found')) {
    content = content.replace(oldParametersLine, newParametersLine);
    
    // Find where to close the if block - after the last body.addStatements
    const lastBodyAddStatements = "body.addStatements(\"eventsHelper.addEventListener(this._session, 'Fetch.requestPaused', async e => await this._networkRequestIntercepted(e));\");";
    if (content.includes(lastBodyAddStatements)) {
      content = content.replace(lastBodyAddStatements, lastBodyAddStatements + '\n    }');
      console.log('✓ Fix applied: Added safety check for undefined constructorDeclaration');
      patchCount++;
    }
  }

  fs.writeFileSync(crNetworkManagerPatchPath, content, 'utf8');
  console.log(`crNetworkManagerPatch.js: ${patchCount} fix(es) applied\n`);
  totalPatchCount += patchCount;
} else {
  console.log('⚠ crNetworkManagerPatch.js not found\n');
}

// ============================================================
// Summary
// ============================================================
console.log('═'.repeat(50));
console.log(`✓ Driver patches fix completed! Total: ${totalPatchCount} fix(es) applied.`);

if (totalPatchCount === 0) {
  console.log('\n⚠ Warning: No fixes were applied.');
  console.log('   The patches may have different structure or already be fixed.');
}
