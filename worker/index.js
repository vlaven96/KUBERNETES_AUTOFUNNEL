const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const ProxyChain = require('proxy-chain');
const axios = require('axios');
const https = require('https');
const { authenticator } = require('otplib');

const args = process.argv.slice(2); // Get command-line arguments
const DEBUG_MODE = args.includes('--debug'); // Check if --debug is passed

let switchProxy = async () => {};
let closeProxy = async () => {};
let isTempLocked = false;

if (DEBUG_MODE) {
  console.log("Debug mode enabled. Loading debug configuration...");
  require('./debug-config.js'); // Load and execute the debug configuration file
} else {
  console.log("Debug mode not enabled. Using environment variables.");
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

const {HttpsProxyAgent} = require('https-proxy-agent');

const proxy = "http://mr37042byUM:dpasnap2024_country-us@ultra.marsproxies.com:44443";
const agent = new HttpsProxyAgent(proxy);


function generateTOTP(secret) {
  const formattedSecret = secret.replace(/\s+/g, ''); // Remove any spaces from the secret
  return authenticator.generate(formattedSecret);
}


async function isUsernameAlive(username) {
  console.log(`Checking username: ${username}`);

  const url = `https://www.snapchat.com/add/${username}`;
  console.log(url);
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3"
  };
  

  try {
    const response = await axios.get(url, {
      headers: headers,
      httpsAgent: agent
    });

    if (response.status === 200) {
      console.log(`Successfully checked username: ${username}`);
    } else {
      console.log(`Failed to check username: ${username} with status code ${response.status}`);
      return false;
    }

    const responseText = response.data;
    if (responseText.includes(username)) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.log(`Error checking Snapchat username: ${error.message}`);
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
        console.log(`Attempt ${i + 1} failed: ${error.message}`);
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
  console.log("Enabling match location...");
  await page.waitForSelector(selectors.mainButton);
  const mainButtons = await page.$$(selectors.mainButton);
  if (mainButtons.length >= 2) {
    await mainButtons[1].click();
    console.log("Clicked the second mainButton");
  } else {
    console.log("Could not find the second mainButton to click");
  }
  
  await page.waitForSelector(selectors.matchLocation);
  const checkboxes = await page.$$(selectors.matchLocation);
  if (checkboxes.length >= 1) {
    const isChecked = await checkboxes[0].isChecked();
    if (!isChecked) {
      await checkboxes[0].click();
      console.log("Checked the matchLocation checkbox");
    } else {
      console.log("matchLocation checkbox is already checked");
    }
  } else {
    console.log("Could not find the matchLocation checkbox");
  }

  console.log("Waiting for a bit before reloading the page...");
  await page.waitForTimeout(5000); // Wait for 5 seconds

  console.log("Reloading the page...");
  await retry(async () => {
    await page.reload({ timeout: 120000 });
    console.log("Page reloaded successfully");
  });
  console.log("Match location enabled");
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
  const isHotBot = process.env.isHotBot;

  console.log(`Username: ${username}`);
  console.log(`Password: ${password}`);
  console.log(`Cupid Token: ${cupid_token}`);
  console.log(`Model Name: ${model_name}`);
  console.log(`isHotBot: ${isHotBot}`);

  const proxyUrl = `http://${proxyUsername}:${proxyPassword}@${proxyHost}:${proxyPort}`;
  const residencialProxyUrl = generateProxy();
  console.log(`Proxy URL: ${residencialProxyUrl}`);
  const newProxyUrl = await ProxyChain.anonymizeProxy({
    url: residencialProxyUrl,
    port: 51123
  });

  // Close any existing anonymized proxy
  switchProxy = async () => {
    try {
      await ProxyChain.closeAnonymizedProxy(newProxyUrl, true);
      console.log('Successfully closed old proxy');
    } catch (error) {
      console.error('Error closing old proxy:', error);
    }
    try {
      await ProxyChain.anonymizeProxy({
        url: proxyUrl,
        port: 51123
      });
    } catch (error) {
      console.error('Error creating new proxy:', error);
      throw error;
    }
  };

  closeProxy = async () => {
    try {
      await ProxyChain.closeAnonymizedProxy(newProxyUrl, true);
      console.log('Successfully closed old proxy');
    } catch (error) {
      console.error('Error closing old proxy:', error);
    }
    try {
      await ProxyChain.closeAnonymizedProxy(proxyUrl, true);
      console.log('Successfully closed new proxy');
    } catch (error) {
      console.error('Error closing new proxy:', error);
    }
  };
  
  console.log(`Anonymized Proxy URL: ${newProxyUrl}`);

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
      console.log('2FA input found');
      const secret = process.env.TWOFA_SECRET;
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
  console.log('Logged into Snapchat account');
}

async function enableHotBot(page, hotbot_token, model_name) {
  console.log("Enabling HotBot...");
  try {
    await page.waitForSelector('input[id="license"]', { timeout: 5000 });
    console.log("License input found");
    await page.fill('#license', hotbot_token);
    await page.keyboard.press("Enter");
    console.log("Hotbot token entered and Enter key pressed");
  } catch (error) {
    console.log("No license input field found, continuing...");
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

  console.log("Checking chatting activation switch state...");
  const chattingSwitch = await page.$$('button[role="switch"]');
  if (chattingSwitch.length >= 2) {
    const switchState = await chattingSwitch[1].getAttribute('data-state');
    if (switchState !== 'checked') {
      await chattingSwitch[1].click();
      console.log("Chatting activation switch was unchecked, now enabled");
    } else {
      console.log("Chatting activation switch already enabled");
    }
  } else {
    console.log("Could not find chatting activation switch");
  }
  await wait(page);

  console.log("Clicking on the 'Main' button...");
  const mainButton = await page.$$('span:has-text("Main")');
  if (mainButton.length > 0) {
    await mainButton[0].click();
    console.log("Clicked on the 'Main' button");
  } else {
    console.log("Could not find the 'Main' button");
  }
  await wait(page);
  await wait(page);

  console.log("Enabling match user location...");
  const switchButtons = await page.$$('button[role="switch"]');
  if (switchButtons.length >= 2) {
    await switchButtons[1].click();
    console.log("Enabled match user location");
  } else {
    console.log("Not found match user location");
  }
  await wait(page);
  await wait(page);
  console.log("Enabling HotBot Switch...");
  const firstSwitchButton = await page.$$('button[role="switch"]');
  if (firstSwitchButton.length > 0) {
    await firstSwitchButton[0].click();
    console.log("Enabled HotBot Switch");
  } else {
    console.log("Not found HotBot Switch");
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

  console.log("Switched to a new proxy and reloaded the page");

  await wait(page);
  console.log("Clicking on the 'Next' button...");
  try {
    console.log("Looking for 'Next' button...");
    const nextButton = await page.waitForSelector('span:has-text("Next")', { timeout: 5000 });
    await nextButton.click();
    console.log("Clicked on the 'Next' button");
    
    await wait(page);
    
    console.log("Looking for 'Skip' button...");
    const skipButton = await page.waitForSelector('span:has-text("Skip")', { timeout: 5000 });
    await skipButton.click();
    console.log("Clicked on the 'Skip' button");
    
    await wait(page);
    
  } catch (error) {
    console.log("Could not find Next/Skip buttons:");
  }

  try {
    if (await page.waitForSelector(selectors.notificationsModal)) {
      await page.click(selectors.notificationsModelCloseButton);
    }
  } catch (error) {
    console.log("No notifications modal found.");
  }

  await wait(page);

  if (isHotBot == 'true') {
     await enableHotBot(page, cupid_token, model_name);
     return;
  }

  
  console.log("Reloading page because Cupid has issues to load");
  await page.reload();
  console.log("Waiting for Cupid to be Enabled");
  await wait(page);

  try {
    const mainSwitchEnabled = await page.waitForSelector(selectors.mainSwitch + '[aria-checked="true"]');
    if (mainSwitchEnabled) {
      const mainSwitchEnabledDetails = await page.evaluate((selector) => {
        const element = document.querySelector(selector);
        if (element) {
          return {
            innerHTML: element.innerHTML,
            textContent: element.textContent,
            attributes: Array.from(element.attributes).map(attr => ({ name: attr.name, value: attr.value })),
          };
        }
        return null;
      }, selectors.mainSwitch + '[aria-checked="true"]');

      console.log("Details of mainSwitchEnabled:", JSON.stringify(mainSwitchEnabledDetails, null, 2));
      console.log("Cupid is already enabled");

      // There might be a problem with the state of cupid so better if we empty the cookies
      await fs.writeFile('state.json', '{}', 'utf8');
      await uploadStateFile(username);
      console.log("State file has been emptied and cookies have been updated.");

      return;
    }
  } catch (error) { 

    console.log("Cupid probable not enabled! Enabling it!");
  }

  if (!(await page.waitForSelector(selectors.cupidExtended).catch(() => void 0))) {
      await click(page, selectors.openCupidExtended);
      await wait(page);
    }

  await retry(async () => {
    if (await page.waitForSelector(selectors.accessTokenInput)) {
      console.log("Filling access token...");

      await page.fill(selectors.accessTokenInput, cupid_token);
      await wait(page);
      console.log("Clicking Submit");
      await click(page, selectors.submitButton); 
      try {
        await click(page, selectors.submitButton); 
      } catch(error) {}
    }
  });
  console.log("Access token filled...");
  await wait(page);
  // const clearButtonSelector = '[title="Clear"]';
  // const clearButton = await page.$(clearButtonSelector);
  // if (clearButton) {
  //   console.log("Clear button found, clicking it even if not visible...");
  //   await clearButton.click({ force: true });
  //   await wait(page);
  // } else {
  //   console.log("Clear button not found, proceeding...");
  // }
  try {
    await page.waitForSelector(selectors.modelInput)
    console.log("Filling model name...");
    await clearInput(selectors.modelInput, page);
    await page.fill(selectors.modelInput, model_name);
    await page.waitForSelector(selectors.firstPresetResult)
    await click(page, selectors.firstPresetResult, { force: true });
    try {
      await click(page, selectors.firstPresetResult, { force: true }); 
    } catch(error) {}
  } catch (error) {
    console.log("Seems model already filled in");
  }

  await wait(page);

  console.log("Enabling chatting...");
  await retry(async () => {
    if (await page.waitForSelector('#\\:r1\\:').catch(() => void 0)) {
      await click(page, '#\\:r1\\:'); // click on chat tab with id :r1:
    } else if (await page.waitForSelector('#\\:r4\\:').catch(() => void 0)) {
      await click(page, '#\\:r4\\:'); // click on chat tab with id :r4:
    } else {
      throw new Error("Neither chat tab with id :r1: nor :r4: found!");
    }
    console.log("Switched to chatting tab...");
    await wait(page);
    try {
      await page.waitForSelector(selectors.chattingSwitch);
      await click(page, selectors.chattingSwitch);
    } catch (error) {
      console.log("chattingSwitch not found or an error occurred, trying chattingSwitchBackup...");
      try {
        await page.waitForSelector(selectors.chattingSwitchBackup);
        await click(page, selectors.chattingSwitchBackup);
      } catch (error) {
        console.log("chattingSwitchBackup not found or an error occurred, trying chattingSwitchBackup2...");
        await page.waitForSelector(selectors.chattingSwitchBackup2);
        await click(page, selectors.chattingSwitchBackup2);
        throw error;
      }
    }
    console.log("Enabled chatting...");
  });

  await wait(page);

  // console.log("Enabling match location...");
  // await page.waitForSelector(selectors.mainButton);
  // const mainButtons = await page.$$(selectors.mainButton);
  // if (mainButtons.length >= 2) {
  //   await mainButtons[1].click();
  //   console.log("Clicked the second mainButton");
  // } else {
  //   console.log("Could not find the second mainButton to click");
  // }
  
  // await page.waitForSelector(selectors.matchLocation);
  // const checkboxes = await page.$$(selectors.matchLocation);
  // if (checkboxes.length >= 1) {
  //   const isChecked = await checkboxes[0].isChecked();
  //   if (!isChecked) {
  //     await checkboxes[0].click();
  //     console.log("Checked the matchLocation checkbox");
  //   } else {
  //     console.log("matchLocation checkbox is already checked");
  //   }
  // } else {
  //   console.log("Could not find the matchLocation checkbox");
  // }

  // console.log("Waiting for a bit before reloading the page...");
  // await page.waitForTimeout(5000); // Wait for 5 seconds

  // console.log("Reloading the page...");
  // await retry(async () => {
  //   await page.reload({ timeout: 120000 });
  //   console.log("Page reloaded successfully");
  // });
  // console.log("Match location enabled");


  console.log("Enabling CubidBot...");
  await retry(async () => {
    await click(page, selectors.mainSwitch);
  });

  console.log("Cupid Enabled");
}

async function checkCupidStatusAndReload(page, browser, username) {
  try {
    // Refresh the page
    try {
      await retry(async () => {
        await page.reload({ timeout: 120000 });
        console.log("Page reloaded successfully");
      });
    } catch (error) {
      console.log("Page reload failed, opening a new web.snapchat.com page");
      try {
        await page.close();
      } catch (error) {
        console.log("Couldn't close the page, opening a new one...");
      }
      page = await browser.newPage();
      await page.goto('https://web.snapchat.com', { timeout: 120000 });
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
        throw new Error("Cupid is not enabled.");
      }
    }

    console.log("Cupid is running well.");
  } catch (error) {
    console.error("An error occurred while confirming Cupid status:", error);
    throw error;
  }
  return page;
}

const DPA_BOT_PLATFORM_API_KEY = 'HC18ytNrQXnsI1X33UfgxMmZq2SWwvy5MTBtsZrAUck'
const DPA_BOT_PLATFORM_URL = 'https://138.201.226.205:8000'

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

    console.log(`Account status for ${username} updated to "${updatedStatus}"`);
  } catch (error) {
    console.error(`An error occurred while updating account status: ${error.message}`);
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

    console.log(`state.json file uploaded for ${username}`);
  } catch (error) {
    console.error(`An error occurred while uploading state.json file: ${error.message}`);
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
    console.error(`An error occurred while reading cookies for ${username}: ${error.message}`);
  }
}

