const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const ProxyChain = require('proxy-chain');
const axios = require('axios');
const https = require('https');
const { authenticator } = require('otplib');
const winston = require('winston');

const args = process.argv.slice(2); // Get command-line arguments
const DEBUG_MODE = args.includes('--debug'); // Check if --debug is passed

let switchProxy = async () => {};
let closeProxy = async () => {};
let isTempLocked = false;

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
  ],
});

if (DEBUG_MODE) {
  logger.info("Debug mode enabled. Loading debug configuration...");
  require('./debug-config.js'); // Load and execute the debug configuration file
} else {
  logger.info("Debug mode not enabled. Using environment variables.");
}



function generateId() {
  const characters = '0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

function generateProxy() {
  const host = "datacenter.proxyempire.io";
  const port = "9000";
  const sessionId = generateId();
  const username = `3954360552;any;session_${sessionId}`;
  const password = "b4adccb73d";
  return `http://${username}:${password}@${host}:${port}`;
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
  sendFriendRequestsButton: 'button[title="View friend requests"]',
  sendFriendRequestUsernameInput: 'input[placeholder="Search..."]',
  sendFriendRequestButton: 'button.sGsBQ',
  clearUsernameButton: 'svg.pG8Jq'
};

const {HttpsProxyAgent} = require('https-proxy-agent');

const proxy = generateProxy();
const agent = new HttpsProxyAgent(proxy);


function generateTOTP(secret) {
  const formattedSecret = secret.replace(/\s+/g, ''); // Remove any spaces from the secret
  return authenticator.generate(formattedSecret);
}


async function isUsernameAlive(username) {
  logger.info(`Checking username: ${username}`);

  const url = `https://www.snapchat.com/add/${username}`;
  logger.info(url);
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3"
  };
  

  try {
    const response = await axios.get(url, {
      headers: headers,
      httpsAgent: agent
    });

    if (response.status === 200) {
      logger.info(`Successfully checked username: ${username}`);
    } else {
      logger.info(`Failed to check username: ${username} with status code ${response.status}`);
      return false;
    }

    const responseText = response.data;
    if (responseText.includes(username)) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    logger.error(`Error checking Snapchat username: ${error.message}`);
    return false;
  }
}


chromium.use(StealthPlugin());

async function click(page, selector) {
  const element = await page.waitForSelector(selector);
  await element.click({force: true});
}

async function wait(page) {
  const waitTimeVar = DEBUG_MODE ? 5000 : 10000; 
  const waitTime = Math.floor(Math.random() * waitTimeVar) + waitTimeVar; // Random time between 10000ms (10s) and 20000ms (20s)
  await page.waitForTimeout(waitTime);
}

