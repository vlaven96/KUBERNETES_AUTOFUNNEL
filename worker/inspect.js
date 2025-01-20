const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const https = require('https');
const { authenticator } = require('otplib');

const DPA_BOT_PLATFORM_API_KEY = 'HC18ytNrQXnsI1X33UfgxMmZq2SWwvy5MTBtsZrAUck'
const DPA_BOT_PLATFORM_URL = 'https://138.201.226.205:8000'

function deleteFolderRecursive(folderPath) {
  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach((file, index) => {
      const curPath = path.join(folderPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(folderPath);
  }
}

function generateId() {
  const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result.toLowerCase();
}

function generateProxy() {
  const countryCode = "us";
  const portHttp = 44443;
  const host = "ultra.marsproxies.com";
  const username = "mr37042byUM";
  const randomId = generateId();
  const password = `dpasnap2024_country-${countryCode.toLowerCase()}_session-${randomId}_lifetime-168h`;
  return `http://${username}:${password}@${host}:${portHttp}`;
}

const selectors = {
    accessTokenInput: "input.MuiInput-input",
    submitButton: "[role='tabpanel'] button.MuiButton-root[type='button']",
    modelInput: '[placeholder="Type in a model..."]',
    presetInput: '[placeholder="Type in a preset..."]',
    inputClearButton: '[aria-label="Clear"]',
    firstPresetResult: 'ul[role="listbox"] button',
    chattingTab: "#wingmanTabView button",
    analyticsTab: "#wingmanTabView button:nth-of-type(4)",
    chattingSwitch: '[role="tabpanel"] input[type="checkbox"]',
    mainSwitch: 'input[type="checkbox"]',
    chattingSwitchBackup: 'input[type="checkbox"]:nth-of-type(2)',
    chattingSwitchBackup2: '.MuiSwitch-input:nth-of-type(2)',
    cupidExtended: ".MuiList-vertical",
    openCupidExtended: "button.MuiButton-root",
    usernameInput: "#ai_input",
    passwordInput: "#password",
    addFriendListButton: '[title="View friend requests"]',
    friendListViewMore: '.ReactVirtualized__Grid__innerScrollContainer [parent="[object Object]"]',
    quickAddsUsernames: '.ReactVirtualized__Grid.ReactVirtualized__List[aria-label="grid"] div div div div span:nth-child(2)',
    quickAddsNames: '.ReactVirtualized__Grid.ReactVirtualized__List[aria-label="grid"] div div div div span:has(span)',
    mainSettings: ".MuiSheet-colorDanger",
    cityInput: "input.MuiInput-input",
    // settingSubmitButton: '[role="tabpanel"] div button.MuiButton-root',
    settingSubmitButton: '.MuiButton-variantSolid',
    matchLocationSwitch: '[role="tabpanel"] input[type="checkbox"]',
    settingBackButton: '[role="tabpanel"] button',
    clearButton: '[aria-label="Clear"]',
    notificationsModal: '[alt="heads-up-modal-image-hint"]',
    notificationsModelCloseButton: "button .nonIntl",
    chattingTabSelector: "#\:r4\:",
    mainButton: '[role="tabpanel"] .MuiListItemButton-root',
    matchLocation: '[role="tabpanel"] input[type="checkbox"]',
  };
  

chromium.use(StealthPlugin());
async function wait(page) {
  try {
    await page.waitForTimeout(2000); // Wait for 2 seconds
  } catch (error) {
    console.error(`An error occurred while waiting: ${error.message}`);
    throw error;
  }
}

function generateTOTP(secret) {
    const formattedSecret = secret.replace(/\s+/g, ''); // Remove any spaces from the secret
    return authenticator.generate(formattedSecret);
  }
  
async function loginToSnapchat(page, username, password, twofa) {
    console.log('Starting..');
    try {
      await page.goto('https://www.snapchat.com/', { timeout: 120000 });
      console.log('Opened Snapchat login page');
    } catch (error) {
      console.error(`Error code: ${error.code}, message: ${error.message}`);
      console.error(`Error stack: ${error.stack}`);
      console.error(`Error name: ${error.name}`);
      console.error(`Error details: ${JSON.stringify(error)}`);
      throw error;
    }
    await wait(page);
    if (await page.waitForSelector(selectors.usernameInput)) {
      console.log('Username input found');
      await page.fill(selectors.usernameInput, username);
      await page.keyboard.press("Enter");
  
      if (!(await page.waitForSelector(selectors.passwordInput).catch(() => void 0))) {
        await updateAccountStatus(username, "CAPTCHA")
        throw new Error("An error occurred while waiting for the password input field to appear or the account is locked!");
      }
      await page.fill(selectors.passwordInput, password);
      await page.keyboard.press("Enter");
    }
  
    await page.waitForTimeout(10000); // Wait for 5 seconds
  
    try {
      const twoFAInputSelector = 'input[name="twoFAChallengeAnswer"]';
      if (await page.waitForSelector(twoFAInputSelector, { timeout: 5000 }).catch(() => void 0)) {
        console.log('2FA input found');
        const secret = twofa;
        const twoFACode = generateTOTP(secret);
        await page.fill(twoFAInputSelector, twoFACode);
        await page.keyboard.press("Enter");
        console.log('2FA code entered');
      } else {
        console.log('No 2FA input found');
      }
    } catch (error) {
      console.error(`An error occurred while handling 2FA: ${error.message}`);
      throw error;
    }
  
    try {
      if (await page.waitForSelector(selectors.notificationsModal)) {
        await page.click(selectors.notificationsModelCloseButton);
      }
    } catch (error) {
      console.log("No notifications modal found.");
    }
    console.log('Logged into Snapchat account');
  }

async function startChromeWithSnapAccount() {
  // Load debug configuration
  const username = process.argv[2]; 
  deleteFolderRecursive('./data');
  if (!username) {
    console.log('Error: Please provide a username as a command-line argument.');
    process.exit(1); // Exit with an error code
  }

  const url = `${DPA_BOT_PLATFORM_URL}/accounts/by-username/${username}`;
  const headers = {
    'x-api-key': `${DPA_BOT_PLATFORM_API_KEY}`,
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
  };

  const response = await axios.get(`${url}`, { headers, httpsAgent: new https.Agent({ rejectUnauthorized: false }) });
  if (response.status !== 200) {
    console.error(`Unexpected status code: ${response.status}`);
    return;
  }

  const account_details = response.data;

  const isHotBot = true;
  // const extensionPath = isHotBot == 'true' ? './hotbot' : './cupidbot';
  const extensionPath = './cupidbot';
  console.log(extensionPath);
  
  const residencialProxyUrl = generateProxy();
  console.log(`Using residential proxy: ${residencialProxyUrl}`);

  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
    // '--window-size=1920,1080', // Set window size to standard screen resolution
    '--use-fake-ui-for-media-stream', // Enable webcam permissions for all websites
    '--use-fake-device-for-media-stream', // Use fake device for media stream
  ];

  const context = await chromium.launchPersistentContext('./data', {
    headless: false,
    args: args,
    proxy: {
      server: residencialProxyUrl.split('@')[1],
      username: residencialProxyUrl.split('@')[0].split('//')[1].split(':')[0],
      password: residencialProxyUrl.split('@')[0].split('//')[1].split(':')[1],
    },
    // viewport: { width: 1920, height: 1080 }, // Set viewport to standard screen resolution
  });
//   const context = await browser.newContext();
  const page = await context.newPage();
  console.log(account_details.two_fa_secret);
  try {
    let cookies = JSON.parse(account_details.cookies.data).cookies;
    if (cookies && cookies.length > 0) {
      await context.addCookies(cookies);
      console.log(`Cookies set for ${account_details.username}`);
      await page.goto('https://www.snapchat.com/');
      console.log('Going directly to SnapChat without login');
      await page.waitForTimeout(5000); // Wait for 5 seconds
      const currentUrl = page.url();
      if (!currentUrl.startsWith("https://web.snapchat.com")) {
        console.error("Not logged-in, cookies most probably expired, attempting login");
        try {
          await loginToSnapchat(page, account_details.username, account_details.password, account_details.two_fa_secret);
          console.log(`Successfully logged in as ${account_details.username}`);
        } catch (loginError) {
          console.error(`Error logging in as ${account_details.username}:`, loginError);
        }
      }
    } else {
      throw new Error('No cookies found, proceeding to login');
    }
  } catch (error) {
    console.error(`Error setting cookies for ${username}:`, error);
    try {
      await loginToSnapchat(page, account_details.username, account_details.password, account_details.two_fa_secret);
      console.log(`Successfully logged in as ${account_details.username}`);
    } catch (loginError) {
      console.error(`Error logging in as ${account_details.username}:`, loginError);
    }
  }
}

startChromeWithSnapAccount().catch(console.error);