async function start() {
  let browser = await launchBrowser();
  const pages = await browser.pages();
  for (const page of pages) {
    await page.close();
  }
  console.log("All pages have been closed.");

  const username = process.env.ACCOUNT_USERNAME;
  const password = process.env.PASSWORD;
  const cupid_token = process.env.CHATBOT_TOKEN;
  const model_name = process.env.MODEL_NAME;

  //check if account is alive
  let usernameAlive = await isUsernameAlive(username)

  if (!usernameAlive) {
    console.log(`${username} is locked`);
    // await updateAccountStatus(username, "CHATBOT_LOCKED");
    await browser.close();
    throw new Error(`${username} is locked and cannot proceed further.`);
  }

  let cookies = await readCookiesForUsername(username)
  let page = await browser.newPage();
  
  if (cookies && cookies.length > 0) {
    browser.addCookies(cookies)
    console.log(`Cookies set for ${username}`);
    try {
      await page.goto('https://www.snapchat.com/');
      console.log('Going directly to SnapChat without login');
    } catch(error){ 
      console.error(`Error code: ${error.code}, message: ${error.message}`);
      console.error(`Error stack: ${error.stack}`);
      console.error(`Error name: ${error.name}`);
      console.error(`Error details: ${JSON.stringify(error)}`);
      await browser.close();
      await closeProxy();
      throw error;
    }
  } else {
    try {
      await retry(() => loginToSnapchat(page, username, password));
      await wait(page);
      await browser.storageState({ path: 'state.json' });
      console.log('State saved to state.json');
      await uploadStateFile(username);
    } catch (error) {
      console.error("An error occurred while logging into Snapchat:", error);
      await browser.close();
      await closeProxy();
      throw error;
    }
  }  

  try {
    await wait(page);
    const currentUrl = page.url();
    if (!currentUrl.startsWith("https://web.snapchat.com")) {
      console.error("Not logged-in, cookies most probable expired");
      throw new Error("Not logged-in, cookies most probable expired, jumping to login");
    }
    await retry(() => enableCupid(page, cupid_token, model_name));
  } catch (error) {
    console.error("An error occurred while enabling Cupid:", error);
    console.log("Either cookies expired or cupid bugged out and didn't automatically enable the extension")
    console.log("Trying a relog!");

    // RELOG
    try {
      await retry(() => loginToSnapchat(page, username, password));
      await wait(page);
      await browser.storageState({ path: 'state.json' });
      console.log('State saved to state.json');
      await uploadStateFile(username);
    } catch (error) {
      console.error("An error occurred while logging into Snapchat:", error);
      await browser.close();
      await closeProxy();
      throw error;
    }

    try {
      console.log("Trying again to enable Cupid...");
      await wait(page);
      await retry(() => enableCupid(page, cupid_token, model_name));
    } catch (error) {
      console.log("Something is fucked - closing");
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
    console.log("Waiting for 37 minutes before the next check...");
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
  console.log(process.env);
  while (true) {
    let usernameAlive = await isUsernameAlive(process.env.ACCOUNT_USERNAME);
    if (usernameAlive) {
      try {
        await start();
      } catch (error) {
        console.error("An error occurred:", error);
        console.log("We are going to restart...");
        await closeProxy();
        if (isTempLocked) {
          console.log("Account temporarily locked - waiting 12 hours before retrying...");
          await new Promise(resolve => setTimeout(resolve, 12 * 60 * 60 * 1000));
        } else {
          console.log("Error occurred - waiting 60 seconds before retrying...");
          await new Promise(resolve => setTimeout(resolve, 60000));
        }
      }
    } else {
      console.log("Username locked - stopping");

      // No longer updating account status

      // await updateAccountStatus(process.env.ACCOUNT_USERNAME, "CHATBOT_LOCKED");
      await new Promise(resolve => setTimeout(resolve, 6 * 60 * 60 * 1000)); // Wait for 6 hours
      break;
    }
  }
})();

