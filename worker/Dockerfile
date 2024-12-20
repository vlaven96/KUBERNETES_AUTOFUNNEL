# Use an official Node.js runtime as a parent image for amd64 architecture
FROM node:18-slim

# Install necessary dependencies for Puppeteer and pnpm
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    curl \
    iputils-ping \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-xcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libatk-bridge2.0-0 \
    libatspi2.0-0 \
    libxtst6 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN npm install -g pnpm

# Set the working directory
WORKDIR /usr/src/app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies using pnpm
RUN pnpm install

# Install Playwright
RUN pnpm dlx playwright install
RUN pnpm exec playwright install

# Expose ports 44444, 44445, 44443
EXPOSE 44444 44445 44443

# Copy the rest of the application code
COPY . .

# Run the Puppeteer script using pnpm
CMD ["pnpm", "start"]