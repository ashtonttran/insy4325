@echo off
REM ============================================================
REM  FlowDesk launcher — starts the Java backend and the React
REM  frontend, then opens the app in your browser.
REM  Double-click this file to run the demo.
REM ============================================================

title FlowDesk Launcher

set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot"
set "NODE_DIR=C:\Program Files\nodejs"
set "MAVEN_BIN=C:\dev\tools\apache-maven-3.9.9\bin"
set "API_DIR=C:\dev\flowdesk-api"
set "WEB_DIR=C:\dev\flowdesk"
set "JAR=%API_DIR%\target\flowdesk-api-0.0.1-SNAPSHOT.jar"

echo.
echo ===== FlowDesk =====
echo.

REM --- Sanity checks ---
if not exist "%JAVA_HOME%\bin\java.exe" (
  echo [ERROR] Java not found at %JAVA_HOME%
  pause
  exit /b 1
)
if not exist "%NODE_DIR%\node.exe" (
  echo [ERROR] Node.js not found at %NODE_DIR%
  pause
  exit /b 1
)

REM --- Build the backend jar if it is missing ---
if not exist "%JAR%" (
  echo Backend jar not found. Building it now ^(one-time, ~1 min^)...
  pushd "%API_DIR%"
  call "%MAVEN_BIN%\mvn.cmd" -q clean package -DskipTests
  popd
)
if not exist "%JAR%" (
  echo [ERROR] Build failed - jar still missing. See output above.
  pause
  exit /b 1
)

REM --- Install frontend deps if missing ---
if not exist "%WEB_DIR%\node_modules" (
  echo Installing frontend dependencies ^(one-time, ~1 min^)...
  pushd "%WEB_DIR%"
  call "%NODE_DIR%\npm.cmd" install
  popd
)

REM --- Start each server in its own window via helper scripts ---
echo Starting backend  ^(http://localhost:8080^) ...
start "FlowDesk API" cmd /k "C:\dev\run-api.cmd"

echo Starting frontend ^(http://localhost:5173^) ...
start "FlowDesk Web" cmd /k "C:\dev\run-web.cmd"

REM --- Give the servers a moment, then open the browser ---
echo Waiting for servers to start...
timeout /t 12 /nobreak >nul
start "" "http://localhost:5173/"

echo.
echo FlowDesk is starting. Two windows opened:
echo   - "FlowDesk API"  backend, port 8080
echo   - "FlowDesk Web"  frontend, port 5173
echo.
echo The app should open in your browser at http://localhost:5173/
echo To stop the demo, close those two windows.
echo.
echo You can close THIS window now.
pause