async function retry(fn, retries = 2, showlogs = true, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (showlogs) {
        logger.info(`Attempt ${i + 1} failed: ${error.message}`);
      }
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

async function clearInput(selector, page) {
  const input = await page.waitForSelector(selector);
  await page.click(selector);

  if (
    await page
      .waitForSelector(selectors.inputClearButton, {
        timeout: 20000,
      })
      .catch(() => void 0)
  )
    await page.click(selectors.inputClearButton);
  await page.click(selector);
}

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

async function enableMatchLocation(page) {
  logger.info("Enabling match location...");
  await page.waitForSelector(selectors.mainButton);
  const mainButtons = await page.$$(selectors.mainButton);
  if (mainButtons.length >= 2) {
    await mainButtons[1].click();
    logger.info("Clicked the second mainButton");
  } else {
    logger.info("Could not find the second mainButton to click");
  }
  
  await page.waitForSelector(selectors.matchLocation);
  const checkboxes = await page.$$(selectors.matchLocation);
  if (checkboxes.length >= 1) {
    const isChecked = await checkboxes[0].isChecked();
    if (!isChecked) {
      await checkboxes[0].click();
      logger.info("Checked the matchLocation checkbox");
    } else {
      logger.info("matchLocation checkbox is already checked");
    }
  } else {
    logger.info("Could not find the matchLocation checkbox");
  }

  logger.info("Waiting for a bit before reloading the page...");
  await page.waitForTimeout(5000); // Wait for 5 seconds

  logger.info("Reloading the page...");
  await retry(async () => {
    await page.reload({ timeout: 120000 });
    logger.info("Page reloaded successfully");
  });
  logger.info("Match location enabled");
}

async function launchBrowser() {
  const username = process.env.ACCOUNT_USERNAME;
  const password = process.env.PASSWORD;
  const cupid_token = process.env.CHATBOT_TOKEN;
  const model_name = process.env.MODEL_NAME;
  const proxyHost = process.env.PROXY_HOST.replace(/\t|\n/g, '');
  const proxyPort = process.env.PROXY_PORT.replace(/\t|\n/g, '');
  const proxyUsername = process.env.PROXY_USERNAME.replace(/\t|\n/g, '');
  const proxyPassword = process.env.PROXY_PASSWORD.replace(/\t|\n/g, '');
  const secret = process.env.TWOFA_SECRET;
  const isHotBot = process.env.isHotBot;

  logger.info(`Username: ${username}`);
  logger.info(`Password: ${password}`);
  logger.info(`Cupid Token: ${cupid_token}`);
  logger.info(`Model Name: ${model_name}`);
  logger.info(`isHotBot: ${isHotBot}`);

  const proxyUrl = `http://${proxyUsername}:${proxyPassword}@${proxyHost}:${proxyPort}`;
  const residentialProxyUrl = generateProxy();
  logger.info(`Proxy URL: ${residentialProxyUrl}`);
  const newProxyUrl = await ProxyChain.anonymizeProxy({
    url: secret ? residentialProxyUrl : proxyUrl,
    port: 51123
  });

  // Close any existing anonymized proxy
  switchProxy = async () => {
    try {
      await ProxyChain.closeAnonymizedProxy(newProxyUrl, true);
      logger.info('Successfully closed old proxy');
    } catch (error) {
      logger.error('Error closing old proxy:', error);
    }
    try {
      await ProxyChain.anonymizeProxy({
        url: proxyUrl,
        port: 51123
      });
    } catch (error) {
      logger.error('Error creating new proxy:', error);
      throw error;
    }
  };

  closeProxy = async () => {
    try {
      await ProxyChain.closeAnonymizedProxy(newProxyUrl, true);
      logger.info('Successfully closed old proxy');
    } catch (error) {
      logger.error('Error closing old proxy:', error);
    }
    try {
      await ProxyChain.closeAnonymizedProxy(proxyUrl, true);
      logger.info('Successfully closed new proxy');
    } catch (error) {
      logger.error('Error closing new proxy:', error);
    }
  };
  
  logger.info(`Anonymized Proxy URL: ${newProxyUrl}`);

  const extensionPath = isHotBot == 'true' ? './hotbot' : './cupidbot';
  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
    '--window-size=1920,1080', // Set window size to standard screen resolution
    '--use-fake-ui-for-media-stream', // Enable webcam permissions for all websites
    '--use-fake-device-for-media-stream' // Use fake device for media stream
  ];
  if (!DEBUG_MODE) {
    args.unshift('--headless=new');
  }
  const browser = await chromium.launchPersistentContext('./data', {
    headless: false, // Set to true to run in headless mode
    args: args,
    proxy: {
      server: newProxyUrl,
    },
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 }, // Set viewport to standard screen resolution
  });

  return browser;
}

async function loginToSnapchat(page, username, password) {
  logger.info('Starting..');
  try {
    await page.goto('https://www.snapchat.com/', { timeout: 120000 });
    logger.info('Opened Snapchat login page');
  } catch (error) {
    logger.error(`Error code: ${error.code}, message: ${error.message}`);
    logger.error(`Error stack: ${error.stack}`);
    logger.error(`Error name: ${error.name}`);
    logger.error(`Error details: ${JSON.stringify(error)}`);
    throw error;
  }
  await wait(page);
  if (await page.waitForSelector(selectors.usernameInput)) {
    logger.info('Username input found');
    await page.fill(selectors.usernameInput, username);
    await page.keyboard.press("Enter");
    await wait(page);
    await wait(page);

    if (!(await page.waitForSelector(selectors.passwordInput).catch(() => void 0))) {
      // No longer updating account status

      const currentUrl = page.url();
      isTempLocked = currentUrl === "https://accounts.snapchat.com/accounts/locked/sso";
      
      // await updateAccountStatus(username, "CAPTCHA")
      throw new Error("An error occurred while waiting for the password input field to appear or the account is locked!");
    }
    await page.fill(selectors.passwordInput, password);
    await page.keyboard.press("Enter");
  }

  await page.waitForTimeout(10000); // Wait for 5 seconds

  try {
    const twoFAInputSelector = 'input[name="twoFAChallengeAnswer"]';
    if (await page.waitForSelector(twoFAInputSelector, { timeout: 5000 }).catch(() => void 0)) {
      logger.info('2FA input found');
      const secret = process.env.TWOFA_SECRET;
      const twoFACode = generateTOTP(secret);
      await page.fill(twoFAInputSelector, twoFACode);
      await page.keyboard.press("Enter");
      logger.info('2FA code entered');
    } else {
      logger.info('No 2FA input found');
    }
  } catch (error) {
    logger.error(`An error occurred while handling 2FA: ${error.message}`);
    throw error;
  }
  logger.info('Logged into Snapchat account');
}

