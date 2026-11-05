Write-Host "1. Building Next.js static export..." -ForegroundColor Cyan
npm run build

Write-Host "2. Preparing staging directory..." -ForegroundColor Cyan
Remove-Item -Path "build-desktop-staging" -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path "build-desktop-staging\electron" -Force | Out-Null
Copy-Item "electron\main.cjs" -Destination "build-desktop-staging\electron\main.cjs"

[System.IO.File]::WriteAllText("build-desktop-staging\package.json", '{"name":"it-maintenance-hub","version":"1.0.0","main":"electron/main.cjs"}', [System.Text.UTF8Encoding]::new($false))

Write-Host "3. Packaging Electron desktop executable with --asar=false..." -ForegroundColor Cyan
Remove-Item -Path "IT-Assets-Hub-Desktop" -Recurse -Force -ErrorAction SilentlyContinue

npx @electron/packager build-desktop-staging "IT-Maintenance-Hub" --platform=win32 --arch=x64 --out=IT-Assets-Hub-Desktop --asar=false --overwrite

# Copy exported Next.js assets directly into resources/out
Copy-Item -Path "out" -Destination "IT-Assets-Hub-Desktop\IT-Maintenance-Hub-win32-x64\resources\out" -Recurse -Force

Write-Host "4. Writing Launch-App.bat and README..." -ForegroundColor Cyan
@"
@echo off
title IT Maintenance Hub
cd /d "%~dp0IT-Maintenance-Hub-win32-x64"
start "" "IT-Maintenance-Hub.exe"
exit
"@ | Out-File -FilePath "IT-Assets-Hub-Desktop\Launch-App.bat" -Encoding ascii

Copy-Item "IT-Maintenance-Hub-App\README-Instructions.txt" -Destination "IT-Assets-Hub-Desktop\README-Instructions.txt"

Write-Host "5. Cleaning temporary staging..." -ForegroundColor Cyan
Remove-Item -Path "build-desktop-staging" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "6. Creating standalone portable ZIP package..." -ForegroundColor Cyan
Set-Location "IT-Assets-Hub-Desktop"
tar -a -c -f "IT-Maintenance-Hub-Windows-v1.0.zip" "IT-Maintenance-Hub-win32-x64" "Launch-App.bat" "README-Instructions.txt"
Set-Location ".."

Write-Host "SUCCESS: Desktop app packaged into IT-Assets-Hub-Desktop!" -ForegroundColor Green
