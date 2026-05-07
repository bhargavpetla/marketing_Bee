@echo off
SET PATH=C:\Program Files\nodejs;%PATH%
cd /d "%~dp0"
echo Starting Pink Foundry Radar dev server on http://localhost:3030
"C:\Program Files\nodejs\node.exe" ".\node_modules\next\dist\bin\next" dev -p 3030
