@echo off
echo Starting Social Network Analysis System...
echo.

REM Start the backend server
start cmd /k "cd backend && python main.py"

REM Wait for backend to initialize
echo Waiting for backend to initialize...
timeout /t 5

REM Start the frontend server
cd frontend && npm start 