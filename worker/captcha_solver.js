const { chromium } = require('playwright');
const Airtable = require('airtable');

// Airtable configuration
const AIRTABLE_API_KEY = 'patx9H8Z5CpvEQCZ1.5b02ca1438712d21ac7809e82b6bead7bc2512e54ce0676b6bde72e09eb8e7bf';
const AIRTABLE_BASE_ID = 'appiaCnT5CjmEukDq';
const AIRTABLE_TABLE_NAME = 'tblmuTTidcm3zJDSL';

// Configure Airtable
const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

async function getCaptchaAccounts() {
  const records = await base(AIRTABLE_TABLE_NAME).select({
    view: "AI Chatting - Captcha"
  }).all();
  console.log(records);
  return records.map(record => ({
    ...record.fields,
    id: record.id
  }));
}

async function updateAccountCookies(recordId, cookies) {
  const record = await base(AIRTABLE_TABLE_NAME).find(recordId);
  const currentStatus = record.fields.Status || [];
  const updatedStatus = currentStatus.filter(status => status !== "Captcha");

  await base(AIRTABLE_TABLE_NAME).update(recordId, {
    Cookies: JSON.stringify({
      cookies: cookies
    }),
    Status: updatedStatus
  });
}

async function solveCaptchaForAccount(account) {
  const browser = await chromium.launch({
    headless: false,
    proxy: {
      server: `http://${account.Proxy_Host[0]}:44444`,
      username: account.Proxy_Username[0],
      password: account.Proxy_Password[0]
    }
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto('https://www.snapchat.com/');
    await page.fill('#ai_input', account.Username);
    await page.keyboard.press("Enter");
    
    // Wait for user to solve captcha
    console.log(`Please solve the captcha for account: ${account.Username}`);
    await page.waitForNavigation({ timeout: 300000 }); // 5 minutes timeout
    await page.fill('#password', account.Password);
    await page.keyboard.press("Enter");

    await page.waitForNavigation({ timeout: 300000 }); // 5 minutes timeout

    // Wait for 10 seconds
    await page.waitForTimeout(5000);

    const cookies = await context.cookies();
    await updateAccountCookies(account.id, cookies);
    console.log(`Successfully logged in and saved cookies for ${account.Username}`);
  } catch (error) {
    console.error(`Error processing account ${account.Username}:`, error);
  } finally {
    await browser.close();
  }
}

async function main() {
  const accounts = await getCaptchaAccounts();
  for (const account of accounts) {
    await solveCaptchaForAccount(account);
  }
}

main().catch(console.error);
