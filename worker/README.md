# Snapchat Captcha Solver

This tool automates the process of solving captchas for Snapchat accounts and uploading cookies to the DPA Platform.

## How It Works

1. Fetches accounts from the DPA Platform that don't have cookies
2. Opens a browser window for each account
3. Initiates the login process
4. Waits for a human to solve the captcha
5. Completes the login process
6. Captures and uploads the cookies back to the DPA Platform

## Requirements

- Node.js 14+
- Playwright
- Axios

## Environment Variables

- `DPA_PLATFORM_API_KEY` - API key for the DPA Platform

## Running Locally

1. Install dependencies:

   ```
   npm install
   ```

2. Set the environment variable:

   ```
   export DPA_PLATFORM_API_KEY="your-api-key"
   ```

3. Run the script:
   ```
   npm start
   ```

## Running with Docker

1. Build the Docker image:

   ```
   docker build -t snapchat-captcha-solver .
   ```

2. Run the container:
   ```
   docker run -e DPA_PLATFORM_API_KEY="your-api-key" snapchat-captcha-solver
   ```

## Notes

- The browser will open in visible mode to allow manual captcha solving
- The script will wait for up to 5 minutes for each captcha to be solved
- Once all accounts are processed, the script will exit
