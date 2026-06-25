#!/bin/bash

# Start backend in background using python3 -m uvicorn
cd /home/runner/workspace/backend && python3 -m uvicorn server:app --host localhost --port 8000 &
BACKEND_PID=$!

# Start frontend on port 5000
cd /home/runner/workspace/frontend && PORT=5000 BROWSER=none npm start &
FRONTEND_PID=$!

# Wait for either process to exit
wait -n $BACKEND_PID $FRONTEND_PID
