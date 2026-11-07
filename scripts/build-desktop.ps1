Write-Host "1. Building Next.js static export..." -ForegroundColor Cyan
npm run build

Write-Host "2. Preparing staging directory..." -ForegroundColor Cyan
Remove-Item -Path "build-desktop-staging" -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path "build-desktop-staging\electron" -Force | Out-Null
Copy-Item "electron\main.cjs" -Destination "build-desktop-staging\electron\main.cjs"

[System.IO.File]::WriteAllText("build-desktop-staging\package.json", '{"name":"it-maintenance-hub","version":"1.0.0","main":"electron/main.cjs"}', [System.Text.UTF8Encoding]::new($false))

Write-Host "3. Packaging Electron desktop directory with --asar=false..." -ForegroundColor Cyan
Remove-Item -Path "IT-Assets-Hub-Desktop" -Recurse -Force -ErrorAction SilentlyContinue

npx @electron/packager build-desktop-staging "IT-Maintenance-Hub" --platform=win32 --arch=x64 --out=IT-Assets-Hub-Desktop --asar=false --overwrite

# Copy exported Next.js assets directly into resources/out
Copy-Item -Path "out" -Destination "IT-Assets-Hub-Desktop\IT-Maintenance-Hub-win32-x64\resources\out" -Recurse -Force

Write-Host "4. Cleaning temporary staging..." -ForegroundColor Cyan
Remove-Item -Path "build-desktop-staging" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "5. Generating Single Standalone EXE packages..." -ForegroundColor Cyan
npx electron-builder --win --prepackaged "IT-Assets-Hub-Desktop\IT-Maintenance-Hub-win32-x64"

New-Item -ItemType Directory -Path "IT-Maintenance-Hub-Single-EXE" -Force | Out-Null
Copy-Item "release-desktop\IT-Maintenance-Hub 1.0.0.exe" -Destination "IT-Maintenance-Hub-Single-EXE\IT-Maintenance-Hub-Portable.exe" -Force
Copy-Item "release-desktop\IT-Maintenance-Hub Setup 1.0.0.exe" -Destination "IT-Maintenance-Hub-Single-EXE\IT-Maintenance-Hub-Setup.exe" -Force

Write-Host "SUCCESS: Single EXE packages ready in IT-Maintenance-Hub-Single-EXE!" -ForegroundColor Green
