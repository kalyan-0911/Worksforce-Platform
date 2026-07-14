@echo off
cd backend
echo Installing Python Flask dependencies...
python -m pip install -r requirements.txt
echo Starting Python Flask Backend on http://localhost:5000...
python run.py
pause
