@echo off
REM ==============================================================
REM  ExamOS ? Automated Database Installer & Restorer (setupdb.bat)
REM  Installs or restores the pre-configured PostgreSQL (PGlite)
REM  database into your ExamOS installation.
REM ==============================================================

setlocal enabledelayedexpansion

echo ====================================================
echo   ExamOS Database Setup ^& Installer
echo ====================================================
echo.

REM --- 1. Locate Source postgres-data ---
set "SCRIPT_DIR=%~dp0"
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

set SRC_DATA=
set "TEMP_EXTRACT="

REM If %1 is a .zip archive
if not "%~1"=="" if exist "%~1" if /i "%~x1"==".zip" (
    echo [INFO] Found database package %~1. Extracting to staging...
    set "TEMP_EXTRACT=%SCRIPT_DIR%\_db_staging_%RANDOM%"
    powershell -NoProfile -Command "Expand-Archive -Path '%~f1' -DestinationPath '!TEMP_EXTRACT!' -Force"
    if exist "!TEMP_EXTRACT!\postgres-data\PG_VERSION" (
        set "SRC_DATA=!TEMP_EXTRACT!\postgres-data"
    ) else if exist "!TEMP_EXTRACT!\PG_VERSION" (
        set "SRC_DATA=!TEMP_EXTRACT!"
    )
)

REM If %1 is an explicit database folder (not a project root containing start_all.bat)
if "%SRC_DATA%"=="" if not "%~1"=="" (
    if not exist "%~1\start_all.bat" if not exist "%~1\ExamOS-Build-Directive.md" (
        if exist "%~1\postgres-data\PG_VERSION" (
            set "SRC_DATA=%~1\postgres-data"
        ) else if exist "%~1\PG_VERSION" (
            set "SRC_DATA=%~1"
        )
    )
)

REM Standard source lookup: script directory, current directory, or zip
if "%SRC_DATA%"=="" (
    if exist "%SCRIPT_DIR%\postgres-data\PG_VERSION" (
        set "SRC_DATA=%SCRIPT_DIR%\postgres-data"
    ) else if exist "%CD%\postgres-data\PG_VERSION" (
        set "SRC_DATA=%CD%\postgres-data"
    ) else if exist "%SCRIPT_DIR%\examos-database.zip" (
        echo [INFO] Found examos-database.zip. Extracting database...
        powershell -NoProfile -Command "Expand-Archive -Path '%SCRIPT_DIR%\examos-database.zip' -DestinationPath '%SCRIPT_DIR%' -Force"
        if exist "%SCRIPT_DIR%\postgres-data\PG_VERSION" (
            set "SRC_DATA=%SCRIPT_DIR%\postgres-data"
        )
    ) else if exist "%CD%\examos-database.zip" (
        echo [INFO] Found examos-database.zip in current directory. Extracting database...
        powershell -NoProfile -Command "Expand-Archive -Path '%CD%\examos-database.zip' -DestinationPath '%CD%' -Force"
        if exist "%CD%\postgres-data\PG_VERSION" (
            set "SRC_DATA=%CD%\postgres-data"
        )
    )
)

if "%SRC_DATA%"=="" (
    echo [ERROR] Could not find source 'postgres-data' directory or database zip package.
    echo Please make sure 'postgres-data' or 'examos-database.zip' is located
    echo in the same folder as setupdb.bat: %SCRIPT_DIR%
    echo.
    if "%~1"=="" pause
    exit /b 1
)

REM --- 2. Locate ExamOS Target Directory ---
set TARGET_DIR=

REM Check parameter 1 if provided as directory
if not "%~1"=="" (
    if exist "%~1\start_all.bat" (
        set "TARGET_DIR=%~f1"
    ) else if exist "%~1\ExamOS-Build-Directive.md" (
        set "TARGET_DIR=%~f1"
    )
)

REM Check parameter 2 if parameter 1 was a zip package
if "%TARGET_DIR%"=="" if not "%~2"=="" (
    if exist "%~2\start_all.bat" (
        set "TARGET_DIR=%~f2"
    ) else if exist "%~2\ExamOS-Build-Directive.md" (
        set "TARGET_DIR=%~f2"
    )
)

