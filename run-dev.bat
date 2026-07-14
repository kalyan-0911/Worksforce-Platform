@echo off
set "PATH=%~dp0.node;%PATH%"
cd /d "%~dp0frontend"
npm run dev
