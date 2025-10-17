@echo off
echo.
echo ========================================
echo   Final Build Script
echo ========================================
echo.

REM Create logs folder
if not exist logs mkdir logs

REM Start logging
echo Build started at %date% %time% > logs\final-build.txt
echo. >> logs\final-build.txt

REM Step 1: Node.js
echo [1/4] Checking Node.js...
echo [1/4] Checking Node.js... >> logs\final-build.txt
node --version
node --version >> logs\final-build.txt 2>&1
echo OK
echo OK >> logs\final-build.txt
echo.
echo. >> logs\final-build.txt

REM Step 2: npm config (skip if fails)
echo [2/4] Configuring npm...
echo [2/4] Configuring npm... >> logs\final-build.txt
call npm config set registry https://registry.npmmirror.com >> logs\final-build.txt 2>&1
echo Done (errors ignored)
echo Done >> logs\final-build.txt
echo.
echo. >> logs\final-build.txt

REM Step 3: Install
echo [3/4] Installing dependencies...
echo [3/4] Installing dependencies... >> logs\final-build.txt
echo This will take 5-10 minutes, please wait...
echo.
call npm install > logs\install-output.txt 2>&1
set INSTALL_ERR=%errorlevel%
echo Install exit code: %INSTALL_ERR% >> logs\final-build.txt

if %INSTALL_ERR% neq 0 (
    echo ERROR: Install failed with code %INSTALL_ERR%
    echo ERROR: Install failed >> logs\final-build.txt
    echo See logs\install-output.txt for details
    pause
    exit /b 1
)
echo OK
echo OK >> logs\final-build.txt
echo.
echo. >> logs\final-build.txt

REM Step 4: Build
echo [4/4] Building EXE...
echo [4/4] Building EXE... >> logs\final-build.txt
echo This will take 10-20 minutes, please wait...
echo.
call npm run build-win > logs\build-output.txt 2>&1
set BUILD_ERR=%errorlevel%
echo Build exit code: %BUILD_ERR% >> logs\final-build.txt

if %BUILD_ERR% neq 0 (
    echo ERROR: Build failed with code %BUILD_ERR%
    echo ERROR: Build failed >> logs\final-build.txt
    echo See logs\build-output.txt for details
    pause
    exit /b 1
)
echo OK
echo OK >> logs\final-build.txt
echo.
echo. >> logs\final-build.txt

REM Success
echo Build completed at %date% %time% >> logs\final-build.txt
echo SUCCESS >> logs\final-build.txt

echo ========================================
echo   BUILD SUCCESS!
echo ========================================
echo.
echo Output: dist\
echo Logs: logs\
echo.
pause
start "" "%cd%\dist"
