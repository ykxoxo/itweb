$ErrorActionPreference = 'Stop'

function Assert-LastExitCode($StepName) {
  if ($LASTEXITCODE -ne 0) {
    throw "Failed during step: $StepName (exit code $LASTEXITCODE)"
  }
}

Write-Host "1. Cleaning previous output and running Next.js static export..." -ForegroundColor Cyan
Remove-Item -Path "out" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "release-desktop" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "IT-Maintenance-Hub-Single-EXE" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "IT-Maintenance-Hub-Single-EXE.zip" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "single exe" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "single exe.zip" -Force -ErrorAction SilentlyContinue

npm run build
Assert-LastExitCode "Next.js static build"

Write-Host "2. Preparing staging directory..." -ForegroundColor Cyan
Remove-Item -Path "build-desktop-staging" -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path "build-desktop-staging\electron" -Force | Out-Null
Copy-Item "electron\*" -Destination "build-desktop-staging\electron\" -Recurse -Force

[System.IO.File]::WriteAllText(
  (Join-Path (Get-Location) "build-desktop-staging\package.json"),
  '{"name":"it-maintenance-hub","version":"1.0.0","main":"electron/main.cjs"}',
  [System.Text.UTF8Encoding]::new($false)
)

Write-Host "3. Packaging Electron desktop directory with --asar=false..." -ForegroundColor Cyan
Remove-Item -Path "IT-Assets-Hub-Desktop" -Recurse -Force -ErrorAction SilentlyContinue

npx @electron/packager build-desktop-staging "IT-Maintenance-Hub" --platform=win32 --arch=x64 --out=IT-Assets-Hub-Desktop --asar=false --overwrite
Assert-LastExitCode "@electron/packager"

# Copy exported Next.js assets directly into resources/out
Copy-Item -Path "out" -Destination "IT-Assets-Hub-Desktop\IT-Maintenance-Hub-win32-x64\resources\out" -Recurse -Force

Write-Host "4. Cleaning temporary staging..." -ForegroundColor Cyan
Remove-Item -Path "build-desktop-staging" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "5. Generating Single Standalone EXE packages..." -ForegroundColor Cyan
npx electron-builder --win --prepackaged "IT-Assets-Hub-Desktop\IT-Maintenance-Hub-win32-x64"
Assert-LastExitCode "electron-builder"

$outputFolderName = "single exe"
$outputDir = Join-Path (Get-Location) $outputFolderName
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
Copy-Item "release-desktop\IT-Maintenance-Hub 1.0.0.exe" -Destination (Join-Path $outputDir "IT-Maintenance-Hub-Portable.exe") -Force
Copy-Item "release-desktop\IT-Maintenance-Hub Setup 1.0.0.exe" -Destination (Join-Path $outputDir "IT-Maintenance-Hub-Setup.exe") -Force

# Copy UTF-8 Arabic README with explicit Unicode filename
$readmeSource = Join-Path (Get-Location) "scripts\README-desktop-ar.txt"
$readmeFileName = "README-" + [char]0x062A + [char]0x0639 + [char]0x0644 + [char]0x064A + [char]0x0645 + [char]0x0627 + [char]0x062A + ".txt"
$readmeDest = Join-Path $outputDir $readmeFileName
$readmeText = [System.IO.File]::ReadAllText($readmeSource, [System.Text.UTF8Encoding]::new($false))
[System.IO.File]::WriteAllText($readmeDest, $readmeText, [System.Text.UTF8Encoding]::new($true))

Write-Host "6. Creating distributable ZIP archive..." -ForegroundColor Cyan
$zipPath = Join-Path (Get-Location) "single exe.zip"
Compress-Archive -Path $outputFolderName -DestinationPath $zipPath -CompressionLevel Optimal

Write-Host "SUCCESS: Desktop EXE and ZIP ready!" -ForegroundColor Green
Get-Item $zipPath | Select-Object FullName, Length, LastWriteTime
