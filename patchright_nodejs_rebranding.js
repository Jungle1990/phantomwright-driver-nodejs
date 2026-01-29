import { Project, SyntaxKind, IndentationText } from "ts-morph"; // Import SyntaxKind from ts-morph
import * as fs from "fs";
import * as path from "path";


// Fix Typing Declarations
const project = new Project({
  manipulationSettings: {
    indentationText: IndentationText.TwoSpaces,
  },
});

// ----------------------------
// types/types.d.ts
// ----------------------------
const typesSourceFile = project.addSourceFileAtPath(
  "packages/playwright-core/types/types.d.ts",
);
// ------- PageType Interface -------
const pageInterface = typesSourceFile.getInterface("Page");
const pageEvaluateSignatures = pageInterface.getMembers()
  .filter(m => m.getKind() === SyntaxKind.MethodSignature && (m.getName() === "evaluate" || m.getName() === "evaluateHandle"));

pageEvaluateSignatures.forEach(method => {
  const methodSig = method.asKindOrThrow(SyntaxKind.MethodSignature);
  methodSig.addParameter({
    name: "isolatedContext",
    type: "boolean",
    hasQuestionToken: true,
  });
});
// ------- WorkerType Interface -------
const workerInterface = typesSourceFile.getInterface("Worker");
const workerEvaluateSignatures = workerInterface.getMembers()
  .filter(m => m.getKind() === SyntaxKind.MethodSignature && (m.getName() === "evaluate" || m.getName() === "evaluateHandle"));

workerEvaluateSignatures.forEach(method => {
  const methodSig = method.asKindOrThrow(SyntaxKind.MethodSignature);
  methodSig.addParameter({
    name: "isolatedContext",
    type: "boolean",
    hasQuestionToken: true,
  });
});
// ------- FrameType Interface -------
const frameInterface = typesSourceFile.getInterface("Frame");
const frameEvaluateSignatures = frameInterface.getMembers()
  .filter(m => m.getKind() === SyntaxKind.MethodSignature && (m.getName() === "evaluate" || m.getName() === "evaluateHandle" || m.getName() === "evaluateAll"));

frameEvaluateSignatures.forEach(method => {
  const methodSig = method.asKindOrThrow(SyntaxKind.MethodSignature);
  methodSig.addParameter({
    name: "isolatedContext",
    type: "boolean",
    hasQuestionToken: true,
  });
});
// ------- LocatorType Interface -------
const locatorInterface = typesSourceFile.getInterface("Locator");
const locatorEvaluateSignatures = locatorInterface.getMembers()
  .filter(m => m.getKind() === SyntaxKind.MethodSignature && (m.getName() === "evaluate" || m.getName() === "evaluateHandle"));

locatorEvaluateSignatures.forEach(method => {
  const methodSig = method.asKindOrThrow(SyntaxKind.MethodSignature);
  methodSig.addParameter({
    name: "isolatedContext",
    type: "boolean",
    hasQuestionToken: true,
  });
});
// ------- JSHandleType Interface -------
const jsHandleInterface = typesSourceFile.getInterface("JSHandle");
const jsHandleEvaluateSignatures = jsHandleInterface.getMembers()
  .filter(m => m.getKind() === SyntaxKind.MethodSignature && (m.getName() === "evaluate" || m.getName() === "evaluateHandle"));

jsHandleEvaluateSignatures.forEach(method => {
  const methodSig = method.asKindOrThrow(SyntaxKind.MethodSignature);
  methodSig.addParameter({
    name: "isolatedContext",
    type: "boolean",
    hasQuestionToken: true,
  });
});

// Save the changes without reformatting
project.saveSync();


// Function to recursively find all TypeScript and JavaScript files
function getAllJsTsFiles(dir){
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getAllJsTsFiles(filePath));
        } else if (filePath.endsWith(".ts") || filePath.endsWith(".js") || filePath.endsWith(".mjs")) {
            results.push(filePath);
        }
    });
    return results;
}

