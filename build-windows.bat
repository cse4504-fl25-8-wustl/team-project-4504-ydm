@echo off
REM Windows Electron Build Script
REM Right-click this file and select "Run as administrator"

echo ========================================
echo ARCH Freight Calculator - Windows Build
echo ========================================
echo.

REM Check for administrator privileges
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Running as Administrator
) else (
    echo [WARNING] Not running as Administrator!
    echo Symlink creation may fail. Please run as Administrator.
    echo.
    pause
)

echo.
echo [INFO] Starting Windows build...
echo.

REM Run the build
call pnpm electron:build:win

if %errorLevel% == 0 (
    echo.
    echo ========================================
    echo [SUCCESS] Build completed successfully!
    echo ========================================
    echo.
    echo [INFO] Windows installer location:
    echo    dist\ARCH Freight Calculator Setup *.exe
    echo.
) else (
    echo.
    echo ========================================
    echo [ERROR] Build failed!
    echo ========================================
    echo.
    pause
    exit /b 1
)

pause