REM Check current working directory
if "%TARGET_DIR%"=="" (
    if exist "%CD%\start_all.bat" (
        set "TARGET_DIR=%CD%"
    ) else if exist "%CD%\ExamOS-Build-Directive.md" (
        set "TARGET_DIR=%CD%"
    )
)

REM Check script's own directory
if "%TARGET_DIR%"=="" (
    if exist "%SCRIPT_DIR%\start_all.bat" (
        set "TARGET_DIR=%SCRIPT_DIR%"
    ) else if exist "%SCRIPT_DIR%\ExamOS-Build-Directive.md" (
        set "TARGET_DIR=%SCRIPT_DIR%"
    )
)

REM Check parent directory of script
if "%TARGET_DIR%"=="" (
    if exist "%SCRIPT_DIR%\..\start_all.bat" (
        for %%I in ("%SCRIPT_DIR%\..") do set "TARGET_DIR=%%~fI"
    )
)

REM If still not found, prompt user
if "%TARGET_DIR%"=="" (
    echo ExamOS installation folder was not automatically detected.
    set /p "TARGET_DIR=Please enter the path to your ExamOS project root: "
    if not exist "!TARGET_DIR!\start_all.bat" (
        if not exist "!TARGET_DIR!\ExamOS-Build-Directive.md" (
            echo.
            echo [ERROR] Invalid ExamOS directory: !TARGET_DIR!
            echo Could not locate start_all.bat or ExamOS-Build-Directive.md in that directory.
            echo.
            if "%~1"=="" pause
            exit /b 1
        )
    )
)

echo [1/4] Target ExamOS Directory: %TARGET_DIR%
echo       Source Database:        %SRC_DATA%
echo.

REM --- 3. Stop running ExamOS services if active ---
echo [2/4] Checking for active ExamOS processes...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ports = @(3000, 4043, 3050); $found = $false; " ^
  "foreach ($p in $ports) { " ^
  "  $conn = Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue; " ^
  "  if ($conn) { $found = $true; break } " ^
  "}; " ^
  "if ($found) { exit 1 } else { exit 0 }"

if %ERRORLEVEL% equ 1 (
    echo       Active ExamOS processes detected. Stopping services...
    if exist "%TARGET_DIR%\stop_all.bat" (
        call "%TARGET_DIR%\stop_all.bat" >nul 2>&1
    ) else (
        powershell -NoProfile -Command "3000, 4043, 3050 | ForEach-Object { Get-NetTCPConnection -LocalPort $_ -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }" >nul 2>&1
    )
    timeout /t 2 /nobreak >nul
) else (
    echo       No conflicting processes active.
)

REM --- 4. Backup Existing Database (if present and different from source) ---
echo.
echo [3/4] Preparing database directory in target...
set "DEST_DATA=%TARGET_DIR%\postgres-data"

for %%A in ("%SRC_DATA%") do set "NORM_SRC=%%~fA"
for %%B in ("%DEST_DATA%") do set "NORM_DEST=%%~fB"

