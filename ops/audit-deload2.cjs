// Debug: see what the summary modal receives
const { chromium } = require('/Users/biancabienaime/repos/Shift6/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

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

  // Fail set 1
  await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(b=>/fail set 1/i.test(b.textContent)); if(b)b.click(); });
  await page.waitForTimeout(1500);
  // Skip rest
  await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(b=>/skip rest/i.test(b.textContent)); if(b)b.click(); });
  await page.waitForTimeout(1500);
  // Fail set 2
  await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(b=>/fail set 2/i.test(b.textContent)); if(b)b.click(); });
  await page.waitForTimeout(1500);
  // Skip rest
  await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(b=>/skip rest/i.test(b.textContent)); if(b)b.click(); });
  await page.waitForTimeout(1500);
  // Fail set 3
  await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(b=>/fail set 3/i.test(b.textContent)); if(b)b.click(); });
  await page.waitForTimeout(1500);

  // After 3 fails, the active set has 4 sets total. We're on set 4 now.
  // Don't skip rest, just click End Workout to bring up the modal
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const endBtn = btns.find(b => /end workout/i.test(b.textContent));
    if (endBtn) endBtn.click();
  });
  await page.waitForTimeout(1500);
  // Confirm
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const confirm = btns.find(b => b.textContent.trim() === 'End Workout' && b.className.includes('bg-'));
    if (confirm) confirm.click();
  });
  await page.waitForTimeout(2500);

  const info = await page.evaluate(() => {
    const modal = document.querySelector('[data-testid="workout-summary-modal"]');
    const deload = document.querySelector('[data-testid="deload-recommendation"]');
    return {
      hasModal: !!modal,
      hasDeload: !!deload,
      modalText: modal?.innerText?.slice(0, 400),
    };
  });
  console.log('INFO:', JSON.stringify(info, null, 2));

  await browser.close();
})();
