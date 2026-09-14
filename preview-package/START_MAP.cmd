@echo off
setlocal
cd /d "%~dp0"
if not exist "TOSH_Preview.html" goto missing
if not exist "serve_preview.py" goto missing
py -3 --version >nul 2>&1
if not errorlevel 1 (
  py -3 "%~dp0serve_preview.py"
  goto end
)
python -c "import sys; assert sys.version_info.major == 3" >nul 2>&1
if not errorlevel 1 (
  python "%~dp0serve_preview.py"
  goto end
)
echo Python 3 was not found. Install Python 3 from python.org and run again.
goto end
:missing
echo Extract ALL files from the ZIP into a folder first. Do not run inside the ZIP.
:end
pause
