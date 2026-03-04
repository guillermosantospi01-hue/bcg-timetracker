@echo off
echo Iniciando BCG Time Tracker Hotkey (Ctrl+Shift+B)...
echo Pulsa Ctrl+Shift+B desde cualquier lugar para Quick Add
echo (Cierra esta ventana o usa Task Manager para parar)
start /b pythonw "%~dp0hotkey.pyw"
echo Hotkey activo! Puedes cerrar esta ventana.
timeout /t 3 >nul
