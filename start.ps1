# Lumor Pay local setup and startup script for Windows PowerShell

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "        Lumor Pay Startup & Setup Script       " -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

# Helper function to check if command is available
function Test-CommandExists {
    param ($Command)
    return (Get-Command $Command -ErrorAction SilentlyContinue) -ne $null
}

# Helper function to reload the Path environment variables
function Refresh-EnvironmentPath {
    Write-Host "🔄 Refreshing system Path variable in the current session..." -ForegroundColor Yellow
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
}

# 1. Verify Node.js and NPM
if (-not (Test-CommandExists "node") -or -not (Test-CommandExists "npm")) {
    Write-Host "⚠️  Node.js or NPM is not installed." -ForegroundColor Yellow
    
    if (Test-CommandExists "winget") {
        Write-Host "📦 Found Winget. Installing Node.js (OpenJS.NodeJS)..." -ForegroundColor Yellow
        winget install --id OpenJS.NodeJS --exact --silent --accept-package-agreements --accept-source-agreements
        
        # Reload env variables so node and npm become active in this session
        Refresh-EnvironmentPath
        
        if (-not (Test-CommandExists "node")) {
            Write-Host "❌ Node.js installation finished but command was not found. Please restart your PowerShell terminal and run the script again." -ForegroundColor Red
            Exit
        }
        Write-Host "✅ Node.js and NPM successfully configured." -ForegroundColor Green
    } else {
        Write-Host "❌ Winget is not available on this system. Please download and install Node.js from https://nodejs.org/" -ForegroundColor Red
        Exit
    }
} else {
    Write-Host "✅ Node.js and NPM are installed." -ForegroundColor Green
}

# 2. Verify Docker
if (-not (Test-CommandExists "docker")) {
    Write-Host "⚠️  Docker is not installed." -ForegroundColor Yellow
    
    if (Test-CommandExists "winget") {
        Write-Host "📦 Found Winget. Installing Docker Desktop..." -ForegroundColor Yellow
        winget install --id Docker.DockerDesktop --silent --accept-package-agreements --accept-source-agreements
        
        Write-Host "✅ Docker Desktop installed successfully." -ForegroundColor Green
        Write-Host "👉 Please launch Docker Desktop from your Start Menu, enable WS2/WSL backend, and restart this terminal." -ForegroundColor Yellow
        Exit
    } else {
        Write-Host "❌ Winget is not available on this system. Please download and install Docker Desktop from https://www.docker.com/" -ForegroundColor Red
        Exit
    }
} else {
    Write-Host "✅ Docker is installed." -ForegroundColor Green
}

# 3. Check/copy env variables
if (-not (Test-Path ".env")) {
    Write-Host "⚙️  .env file not found. Copying from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
} else {
    Write-Host "✅ .env file is present." -ForegroundColor Green
}

# 4. Check and install backend dependencies
if (-not (Test-Path "backend\node_modules")) {
    Write-Host "📦 Backend dependencies missing. Installing..." -ForegroundColor Yellow
    Push-Location backend
    npm install
    Pop-Location
} else {
    Write-Host "✅ Backend dependencies are already installed." -ForegroundColor Green
}

# 5. Check and install frontend dependencies
if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "📦 Frontend dependencies missing. Installing..." -ForegroundColor Yellow
    Push-Location frontend
    npm install
    Pop-Location
} else {
    Write-Host "✅ Frontend dependencies are already installed." -ForegroundColor Green
}

Write-Host "🚀 Starting backend and frontend development servers..." -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

# Launch both servers concurrently using npx concurrently
npx concurrently --names "BACKEND,FRONTEND" --prefix-colors "blue,green" "npm run dev --prefix backend" "npm run dev --prefix frontend"
