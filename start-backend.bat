@echo off
echo Starting Spring Boot Backend...
cd /d "%~dp0smart-timetable-backend"
mvnw.cmd spring-boot:run
