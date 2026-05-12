@echo off
REM Firebase Cloud Functions - Automated Deployment Script for Windows
REM This script automates the setup and deployment of Cloud Functions for TaskSync

setlocal enabledelayedexpansion

REM Color codes (note: Windows batch doesn't support ANSI colors easily)
set "GREEN=[OK]"
set "RED=[ERROR]"
set "YELLOW=[WARNING]"
set "BLUE=[INFO]"

REM Main script
call :main
exit /b %ERRORLEVEL%

:main
cls
echo ============================================================
echo   TaskSync Firebase Cloud Functions Deployment (Windows)
echo ============================================================
echo.

call :check_prerequisites
if %ERRORLEVEL% neq 0 exit /b 1

call :login_firebase
if %ERRORLEVEL% neq 0 exit /b 1

call :set_project
if %ERRORLEVEL% neq 0 exit /b 1

call :install_dependencies
if %ERRORLEVEL% neq 0 exit /b 1

call :build_functions
if %ERRORLEVEL% neq 0 exit /b 1

call :configure_env
if %ERRORLEVEL% neq 0 exit /b 1

call :deploy_functions
if %ERRORLEVEL% neq 0 exit /b 1

call :verify_deployment
if %ERRORLEVEL% neq 0 exit /b 1

call :test_functions

echo.
echo ============================================================
echo   Deployment Complete!
echo ============================================================
echo.
echo Next steps:
echo   1. Monitor logs: firebase functions:log
echo   2. Check email delivery in EmailJS dashboard
echo   3. Verify scheduled runs at configured times
echo.
exit /b 0

:check_prerequisites
echo ============================================================
echo Step 1: Checking Prerequisites
echo ============================================================
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo %RED% Node.js is not installed. Please install Node.js 20+
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo %GREEN% Node.js installed: %NODE_VERSION%

REM Check Firebase CLI
where firebase >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo %YELLOW% Firebase CLI not found. Installing...
    call npm install -g firebase-tools
    echo %GREEN% Firebase CLI installed
) else (
    for /f "tokens=*" %%i in ('firebase -v') do set FB_VERSION=%%i
    echo %GREEN% Firebase CLI installed: !FB_VERSION!
)

REM Check .env file
if not exist ".env" (
    echo %RED% .env file not found in current directory
    echo %BLUE% Create .env with EmailJS credentials before proceeding
    exit /b 1
)
echo %GREEN% .env file found
echo.
exit /b 0

:login_firebase
echo ============================================================
echo Step 2: Firebase Login
echo ============================================================
echo.

firebase projects:list >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo %GREEN% Already authenticated with Firebase
) else (
    echo %BLUE% Logging in to Firebase...
    call firebase login
    echo %GREEN% Firebase login successful
)
echo.
exit /b 0

:set_project
echo ============================================================
echo Step 3: Setting Firebase Project
echo ============================================================
echo.

echo %BLUE% Available projects:
firebase projects:list --limit=10
echo.

set /p PROJECT_ID="Enter your Firebase project ID (e.g., tasksync-70aa9): "

if "!PROJECT_ID!"=="" (
    echo %RED% Project ID cannot be empty
    exit /b 1
)

call firebase use !PROJECT_ID!
echo %GREEN% Project set to: !PROJECT_ID!
echo.
exit /b 0

:install_dependencies
echo ============================================================
echo Step 4: Installing Dependencies
echo ============================================================
echo.

if not exist "functions" (
    echo %RED% functions directory not found
    exit /b 1
)

cd functions
echo %BLUE% Installing npm packages in functions directory...
call npm install --quiet
if %ERRORLEVEL% neq 0 (
    echo %RED% Failed to install dependencies
    cd ..
    exit /b 1
)
echo %GREEN% Dependencies installed
cd ..
echo.
exit /b 0

:build_functions
echo ============================================================
echo Step 5: Building Cloud Functions
echo ============================================================
echo.

cd functions
echo %BLUE% Compiling TypeScript to JavaScript...
call npm run build >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo %RED% Build failed. Check functions/src/ for errors
    cd ..
    exit /b 1
)

if exist "lib" (
    echo %GREEN% Build successful. Output in: functions/lib/
    dir lib
) else (
    echo %RED% Build failed - lib directory not created
    cd ..
    exit /b 1
)

