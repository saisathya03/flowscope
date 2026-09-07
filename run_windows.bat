@echo off
title FlowScope AI Local Server
echo.
echo  FlowScope AI is starting at http://localhost:8000
echo  Keep this window open. Press Ctrl+C to stop the server.
echo.
start "" http://localhost:8000
python -m http.server 8000
