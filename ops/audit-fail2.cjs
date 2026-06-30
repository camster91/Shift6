// Just probe the DOM for the buttons
const { chromium } = require('/Users/biancabienaime/repos/Shift6/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  await page.goto('https://getshift6.com/');
  await page.evaluate(() => {
    const data = {
      userProfile: { displayName: 'Cam', estimated1RMs: { barbell_squat: 245 }, onboardedAt: '2026-06-01' },
      preferences: { unit: 'lbs', theme: 'dark', equipmentTrack: 'full_gym' },
      currentCycle: { week: 1, day: 1, totalCyclesCompleted: 0, completedDaysThisWeek: [] },
      activeModifiers: { mvdMode: false, travelMode: false, timeCrunch: false, highFatigue: false },
      dailyHabitState: {}, workoutHistory: [],
      streakData: { currentStreak: 0, longestStreak: 0, mvdDates: [], freezesAvailable: 1, lastActiveDate: null },
    };
    localStorage.setItem('armor_data', JSON.stringify(data));
    localStorage.setItem('armor_revision', '1');
    localStorage.setItem('armor_migrated_from_shift6', 'true');
    localStorage.setItem('armor_tour_shown', '1');
  });
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2500);
  await page.evaluate(() => Promise.all([...document.images].map(img => img.complete ? Promise.resolve() : new Promise(r => { img.onload = img.onerror = r; setTimeout(r, 5000); }))));
  await page.waitForTimeout(500);

  // Start workout
  await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(b=>/start/i.test(b.textContent)&&!b.disabled); if(b)b.click(); });
  await page.waitForTimeout(2500);

  // Probe buttons
  const info = await page.evaluate(() => {
    const failBtn = document.querySelector('[data-testid="fail-set-button"]');
    const allBtns = [...document.querySelectorAll('button')].map(b => ({
      text: b.textContent?.trim().slice(0, 50),
      testid: b.getAttribute('data-testid'),
      class: b.className?.slice(0, 60),
    }));
    return { failBtnVisible: !!failBtn, allBtns };
  });
  console.log('INFO:', JSON.stringify(info, null, 2));

  // Scroll the fail button into view + screenshot
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => /fail set/i.test(b.textContent));
    btn?.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/audit-fail-scrolled.png', fullPage: false });
  console.log('scrolled screenshot saved');

  await browser.close();
})();
