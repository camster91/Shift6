// Verify the rest screen with next-exercise preview.
const { chromium } = require('/Users/biancabienaime/repos/Shift6/node_modules/playwright');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 420, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));

  await page.goto('https://getshift6.com/');
  await page.evaluate(() => {
    const data = {
      userProfile: {
        displayName: 'Cam',
        estimated1RMs: { barbell_squat: 245, bench_press: 185, deadlift: 315, goblet_squat: 50, dumbbell_press: 60, romanian_deadlift: 95, leg_press: 400, leg_curls: 95, calf_raises: 200 },
        onboardedAt: '2026-06-01',
      },
      preferences: { unit: 'lbs', theme: 'dark', equipmentTrack: 'full_gym' },
      currentCycle: { week: 2, day: 1, totalCyclesCompleted: 0, completedDaysThisWeek: [] },
      activeModifiers: { mvdMode: false, travelMode: false, timeCrunch: false, highFatigue: false },
      dailyHabitState: {},
      workoutHistory: [],
      streakData: { currentStreak: 0, longestStreak: 0, mvdDates: [], freezesAvailable: 1, lastActiveDate: null },
    };
    localStorage.setItem('armor_data', JSON.stringify(data));
    localStorage.setItem('armor_revision', '1');
    localStorage.setItem('armor_migrated_from_shift6', 'true');
    localStorage.setItem('armor_first_run_done', 'true');
  });
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2500);

  // Click Start
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const m = btns.find(b => /start/i.test(b.textContent) && !b.disabled);
    if (m) m.click();
  });
  await page.waitForTimeout(2500);

  // Active-set screenshot first
  await page.evaluate(() => Promise.all(
    [...document.images].map(img => img.complete ? Promise.resolve() :
      new Promise(r => { img.onload = img.onerror = r; setTimeout(r, 5000); })
    )
  ));
  await page.screenshot({ path: '/tmp/armor-active-set.png', fullPage: true });
  console.log('Active-set screenshot saved');

  // Click Complete Set via text-match
  const completeResult = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const t = btns.find(b => /complete set/i.test(b.textContent));
    if (t) { t.click(); return 'clicked'; }
    return 'no complete set button found';
  });
  console.log('Complete:', completeResult);
  await page.waitForTimeout(2500);

  await page.evaluate(() => Promise.all(
    [...document.images].map(img => img.complete ? Promise.resolve() :
      new Promise(r => { img.onload = img.onerror = r; setTimeout(r, 5000); })
    )
  ));
  await page.screenshot({ path: '/tmp/armor-rest.png', fullPage: true });
  console.log('Rest screenshot saved');

  await browser.close();
})();