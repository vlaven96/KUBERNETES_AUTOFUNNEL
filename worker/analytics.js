import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import ProxyChain from 'proxy-chain';
import Airtable from 'airtable';


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

const proxy = {
  "http": "http://mr37042byUM:dpasnap2024_country-us@ultra.marsproxies.com:44443",
  "https": "http://mr37042byUM:dpasnap2024_country-us@ultra.marsproxies.com:44443"
};

async function isUsernameAlive(username) {
  console.log(`Checking username: ${username}`);
  const url = `https://www.snapchat.com/add/${username}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      proxy: proxy
    });

    if (response.status === 200) {
      console.log(`Successfully checked username: ${username}`);
    } else {
      console.log(`Failed to check username: ${username} with status code ${response.status}`);
      return false;
    }

    const responseText = await response.text();
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
  const waitTime = Math.floor(Math.random() * 1000) + 1000; // Random time between 10000ms (10s) and 20000ms (20s)
  await page.waitForTimeout(waitTime);
}

async function retry(fn, retries = 3, showlogs = true, delay = 5000) {
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

async function parseTableData(page) {
  console.log("Parsing table data...");

  // Wait for the second table to be available
  const tables = await page.$$('table');
  if (tables.length < 2) {
    console.error("Could not find the second table on the page");
    return;
  }

  const table = tables[1];
  const rows = await table.$$('tr');
  if (rows.length < 6) {
    console.error("The second table does not have 6 rows");
    return;
  }

  for (const row of rows) {
    const cells = await row.$$('td');
    const rowText = await Promise.all(cells.map(cell => cell.innerText()));
    console.log("Row text:", rowText.join(' | '));
  }
  const data = {
    conversationsRaw: await rows[1].$$('td').then(cells => cells[1].innerText()),
    conversationsCharged: await rows[2].$$('td').then(cells => cells[1].innerText()),
    ctaPhaseStarted: await rows[3].$$('td').then(cells => cells[1].innerText()),
    sharedCtaLink: await rows[4].$$('td').then(cells => cells[1].innerText()),
    conversionsFromCtaLink: await rows[5].$$('td').then(cells => cells[1].innerText()),
    conversions: await rows[6].$$('td').then(cells => cells[1].innerText())
  };

  console.log("Extracted data:", JSON.stringify(data, null, 2));
  return data;
}


async function launchBrowser() {
  const username = process.env.USERNAME;
  const password = process.env.PASSWORD;
  const cupid_token = process.env.CUPID_TOKEN;
  const model_name = process.env.MODEL_NAME;
  const proxyHost = process.env.PROXY_HOST.replace(/\t|\n/g, '');
  const proxyPort = process.env.PROXY_PORT.replace(/\t|\n/g, '');
  const proxyUsername = process.env.PROXY_USERNAME.replace(/\t|\n/g, '');
  const proxyPassword = process.env.PROXY_PASSWORD.replace(/\t|\n/g, '');

  console.log(`Username: ${username}`);
  console.log(`Password: ${password}`);
  console.log(`Cupid Token: ${cupid_token}`);
  console.log(`Model Name: ${model_name}`);

  const proxyUrl = `socks5://${proxyUsername}:${proxyPassword}@${proxyHost}:${proxyPort}`;
  console.log(`Proxy URL: ${proxyUrl}`);
  const newProxyUrl = await ProxyChain.anonymizeProxy(proxyUrl);
  console.log(`Anonymized Proxy URL: ${newProxyUrl}`);

  const browser = await chromium.launchPersistentContext('./data', {
    headless: false, // Set to true to run in headless mode
    args: [
      // '--headless=new',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-extensions-except=./cupidbot',
      '--load-extension=./cupidbot',
      '--window-size=1920,1080', // Set window size to standard screen resolution
    ],
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

    if (!(await page.waitForSelector(selectors.passwordInput).catch(() => void 0))) {
      await updateAccountStatus(username, "Captcha")
      throw new Error("An error occurred while waiting for the password input field to appear or the account is locked!");
    }
    await page.fill(selectors.passwordInput, password);
    await page.keyboard.press("Enter");
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

async function enableCupid(page, cupid_token, model_name) {
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
  await wait(page);


  console.log("Switching to analytics tab...");
  await retry(async () => {
    await click(page, selectors.analyticsTab);
  });
  console.log("Switched to analytics tab.");
  await wait(page);
  await wait(page);
  await wait(page);
  await wait(page);
  await wait(page);
}

async function checkCupidStatusAndReload(page, browser) {
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

    // Check if the main switch is enabled
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

    console.log("Cupid is running well.");
  } catch (error) {
    console.error("An error occurred while confirming Cupid status:", error);
    throw error;
  }
  return page;
}

const AIRTABLE_API_KEY = 'patx9H8Z5CpvEQCZ1.5b02ca1438712d21ac7809e82b6bead7bc2512e54ce0676b6bde72e09eb8e7bf';
const AIRTABLE_BASE_ID = 'appiaCnT5CjmEukDq';
const AIRTABLE_TABLE_NAME = 'tblmuTTidcm3zJDSL';

async function updateAccountStatus(username, status) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;
  const headers = {
    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json'
  };

  try {
    // Fetch the account record from Airtable
    const response = await fetch(`${url}?filterByFormula={Username}='${username}'`, { headers });
    const data = await response.json();

    if (data.records.length === 0) {
      throw new Error(`No account found with username: ${username}`);
    }

    const accountId = data.records[0].id;
    const currentStatus = data.records[0].fields.Status || [];

    // Append the new status to the current status
    const updatedStatus = [...new Set([...currentStatus, status])];

    // Update the account status
    const updateResponse = await fetch(`${url}/${accountId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        fields: {
          Status: updatedStatus
        }
      })
    });

    if (!updateResponse.ok) {
      throw new Error(`Failed to update account status: ${updateResponse.statusText}`);
    }

    console.log(`Account status for ${username} updated to "${updatedStatus}"`);
  } catch (error) {
    console.error(`An error occurred while updating account status: ${error.message}`);
  }
}

async function uploadStateFile(username) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;
  const headers = {
    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json'
  };

  try {
    // Fetch the account record from Airtable
    const response = await fetch(`${url}?filterByFormula={Username}='${username}'`, { headers });
    const data = await response.json();

    if (data.records.length === 0) {
      throw new Error(`No account found with username: ${username}`);
    }

    const accountId = data.records[0].id;
    const stateFile = fs.readFileSync('state.json', 'utf8');

    // Upload the state.json file as a long text field
    const uploadResponse = await fetch(`${url}/${accountId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        fields: {
          Cookies: stateFile
        }
      })
    });

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload state.json file: ${uploadResponse.statusText}`);
    }

    console.log(`state.json file uploaded for ${username}`);
  } catch (error) {
    console.error(`An error occurred while uploading state.json file: ${error.message}`);
  }
}

async function readCookiesForUsername(username) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;
  const headers = {
    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json'
  };

  try {
    // Fetch the account record from Airtable
    const response = await fetch(`${url}?filterByFormula={Username}='${username}'`, { headers });
    const data = await response.json();

    if (data.records.length === 0) {
      throw new Error(`No account found with username: ${username}`);
    }

    const accountId = data.records[0].id;

    // Fetch the state.json file from Airtable
    const stateResponse = await fetch(`${url}/${accountId}`, { headers });
    const stateData = await stateResponse.json();

    if (!stateResponse.ok) {
      throw new Error(`Failed to fetch state.json file: ${stateResponse.statusText}`);
    }

    const cookies = JSON.parse(stateData.fields.Cookies).cookies;
    return cookies;
  } catch (error) {
    console.error(`An error occurred while reading cookies for ${username}: ${error.message}`);
  }
}

async function start() {
  deleteFolderRecursive('./data');
  let browser = await launchBrowser();

  const username = process.env.USERNAM;
  const password = process.env.PASSWORD;
  const cupid_token = process.env.CUPID_TOKEN;
  const model_name = process.env.MODEL_NAME;

  //check if account is alive
  let usernameAlive = await isUsernameAlive(username)

  if (!usernameAlive) {
    console.log(`${username} is locked`);
    await updateAccountStatus(username, "Locked");
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
      throw error;
    }

    try {
      console.log("Trying again to enable Cupid...");
      await wait(page);
      await retry(() => enableCupid(page, cupid_token, model_name));
    } catch (error) {
      console.log("Something is fucked - closing");
      await browser.close();
      throw error;
    }
  }

  await wait(page);

  parseTableData(page);

  await wait(page);
  await wait(page);
  await wait(page);
  await wait(page);
  await wait(page);

  while (true) {
    try {
      page = await retry(() => checkCupidStatusAndReload(page, browser));
    } catch (error) {
      await browser.close();
      throw error;
    }
    console.log("Waiting for 37 minutes before the next check...");
    try {
      await page.waitForTimeout(37 * 60 * 1000); // Wait for 37 minutes
    } catch (error) {
      await browser.close();
      throw error;
    }
  }
}

// Start Generation Here
const base = new Airtable({ apiKey: 'patx9H8Z5CpvEQCZ1.5b02ca1438712d21ac7809e82b6bead7bc2512e54ce0676b6bde72e09eb8e7bf' }).base('appiaCnT5CjmEukDq');

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

async function getAIChattingAccounts() {
  // Fetch records from the "Stage 3 - AI Chatting" view
  const records = await base('tblmuTTidcm3zJDSL').select({
    view: 'Stage 4 - AI Chatting',
    filterByFormula: '{Conversions} = ""'  
    // Only select records with empty Conversions field
  }).all();

  // Map records to account objects, including record ID and cookies
  return records.map(record => ({
    id: record.id,
    username: record.get('Username'),
    password: record.get('Password'),
    cupid_token: "5cb75ec7721e3ed209fa22fc55480edf",
    model_name: record.get('Model'),
    proxy_host: record.get('Proxy_Host'),
    proxy_port: 44445,
    proxy_username: record.get('Proxy_Username'),
    proxy_password: record.get('Proxy_Password'),
    cookies: record.get('Cookies') ? JSON.parse(record.get('Cookies')) : null,
    // Add other necessary fields here
  }));
}

async function startAccountProcess(account) {
  try {
    // Construct the proxy URL
    const proxyUrl = `socks5://${account.proxy_username}:${account.proxy_password}@${account.proxy_host}:${account.proxy_port}`;
    console.log(`Using proxy: ${proxyUrl}`);
    const newProxyUrl = await ProxyChain.anonymizeProxy(proxyUrl);

    // Launch the browser with the specified proxy
    const browser = await chromium.launchPersistentContext('./data', {
      headless: false, 
      args: [
        '--headless=new',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-extensions-except=./cupidbot',
        '--load-extension=./cupidbot',
        '--window-size=1920,1080',
      ],
      proxy: {
        server: newProxyUrl,
      },
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
    });

    try {
      if (account.cookies) {        // Set cookies from Airtable
        let cookies = await readCookiesForUsername(account.username);
        await browser.addCookies(cookies);

        let page = await browser.newPage();
        await page.goto('https://www.snapchat.com/');
        console.log('Going directly to SnapChat without login');

        console.log(`Cookies loaded for ${account.username}`);
        await wait(page);

        // Enable Cupid
        try {
          console.log("Trying to enable Cupid...");
          await wait(page);
          await retry(() => enableCupid(page, account.cupid_token, account.model_name));
        } catch (error) {
          console.log("Something went wrong while enabling Cupid - closing browser.");
          await browser.close();
          throw error;
        }

        // Parse table data and upload to Airtable
        await wait(page);
        const data = await parseTableData(page);
        await base('tblmuTTidcm3zJDSL').update(account.id, {
          'Analytics': JSON.stringify(data),
          'Conversions': data.conversions
        });
        console.log(`Analytics data uploaded for ${account.username}`);
        await browser.close();
      } else {
        // If no cookies, skip processing this account
        console.log(`No cookies found for ${account.username}. Skipping account.`);
        await browser.close();
        return;
      }
    } catch (error) {
      console.error(`Error processing account ${account.username}:`, error);
      await browser.close();
    }

  } catch (error) {
    console.error(`Failed to start process for account ${account.username}:`, error);
    await browser.close();
  }
}

async function main() {
  try {
    const accounts = await getAIChattingAccounts();
    shuffleArray(accounts);
    for (const account of accounts) {
      console.log(`Processing account: ${account.username}`);
      deleteFolderRecursive('./data');
      await startAccountProcess(account);
    }
  } catch (error) {
    console.error("An error occurred while processing accounts:", error);
  }
}

main().catch(console.error);
