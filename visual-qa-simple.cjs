const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots-qa');
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

async function capture(page, name) {
    const filePath = path.join(SCREENSHOTS_DIR, `mobile-${name}.png`);
    await page.screenshot({ path: filePath });
    console.log(`Saved: ${name}`);
}

async function run() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });

    try {
        // Wait for server
        for (let i = 0; i < 15; i++) {
            try { await page.goto('http://localhost:5173', { timeout: 5000 }); break; }
            catch { await new Promise(r => setTimeout(r, 2000)); }
        }
        await page.waitForTimeout(2000);

        // Onboarding
        await capture(page, '01-onboarding');
        await page.click('text=Bodyweight training');
        await page.waitForTimeout(1500);
        await capture(page, '02-experience');
        await page.click('text=Beginner');
        await page.waitForTimeout(1500);
        await capture(page, '03-programs');
        
        // Click first Select Program button
        await page.locator('button:has-text("Select Program")').first().click();
        await page.waitForTimeout(2000);
        await capture(page, '04-schedule');
        await page.click('text=Start My Journey');
        await page.waitForTimeout(3000);

        // Dashboard
        await capture(page, '05-dashboard');

        // Navigate tabs
        const tabs = await page.locator('nav button').all();
        if (tabs.length >= 2) {
            await tabs[1].click();
            await page.waitForTimeout(1000);
            await capture(page, '06-workout-tab');
        }
        if (tabs.length >= 3) {
            await tabs[2].click();
            await page.waitForTimeout(1000);
            await capture(page, '07-progress-tab');
        }

        // Open menu
        await page.click('nav button:last-child');
        await page.waitForTimeout(1000);
        await capture(page, '08-menu-drawer');

        console.log('Done! Check screenshots-qa folder');
    } catch (e) {
        console.error('Error:', e.message);
        await capture(page, 'error');
    } finally {
        await browser.close();
    }
}

run();
