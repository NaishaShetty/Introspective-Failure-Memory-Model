@echo off
echo Installing Python dependencies...
pip install -r requirements.txt

echo.
echo Installing Frontend dependencies...
cd frontend-v2
call npm install
cd ..

echo.
echo Installation complete! You can now run start_app.bat.
pause
