@echo off
echo Starting IFM System...

:: Start Backend in a new window using python interpreter
start "IFM Backend" cmd /k "py api.py"

:: Start Frontend in a new window using npm
cd frontend-v2
start "IFM Frontend" cmd /k "npm run dev"

echo System started! 
echo Backend running on http://localhost:8000
echo Frontend running on http://localhost:5173
echo.
pause
