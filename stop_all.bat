@echo off
echo Stopping all ExamOS servers...

powershell -NoProfile -Command "3000, 4000, 5432, 3050 | ForEach-Object { Get-NetTCPConnection -LocalPort $_ -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }"

echo ====================================================
echo  All ExamOS servers have been stopped cleanly!
echo  You can now run start_all.bat
echo ====================================================
