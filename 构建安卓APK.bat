@echo off
chcp 65001 >nul
cd /d "%~dp0"

rem 一键打包安卓 APK。需要 JDK 17+ 与 Android SDK（含 build-tools;34.0.0 与 platforms;android-34）。
rem 若未设置，可在下面两行填入自己的路径。

if "%JAVA_HOME%"=="" set "JAVA_HOME=%USERPROFILE%\androidtoolchain\jdk\jdk-17.0.20.1+1"
if "%ANDROID_SDK_ROOT%"=="" set "ANDROID_SDK_ROOT=%USERPROFILE%\androidtoolchain\sdk"

if not exist "%JAVA_HOME%" (
  echo [错误] 找不到 JDK: %JAVA_HOME%
  echo 请先安装 JDK 17+ 并设置 JAVA_HOME 环境变量。
  pause
  exit /b 1
)
if not exist "%ANDROID_SDK_ROOT%" (
  echo [错误] 找不到 Android SDK: %ANDROID_SDK_ROOT%
  echo 请先安装 Android SDK 并设置 ANDROID_SDK_ROOT 环境变量。
  pause
  exit /b 1
)

powershell -ExecutionPolicy Bypass -File "%~dp0android\build-apk.ps1"
pause