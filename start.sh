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
if ! check_command docker || (! check_command docker-compose && ! docker compose version >/dev/null 2>&1); then
    echo "⚠️  Docker or Docker Compose is missing."
    if [[ "$uname_str" == *"MINGW"* || "$uname_str" == *"MSYS"* ]]; then
        echo "❌ Cannot install Docker automatically on Windows from a Bash shell. Please run start.ps1 in PowerShell."
        exit 1
    fi

    echo "Attempting to install Docker..."
    if check_command apt-get; then
        sudo apt-get update && (sudo apt-get install -y docker.io docker-compose-plugin || sudo apt-get install -y docker.io docker-compose)
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

echo "🛡️  Checking firewall configuration..."
if [[ -z "$uname_str" || "$uname_str" != *"MINGW"* && "$uname_str" != *"MSYS"* && "$uname_str" != *"CYGWIN"* ]]; then
    # Removed interactive prompt to open ports.
    # We will just print the warning to manually do it if needed.
    echo "💡 Note: If you want to access the app externally, please ensure ports 5173 (frontend) and 5000 (backend) are open in your firewall."
fi

# Helper to check if a port is in use and kill the process using it
kill_port() {
    local port=$1
    echo "🔍 Checking if port $port is in use..."
    
    # Try using lsof
    if command -v lsof >/dev/null 2>&1; then
        local pids=$(lsof -t -i:"$port")
        if [ ! -z "$pids" ]; then
            echo "💥 Port $port is in use by PID(s): $pids. Terminating..."
            echo "$pids" | xargs kill -9 2>/dev/null || true
            sleep 1
        fi
        return
    fi

    # Try using fuser
    if command -v fuser >/dev/null 2>&1; then
        if fuser "$port"/tcp >/dev/null 2>&1; then
            echo "💥 Port $port is in use. Terminating..."
            fuser -k -9 "$port"/tcp >/dev/null 2>&1 || true
            sleep 1
        fi
        return
    fi

    # Try using ss
    if command -v ss >/dev/null 2>&1; then
        local pids=$(ss -lptn "sport = :$port" 2>/dev/null | grep -oP 'pid=\K\d+')
        if [ ! -z "$pids" ]; then
            echo "💥 Port $port is in use by PID(s): $pids. Terminating..."
            echo "$pids" | xargs kill -9 2>/dev/null || true
            sleep 1
        fi
        return
    fi
}

# Resolve backend and frontend ports from .env or fallback
backend_port=5000
frontend_port=5173

if [ -f ".env" ]; then
    env_port=$(grep -oP '^PORT=\K\d+' .env || true)
    if [ ! -z "$env_port" ]; then
        backend_port=$env_port
    fi
    env_app_url=$(grep -oP '^APP_URL=\K.+' .env || true)
    if [[ "$env_app_url" =~ :([0-9]+) ]]; then
        frontend_port="${BASH_REMATCH[1]}"
    fi
fi

kill_port "$backend_port"
kill_port "$frontend_port"

echo "🚀 Starting backend and frontend development servers..."
echo "==============================================="

# Launch both servers concurrently
npx -y concurrently \
  --names "BACKEND,FRONTEND" \
  --prefix-colors "blue,green" \
  "npm run dev --prefix backend" \
  "npm run dev --prefix frontend -- --host"
