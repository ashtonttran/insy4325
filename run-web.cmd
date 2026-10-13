@echo off
title FlowDesk Web
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "C:\dev\flowdesk"
echo Starting FlowDesk frontend on http://localhost:5173 ...
echo (Keep this window open during the demo. Close it to stop the frontend.)
echo.
call npm run dev -- --strictPort
echo.
echo Frontend stopped. Press any key to close.
pause >nul