async function enableHotBot(page, hotbot_token, model_name) {
  logger.info("Enabling HotBot...");
  try {
    await page.waitForSelector('input[id="license"]', { timeout: 5000 });
    logger.info("License input found");
    await page.fill('#license', hotbot_token);
    await page.keyboard.press("Enter");
    logger.info("Hotbot token entered and Enter key pressed");
  } catch (error) {
    logger.info("No license input field found, continuing...");
  }

  await wait(page);
  await wait(page);

  // console.log("Clicking on the second div with class='relative' and type='button'...");
  // const relativeDivs = await page.$$('div.relative[type="button"]');
  // if (relativeDivs.length >= 2) {
  //   await relativeDivs[1].click();
  //   console.log("Clicked the second div with class='relative' and type='button'");
  // } else {
  //   console.log("Could not find the second div with class='relative' and type='button'");
  // }
  
  //   await wait(page);
  //   await wait(page);
  //   await wait(page);
  //   await wait(page);

  //     console.log("Clicking on the second div with class='relative' and type='button'...");
  // const relativeDivs2 = await page.$$('div.relative[type="button"]');
  // if (relativeDivs2.length >= 2) {
  //   await relativeDivs2[1].click();
  //   console.log("Clicked the second div with class='relative' and type='button'");
  // } else {
  //   console.log("Could not find the second div with class='relative' and type='button'");
  // }


  // await wait(page);
  // await wait(page);
  // await wait(page);
  // await wait(page);

  // console.log(`Clicking on <p> element with model name: ${model_name}`);
  // const modelParagraph = await page.$$(`p:has-text("${model_name}")`);
  // if (modelParagraph.length > 0) {
  //   await modelParagraph[0].click();
  //   console.log(`Clicked on <p> element with model name: ${model_name}`);
  // } else {
  //   console.log(`Could not find <p> element with model name: ${model_name}`);
  // }

  logger.info("Checking chatting activation switch state...");
  const chattingSwitch = await page.$$('button[role="switch"]');
  if (chattingSwitch.length >= 2) {
    const switchState = await chattingSwitch[1].getAttribute('data-state');
    if (switchState !== 'checked') {
      await chattingSwitch[1].click();
      logger.info("Chatting activation switch was unchecked, now enabled");
    } else {
      logger.info("Chatting activation switch already enabled");
    }
  } else {
    logger.info("Could not find chatting activation switch");
  }
  await wait(page);

  logger.info("Clicking on the 'Main' button...");
  const mainButton = await page.$$('span:has-text("Main")');
  if (mainButton.length > 0) {
    await mainButton[0].click();
    logger.info("Clicked on the 'Main' button");
  } else {
    logger.info("Could not find the 'Main' button");
  }
  await wait(page);
  await wait(page);

  logger.info("Enabling match user location...");
  const switchButtons = await page.$$('button[role="switch"]');
  if (switchButtons.length >= 2) {
    await switchButtons[1].click();
    logger.info("Enabled match user location");
  } else {
    logger.info("Not found match user location");
  }
  await wait(page);
  await wait(page);
  logger.info("Enabling HotBot Switch...");
  const firstSwitchButton = await page.$$('button[role="switch"]');
  if (firstSwitchButton.length > 0) {
    await firstSwitchButton[0].click();
    logger.info("Enabled HotBot Switch");
  } else {
    logger.info("Not found HotBot Switch");
  }
  await wait(page);
  await wait(page);

}