if /i "%NORM_SRC%"=="%NORM_DEST%" (
    echo       Source and target database path are identical.
    echo       Verifying database integrity directly...
) else (
    REM Check for stale export overwrite (compare OLD vs NEW share-manifest.txt)
    set "OLD_MANIFEST="
    if exist "%DEST_DATA%\share-manifest.txt" (
        set "OLD_MANIFEST=%DEST_DATA%\share-manifest.txt"
    ) else if exist "%TARGET_DIR%\share-manifest.txt" (
        set "OLD_MANIFEST=%TARGET_DIR%\share-manifest.txt"
    )

    set "NEW_MANIFEST="
    if exist "%SRC_DATA%\share-manifest.txt" (
        set "NEW_MANIFEST=%SRC_DATA%\share-manifest.txt"
    ) else if exist "%SCRIPT_DIR%\share-manifest.txt" (
        set "NEW_MANIFEST=%SCRIPT_DIR%\share-manifest.txt"
    )

    if not "!OLD_MANIFEST!"=="" if not "!NEW_MANIFEST!"=="" (
        set "OLD_TS="
        for /f "tokens=1,* delims==" %%A in ('type "!OLD_MANIFEST!" ^| findstr /i "^EXPORT_TIMESTAMP="') do (
            set "OLD_TS=%%B"
        )
        set "NEW_TS="
        for /f "tokens=1,* delims==" %%A in ('type "!NEW_MANIFEST!" ^| findstr /i "^EXPORT_TIMESTAMP="') do (
            set "NEW_TS=%%B"
        )

        if not "!OLD_TS!"=="" if not "!NEW_TS!"=="" (
            set IS_STALE=0
            for /f %%R in ('powershell -NoProfile -Command "try { if ([DateTime]::Parse('!NEW_TS!') -lt [DateTime]::Parse('!OLD_TS!')) { '1' } else { '0' } } catch { '0' }"') do (
                set IS_STALE=%%R
            )
            if "!IS_STALE!"=="1" (
                echo.
                echo **************************************************************
                echo   WARNING: STALE DATABASE OVERWRITE DETECTED!
                echo   You are about to overwrite a newer local database [!OLD_TS!]
                echo   with an older shared export [!NEW_TS!].
                echo **************************************************************
                echo.
                set "PROCEED_CONFIRM="
                set /p "PROCEED_CONFIRM=Warning: incoming database export is older than current local database. Proceed anyway? (y/N): "
                if /i not "!PROCEED_CONFIRM:~0,1!"=="y" (
                    echo.
                    echo [ERROR] Database installation aborted by user to protect newer local database.
                    echo.
                    if not "!TEMP_EXTRACT!"=="" if exist "!TEMP_EXTRACT!" rd /s /q "!TEMP_EXTRACT!" >nul 2>&1
                    if "%~1"=="" pause
                    exit /b 1
                )
                echo Proceeding with installation of older database as confirmed...
            )
        )
    )

    if exist "%DEST_DATA%" (
        set TS=%DATE:~-4,4%%DATE:~-7,2%%DATE:~-10,2%_%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%
        set TS=!TS: =0!
        set "BACKUP_DIR=%TARGET_DIR%\postgres-data_backup_!TS!"
        echo       Backing up existing database to: !BACKUP_DIR!
        ren "%DEST_DATA%" "postgres-data_backup_!TS!" >nul 2>&1
        if exist "%DEST_DATA%" (
            move /y "%DEST_DATA%" "!BACKUP_DIR!" >nul 2>&1
        )
    )

    echo       Installing fresh database files into destination...
    if not exist "%DEST_DATA%" mkdir "%DEST_DATA%"
    robocopy "%SRC_DATA%" "%DEST_DATA%" /E /R:1 /W:1 /NFL /NDL /NJH /NJS /nc /ns >nul
    if !ERRORLEVEL! geq 8 (
        echo.
        echo [ERROR] Failed to copy database files to destination.
        if not "!TEMP_EXTRACT!"=="" if exist "!TEMP_EXTRACT!" rd /s /q "!TEMP_EXTRACT!" >nul 2>&1
        if "%~1"=="" pause
        exit /b 1
    )

    REM Copy manifest and state snapshot files into destination
    if exist "%SCRIPT_DIR%\share-manifest.txt" copy /y "%SCRIPT_DIR%\share-manifest.txt" "%DEST_DATA%\share-manifest.txt" >nul 2>&1
    if exist "%SCRIPT_DIR%\db-state.txt" copy /y "%SCRIPT_DIR%\db-state.txt" "%DEST_DATA%\db-state.txt" >nul 2>&1
    if exist "%SRC_DATA%\share-manifest.txt" copy /y "%SRC_DATA%\share-manifest.txt" "%DEST_DATA%\share-manifest.txt" >nul 2>&1
    if exist "%SRC_DATA%\db-state.txt" copy /y "%SRC_DATA%\db-state.txt" "%DEST_DATA%\db-state.txt" >nul 2>&1
    if exist "%DEST_DATA%\share-manifest.txt" copy /y "%DEST_DATA%\share-manifest.txt" "%TARGET_DIR%\share-manifest.txt" >nul 2>&1
    if exist "%DEST_DATA%\db-state.txt" copy /y "%DEST_DATA%\db-state.txt" "%TARGET_DIR%\db-state.txt" >nul 2>&1

    if not "!TEMP_EXTRACT!"=="" if exist "!TEMP_EXTRACT!" rd /s /q "!TEMP_EXTRACT!" >nul 2>&1
)

