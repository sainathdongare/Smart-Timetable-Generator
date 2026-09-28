@echo off
echo ==========================================
echo Starting Smart Timetable Management System
echo ==========================================

start "Smart Timetable - Backend (Spring Boot)" cmd /k "cd /d "%~dp0smart-timetable-backend" && mvnw.cmd spring-boot:run"
start "Smart Timetable - Frontend (Vite React)" cmd /k "cd /d "%~dp0smart-timetable-frontend" && npm run dev"

echo Backend starting on http://localhost:8080
echo Frontend starting on http://localhost:5173
echo.
