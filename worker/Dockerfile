FROM mcr.microsoft.com/playwright:v1.39.0-focal

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Set environment variable (will be overridden at runtime)
ENV DPA_PLATFORM_API_KEY=""

# Install xvfb for headless browser with display
RUN apt-get update && apt-get install -y \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# Create a script to start Xvfb and run the captcha solver
RUN echo '#!/bin/bash \n\
    Xvfb :99 -screen 0 1280x720x24 -ac & \n\
    export DISPLAY=:99 \n\
    node captcha_solver.js \n\
    ' > /app/start.sh && chmod +x /app/start.sh

# Run the script when the container starts
CMD ["/app/start.sh"]