async function enableCupid(page, cupid_token, model_name) {
  const isHotBot = process.env.isHotBot;
  await wait(page);

  // Switch to a new proxy and reload the page to apply it
  await switchProxy(); // Call switchProxy() to close old proxy and create new one
  await page.reload(); // Reload page to use the new proxy
  await page.screenshot({ path: 'after-proxy-switch.png', fullPage: true });

  logger.info("Switched to a new proxy and reloaded the page");

  await wait(page);
  logger.info("Clicking on the 'Next' button...");
  try {
    logger.info("Looking for 'Next' button...");
    const nextButton = await page.waitForSelector('span:has-text("Next")', { timeout: 5000 });
    await nextButton.click();
    await page.screenshot({ path: 'after-next-click.png', fullPage: true });
    logger.info("Clicked on the 'Next' button");
    
    await wait(page);
    
    logger.info("Looking for 'Skip' button...");
    const skipButton = await page.waitForSelector('span:has-text("Skip")', { timeout: 5000 });
    await skipButton.click();
    await page.screenshot({ path: 'after-skip-click.png', fullPage: true });
    logger.info("Clicked on the 'Skip' button");
    
    await wait(page);
    
  } catch (error) {
    logger.info("Could not find Next/Skip buttons:");
  }

  try {
    if (await page.waitForSelector(selectors.notificationsModal)) {
      await page.click(selectors.notificationsModelCloseButton);
      await page.screenshot({ path: 'after-notifications-close.png', fullPage: true });
    }
  } catch (error) {
    logger.info("No notifications modal found.");
  }

  await wait(page);

  if (isHotBot == 'true') {
     await enableHotBot(page, cupid_token, model_name);
     await page.screenshot({ path: 'after-hotbot-enable.png', fullPage: true });
     return;
  }

  
  logger.info("Reloading page because Cupid has issues to load");
  await page.reload();
  await page.screenshot({ path: 'after-cupid-reload.png', fullPage: true });
  logger.info("Waiting for Cupid to be Enabled");
  await wait(page);

  logger.info("Taking screenshot before enabling Cupid...");
  try {
    await page.screenshot({ path: 'pre-cupid-state.png', fullPage: true });
    logger.info("Screenshot saved successfully");
  } catch (error) {
    logger.error("Failed to take screenshot:", error);
  }

  try {
    const mainSwitchEnabled = await page.isChecked(selectors.mainSwitch);
    if (mainSwitchEnabled) {
      await page.screenshot({ path: 'cupid-already-enabled.png', fullPage: true });
      logger.info("Cupid is already enabled");

      // There might be a problem with the state of cupid so better if we empty the cookies
      try {
        await fs.promises.writeFile('state.json', '{}', 'utf8');
        await uploadStateFile(username);
        logger.info("State file has been emptied and cookies have been updated.");
      } catch (error) {
        logger.error("Error updating state file:", error);
      }

      return;
    }
  } catch (error) { 
    logger.info("Cupid probable not enabled! Enabling it!");
    logger.error("Error:", error);
  }

  if (!(await page.waitForSelector(selectors.cupidExtended).catch(() => void 0))) {
      await click(page, selectors.openCupidExtended);
      await page.screenshot({ path: 'after-cupid-extended.png', fullPage: true });
      await wait(page);
    }

  await retry(async () => {
    if (await page.waitForSelector(selectors.accessTokenInput)) {
      logger.info("Filling access token...");
      await page.fill(selectors.accessTokenInput, cupid_token);
      await wait(page);
      logger.info("Clicking Submit");
      await click(page, selectors.submitButton);
      await page.screenshot({ path: 'after-token-submit.png', fullPage: true }); 
      try {
        await click(page, selectors.submitButton); 
      } catch(error) {}
    }
  });
  logger.info("Access token filled...");
  await wait(page);
  const clearButtonSelector = 'button[aria-label="Clear"]';
  await page.evaluate((selector) => {
    const button = document.querySelector(selector);
    if (button) button.style.display = 'block';
  }, clearButtonSelector);
  const clearButton = await page.$(clearButtonSelector);
  if (clearButton) {
    logger.info("Clear button found, clicking it even if not visible...");
    await clearButton.click({ force: true });
    await page.screenshot({ path: 'after-clear-click.png', fullPage: true });
    await wait(page);
  } else {
    logger.info("Clear button not found, proceeding...");
  }
  try {
    await page.waitForSelector(selectors.modelInput)
    logger.info("Filling model name...");
    await clearInput(selectors.modelInput, page);
    await page.fill(selectors.modelInput, model_name);
    await page.waitForSelector(selectors.firstPresetResult)
    await click(page, selectors.firstPresetResult, { force: true });
    await page.screenshot({ path: 'after-model-select.png', fullPage: true });
    try {
      await click(page, selectors.firstPresetResult, { force: true }); 
    } catch(error) {}
  } catch (error) {
    logger.info("Seems model already filled in");
  }

  await wait(page);

  logger.info("Enabling chatting...");
  await retry(async () => {
    if (await page.waitForSelector(selectors.chattingTab).catch(() => void 0)) {
      await click(page, selectors.chattingTab);
      await page.screenshot({ path: 'after-chatting-tab.png', fullPage: true });
    } else {
      throw new Error("Chatting tab not found!");
    }
    logger.info("Switched to chatting tab...");
    await wait(page);
    await page.waitForSelector(selectors.chattingSwitch);
    let isChecked = false;
    while (!isChecked) {
      await click(page, selectors.chattingSwitch);
      const element = await page.$(selectors.chattingSwitch);
      isChecked = await element.getAttribute('aria-checked') === 'true';
      if (!isChecked) {
        await wait(page); // Give a small delay between attempts
      }
    }
    await page.screenshot({ path: 'after-chatting-enabled.png', fullPage: true });
    logger.info("chattingSwitch found and clicked until enabled");
    logger.info("Enabled chatting...");
  });

  await wait(page);

  logger.info("Enabling CubidBot...");
  await retry(async () => {
    await click(page, selectors.mainSwitch);
  });
  await page.screenshot({ path: 'after-cupid-enabled.png', fullPage: true });

  logger.info("Cupid Enabled");
  await wait(page);
  await wait(page);
}