// Main function to rename imports and exports from "playwright-core" to "phantomwright-driver-core"
function renameImportsAndExportsInDirectory(directoryPath) {
    const project = new Project();

    // Get all TypeScript and JavaScript files recursively
    const jsTsFiles = getAllJsTsFiles(directoryPath);

    // Iterate over each file
    jsTsFiles.forEach((filePath) => {
        const sourceFile = project.addSourceFileAtPath(filePath);
        let modified = false;

        // Find and modify import declarations
        sourceFile.getImportDeclarations().forEach((importDecl) => {
            const moduleSpecifierValue = importDecl.getModuleSpecifierValue();

            // If the import path starts with "playwright-core", replace it with "phantomwright-driver-core"
            if (moduleSpecifierValue.startsWith("playwright-core")) {
                const newModuleSpecifier = moduleSpecifierValue.replace("playwright-core", "phantomwright-driver-core");
                importDecl.setModuleSpecifier(newModuleSpecifier);
                modified = true;
            } else if (moduleSpecifierValue.includes("playwright-core")) {
                const newModuleSpecifier = moduleSpecifierValue.replace(/playwright-core/g, "phantomwright-driver-core");
                importDecl.setModuleSpecifier(newModuleSpecifier);
                modified = true;
            }
        });

        // Find and modify export declarations
        sourceFile.getExportDeclarations().forEach((exportDecl) => {
            const moduleSpecifierValue = exportDecl.getModuleSpecifierValue();

            // If the export path starts with "playwright-core", replace it with "phantomwright-driver-core"
            if (moduleSpecifierValue && moduleSpecifierValue.startsWith("playwright-core")) {
                const newModuleSpecifier = moduleSpecifierValue.replace("playwright-core", "phantomwright-driver-core");
                exportDecl.setModuleSpecifier(newModuleSpecifier);
                modified = true;
            }
        });

        // Handle export *
        const exportAllDeclarations = sourceFile.getExportDeclarations().filter(exportDecl => {
            return exportDecl.getModuleSpecifierValue() === 'playwright-core';
        });

        exportAllDeclarations.forEach(exportDecl => {
            exportDecl.setModuleSpecifier('phantomwright-driver-core');
            modified = true;
        });

        // Find all require() calls
        const requireCalls = sourceFile.getDescendantsOfKind(
            SyntaxKind.CallExpression
        ).filter(call => {
            const expression = call.getExpression();
            // Check for require() and require.resolve()
            return expression.getText() === "require" || expression.getText() === "require.resolve";
        });
        // Modify any 'playwright-core' require or require.resolve
        requireCalls.forEach(call => {
            const args = call.getArguments();
            if (args.length && (args[0].getText().includes("playwright-core"))) {
                const arg = args[0];
                arg.replaceWithText(arg.getText().replace(/playwright-core/g, "phantomwright-driver-core"));
                modified = true;
            } else if (args.length && (args[0].getText().includes("playwright"))) {
                const arg = args[0];
                arg.replaceWithText(arg.getText().replace(/playwright/g, "phantomwright-driver"));
                modified = true;
            }
        });

        // Save if any modification was made
        if (modified) {
            sourceFile.saveSync();
            console.log(`Modified imports/exports in: ${filePath}`);
        }
    });
}


// Renaming the folders synchronously to ensure they complete before writing files
fs.renameSync("packages/playwright-core", "packages/phantomwright-driver-core");
fs.renameSync("packages/playwright", "packages/phantomwright-driver");

// Write the Projects README to the README which is used in the release
{
    const readmeData = fs.readFileSync("../README.md", "utf8");
    fs.writeFileSync("packages/phantomwright-driver/README.md", readmeData, "utf8");
    fs.writeFileSync("packages/phantomwright-driver-core/README.md", "# phantomwright-driver-core\n\nThis package contains the no-browser flavor of [Phantomwright-Driver-NodeJS](https://github.com/Jungle1990/phantomwright-driver-nodejs).", "utf8");

    // Package.Json Files
    // playwright-core/package.json
    {
      const data = fs.readFileSync("packages/phantomwright-driver-core/package.json", "utf8");
      const packageJson = JSON.parse(data);
      packageJson.name = "phantomwright-driver-core";
      if (process.env.patchright_release && process.env.patchright_release.trim() !== "") {
        packageJson.version = process.env.patchright_release;
      }

      packageJson.author["name"] = "Microsoft Corportation, patched by github.com/Jungle1990/";
      packageJson.homepage = "https://github.com/Jungle1990/phantomwright-driver-nodejs"
      packageJson.repository["url"] = "https://github.com/Jungle1990/phantomwright-driver-nodejs"
      packageJson.bin = {
        "patchright-core": "cli.js"
      }

      const updatedJsonData = JSON.stringify(packageJson, null, 4);
      fs.writeFileSync("packages/phantomwright-driver-core/package.json", updatedJsonData, 'utf8');
      console.log('phantomwright-driver-core package.json has been updated successfully.');
    }
    // playwright/package.json
    {
      const data = fs.readFileSync("packages/phantomwright-driver/package.json", "utf8");
      const packageJson = JSON.parse(data);
      packageJson.name = "phantomwright-driver";
      if (process.env.patchright_release && process.env.patchright_release.trim() !== "") {
        packageJson.version = process.env.patchright_release;
      }
      packageJson.author["name"] = "Microsoft Corportation, patched by github.com/Jungle1990/";
      packageJson.homepage = "https://github.com/Jungle1990/phantomwright-driver-nodejs"
      packageJson.repository["url"] = "https://github.com/Jungle1990/phantomwright-driver-nodejs"
      packageJson.bin = {
        "patchright": "cli.js"
      }
      packageJson.dependencies = {
        "phantomwright-driver-core": packageJson.version
      }

      const updatedJsonData = JSON.stringify(packageJson, null, 4);
      fs.writeFileSync("packages/phantomwright-driver/package.json", updatedJsonData, 'utf8');
      console.log('phantomwright-driver package.json has been updated successfully.');
    }

    // Usage example: pass the directory path as an argument
    renameImportsAndExportsInDirectory("packages/phantomwright-driver");
}
