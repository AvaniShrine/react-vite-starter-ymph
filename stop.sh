#!/bin/bash

# Check if PM2 is installed
if command -v pm2 &> /dev/null; then
    # Check if the server is running
    if pm2 list | grep -q "elitechem-server"; then
        echo "Stopping elitechem-server..."
        pm2 stop elitechem-server
        
        # Optionally delete the process from PM2 list
        # pm2 delete elitechem-server
        
        echo "Server stopped."
    else
        echo "Server is not running in PM2."
    fi
else
    echo "PM2 is not installed. Cannot stop the server using PM2."
    
    # Fall back to old method if save_pid.txt exists
    if [ -f save_pid.txt ]; then
        PID=$(cat save_pid.txt)
        if ps -p $PID > /dev/null; then
            echo "Stopping server (PID: $PID) using direct kill..."
            kill $PID
            sleep 3
            
            # Check if process is still running
            if ps -p $PID > /dev/null; then
                echo "Process still running, forcing termination..."
                kill -9 $PID
            fi
            
            echo "Server stopped via PID method."
        else
            echo "Server is not running (PID: $PID)."
        fi
        rm save_pid.txt
    else
        echo "No save_pid.txt file found. Server may not be running."
    fi
fi