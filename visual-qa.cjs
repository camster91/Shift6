const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots-qa');

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const VIEWPORTS = {
    mobile: { width: 375, height: 812 },
    desktop: { width: 1280, height: 800 }
};

async function captureScreenshot(page, name, viewport = 'mobile') {
    const fileName = `${viewport}-${name}.png`;
    const filePath = path.join(SCREENSHOTS_DIR, fileName);
    await page.screenshot({ path: filePath, fullPage: false });
    console.log(`Screenshot saved: ${fileName}`);
    return filePath;
}

async function runVisualQA() {
    console.log('Starting Visual QA...');
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: VIEWPORTS.mobile,
        deviceScaleFactor: 2
    });
    const page = await context.newPage();

    try {
        // Wait for dev server to be ready
        console.log('Waiting for dev server...');
        let retries = 15;
        while (retries > 0) {
            try {
                await page.goto('http://localhost:5173', { timeout: 5000 });
                break;
            } catch (e) {
                retries--;
                if (retries === 0) throw e;
                console.log(`Retrying... (${retries} left)`);
                await new Promise(r => setTimeout(r, 2000));
            }
        }

        // Wait for app to load
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // ==== ONBOARDING FLOW ====
        console.log('\n=== ONBOARDING ===');
        await captureScreenshot(page, '01-onboarding-welcome');

        // Select Home mode
        await page.click('text=Bodyweight training');
        await page.waitForTimeout(2000);
        await captureScreenshot(page, '02-onboarding-equipment');

        // Select experience level
        await page.click('text=Beginner');
        await page.waitForTimeout(2000);
        await captureScreenshot(page, '03-onboarding-program');

        // Select a program
        await page.click('text=Shift6 Classic');
        await page.waitForTimeout(2000);
        await captureScreenshot(page, '04-onboarding-schedule');

        // Complete onboarding
        await page.click('button:has-text("Start My Journey")');
        await page.waitForTimeout(3000);

        // ==== HOME DASHBOARD ====
        console.log('\n=== HOME DASHBOARD ===');
        await captureScreenshot(page, '05-dashboard-home');

        // Capture Workout tab
        const workoutTab = await page.locator('nav button, [role="tab"]').filter({ hasText: /Workout|Training/i }).first();
        if (await workoutTab.isVisible().catch(() => false)) {
            await workoutTab.click();
            await page.waitForTimeout(1000);
            await captureScreenshot(page, '06-workout-tab');
        }

        // Capture Progress tab
        const progressTab = await page.locator('nav button, [role="tab"]').filter({ hasText: /Progress|Stats/i }).first();
        if (await progressTab.isVisible().catch(() => false)) {
            await progressTab.click();
            await page.waitForTimeout(1000);
            await captureScreenshot(page, '07-progress-tab');
        }

        // ==== WORKOUT SESSION ====
        console.log('\n=== WORKOUT SESSION ===');
        await page.goto('http://localhost:5173');
        await page.waitForTimeout(2000);

        // Click Start Training
        const startBtn = await page.locator('button').filter({ hasText: /Start Training|Start Workout/i }).first();
        if (await startBtn.isVisible().catch(() => false)) {
            await startBtn.click();
            await page.waitForTimeout(2000);
            await captureScreenshot(page, '08-workout-readiness');

            // Continue to workout
            await page.click('button:has-text("Ready")');
            await page.waitForTimeout(1000);
            await captureScreenshot(page, '09-workout-active');

            // Complete a set to see rest screen
            await page.click('button:has-text("Complete Set")');
            await page.waitForTimeout(1000);
            await captureScreenshot(page, '10-rest-screen');

            // Skip rest
            await page.click('button:has-text("Skip")');
            await page.waitForTimeout(500);

            // Exit workout
            const exitBtn = await page.locator('button').filter({ hasText: /^Exit$|Close/i }).first();
            if (await exitBtn.isVisible().catch(() => false)) {
                await exitBtn.click();
                await page.waitForTimeout(500);
                await captureScreenshot(page, '11-exit-confirmation');
                
                // Cancel
                await page.click('button:has-text("Keep")');
                await page.waitForTimeout(500);
            }

            // Finish workout
            for (let i = 0; i < 3; i++) {
                const completeBtn = await page.locator('button').filter({ hasText: "Complete Set" }).first();
                if (await completeBtn.isVisible().catch(() => false)) {
                    await completeBtn.click();
                    await page.waitForTimeout(500);
                    const skipBtn = await page.locator('button').filter({ hasText: "Skip" }).first();
                    if (await skipBtn.isVisible().catch(() => false)) {
                        await skipBtn.click();
                        await page.waitForTimeout(500);
                    }
                }
            }
            await captureScreenshot(page, '12-workout-complete');
        }

        // ==== GYM MODE ====
        console.log('\n=== GYM MODE ===');
        await page.goto('http://localhost:5173');
        await page.waitForTimeout(2000);

        // Check if we need to reset to see mode selector or use drawer
        const menuBtn = await page.locator('button svg[data-lucide="menu"], button:has([data-lucide="menu"])').first();
        if (await menuBtn.isVisible().catch(() => false)) {
            await menuBtn.click();
            await page.waitForTimeout(1000);
            await captureScreenshot(page, '13-side-drawer');

            // Find Gym Mode button
            const gymModeBtn = await page.locator('button, a').filter({ hasText: /Gym Mode|Switch to Gym/i }).first();
            if (await gymModeBtn.isVisible().catch(() => false)) {
                await gymModeBtn.click();
                await page.waitForTimeout(2000);
                await captureScreenshot(page, '14-gym-dashboard');

                // Start gym workout
                const gymStartBtn = await page.locator('button').filter({ hasText: /Start Workout|Begin Workout/i }).first();
                if (await gymStartBtn.isVisible().catch(() => false)) {
                    await gymStartBtn.click();
                    await page.waitForTimeout(2000);
                    await captureScreenshot(page, '15-gym-workout-session');

                    // Test plate buttons
                    const plateBtn = await page.locator('button').filter({ hasText: "+20" }).first();
                    if (await plateBtn.isVisible().catch(() => false)) {
                        await plateBtn.click();
                        await page.waitForTimeout(500);
                        await captureScreenshot(page, '16-gym-plate-buttons');
                    }

                    // Exit
                    const gymExitBtn = await page.locator('button svg[data-lucide="x"]').first();
                    if (await gymExitBtn.isVisible().catch(() => false)) {
                        await gymExitBtn.click();
                        await page.waitForTimeout(500);
                        await captureScreenshot(page, '17-gym-exit-modal');
                    }
                }
            }
        }

        // ==== SETTINGS/MODALS ====
        console.log('\n=== SETTINGS ===');
        await page.goto('http://localhost:5173');
        await page.waitForTimeout(2000);

        // Open drawer and check settings
        const menuBtn2 = await page.locator('button svg[data-lucide="menu"]').first();
        if (await menuBtn2.isVisible().catch(() => false)) {
            await menuBtn2.click();
            await page.waitForTimeout(500);

            // Try to find settings/training settings
            const settingsBtn = await page.locator('button, a').filter({ hasText: /Settings|Training Settings/i }).first();
            if (await settingsBtn.isVisible().catch(() => false)) {
                await settingsBtn.click();
                await page.waitForTimeout(1000);
                await captureScreenshot(page, '18-settings-modal');
            }
        }

        console.log('\n=== VISUAL QA COMPLETE ===');
        console.log('Screenshots saved to:', SCREENSHOTS_DIR);
        
    } catch (error) {
        console.error('Error during visual QA:', error);
        await captureScreenshot(page, 'error-final-state');
    } finally {
        await browser.close();
    }
}

runVisualQA().catch(console.error);