cd ..
echo.
exit /b 0

:configure_env
echo ============================================================
echo Step 6: Configuring Environment Variables
echo ============================================================
echo.

REM Read values from .env file
for /f "tokens=2 delims==" %%i in ('findstr /b "EMAILJS_SERVICE_ID=" .env') do set EMAILJS_SERVICE_ID=%%i
for /f "tokens=2 delims==" %%i in ('findstr /b "EMAILJS_TEMPLATE_ID=" .env') do set EMAILJS_TEMPLATE_ID=%%i
for /f "tokens=2 delims==" %%i in ('findstr /b "EMAILJS_OVERDUE_TEMPLATE_ID=" .env') do set EMAILJS_OVERDUE_TEMPLATE_ID=%%i
for /f "tokens=2 delims==" %%i in ('findstr /b "EMAILJS_PUBLIC_KEY=" .env') do set EMAILJS_PUBLIC_KEY=%%i
for /f "tokens=2 delims==" %%i in ('findstr /b "FRONTEND_URL=" .env') do set FRONTEND_URL=%%i

if "!EMAILJS_SERVICE_ID!"=="" (
    echo %YELLOW% EmailJS Service ID not found in .env
    set /p EMAILJS_SERVICE_ID="Enter EmailJS Service ID: "
)

if "!EMAILJS_TEMPLATE_ID!"=="" (
    echo %YELLOW% EmailJS Template ID not found in .env
    set /p EMAILJS_TEMPLATE_ID="Enter EmailJS Template ID (nearly due): "
)

echo %BLUE% Setting Firebase environment variables...
call firebase functions:config:set emailjs.service_id="!EMAILJS_SERVICE_ID!" >nul 2>nul
call firebase functions:config:set emailjs.template_id="!EMAILJS_TEMPLATE_ID!" >nul 2>nul

if not "!EMAILJS_OVERDUE_TEMPLATE_ID!"=="" (
    call firebase functions:config:set emailjs.overdue_template_id="!EMAILJS_OVERDUE_TEMPLATE_ID!" >nul 2>nul
)

if not "!EMAILJS_PUBLIC_KEY!"=="" (
    call firebase functions:config:set emailjs.public_key="!EMAILJS_PUBLIC_KEY!" >nul 2>nul
)

if not "!FRONTEND_URL!"=="" (
    call firebase functions:config:set app.frontend_url="!FRONTEND_URL!" >nul 2>nul
)

echo %GREEN% Environment variables configured
echo %BLUE% Configured values:
firebase functions:config:get
echo.
exit /b 0

:deploy_functions
echo ============================================================
echo Step 7: Deploying Cloud Functions
echo ============================================================
echo.

echo %BLUE% Deploying to Firebase...

call firebase deploy --only functions
if %ERRORLEVEL% neq 0 (
    echo %RED% Deployment failed. Check error messages above
    exit /b 1
)

echo %GREEN% Deployment successful!
echo.
exit /b 0

:verify_deployment
echo ============================================================
echo Step 8: Verifying Deployment
echo ============================================================
echo.

echo %BLUE% Checking deployed functions...

firebase functions:list | findstr /C:"sendNearlyDueReminder" >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo %GREEN% sendNearlyDueReminder deployed
) else (
    echo %YELLOW% sendNearlyDueReminder not found
)

firebase functions:list | findstr /C:"sendOverdueAlert" >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo %GREEN% sendOverdueAlert deployed
) else (
    echo %YELLOW% sendOverdueAlert not found
)

firebase functions:list | findstr /C:"updateOverdueTasksStatus" >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo %GREEN% updateOverdueTasksStatus deployed
) else (
    echo %YELLOW% updateOverdueTasksStatus not found
)

firebase functions:list | findstr /C:"notify" >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo %GREEN% notify HTTP endpoint deployed
) else (
    echo %YELLOW% notify endpoint not found
)

echo.
exit /b 0

:test_functions
echo ============================================================
echo Step 9: Testing Functions
echo ============================================================
echo.

echo %BLUE% View logs with:
echo   firebase functions:log --function=sendNearlyDueReminder
echo.
echo Or see all logs:
echo   firebase functions:log --limit=50
echo.

setlocal disableallextensions
exit /b 0
