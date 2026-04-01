#!/bin/bash
# AI Fitness Coach - Start Script
# Usage: ./start.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -f "$SCRIPT_DIR/.env" ]; then
  echo "⚠️  No .env file found. Copy .env.example and add your ANTHROPIC_API_KEY."
  echo "   cp .env.example .env"
  exit 1
fi

echo "🚀 Starting AI Fitness Coach..."

# Start backend
echo "📡 Starting FastAPI backend on http://localhost:8000"
cd "$SCRIPT_DIR/backend"
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

# Start frontend
echo "🌐 Starting React frontend on http://localhost:5173"
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ App running!"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'" INT
wait
