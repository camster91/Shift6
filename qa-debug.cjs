const { chromium } = require('playwright');

async function run() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });

    try {
        // Wait for server
        for (let i = 0; i < 10; i++) {
            try { await page.goto('http://localhost:5173', { timeout: 3000 }); break; }
            catch { await new Promise(r => setTimeout(r, 2000)); }
        }
        await page.waitForTimeout(2000);

        console.log('1. Welcome screen');
        console.log('   URL:', page.url());
        console.log('   Title:', await page.title());
        console.log('   H1:', await page.locator('h1, h2').first().textContent().catch(() => 'none'));

        // Click Get Started
        console.log('\n2. Click Get Started');
        await page.click('button:has-text("Get Started")');
        await page.waitForTimeout(1500);
        console.log('   H2:', await page.locator('h2').first().textContent().catch(() => 'none'));

        // Select exercises
        console.log('\n3. Select exercises');
        await page.click('button:has-text("Push-Ups")');
        await page.waitForTimeout(500);
        await page.click('button:has-text("Bodyweight Squats")');
        await page.waitForTimeout(500);
        console.log('   H2:', await page.locator('h2').first().textContent().catch(() => 'none'));

        // Find and click the start button
        console.log('\n4. Find Start button');
        const startBtn = page.locator('button').filter({ hasText: /Start with/ });
        const btnText = await startBtn.textContent();
        const btnEnabled = await startBtn.isEnabled();
        console.log('   Button text:', btnText);
        console.log('   Button enabled:', btnEnabled);
        console.log('   Button visible:', await startBtn.isVisible());

        // Scroll into view and click
        await startBtn.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        await startBtn.click();
        console.log('   Clicked!');

        // After setting localStorage, force a full reload so React reinitializes state
        await page.evaluate(() => window.location.reload());
        await page.waitForTimeout(3000);
        console.log('\n5. After reload');
        console.log('   URL:', page.url());
        const h2 = await page.locator('h1, h2').allTextContents();
        console.log('   Headings:', h2);
        const bodyText = await page.textContent('body');
        console.log('   Body preview:', bodyText.slice(0, 300));

        // Check localStorage
        const onboardingDone = await page.evaluate(() => localStorage.getItem('shift6_onboarding_done'));
        const myExercises = await page.evaluate(() => localStorage.getItem('shift6_my_exercises'));
        console.log('\n6. localStorage');
        console.log('   onboarding_done:', onboardingDone);
        console.log('   my_exercises:', myExercises);

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await browser.close();
    }
}

run();
