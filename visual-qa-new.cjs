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

    try {
        console.log('Waiting for dev server...');
        await waitForServer(page);
        await page.waitForTimeout(2000);

        // === ONBOARDING ===
        console.log('\n[1] Onboarding');
        await capture(page, '01-welcome');

        await page.click('button:has-text("Get Started")');
        await page.waitForTimeout(1500);
        await capture(page, '02-exercise-picker');

        await page.click('button:has-text("Push-Ups")');
        await page.waitForTimeout(300);
        await page.click('button:has-text("Bodyweight Squats")');
        await page.waitForTimeout(300);
        await capture(page, '03-exercises-selected');

        const startBtn = page.locator('button').filter({ hasText: /Start with/ });
        await startBtn.click();
        await page.waitForTimeout(1000);
        await page.evaluate(() => window.location.reload());
        await page.waitForTimeout(3000);
        await capture(page, '04-dashboard');

        // === HOME DASHBOARD ===
        console.log('\n[2] Dashboard');
        const dashText = await page.textContent('body');
        console.log('  Preview:', dashText.slice(0, 150).replace(/\s+/g, ' '));

        // Start a workout
        const workoutBtn = page.locator('button').filter({ hasText: /Start Workout/ }).first();
        if (await workoutBtn.isVisible()) {
            await workoutBtn.click();
            await page.waitForTimeout(2000);
            await capture(page, '05-workout-active');

            // Complete set 1
            const completeBtn = page.locator('button').filter({ hasText: 'Complete Set' });
            if (await completeBtn.isVisible()) {
                await completeBtn.click();
                await page.waitForTimeout(1500);
                await capture(page, '06-rest-screen');

                // Dismiss any modal overlay first
                const keepGoingBtn = page.locator('button').filter({ hasText: 'Keep Going' });
                if (await keepGoingBtn.isVisible()) {
                    await keepGoingBtn.click();
                    await page.waitForTimeout(500);
                }

                // Skip rest
                const skipBtn = page.locator('button').filter({ hasText: 'Skip' });
                if (await skipBtn.isVisible()) {
                    await skipBtn.click();
                    await page.waitForTimeout(500);
                }

                // Complete sets 2 and 3
                for (let i = 0; i < 2; i++) {
                    const cb = page.locator('button').filter({ hasText: 'Complete Set' });
                    if (await cb.isVisible()) {
                        await cb.click();
                        await page.waitForTimeout(800);
                        // Dismiss modal if it appears
                        const kg = page.locator('button').filter({ hasText: 'Keep Going' });
                        if (await kg.isVisible()) { await kg.click(); await page.waitForTimeout(500); }
                        const sk = page.locator('button').filter({ hasText: 'Skip' });
                        if (await sk.isVisible()) { await sk.click(); await page.waitForTimeout(500); }
                    }
                }
                await capture(page, '07-workout-complete');
            }
        }

        // === TAB NAVIGATION ===
        console.log('\n[3] Tab navigation');
        for (const tab of ['Log', 'Goals', 'Progress']) {
            const tabBtn = page.locator('button').filter({ hasText: new RegExp(`^${tab}$`) });
            if (await tabBtn.isVisible()) {
                await tabBtn.click();
                await page.waitForTimeout(800);
                await capture(page, `08-${tab.toLowerCase()}-tab`);
            }
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