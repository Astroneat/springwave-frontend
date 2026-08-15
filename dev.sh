#!/bin/bash

# ==============================================================================
# SpringWave All-in-One Development Runner
# Starts Backend (node index.js) and Frontend (npm run dev) concurrently
# Handles graceful shutdown on Ctrl+C (SIGINT/SIGTERM)
# ==============================================================================

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Auto-detect paths
if [ -d "$SCRIPT_DIR/src" ] && [ -f "$SCRIPT_DIR/index.js" ]; then
    BACKEND_DIR="$SCRIPT_DIR"
    FRONTEND_DIR="$(cd "$SCRIPT_DIR/../springwave-frontend" 2>/dev/null && pwd)"
elif [ -d "$SCRIPT_DIR/springwave-backend" ] && [ -d "$SCRIPT_DIR/springwave-frontend" ]; then
    BACKEND_DIR="$SCRIPT_DIR/springwave-backend"
    FRONTEND_DIR="$SCRIPT_DIR/springwave-frontend"
elif [ -d "$SCRIPT_DIR/../springwave-backend" ]; then
    BACKEND_DIR="$(cd "$SCRIPT_DIR/../springwave-backend" 2>/dev/null && pwd)"
    FRONTEND_DIR="$SCRIPT_DIR"
else
    BACKEND_DIR="/home/ductai/Documents/springwave-backend"
    FRONTEND_DIR="/home/ductai/Documents/springwave-frontend"
fi

echo -e "${CYAN}======================================================${NC}"
echo -e "${CYAN}       🚀 SPRINGWAVE LOCAL DEVELOPMENT RUNNER         ${NC}"
echo -e "${CYAN}======================================================${NC}"
echo -e "${BLUE}📂 Backend :${NC} $BACKEND_DIR"
echo -e "${BLUE}📂 Frontend:${NC} $FRONTEND_DIR"
echo ""

# Verification
if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}❌ Error: Backend directory not found at: $BACKEND_DIR${NC}"
    exit 1
fi

if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}❌ Error: Frontend directory not found at: $FRONTEND_DIR${NC}"
    exit 1
fi

# Cleanup process handler
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Stopping all SpringWave development servers...${NC}"
    if [ -n "$BACKEND_PID" ]; then
        kill -SIGTERM "$BACKEND_PID" 2>/dev/null
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill -SIGTERM "$FRONTEND_PID" 2>/dev/null
    fi
    wait 2>/dev/null
    echo -e "${GREEN}✅ All processes terminated cleanly.${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# 1. Launch Backend
echo -e "${GREEN}▶️  Starting Backend [node index.js]...${NC}"
(
  cd "$BACKEND_DIR" || exit 1
  node index.js
) &
BACKEND_PID=$!

# Brief pause to let backend initialize database connections
sleep 1

# 2. Launch Frontend
echo -e "${GREEN}▶️  Starting Frontend [npm run dev]...${NC}"
(
  cd "$FRONTEND_DIR" || exit 1
  npm run dev
) &
FRONTEND_PID=$!

echo ""
echo -e "${GREEN}✨ Both Backend & Frontend are running!${NC}"
echo -e "${YELLOW}👉 Press [Ctrl + C] anytime to stop both servers.${NC}"
echo ""

wait