REM Clean up any stale lock files
if exist "%DEST_DATA%\postmaster.pid" (
    del /f /q "%DEST_DATA%\postmaster.pid" >nul 2>&1
)

REM --- 5. Verify Database Integrity ---
echo.
echo [4/4] Verifying database integrity...
if not exist "%DEST_DATA%\PG_VERSION" (
    echo [ERROR] Verification failed: PG_VERSION is missing!
    if "%~1"=="" pause
    exit /b 1
)
if not exist "%DEST_DATA%\global" (
    echo [ERROR] Verification failed: global directory is missing!
    if "%~1"=="" pause
    exit /b 1
)
if not exist "%DEST_DATA%\base" (
    echo [ERROR] Verification failed: base directory is missing!
    if "%~1"=="" pause
    exit /b 1
)

echo       Database structure verified successfully!
echo.
echo ====================================================
echo   Database Installation Completed Successfully!
echo ====================================================
echo.
echo ====================================================
echo   Installed Database Manifest
echo ====================================================
set "INSTALLED_MANIFEST="
if exist "%DEST_DATA%\share-manifest.txt" (
    set "INSTALLED_MANIFEST=%DEST_DATA%\share-manifest.txt"
) else if exist "%TARGET_DIR%\share-manifest.txt" (
    set "INSTALLED_MANIFEST=%TARGET_DIR%\share-manifest.txt"
)

if not "!INSTALLED_MANIFEST!"=="" (
    type "!INSTALLED_MANIFEST!"
) else (
    echo   [Note: share-manifest.txt not present in package]
)
echo.
echo ----------------------------------------------------
echo   Installed Database State Summary (db-state.txt)
echo ----------------------------------------------------
set "INSTALLED_DB_STATE="
if exist "%DEST_DATA%\db-state.txt" (
    set "INSTALLED_DB_STATE=%DEST_DATA%\db-state.txt"
) else if exist "%TARGET_DIR%\db-state.txt" (
    set "INSTALLED_DB_STATE=%TARGET_DIR%\db-state.txt"
)

if not "!INSTALLED_DB_STATE!"=="" (
    powershell -NoProfile -Command ^
      "$lines = Get-Content '!INSTALLED_DB_STATE!'; " ^
      "$keysLine = $lines | Where-Object { $_ -match 'TRANSLATION KEYS' }; " ^
      "$langsLine = $lines | Where-Object { $_ -match '^\[LANGUAGES\]' }; " ^
      "$transLine = $lines | Where-Object { $_ -match '^\[TRANSLATIONS BY LANGUAGE\]' }; " ^
      "$permLine = $lines | Where-Object { $_ -match '^\[PERMISSIONS\]' }; " ^
      "if ($langsLine) { Write-Host ('  ' + $langsLine) }; " ^
      "if ($keysLine) { Write-Host ('  ' + $keysLine) }; " ^
      "if ($transLine) { Write-Host ('  ' + $transLine) }; " ^
      "if ($permLine) { Write-Host ('  ' + $permLine) }"
) else (
    echo   [Note: db-state.txt not present in package]
)
echo ====================================================
echo.
echo   Seeded Login Credentials:
echo     - Main Admin:   admin@examos.com    / Admin@123
echo     - Sub-Admin:    subadmin@examos.com / SubAdmin@123
echo     - Teacher:      teacher@examos.com  / Teacher@123
echo     - Student 1:    student@examos.com  / Student@123
echo     - Student 2:    student2@examos.com / Student2@123
echo.
echo   Included Data:
echo     - Courses: JEE, NEET, IELTS
echo     - Full Question Bank ^& Exam Patterns
echo     - Subscriptions, Entitlements ^& AI Stack
echo.
echo ====================================================
echo.

if "%~1"=="--no-prompt" exit /b 0

set /p "LAUNCH_NOW=Would you like to start ExamOS now? (Y/N) [N]: "
if /i "%LAUNCH_NOW%"=="Y" (
    echo.
    echo Starting ExamOS...
    pushd "%TARGET_DIR%"
    call start_all.bat
    popd
) else (
    echo.
    echo You can start ExamOS at any time by running:
    echo   %TARGET_DIR%\start_all.bat
    echo.
    if "%~1"=="" pause
)

exit /b 0
