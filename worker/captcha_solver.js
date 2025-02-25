const { chromium } = require('playwright');
const axios = require('axios');
const https = require('https');
const fs = require('fs');
const path = require('path');

// DPA Platform API configuration
const DPA_PLATFORM_API_KEY = 'HC18ytNrQXnsI1X33UfgxMmZq2SWwvy5MTBtsZrAUck';
const DPA_PLATFORM_API_URL = 'https://138.201.226.205:8000';

// Create an HTTPS agent that ignores SSL certificate errors (for development only)
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

async function getAccountsWithoutCookies() {
  try {
    console.log('Fetching accounts without cookies from DPA Platform...');
    const response = await axios.get(`${DPA_PLATFORM_API_URL}/accounts?statuses=GOOD_STANDING&has_cookies=false`, {
      headers: {
        'x-api-key': DPA_PLATFORM_API_KEY,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
      },
      httpsAgent
    });
    
    if (response.status !== 200) {
      throw new Error(`Unexpected status code: ${response.status}`);
    }
    
    console.log(`Fetched ${response.data.length} accounts without cookies`);
    return response.data;
  } catch (error) {
    console.error('Error fetching accounts:', error.message);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response data:`, error.response.data);
    } else if (error.request) {
      console.error('No response received', error.request);
    }
    return [];
  }
}

async function uploadStateFile(username) {
  try {
    console.log(`Uploading state.json file for account ${username}`);
    
    // Read the state file
    if (!fs.existsSync('state.json')) {
      throw new Error('state.json file does not exist');
    }
    
    const stateFile = fs.readFileSync('state.json', 'utf8');
    
    // Upload the state.json file
    const url = `${DPA_PLATFORM_API_URL}/accounts/${username}/cookies`;
    const response = await axios.post(url, {
      cookies: stateFile
    }, {
      headers: {
        'x-api-key': DPA_PLATFORM_API_KEY,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false })
    });

    if (response.status !== 200) {
      throw new Error(`Failed to upload state.json file: ${response.statusText}`);
    }

    console.log(`State file uploaded successfully for ${username}`);
    return true;
  } catch (error) {
    console.error(`Error uploading state file for ${username}:`, error.message);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response data:`, error.response.data);
    }
    return false;
  }
}

async function solveCaptchaForAccount(account) {
  console.log(`Starting captcha solving process for ${account.username}`);
  const browser = await chromium.launch({
    headless: false,
    proxy: {
      server: `http://${account.proxy.host}:${account.proxy.port}`,
      username: account.proxy.proxy_username,
      password: account.proxy.proxy_password
    }
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto('https://www.snapchat.com/');
    console.log(`Attempting to login for account: ${account.username}`);
    
    await page.fill('#ai_input', account.username);
    await page.keyboard.press("Enter");
    
    // Wait for user to solve captcha
    console.log(`Please solve the captcha for account: ${account.username}`);
    await page.waitForNavigation({ timeout: 300000 }); // 5 minutes timeout
    
    await page.fill('#password', account.password);
    await page.keyboard.press("Enter");

    await page.waitForNavigation({ timeout: 300000 }); // 5 minutes timeout

    // Wait for 5 seconds to ensure everything is loaded
    await page.waitForTimeout(5000);

    // Save the browser state to state.json
    console.log(`Saving browser state for ${account.username}`);
    await context.storageState({ path: 'state.json' });
    console.log('State saved to state.json');

    // Upload the state file
    const uploadSuccess = await uploadStateFile(account.username);

    if (uploadSuccess) {
      console.log(`Successfully logged in and saved state for ${account.username}`);
    } else {
      console.error(`Failed to save state for ${account.username}`);
    }
  } catch (error) {
    console.error(`Error processing account ${account.username}:`, error);
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log('Starting Snapchat captcha solver...');
  
  if (!DPA_PLATFORM_API_KEY) {
    console.error('DPA_PLATFORM_API_KEY environment variable is not set');
    process.exit(1);
  }
  
  const accounts = await getAccountsWithoutCookies();
  
  if (accounts.length === 0) {
    console.log('No accounts without cookies found. Exiting.');
    return;
  }
  
  console.log(`Found ${accounts.length} accounts without cookies. Starting captcha solving...`);
  
  for (const account of accounts) {
    await solveCaptchaForAccount(account);
  }
  
  console.log('Captcha solving process completed.');
}

main().catch(error => {
  console.error('Main process error:', error);
  process.exit(1);
});
