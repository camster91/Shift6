const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots-qa');
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

async function capture(page, name) {
    const filePath = path.join(SCREENSHOTS_DIR, `qa-${name}.png`);
    await page.screenshot({ path: filePath, fullPage: false });
    console.log(`  Saved: qa-${name}.png`);
}

async function waitForServer(page) {
    let retries = 15;
    while (retries > 0) {
        try {
            await page.goto('http://localhost:5173', { timeout: 5000 });
            return true;
        } catch {
            retries--;
            if (retries === 0) throw new Error('Server not ready');
            await new Promise(r => setTimeout(r, 2000));
        }
    }
}

async function run() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });

    page.on('console', msg => {
        const type = msg.type();
        if (type === 'error' || type === 'warning' || type === 'log') {
            console.log(`PAGE [${type.toUpperCase()}]:`, msg.text());
        }
    });
    page.on('pageerror', err => {
        console.error('PAGE EXCEPTION:', err.stack || err.message || err);
    });

    try {
        console.log('Waiting for dev server...');
        await waitForServer(page);
        await page.waitForTimeout(2000);

        // === ONBOARDING ===
        console.log('\n[1] Onboarding');
        await capture(page, '01-step1-equipment');

        // Step 1: Equipment Selection. Click Continue.
        await page.click('button:has-text("Continue")');
        await page.waitForTimeout(1000);
        await capture(page, '02-step2-experience');

        // Step 2: Experience level. Click "Intermediate" option, then click Continue.
        await page.click('button:has-text("Intermediate")');
        await page.waitForTimeout(300);
        await page.click('button:has-text("Continue")');
        await page.waitForTimeout(1000);
        await capture(page, '03-step3-calibration');

        // Step 3: Calibration. Click Continue.
        await page.click('button:has-text("Continue")');
        await page.waitForTimeout(1000);
        await capture(page, '04-step4-routine');

        // Step 4: Routine selection. Click Build Routine.
        await page.click('button:has-text("Build Routine")');
        await page.waitForTimeout(2000);
        
        // Reloader if needed, or just let it transition
        await capture(page, '05-dashboard');

        // === HOME DASHBOARD ===
        console.log('\n[2] Dashboard');
        const dashText = await page.textContent('body');
        console.log('  Preview:', dashText.slice(0, 150).replace(/\s+/g, ' '));

        // Start a workout
        const workoutBtn = page.locator('button').filter({ hasText: /^Train / }).first();
        if (await workoutBtn.isVisible()) {
            await workoutBtn.click();
            await page.waitForTimeout(2000);
            await capture(page, '06-workout-active');

            // Complete set 1
            const completeBtn = page.locator('button').filter({ hasText: 'Complete Set' });
            await completeBtn.waitFor({ state: 'visible', timeout: 5000 });
            await completeBtn.click();
            await page.waitForTimeout(1500);
            await capture(page, '07-rest-screen');

            // Dismiss achievement popup if it appears
            const keepGoingBtn = page.locator('button').filter({ hasText: 'Keep Going' });
            try {
                await keepGoingBtn.waitFor({ state: 'visible', timeout: 2000 });
                await keepGoingBtn.click();
                await page.waitForTimeout(500);
            } catch (e) {
                // No achievement popup, that's fine
            }

            // Skip rest
            const skipBtn = page.locator('button').filter({ hasText: 'Skip' });
            try {
                await skipBtn.waitFor({ state: 'visible', timeout: 2000 });
                await skipBtn.click();
                await page.waitForTimeout(500);
            } catch (e) {
                // Rest screen skip not found or already skipped
            }

            // Complete sets 2 and 3
            // Set 2
            await completeBtn.waitFor({ state: 'visible', timeout: 5000 });
            await completeBtn.click();
            await page.waitForTimeout(1000);
            try {
                await skipBtn.waitFor({ state: 'visible', timeout: 2000 });
                await skipBtn.click();
                await page.waitForTimeout(500);
            } catch (e) {}

            // Set 3 (Final set)
            await completeBtn.waitFor({ state: 'visible', timeout: 5000 });
            await completeBtn.click();
            await page.waitForTimeout(1500);

            await capture(page, '08-workout-complete');

            // Click Done button to return to dashboard
            const doneBtn = page.locator('button').filter({ hasText: 'Done' });
            await doneBtn.waitFor({ state: 'visible', timeout: 5000 });
            await doneBtn.click();
            await page.waitForTimeout(1000);
        }

        // === TAB NAVIGATION ===
        console.log('\n[3] Tab navigation');
        for (const tab of ['Log', 'Goals', 'Progress']) {
            const tabBtn = page.locator('button').filter({ hasText: new RegExp(`^${tab}$`) });
            await tabBtn.waitFor({ state: 'visible', timeout: 5000 });
            await tabBtn.click();
            await page.waitForTimeout(800);
            await capture(page, `08-${tab.toLowerCase()}-tab`);
        }

        // === EXERCISE LIBRARY ===
        console.log('\n[4] Exercise Library');
        await page.goto('http://localhost:5173');
        await page.waitForTimeout(2000);

        const browseBtn = page.locator('button').filter({ hasText: 'Browse' });
        if (await browseBtn.isVisible()) {
            await browseBtn.click();
            await page.waitForTimeout(1000);
            await capture(page, '09-exercise-library');

            const homeFilter = page.locator('button').filter({ hasText: 'Home' });
            if (await homeFilter.isVisible()) {
                await homeFilter.click();
                await page.waitForTimeout(500);
                await capture(page, '10-library-home-filter');
            }
        }

        // === ERROR CHECK ===
        console.log('\n[5] Error check');
        const errors = await page.evaluate(() => {
            const body = document.body.innerText;
            if (body.includes('Error') && body.includes('undefined')) return body.slice(0, 300);
            return null;
        });
        console.log(errors ? `  ERROR: ${errors}` : '  No JS errors detected');

        console.log('\n=== QA COMPLETE ===');
        console.log('Screenshots:', SCREENSHOTS_DIR);

    } catch (e) {
        console.error('Error:', e.message);
        await capture(page, 'error');
    } finally {
        await browser.close();
    }
}

run();