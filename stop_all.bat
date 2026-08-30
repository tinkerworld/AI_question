@echo off
echo Stopping all ExamOS servers...

powershell -NoProfile -Command "3000, 4043, 3050 | ForEach-Object { Get-NetTCPConnection -LocalPort $_ -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }"

if exist postgres-data\postmaster.pid del /f /q postgres-data\postmaster.pid >nul 2>nul
if exist test-db\postmaster.pid del /f /q test-db\postmaster.pid >nul 2>nul

echo ====================================================
echo  All ExamOS servers have been stopped cleanly!
echo  You can now run start_all.bat
echo ====================================================
