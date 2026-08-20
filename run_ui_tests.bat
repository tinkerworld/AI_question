@echo off
REM ==============================================================
REM  ExamOS — UI / Human Simulation Test Runner
REM  Run this after start_all.bat, once the full stack is live.
REM  Requires one-time setup first (see tools\e2e-tester\README.md):
REM    cd tools\e2e-tester
REM    npm install
REM    npm run install-browser
REM ==============================================================

setlocal enabledelayedexpansion

set TOOLDIR=%~dp0tools\e2e-tester

if not exist "%TOOLDIR%\node_modules" (
    echo.
    echo ERROR: e2e tester dependencies not installed yet.
    echo Run this once first:
    echo   cd tools\e2e-tester
    echo   npm install
    echo   npm run install-browser
    echo.
    pause
    exit /b 1
)

echo Checking that the app is actually running first...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$web = Test-NetConnection -ComputerName localhost -Port 3000 -WarningAction SilentlyContinue; " ^
  "$api = Test-NetConnection -ComputerName localhost -Port 4000 -WarningAction SilentlyContinue; " ^
  "if (-not $web.TcpTestSucceeded -or -not $api.TcpTestSucceeded) { " ^
  "  Write-Host 'ERROR: Web (3000) or API (4000) is not responding. Run start_all.bat first.' -ForegroundColor Red; " ^
  "  exit 1 " ^
  "}"

if errorlevel 1 (
    pause
    exit /b 1
)

REM --- timestamp for this run, used for both the log file and report folder ---
for /f %%i in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Date -Format yyyy-MM-dd_HH-mm-ss"') do set TIMESTAMP=%%i

if not exist "%TOOLDIR%\logs" mkdir "%TOOLDIR%\logs"
if not exist "%TOOLDIR%\reports" mkdir "%TOOLDIR%\reports"

set LOGFILE=%TOOLDIR%\logs\e2e-run-%TIMESTAMP%.txt

echo.
echo ====================================================
echo  Running ExamOS UI test suite...
echo  Log:    logs\e2e-run-%TIMESTAMP%.txt
echo  Report: reports\%TIMESTAMP%\
echo ====================================================
echo.

pushd "%TOOLDIR%"

REM -ExecutionPolicy Bypass here is required on Windows: npx resolves to
REM npx.ps1, and PowerShell's default policy (Restricted, on most systems)
REM blocks .ps1 scripts from running at all. Bypass is scoped to only this
REM one subprocess - it does NOT change your system's actual execution
REM policy or anything outside this single command.
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "npx playwright test 2>&1 | Tee-Object -FilePath '%LOGFILE%'"

set TESTEXIT=%ERRORLEVEL%

REM Copy this run's report into a timestamped folder so it isn't overwritten
REM by the next run - this is the permanent, reviewable record.
if exist "playwright-report" (
    xcopy /E /I /Y "playwright-report" "reports\%TIMESTAMP%" >nul
)

REM --- Append a one-line summary to the permanent, never-pruned history file. ---
REM This is the actual long-term trend record: individual full logs and
REM report folders get pruned below (they're disposable detail), but this
REM file is never touched, so "did test X start failing on run 7" stays
REM answerable even after the detailed evidence for run 7 is long gone.
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$resultsPath = 'reports\%TIMESTAMP%\results.json'; " ^
  "if (Test-Path $resultsPath) { " ^
  "  $r = Get-Content $resultsPath -Raw | ConvertFrom-Json; " ^
  "  $dur = [math]::Round($r.stats.duration / 1000, 1); " ^
  "  $line = '%TIMESTAMP% | passed=' + $r.stats.expected + ' failed=' + $r.stats.unexpected + ' skipped=' + $r.stats.skipped + ' flaky=' + $r.stats.flaky + ' duration=' + $dur + 's | report=reports\%TIMESTAMP%'; " ^
  "} else { " ^
  "  $line = '%TIMESTAMP% | NO RESULTS - run likely crashed before any test executed (check the .txt log for this timestamp)'; " ^
  "} " ^
  "Add-Content -Path 'logs\history.txt' -Value $line"

REM Prune detailed .txt logs to the most recent 20 - these are tiny
REM (measured ~4-80KB each in real runs), so no need to be aggressive here.
REM history.txt above is unaffected by this and keeps every run forever.
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Get-ChildItem -Path 'logs' -Filter 'e2e-run-*.txt' | Sort-Object Name -Descending | Select-Object -Skip 20 | Remove-Item -Force"

REM Prune report folders to the most recent 3 - these are the expensive
REM ones (a single run measured ~22MB before the trace-on-failure-only
REM change above; still meaningfully sized after it on runs with real
REM failures). A report folder's only real value is debugging the MOST
REM RECENT failure - older trend data lives in history.txt, not in old
REM traces, so 3 is enough here even though logs/ keeps far more history.
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Get-ChildItem -Path 'reports' -Directory | Sort-Object Name -Descending | Select-Object -Skip 3 | Remove-Item -Recurse -Force"

popd

echo.
echo ====================================================
if %TESTEXIT% EQU 0 (
    echo  ALL TESTS PASSED
) else (
    echo  SOME TESTS FAILED - see log and report above for details
)
echo ====================================================
echo.
echo Log saved to:      tools\e2e-tester\logs\e2e-run-%TIMESTAMP%.txt
echo Report saved to:   tools\e2e-tester\reports\%TIMESTAMP%\index.html
echo History updated:   tools\e2e-tester\logs\history.txt
echo.
echo All three are included automatically next time you run Reviewzip.bat.
echo.

pause
exit /b %TESTEXIT%