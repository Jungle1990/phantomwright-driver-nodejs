# Local Build Script for phantomwright-driver
# Mirrors the GitHub Actions release workflow for local testing
#
# Usage: 
#   .\local_build.ps1 -PlaywrightVersion "v1.50.1"
#   .\local_build.ps1 -PlaywrightVersion "v1.50.1" -SkipClone
#   .\local_build.ps1 -PlaywrightVersion "v1.50.1" -CleanBuild

param(
    [Parameter(Mandatory=$true)]
    [string]$PlaywrightVersion,
    
    [string]$PackageVersion,  # e.g. "1.50.1" - defaults to PlaywrightVersion without 'v' prefix
    
    [switch]$SkipClone,
    [switch]$CleanBuild,
    [switch]$SkipPublish
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Set package version (remove 'v' prefix if present)
if (-not $PackageVersion) {
    $PackageVersion = $PlaywrightVersion -replace '^v', ''
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Phantomwright-Driver Local Build Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Playwright Version: $PlaywrightVersion" -ForegroundColor Yellow
Write-Host "Package Version:    $PackageVersion" -ForegroundColor Yellow
Write-Host "Working Directory:  $ScriptDir" -ForegroundColor Yellow
Write-Host ""

Set-Location $ScriptDir

# Step 1: Clean previous build if requested
if ($CleanBuild) {
    Write-Host "[1/9] Cleaning previous build..." -ForegroundColor Green
    if (Test-Path "playwright") {
        Remove-Item -Recurse -Force "playwright"
        Write-Host "  Removed playwright directory" -ForegroundColor Gray
    }
    if (Test-Path "phantomwright-driver") {
        Remove-Item -Recurse -Force "phantomwright-driver"
        Write-Host "  Removed phantomwright-driver directory" -ForegroundColor Gray
    }
    if (Test-Path "driver_patches") {
        Remove-Item -Recurse -Force "driver_patches"
        Write-Host "  Removed driver_patches directory" -ForegroundColor Gray
    }
} else {
    Write-Host "[1/9] Skipping clean (use -CleanBuild to clean)" -ForegroundColor Gray
}

# Step 2: Install TS-Morph dependencies
Write-Host "[2/9] Installing TS-Morph dependencies..." -ForegroundColor Green
npm install
if ($LASTEXITCODE -ne 0) { throw "npm install failed" }

# Step 3: Clone Playwright
if (-not $SkipClone) {
    Write-Host "[3/9] Cloning Playwright repository (tag: $PlaywrightVersion)..." -ForegroundColor Green
    if (Test-Path "playwright") {
        Write-Host "  Removing existing playwright directory..." -ForegroundColor Gray
        Remove-Item -Recurse -Force "playwright"
    }
    git clone https://github.com/microsoft/playwright --branch $PlaywrightVersion --depth 1
    if ($LASTEXITCODE -ne 0) { throw "git clone playwright failed" }
    
    Set-Location "playwright"
    Write-Host "  Running npm ci..." -ForegroundColor Gray
    npm ci
    if ($LASTEXITCODE -ne 0) { throw "npm ci failed" }
    Set-Location $ScriptDir
} else {
    Write-Host "[3/9] Skipping clone (use without -SkipClone to clone fresh)" -ForegroundColor Gray
}

# Step 4: Copy Patchright Patch Scripts
Write-Host "[4/9] Copying Patchright patch scripts..." -ForegroundColor Green
if (Test-Path "phantomwright-driver") {
    Remove-Item -Recurse -Force "phantomwright-driver"
}
git clone https://github.com/StudentWan/phantomwright-driver.git --depth 1
if ($LASTEXITCODE -ne 0) { throw "git clone phantomwright-driver failed" }

if (Test-Path "driver_patches") {
    Remove-Item -Recurse -Force "driver_patches"
}
Copy-Item -Recurse "phantomwright-driver/driver_patches" "./driver_patches"

# Append driver patch content (skip first 12 lines)
$patchContent = Invoke-WebRequest -Uri "https://raw.githubusercontent.com/StudentWan/phantomwright-driver/refs/heads/main/patchright_driver_patch.js" -UseBasicParsing
$lines = $patchContent.Content -split "`n" | Select-Object -Skip 12
Add-Content -Path "patchright_nodejs_patch.js" -Value ($lines -join "`n")

Remove-Item -Recurse -Force "phantomwright-driver"
Write-Host "  Patch scripts copied successfully" -ForegroundColor Gray

# Step 5: Patch Playwright-NodeJS Package
Write-Host "[5/9] Patching Playwright-NodeJS package..." -ForegroundColor Green
Set-Location "playwright"
node "../patchright_nodejs_patch.js"
Set-Location $ScriptDir

# Step 6: Apply waitForSelector Fix Patch
Write-Host "[6/9] Applying waitForSelector fix patch..." -ForegroundColor Green
node driverPatchesFix.js
if ($LASTEXITCODE -ne 0) { throw "driverPatchesFix.js failed" }

# Step 7: Generate Playwright Channels
Write-Host "[7/9] Generating Playwright channels..." -ForegroundColor Green
Set-Location "playwright"
try {
    node utils/generate_channels.js
} catch {
    # Ignore error - script exits 1 when a file is modified (expected behavior)
    Write-Host "  (Note: generate_channels.js exits with code 1 when files are modified - this is expected)" -ForegroundColor Gray
}
Set-Location $ScriptDir

# Step 8: Build Playwright-NodeJS Package
Write-Host "[8/9] Building Playwright-NodeJS package..." -ForegroundColor Green
Set-Location "playwright"
npm run build
if ($LASTEXITCODE -ne 0) { throw "npm run build failed" }
Set-Location $ScriptDir

# Step 9: Rebrand to Patchright-NodeJS Package
Write-Host "[9/9] Rebranding to Phantomwright-Driver package..." -ForegroundColor Green
Set-Location "playwright"
node "../patchright_nodejs_rebranding.js"
if ($LASTEXITCODE -ne 0) { throw "patchright_nodejs_rebranding.js failed" }

# Set package version in package.json files
Write-Host "  Setting package version to $PackageVersion..." -ForegroundColor Gray
$corePackageJson = "packages/phantomwright-driver-core/package.json"
$driverPackageJson = "packages/phantomwright-driver/package.json"

if (Test-Path $corePackageJson) {
    $json = Get-Content $corePackageJson -Raw | ConvertFrom-Json
    $json.version = $PackageVersion
    $json | ConvertTo-Json -Depth 100 | Set-Content $corePackageJson
    Write-Host "  Updated $corePackageJson" -ForegroundColor Gray
}

if (Test-Path $driverPackageJson) {
    $json = Get-Content $driverPackageJson -Raw | ConvertFrom-Json
    $json.version = $PackageVersion
    # Also update the dependency on phantomwright-driver-core
    if ($json.dependencies.'phantomwright-driver-core') {
        $json.dependencies.'phantomwright-driver-core' = $PackageVersion
    }
    $json | ConvertTo-Json -Depth 100 | Set-Content $driverPackageJson
    Write-Host "  Updated $driverPackageJson" -ForegroundColor Gray
}

Set-Location $ScriptDir

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Build Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Built packages:" -ForegroundColor Yellow
Write-Host "  - playwright/packages/phantomwright-driver-core/" -ForegroundColor Gray
Write-Host "  - playwright/packages/phantomwright-driver/" -ForegroundColor Gray
Write-Host ""

if (-not $SkipPublish) {
    Write-Host "To publish (dry-run):" -ForegroundColor Yellow
    Write-Host '  cd playwright/packages/phantomwright-driver-core; npm publish --dry-run' -ForegroundColor Gray
    Write-Host '  cd playwright/packages/phantomwright-driver; npm publish --dry-run' -ForegroundColor Gray
    Write-Host ""
    Write-Host "To publish (real):" -ForegroundColor Yellow
    Write-Host '  cd playwright/packages/phantomwright-driver-core; npm publish --access=public' -ForegroundColor Gray
    Write-Host '  cd playwright/packages/phantomwright-driver; npm publish --access=public' -ForegroundColor Gray
}

Write-Host ""
Write-Host "To test the built package locally:" -ForegroundColor Yellow
Write-Host '  cd test' -ForegroundColor Gray
Write-Host '  npm install ../playwright/packages/phantomwright-driver' -ForegroundColor Gray
Write-Host '  node test_locator_debug.js' -ForegroundColor Gray
