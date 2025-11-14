# Windows Electron Build Script
# Right-click this file and select "Run with PowerShell" (as Administrator)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ARCH Freight Calculator - Windows Build" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  WARNING: Not running as Administrator!" -ForegroundColor Yellow
    Write-Host "   Symlink creation may fail. Please run this script as Administrator." -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        Write-Host "Build cancelled." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Running as Administrator" -ForegroundColor Green
    Write-Host ""
}

# Navigate to project directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

Write-Host "📁 Working directory: $scriptPath" -ForegroundColor Cyan
Write-Host ""

# Check if pnpm is available
try {
    $pnpmVersion = pnpm --version
    Write-Host "✅ pnpm found (version $pnpmVersion)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: pnpm not found. Please install pnpm first." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🚀 Starting Windows build..." -ForegroundColor Cyan
Write-Host ""

# Run the build
pnpm electron:build:win

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✅ Build completed successfully!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "📦 Windows installer location:" -ForegroundColor Cyan
    Write-Host "   dist\ARCH Freight Calculator Setup *.exe" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "❌ Build failed!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    exit 1
}