async function checkCupidStatusAndReload(page, browser, username) {
  try {
    // Refresh the page
    try {
      await retry(async () => {
        await page.reload({ timeout: 120000 });
        await page.screenshot({ path: 'after-page-reload.png', fullPage: true });
        logger.info("Page reloaded successfully");
      });
    } catch (error) {
      logger.info("Page reload failed, opening a new web.snapchat.com page");
      try {
        await page.close();
      } catch (error) {
        logger.info("Couldn't close the page, opening a new one...");
      }
      page = await browser.newPage();
      await page.goto('https://web.snapchat.com', { timeout: 120000 });
      await page.screenshot({ path: 'after-new-page.png', fullPage: true });
    }
    await wait(page);

    // const usernameAlive = await isUsernameAlive(username);
    // if (!usernameAlive) {
    //   console.log(`${username} is locked`);
    //   await updateAccountStatus(username, "Locked");
    //   await browser.close();
    //   throw new Error(`${username} is locked and cannot proceed further.`);
    // }

    // Check if the main switch is enabled only if isHotBot is false
    if (process.env.isHotBot === 'false') {
      let isCupidEnabled = false;
      for (let i = 0; i < 3; i++) {
        await retry(async () => {
          isCupidEnabled = await page.isChecked(selectors.mainSwitch);
        });
        if (isCupidEnabled) break;
      }
      if (!isCupidEnabled) {
        await page.screenshot({ path: 'cupid-not-enabled.png', fullPage: true });
        logger.info("Cupid is not enabled, attempting to enable it...");
        await retry(async () => {
          await click(page, selectors.mainSwitch);
          await page.screenshot({ path: 'after-enabling-cupid.png', fullPage: true });
        });
        await wait(page);
        throw new Error("Cupid is not enabled.");
      }
      await page.screenshot({ path: 'cupid-enabled.png', fullPage: true });
    }

    logger.info("Cupid is running well.");
  } catch (error) {
    logger.error("An error occurred while confirming Cupid status:", error);
    throw error;
  }
  return page;
}

const DPA_BOT_PLATFORM_API_KEY = 'HC18ytNrQXnsI1X33UfgxMmZq2SWwvy5MTBtsZrAUck'
const DPA_BOT_PLATFORM_URL = 'https://138.201.226.205:8000'

async function getUserNames(num_usernames) {
  const url = `${DPA_BOT_PLATFORM_URL}/validator/get-usernames/?num_usernames=${num_usernames}`;
  const headers = {
    'x-api-key': `${DPA_BOT_PLATFORM_API_KEY}`,
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
  };
 
  const agent = new https.Agent({ rejectUnauthorized: false });

  try {
    const response = await axios.post(url, {}, { headers, httpsAgent: agent });
    return response.data;
  } catch (error) {
    logger.error(`Error fetching usernames: ${error.message}`);
    throw error;
  }
}

