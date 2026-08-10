@echo off
title Smart Whiteboard Server
color 0B
echo.
echo  ==========================================
echo   SMART WHITEBOARD - Serveur Local
echo  ==========================================
echo.

:: Detecter l'IP locale principale
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"Adresse IPv4" /C:"IPv4 Address"') do (
    set "LOCAL_IP=%%a"
    goto :found_ip
)
:found_ip
set LOCAL_IP=%LOCAL_IP: =%

echo  Votre IP locale : %LOCAL_IP%
echo.
echo  URLS D'ACCES :
echo  ------------------------------------------
echo  PC (Tableau)   : http://%LOCAL_IP%/public/pc.html
echo  Mobile (Dessin): http://%LOCAL_IP%/public/mobile.html
echo  Accueil        : http://%LOCAL_IP%/public/index.html
echo  ------------------------------------------
echo.
echo  INSTRUCTIONS :
echo  1. Ouvrez http://%LOCAL_IP%/public/pc.html sur le PC
echo  2. Scannez le QR code avec votre telephone
echo  3. Ou entrez le code de session sur le mobile
echo.
echo  Port WebSocket : 8080 (ne pas fermer cette fenetre)
echo.

:: Vérifier que PHP est disponible
where php >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERREUR] PHP introuvable dans le PATH.
    echo  Installez PHP ou utilisez Herd/XAMPP.
    pause
    exit /b 1
)

:: Vérifier que vendor/ existe
if not exist "vendor\autoload.php" (
    echo  [ERREUR] Dependances manquantes. Executez d'abord :
    echo    composer install
    echo.
    pause
    exit /b 1
)

echo  Demarrage du serveur WebSocket...
echo.
php bin/server.php

pause
