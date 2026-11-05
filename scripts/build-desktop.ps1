Write-Host "1. Building Next.js static export..." -ForegroundColor Cyan
npm run build

Write-Host "2. Preparing staging directory..." -ForegroundColor Cyan
Remove-Item -Path "build-desktop-staging" -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path "build-desktop-staging\electron" -Force | Out-Null
Copy-Item "electron\main.cjs" -Destination "build-desktop-staging\electron\main.cjs"
Copy-Item -Path "out" -Destination "build-desktop-staging\out" -Recurse

[System.IO.File]::WriteAllText("build-desktop-staging\package.json", '{"name":"it-maintenance-hub","version":"1.0.0","main":"electron/main.cjs"}', [System.Text.UTF8Encoding]::new($false))

Write-Host "3. Packaging Electron desktop executable..." -ForegroundColor Cyan
npx @electron/packager build-desktop-staging "IT-Maintenance-Hub" --platform=win32 --arch=x64 --out=IT-Maintenance-Hub-App --overwrite

Copy-Item -Path "out" -Destination "IT-Maintenance-Hub-App\IT-Maintenance-Hub-win32-x64\resources\out" -Recurse -Force

Write-Host "4. Cleaning temporary staging..." -ForegroundColor Cyan
Remove-Item -Path "build-desktop-staging" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Desktop app packaged successfully in IT-Maintenance-Hub-App!" -ForegroundColor Green
