@echo off
echo Stopping all ExamOS servers...

powershell -Command "foreach ($port in @(3000, 4000, 5432, 3050)) { $p = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue; if ($p) { Stop-Process -Id $p.OwningProcess -Force -ErrorAction SilentlyContinue; write-host 'Stopped server on port' $port } }"

echo ====================================================
echo  All ExamOS servers have been stopped cleanly!
echo  You can now test running start_all.bat
echo ====================================================
