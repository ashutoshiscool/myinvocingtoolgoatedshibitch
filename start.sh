#!/bin/bash

# Lumor Pay local setup and startup script for Linux / Git Bash

# Exit on any unexpected error
set -e

echo "==============================================="
echo "        Lumor Pay Startup & Setup Script       "
echo "==============================================="

# Helper to check if a command exists
check_command() {
    command -v "$1" >/dev/null 2>&1
}

# Detect OS
uname_str=$(uname -s)
if [[ "$uname_str" == *"MINGW"* || "$uname_str" == *"MSYS"* || "$uname_str" == *"CYGWIN"* ]]; then
    echo "🖥️  Detected Windows environment running Git Bash."
    echo "👉 Please run './start.ps1' in a PowerShell terminal (run as Administrator) to automatically configure Windows dependencies."
    echo "==============================================="
    # Continue to checks but skip sudo installations
else
    echo "🐧 Detected Linux system."
fi

# 1. Verify Node.js and NPM
if ! check_command node || ! check_command npm; then
    echo "⚠️  Node.js or NPM is missing."
    if [[ "$uname_str" == *"MINGW"* || "$uname_str" == *"MSYS"* ]]; then
        echo "❌ Cannot install Node.js automatically on Windows from a Bash shell. Please run start.ps1 in PowerShell."
        exit 1
    fi

    echo "Attempting to install Node.js and NPM..."
    if check_command apt-get; then
        sudo apt-get update && sudo apt-get install -y nodejs npm
    elif check_command yum; then
        sudo yum install -y nodejs npm
    elif check_command pacman; then
        sudo pacman -S --noconfirm nodejs npm
    else
        echo "❌ Package manager not recognized. Please install Node.js (v18+) and NPM manually."
        exit 1
    fi
else
    echo "✅ Node.js and NPM are installed."
fi

# 2. Verify Docker and Docker Compose
if ! check_command docker || ! check_command docker-compose; then
    echo "⚠️  Docker or Docker Compose is missing."
    if [[ "$uname_str" == *"MINGW"* || "$uname_str" == *"MSYS"* ]]; then
        echo "❌ Cannot install Docker automatically on Windows from a Bash shell. Please run start.ps1 in PowerShell."
        exit 1
    fi

    echo "Attempting to install Docker..."
    if check_command apt-get; then
        sudo apt-get update && sudo apt-get install -y docker.io docker-compose
        sudo systemctl start docker || true
        sudo systemctl enable docker || true
    elif check_command yum; then
        sudo yum install -y docker docker-compose
        sudo systemctl start docker || true
        sudo systemctl enable docker || true
    elif check_command pacman; then
        sudo pacman -S --noconfirm docker docker-compose
        sudo systemctl start docker || true
        sudo systemctl enable docker || true
    else
        echo "❌ Package manager not recognized. Please install Docker and Docker Compose manually."
        exit 1
    fi
else
    echo "✅ Docker is installed."
fi

# 3. Check/copy env variables
if [ ! -f ".env" ]; then
    echo "⚙️  .env file not found. Copying from .env.example..."
    cp .env.example .env
else
    echo "✅ .env file is present."
fi

# 4. Check and install backend dependencies
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Backend dependencies missing. Installing..."
    cd backend
    npm install
    cd ..
else
    echo "✅ Backend dependencies are already installed."
fi

# 5. Check and install frontend dependencies
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Frontend dependencies missing. Installing..."
    cd frontend
    npm install
    cd ..
else
    echo "✅ Frontend dependencies are already installed."
fi

echo "🚀 Starting backend and frontend development servers..."
echo "==============================================="

# Launch both servers concurrently
npx concurrently \
  --names "BACKEND,FRONTEND" \
  --prefix-colors "blue,green" \
  "npm run dev --prefix backend" \
  "npm run dev --prefix frontend"
