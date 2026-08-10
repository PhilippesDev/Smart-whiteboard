@echo off
title Smart Whiteboard Server
echo Starting Smart Whiteboard Server...

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /r "IPv4"') do (
    set "LOCAL_IP=%%a"
)
set LOCAL_IP=%LOCAL_IP: =%

echo Local IP Address: %LOCAL_IP%
echo.
echo Please open pc.html in your browser or point your mobile to mobile.html
echo using the local IP address on port 80 (e.g., http://%LOCAL_IP%/pc.html)
echo.

php bin/server.php
pause
