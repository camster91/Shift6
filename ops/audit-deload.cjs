// Fail 3 sets, end workout, see deload recommendation
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

  // Start workout
  await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(b=>/start/i.test(b.textContent)&&!b.disabled); if(b)b.click(); });
  await page.waitForTimeout(2500);

  // Fail set 1
  await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(b=>/fail set 1/i.test(b.textContent)); if(b)b.click(); });
  await page.waitForTimeout(2000);
  // Skip rest
  await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(b=>/skip rest/i.test(b.textContent)); if(b)b.click(); });
  await page.waitForTimeout(2000);
  // Fail set 2
  await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(b=>/fail set 2/i.test(b.textContent)); if(b)b.click(); });
  await page.waitForTimeout(2000);
  // Skip rest
  await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(b=>/skip rest/i.test(b.textContent)); if(b)b.click(); });
  await page.waitForTimeout(2000);
  // Fail set 3
  await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(b=>/fail set 3/i.test(b.textContent)); if(b)b.click(); });
  await page.waitForTimeout(2000);
  // Skip rest
  await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(b=>/skip rest/i.test(b.textContent)); if(b)b.click(); });
  await page.waitForTimeout(2000);
  // Fail set 4
  await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(b=>/fail set 4/i.test(b.textContent)); if(b)b.click(); });
  await page.waitForTimeout(2500);
  // End Workout (from active set)
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

  // Now the summary modal should be visible with deload recommendation
  await page.screenshot({ path: '/tmp/audit-deload-modal.png', fullPage: false });
  const info = await page.evaluate(() => {
    const modal = document.querySelector('[data-testid="workout-summary-modal"]');
    const deload = document.querySelector('[data-testid="deload-recommendation"]');
    return {
      hasModal: !!modal,
      hasDeload: !!deload,
      deloadText: deload?.innerText?.slice(0, 200),
    };
  });
  console.log('DELOAD INFO:', JSON.stringify(info, null, 2));

  // Click "Apply Deload" and check the modifier state
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => /apply deload/i.test(b.textContent));
    if (btn) btn.click();
  });
  await page.waitForTimeout(1500);
  const finalState = await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('armor_data'));
    return { highFatigue: data.activeModifiers.highFatigue };
  });
  console.log('FINAL STATE:', JSON.stringify(finalState));

  await browser.close();
})();
