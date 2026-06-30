// Click Apply Deload and verify the modifier state changes
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

  // Start
  await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(b=>/start/i.test(b.textContent)&&!b.disabled); if(b)b.click(); });
  await page.waitForTimeout(2500);

  // Fail 3 sets
  for (let i = 1; i <= 3; i++) {
    await page.evaluate((n) => { const b=[...document.querySelectorAll('button')].find(b=>new RegExp('fail set '+n, 'i').test(b.textContent)); if(b)b.click(); }, i);
    await page.waitForTimeout(1500);
    if (i < 3) {
      await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(b=>/skip rest/i.test(b.textContent)); if(b)b.click(); });
      await page.waitForTimeout(1500);
    }
  }

  // End workout
  await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(b=>/end workout/i.test(b.textContent)); if(b)b.click(); });
  await page.waitForTimeout(1500);
  // Confirm
  await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='End Workout'&&b.className.includes('bg-')); if(b)b.click(); });
  await page.waitForTimeout(2500);

  // Verify deload banner visible
  const deloadVisible = await page.evaluate(() => {
    return !!document.querySelector('[data-testid="deload-recommendation"]');
  });
  console.log('Deload banner visible before click:', deloadVisible);

  // Click Apply Deload
  await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(b=>/apply deload/i.test(b.textContent)); if(b)b.click(); });
  await page.waitForTimeout(1500);

  // Check modifier state
  const final = await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('armor_data'));
    return data.activeModifiers;
  });
  console.log('FINAL modifiers:', JSON.stringify(final));

  await browser.close();
})();