async function sendFriendRequest(page, usernames_number) {
  await page.waitForTimeout(3000); // Wait for 3 seconds after clicking the send friend requests button
  const usernames = await getUserNames(usernames_number);
  const usernamesArray = usernames.usernames;
  await page.click(selectors.sendFriendRequestsButton);
  await page.waitForTimeout(3000); // Wait for 3 seconds after clicking the send friend requests button
  for (const username of usernamesArray) {
    logger.info(`Sending friend request to ${username}`);
    await page.waitForSelector(selectors.sendFriendRequestUsernameInput);
    logger.info('Waited for send friend request username input');
    await page.fill(selectors.sendFriendRequestUsernameInput, username);
    logger.info('Filled send friend request username input');
    await page.waitForTimeout(3000); // Wait for 3 seconds after filling the username input
    const buttons = await page.$$('button');
    for (const button of buttons) {
        const text = await button.evaluate(el => el.innerText);
        if (text.includes("Add")) {
            await button.click();
            logger.info("Clicked on 'Add' button");
            break;
        }
    }

    await page.click(selectors.clearUsernameButton);
    logger.info("Clicked on clear username button");
    await page.waitForTimeout(3000); // Wait for 3 seconds after clearing the username input
  }
  await page.click(selectors.sendFriendRequestsButton);
  logger.info("Clicked on closing the send friend requests button");
}

async function updateAccountStatus(username, status) {
  const url = `${DPA_BOT_PLATFORM_URL}/accounts/by-username/${username}`;
  const headers = {
    'x-api-key': `${DPA_BOT_PLATFORM_API_KEY}`,
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
  };

  try {

    // Update the account status
    const updateResponse = await axios.patch(`${url}`, {
        status: status
    }, { headers, httpsAgent: new https.Agent({ rejectUnauthorized: false }) });

    if (updateResponse.status !== 200) {
      throw new Error(`Failed to update account status: ${updateResponse.statusText}`);
    }

    logger.info(`Account status for ${username} updated to "${updatedStatus}"`);
  } catch (error) {
    logger.error(`An error occurred while updating account status: ${error.message}`);
  }
}

async function uploadStateFile(username) {
  const url = `${DPA_BOT_PLATFORM_URL}/accounts/${username}/cookies`;
  const headers = {
    'x-api-key': `${DPA_BOT_PLATFORM_API_KEY}`,
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
  };

  try {
    // Fetch the account record from Airtable
    const stateFile = fs.readFileSync('state.json', 'utf8');

    // Upload the state.json file as a long text field
    const uploadResponse = await axios.post(`${url}`, {
      cookies: stateFile
    }, { headers, httpsAgent: new https.Agent({ rejectUnauthorized: false }) });

    if (uploadResponse.status !== 200) {
      throw new Error(`Failed to upload state.json file: ${uploadResponse.statusText}`);
    }

    logger.info(`state.json file uploaded for ${username}`);
  } catch (error) {
    logger.error(`An error occurred while uploading state.json file: ${error.message}`);
  }
}

async function readCookiesForUsername(username) {
  const url = `${DPA_BOT_PLATFORM_URL}/cookies/snapchat-account/${username}`;
  const headers = {
    'x-api-key': `${DPA_BOT_PLATFORM_API_KEY}`,
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
  };

  try {
    // Fetch the account record from Airtable
    const response = await axios.get(`${url}`, { headers, httpsAgent: new https.Agent({ rejectUnauthorized: false }) });
    const data = response.data.data;

    if (response.status !== 200) {
      throw new Error(`Failed to fetch Cookies for user: ${username}`);
    }

    const cookies = JSON.parse(data).cookies;
    return cookies;
  } catch (error) {
    logger.error(`An error occurred while reading cookies for ${username}: ${error.message}`);
  }
}

