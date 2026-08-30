@echo off
REM ==============================================================
REM  ExamOS — Package for Review
REM  Run this from the repo root (folder containing docs\, Exam\, tools\)
REM  Requires 7-Zip installed: https://www.7-zip.org/
REM
REM  Future-proof by design: this INCLUDES everything by default and
REM  EXCLUDES known junk/bulk/secret patterns, wherever they appear in
REM  the tree. New folders, new packages, new apps you add later are
REM  picked up automatically — nothing to edit here as the project grows.
REM
REM  This also automatically picks up tools\e2e-tester\logs\*.txt and
REM  tools\e2e-tester\reports\ (the UI test tool's timestamped run
REM  history) — nothing excludes them, and NOTE they are deliberately
REM  .txt not .log, since *.log is excluded below and a .log file here
REM  would silently vanish from every zip otherwise.
REM ==============================================================

setlocal

REM --- locate 7z.exe, checking common install paths ---
set SEVENZIP=
if exist "C:\Program Files\7-Zip\7z.exe" set SEVENZIP=C:\Program Files\7-Zip\7z.exe
if exist "C:\Program Files (x86)\7-Zip\7z.exe" set SEVENZIP=C:\Program Files (x86)\7-Zip\7z.exe
where 7z >nul 2>nul && set SEVENZIP=7z

if "%SEVENZIP%"=="" (
    echo.
    echo ERROR: 7-Zip not found. Install it from https://www.7-zip.org/ and try again.
    pause
    exit /b 1
)

set OUTFILE=review-package.zip
if exist %OUTFILE% del %OUTFILE%

echo Generating lock file integrity check...
if exist Exam\pnpm-lock.yaml (
    echo pnpm-lock.yaml: present ^(correct^) > lockfile-check.txt
) else (
    echo WARNING: pnpm-lock.yaml MISSING - project declares pnpm but has no lock file! > lockfile-check.txt
)
if exist Exam\package-lock.json (
    echo WARNING: package-lock.json present at root - this should NOT exist, project uses pnpm workspaces and npm install will fail on workspace:* references >> lockfile-check.txt
) else (
    echo package-lock.json at root: absent ^(correct^) >> lockfile-check.txt
)
if exist Exam\apps\web\package-lock.json (
    echo WARNING: package-lock.json present in apps\web - should NOT exist >> lockfile-check.txt
) else (
    echo package-lock.json in apps\web: absent ^(correct^) >> lockfile-check.txt
)

echo Generating file tree snapshot...
tree /f /a > tree.txt

echo Generating git log snapshot...
if exist .git (
    git log --stat --date=iso -n 50 > git-log.txt 2>nul
    git log --oneline --all -n 100 > git-log-oneline.txt 2>nul
) else if exist Exam\.git (
    pushd Exam
    git log --stat --date=iso -n 50 > ..\git-log.txt 2>nul
    git log --oneline --all -n 100 > ..\git-log-oneline.txt 2>nul
    popd
) else (
    echo No .git found in root or Exam\ — skipping git log.> git-log.txt
)

echo Checking for UI test tool run history...
set E2ECOUNT=0
if exist tools\e2e-tester\logs (
    for %%f in (tools\e2e-tester\logs\*.txt) do set /a E2ECOUNT+=1
)

echo Zipping project for review...
echo   Including: everything in this folder, plus tree.txt and git-log.txt
echo   Excluding: node_modules, build output, database data/binaries, secrets
echo.

"%SEVENZIP%" a -tzip %OUTFILE% * ^
  -xr!node_modules ^
  -xr!postgres-data ^
  -xr!.cache ^
  -xr!.prisma ^
  -xr!dist ^
  -xr!.next ^
  -xr!build ^
  -xr!coverage ^
  -xr!.turbo ^
  -xr!.git ^
  -xr!*.db ^
  -xr!*.db-journal ^
  -xr!.env ^
  -xr!.env.* ^
  -xr!agyssessionid.txt ^
  -xr!__pycache__ ^
  -xr!*.pyc ^
  -xr!*.log ^
  -xr!*.tsbuildinfo ^
  -xr!.vscode ^
  -xr!.idea ^
  -xr!Thumbs.db ^
  -xr!.DS_Store ^
  -x!%OUTFILE%

echo.
if exist %OUTFILE% (
    echo Done. Created %OUTFILE% — upload this instead of the full folder.
    echo.
    echo Included this time:
    echo   lockfile-check.txt    - flags if the pnpm/npm lock file situation
    echo                           has drifted again
    echo   tree.txt              - full file listing, so new/removed/renamed
    echo                           files are visible at a glance
    echo   git-log.txt           - last 50 commits with full stats
    echo   git-log-oneline.txt   - last 100 commits, one line each, for a
    echo                           quick scan of commit message discipline
    echo                           ^(e.g. checking the [P0X.FXX] tag convention
    echo                           is actually being followed^)
    echo   tools\e2e-tester\logs\*.txt   - %E2ECOUNT% UI test run^(s^) found,
    echo                           full console transcript per run
    echo   tools\e2e-tester\reports\     - matching HTML reports + traces +
    echo                           screenshots for each run above, viewable
    echo                           with: npx playwright show-trace ^<file^>
    echo.
    echo   pnpm-lock.yaml / package-lock.json are included ^(not excluded^) —
    echo   this lets Claude run its own "pnpm install" and actually execute
    echo   your test suites directly, instead of relying on your self-reported
    echo   pass/fail counts. node_modules itself still isn't shipped since it's
    echo   pure bulk that regenerates from the lock file. This also applies to
    echo   tools\e2e-tester's own node_modules — excluded the same way.
    echo.
    echo Note: .env files were excluded ^(they hold secrets^). If Claude needs
    echo to see non-secret env values, paste them directly in chat instead.
    echo.
    echo TIP: if you've run tests locally, save the raw output to a file
    echo ^(e.g. test-output.txt^) in the repo root before running this script —
    echo it'll get swept into the zip automatically, and Claude can read real
    echo results instead of relying on commit messages or STATE.md summaries.
    echo.
    echo TIP: run run_ui_tests.bat before this script if you want Claude to
    echo see real UI/browser evidence too, not just backend test output.
) else (
    echo Something went wrong — %OUTFILE% was not created.
)
pause
