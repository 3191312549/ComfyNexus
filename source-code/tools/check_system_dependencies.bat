@echo off
chcp 65001 >nul
title ComfyNexus System Dependency Checker

echo ============================================================
echo  ComfyNexus Windows System Dependency Checker
echo ============================================================
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0check_system_dependencies.ps1" -Detailed

exit /b %ERRORLEVEL%