async function start() {
  let browser = await launchBrowser();
  const pages = await browser.pages();
  for (const page of pages) {
    await page.close();
  }
  logger.info("All pages have been closed.");

  const username = process.env.ACCOUNT_USERNAME;
  const password = process.env.PASSWORD;
  const cupid_token = process.env.CHATBOT_TOKEN;
  const model_name = process.env.MODEL_NAME;

  //check if account is alive
  let usernameAlive = await isUsernameAlive(username)

  if (!usernameAlive) {
    logger.info(`${username} is locked`);
    // await updateAccountStatus(username, "CHATBOT_LOCKED");
    await browser.close();
    throw new Error(`${username} is locked and cannot proceed further.`);
  }

  let cookies = await readCookiesForUsername(username)
  let page = await browser.newPage();
  
  if (cookies && cookies.length > 0) {
    browser.addCookies(cookies)
    logger.info(`Cookies set for ${username}`);
    try {
      await page.goto('https://www.snapchat.com/');
      logger.info('Going directly to SnapChat without login');
    } catch(error){ 
      logger.error(`Error code: ${error.code}, message: ${error.message}`);
      logger.error(`Error stack: ${error.stack}`);
      logger.error(`Error name: ${error.name}`);
      logger.error(`Error details: ${JSON.stringify(error)}`);
      await browser.close();
      await closeProxy();
      throw error;
    }
  } else {
    try {
      await retry(() => loginToSnapchat(page, username, password));
      await wait(page);
      await browser.storageState({ path: 'state.json' });
      logger.info('State saved to state.json');
      await uploadStateFile(username);
    } catch (error) {
      logger.error("An error occurred while logging into Snapchat:", error);
      await browser.close();
      await closeProxy();
      throw error;
    }
  }  

  try {
    await wait(page);
    const currentUrl = page.url();
    if (!currentUrl.startsWith("https://web.snapchat.com")) {
      logger.error("Not logged-in, cookies most probable expired");
      throw new Error("Not logged-in, cookies most probable expired, jumping to login");
    }
    await retry(() => enableCupid(page, cupid_token, model_name));
  } catch (error) {
    logger.error("An error occurred while enabling Cupid:", error);
    logger.info("Either cookies expired or cupid bugged out and didn't automatically enable the extension")
    logger.info("Trying a relog!");

    // Clear cookies and state
    await browser.clearCookies();
    try {
      await fs.promises.writeFile('state.json', '{}', 'utf8');
      await uploadStateFile(username);
      logger.info('Cookies cleared and state file emptied');
    } catch (error) {
      logger.error("Error clearing state file:", error);
    }

    await page.goto('https://www.snapchat.com/');

    // RELOG
    try {
      await retry(() => loginToSnapchat(page, username, password));
      await wait(page);
      await browser.storageState({ path: 'state.json' });
      logger.info('State saved to state.json');
      await uploadStateFile(username);
    } catch (error) {
      logger.error("An error occurred while logging into Snapchat:", error);
      await browser.close();
      await closeProxy();
      throw error;
    }

    try {
      logger.info('Trying again to enable Cupid...');
      await wait(page);
      await retry(() => enableCupid(page, cupid_token, model_name));
    } catch (error) {
      logger.info("Something is fucked - closing");
      await browser.close();
      await closeProxy();
      throw error;
    }
  }

  // try {
  //   await enableMatchLocation(page);
  // } catch (error) {
  //   console.log("An error occurred while enabling match location:", error);
  // }

  while (true) {
    try {
      page = await retry(() => checkCupidStatusAndReload(page, browser, username));
    } catch (error) {
      await browser.close();
      throw error;
    }
    logger.info("Waiting for 37 minutes before the next check...");
    try {
      await page.waitForTimeout(37 * 60 * 1000); // Wait for 37 minutes
    } catch (error) {
      await browser.close();
      await closeProxy();
      throw error;
    }
  }
}

(async () => {
  deleteFolderRecursive('./data');
  logger.info(process.env);
  while (true) {
    let usernameAlive = await isUsernameAlive(process.env.ACCOUNT_USERNAME);
    if (usernameAlive) {
      try {
        await start();
      } catch (error) {
        logger.error("An error occurred:", error);
        logger.info("We are going to restart...");
        await closeProxy();
        if (isTempLocked) {
          logger.info("Account temporarily locked - waiting 12 hours before retrying...");
          await new Promise(resolve => setTimeout(resolve, 12 * 60 * 60 * 1000));
        } else {
          logger.info("Error occurred - waiting 60 seconds before retrying...");
          await new Promise(resolve => setTimeout(resolve, 60000));
        }
      }
    } else {
      logger.info("Username locked - stopping");

      // No longer updating account status

      // await updateAccountStatus(process.env.ACCOUNT_USERNAME, "CHATBOT_LOCKED");
      await new Promise(resolve => setTimeout(resolve, 6 * 60 * 60 * 1000)); // Wait for 6 hours
      break;
    }
  }
})();

