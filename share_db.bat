@echo off
REM ==============================================================
REM  ExamOS ? Share & Export Database Package (share_db.bat)
REM  Packages the pre-configured PostgreSQL (PGlite) database
REM  along with the automated setupdb.bat installer into a
REM  clean, self-contained zip archive for easy sharing.
REM ==============================================================

if /i "%~1"=="install" goto :DO_INSTALL
if /i "%~1"=="--install" goto :DO_INSTALL
if /i "%~1"=="-i" goto :DO_INSTALL

setlocal DisableDelayedExpansion

echo ==============================================================
echo   ExamOS Database Share ^& Package Generator
echo ==============================================================
echo.

REM --- 1. Verify Prerequisites ---
if not exist "postgres-data\PG_VERSION" (
    echo [ERROR] 'postgres-data' directory not found in current folder: %CD%
    echo Please run this script from the ExamOS project root directory.
    echo.
    if "%~1"=="" pause
    exit /b 1
)

if not exist "setupdb.bat" (
    echo [ERROR] 'setupdb.bat' installer script is missing from %CD%.
    if "%~1"=="" pause
    exit /b 1
)

REM --- 2. Check and Stop Running Services ---
echo [1/4] Checking for active ExamOS services...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ports = @(3000, 4043, 3050); $found = $false; " ^
  "foreach ($p in $ports) { " ^
  "  $conn = Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue; " ^
  "  if ($conn) { $found = $true; break } " ^
  "}; " ^
  "if ($found) { exit 1 } else { exit 0 }"

if %ERRORLEVEL% equ 1 (
    echo       Stopping running ExamOS services to ensure database consistency...
    if exist "stop_all.bat" (
        call stop_all.bat >nul 2>&1
    ) else (
        powershell -NoProfile -Command "3000, 4043, 3050 | ForEach-Object { Get-NetTCPConnection -LocalPort $_ -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }" >nul 2>&1
    )
    timeout /t 2 /nobreak >nul
) else (
    echo       Services are stopped. Database files are unlocked and clean.
)

REM Clean up any stale postmaster.pid
if exist "postgres-data\postmaster.pid" (
    del /f /q "postgres-data\postmaster.pid" >nul 2>&1
)

REM --- 3. Locate Compression Engine (7-Zip or PowerShell) ---
echo.
echo [2/4] Detecting compression engine...
set SEVENZIP=
if exist "C:\Program Files\7-Zip\7z.exe" (
    set "SEVENZIP=C:\Program Files\7-Zip\7z.exe"
) else if exist "C:\Program Files (x86)\7-Zip\7z.exe" (
    set "SEVENZIP=C:\Program Files (x86)\7-Zip\7z.exe"
) else (
    where 7z >nul 2>nul && set SEVENZIP=7z
)

if not "%SEVENZIP%"=="" (
    echo       Using 7-Zip engine: "%SEVENZIP%"
) else (
    echo       7-Zip not found. Using native Windows PowerShell zip engine.
)

REM --- 4. Package Database and Installer ---
echo.
echo [3/4] Compressing database and setupdb.bat into zip archives...
set OUTFILE=examos-database.zip
set OUTFILE_ALIAS=database.zip

if exist "%OUTFILE%" del /f /q "%OUTFILE%" >nul 2>&1
if exist "%OUTFILE_ALIAS%" del /f /q "%OUTFILE_ALIAS%" >nul 2>&1

if not "%SEVENZIP%"=="" (
    "%SEVENZIP%" a -tzip "%OUTFILE%" postgres-data setupdb.bat setupdb.sh README_DATABASE.txt
    if errorlevel 1 (
        echo [ERROR] 7-Zip packaging failed.
        if "%~1"=="" pause
        exit /b 1
    )
) else (
    powershell -NoProfile -Command ^
      "$items = @('postgres-data', 'setupdb.bat', 'setupdb.sh', 'README_DATABASE.txt'); " ^
      "Compress-Archive -Path $items -DestinationPath '%OUTFILE%' -Force"
    if errorlevel 1 (
        echo [ERROR] PowerShell archive creation failed.
        if "%~1"=="" pause
        exit /b 1
    )
)

REM Create database.zip alias for convenience
copy /y "%OUTFILE%" "%OUTFILE_ALIAS%" >nul 2>&1

REM --- 5. Verify Package Integrity ---
echo.
echo [4/4] Verifying archive integrity...
if not exist "%OUTFILE%" (
    echo [ERROR] Output zip file was not created.
    if "%~1"=="" pause
    exit /b 1
)

for %%F in ("%OUTFILE%") do set ZIP_BYTES=%%~zF
set /a ZIP_MB=%ZIP_BYTES% / 1048576

echo       Archive created: %OUTFILE% (%ZIP_MB% MB / %ZIP_BYTES% bytes)
echo       Archive created: %OUTFILE_ALIAS% (%ZIP_MB% MB / %ZIP_BYTES% bytes)

echo.
echo ==============================================================
echo   Database Sharing Package Created Successfully!
echo ==============================================================
echo.
echo   Package Contents:
echo     - postgres-data/       (Full pre-seeded PostgreSQL database)
echo     - setupdb.bat          (Windows 1-click automated installer)
echo     - setupdb.sh           (Linux/macOS automated installer)
echo     - README_DATABASE.txt  (Instructions ^& default login credentials)
echo.
echo   Distribution Files:
echo     - %OUTFILE%
echo     - %OUTFILE_ALIAS%
echo.
echo   How the recipient installs it:
echo     1. Extract %OUTFILE% into their ExamOS directory
echo     2. Run: setupdb.bat
echo     3. Run: start_all.bat
echo.
echo ==============================================================
echo.
if "%~1"=="" pause
exit /b 0

:DO_INSTALL
echo Routing to setupdb.bat for database installation...
call setupdb.bat %*
exit /b %ERRORLEVEL%
