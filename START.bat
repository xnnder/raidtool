@echo off
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
) else (
    echo Dependencies already installed, skipping...
)
node index.js
pause
