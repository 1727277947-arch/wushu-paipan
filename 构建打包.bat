@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo [1/2] 清理旧产物...
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist

echo [2/2] 打包桌面应用...
python -m PyInstaller ^
  --noconfirm --clean --windowed ^
  --name "五术排盘" ^
  --icon "assets\icon.ico" ^
  --add-data "index.html;." ^
  --add-data "assets;assets" ^
  --add-data "manifest.webmanifest;." ^
  --add-data "src;src" ^
  --hidden-import webview ^
  --hidden-import clr_loader ^
  app.py

echo.
echo 打包完成，产物在 dist\五术排盘\ 目录下。
pause