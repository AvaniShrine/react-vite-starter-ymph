#!/bin/bash

if test -f nohup.out; then
  rm nohup.out
fi

export NODE_ENV=production
# Update dependencies and build the app
# npm update
# npm install
sudo npm run build

# Create log directory
timestamp=$(date "+%Y%m%d%H%M%S")
mkdir -p server-logs/"$timestamp"

# Check if PM2 is installed, if not install it
if ! command -v pm2 &> /dev/null; then
    echo "PM2 is not installed. Installing PM2..."
    sudo npm install -g pm2
fi

# Stop existing instance if running
pm2 stop elitechem-server 2>/dev/null || true

# Start the server with PM2, including memory limits
# --max-memory-restart: restart if memory exceeds 500MB
sudo pm2 start server.js \
  --name "elitechem-server" \
  --max-memory-restart 500M \
  --log ./server-logs/"$timestamp"/log.txt \
  --time

# Save the PM2 process list to be restored on reboot
pm2 save

echo "Running server with PM2 as 'elitechem-server' and logging at server-logs/${timestamp}"

# Display logs
pm2 logs elitechem-server --lines 20