@echo off
title FlowDesk API
set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot"
set "JAR=C:\dev\flowdesk-api\target\flowdesk-api-0.0.1-SNAPSHOT.jar"
echo Starting FlowDesk backend on http://localhost:8080 ...
echo (Keep this window open during the demo. Close it to stop the backend.)
echo.
"%JAVA_HOME%\bin\java.exe" -jar "%JAR%"
echo.
echo Backend stopped. Press any key to close.
pause >nul
