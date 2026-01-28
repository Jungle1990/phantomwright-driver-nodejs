import { Project, SyntaxKind, IndentationText } from "ts-morph";

const project = new Project({
  manipulationSettings: {
    indentationText: IndentationText.TwoSpaces,
  },
});

// ----------------------------
// server/frames.ts - Post-patch fixes for bugs introduced by framesPatch.js
// ----------------------------
// These fixes must run AFTER patchright_nodejs_patch.js and the external driver patches
// to correct bugs in the patched code.

const serverFramesSourceFile = project.addSourceFileAtPath(
  "packages/playwright-core/src/server/frames.ts",
);

const serverFrameClass = serverFramesSourceFile.getClass("Frame");

// ----------------------------
// FIX #1: setContent method
// Bug: this._waitForLoadState should be this.waitForLoadState (no underscore prefix)
// ----------------------------
const setContentMethod = serverFrameClass.getMethod("setContent");
if (setContentMethod) {
  const setContentBody = setContentMethod.getBodyText();
  if (setContentBody && setContentBody.includes("this._waitForLoadState")) {
    const fixedBody = setContentBody.replace(
      /this\._waitForLoadState\(/g,
      "this.waitForLoadState("
    );
    setContentMethod.setBodyText(fixedBody);
    console.log("✓ Fix #1 applied: setContent - changed this._waitForLoadState to this.waitForLoadState");
  } else {
    console.log("⚠ Fix #1 skipped: setContent method does not contain this._waitForLoadState");
  }
}

// ----------------------------
// FIX #2: _retryWithProgressIfNotConnected method
// Bug: The method body uses 'strict' and 'performActionPreChecks' variables,
//      but they were not added as parameters. Only 'returnAction' was added.
//      The callers pass: (progress, selector, strict, performActionPreChecks, action, returnAction)
// Solution: Add 'strict' and 'performActionPreChecks' parameters before 'returnAction'
// ----------------------------
const retryWithProgressMethod = serverFrameClass.getMethod("_retryWithProgressIfNotConnected");
if (retryWithProgressMethod) {
  const params = retryWithProgressMethod.getParameters();
  const paramNames = params.map(p => p.getName());
  
  // Check if 'strict' parameter is missing (it should be after 'selector' and before 'action')
  if (!paramNames.includes("strict")) {
    // Find the index of 'action' parameter to insert before it
    const actionIndex = paramNames.indexOf("action");
    if (actionIndex !== -1) {
      // Insert 'strict' and 'performActionPreChecks' before 'action'
      retryWithProgressMethod.insertParameter(actionIndex, {
        name: "strict",
      });
      retryWithProgressMethod.insertParameter(actionIndex + 1, {
        name: "performActionPreChecks", 
      });
      console.log("✓ Fix #2 applied: _retryWithProgressIfNotConnected - added 'strict' and 'performActionPreChecks' parameters");
    } else {
      console.log("⚠ Fix #2 skipped: Could not find 'action' parameter in _retryWithProgressIfNotConnected");
    }
  } else {
    console.log("⚠ Fix #2 skipped: 'strict' parameter already exists in _retryWithProgressIfNotConnected");
  }
}

// Save the changes
project.saveSync();

console.log("\n✓ Post-patch fixes completed successfully!");
