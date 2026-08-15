@echo off
chcp 65001 >nul
title ROMAND Beauty Store
cd /d "%~dp0"
echo ==========================================
echo   ROMAND Beauty Store - Dang khoi dong...
echo   Trang chu:  http://localhost:3000
echo   Quan tri:   http://localhost:3000/admin/
echo   (Mat khau admin mac dinh: admin123)
echo   Nhan Ctrl+C de tat server
echo ==========================================
start "" http://localhost:3000
node server.js
pause
