# Clean Rebuild Script for GoodBelly

Write-Host "Starting Clean Rebuild Process..." -ForegroundColor Green

# 1. Clean Node Modules and Cache
Write-Host "Cleaning node_modules and cache..."
Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "package-lock.json" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "yarn.lock" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "android" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "ios" -Recurse -Force -ErrorAction SilentlyContinue

# 2. Install Dependencies
Write-Host "Installing dependencies..."
npm install

# 3. Prebuild (Generate Native Files)
Write-Host "Generating native files (Prebuild)..."
npx expo prebuild --clean

# 4. Run Android Build
Write-Host "Running Android build..."
npx expo run:android

Write-Host "Build process initiated. Please wait for the app to launch on your device/emulator." -ForegroundColor Green
