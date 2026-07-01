// Single-shot active set screenshot, with layout fix in place.
const { chromium } = require('/Users/biancabienaime/repos/Shift6/node_modules/playwright');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('https://getshift6.com/');
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  await page.evaluate((y) => {
    const data = {
      userProfile: {
        displayName: 'Cam',
        estimated1RMs: { barbell_squat: 245, bench_press: 185, deadlift: 315, leg_press: 400 },
        onboardedAt: '2026-06-01',
      },
      preferences: { unit: 'lbs', theme: 'dark', equipmentTrack: 'full_gym' },
      currentCycle: { week: 2, day: 1, totalCyclesCompleted: 0, completedDaysThisWeek: ['1', '2'] },
      activeModifiers: { mvdMode: false, travelMode: false, timeCrunch: false, highFatigue: false, heavyMeal: false },
      dailyHabitState: {},
      workoutHistory: [{ date: y, day: 2, week: 1, completed: true, exercises: [] }],
      streakData: { currentStreak: 1, longestStreak: 1, mvdDates: [], freezesAvailable: 1, lastActiveDate: y },
    };
    localStorage.setItem('shift6_data', JSON.stringify(data));
    localStorage.setItem('shift6_revision', '1');
    localStorage.setItem('shift6_migrated_from_v1', '1');
    localStorage.setItem('shift6_migrated_from_armor', '1');
    localStorage.setItem('shift6_tour_shown', '1');
  }, yesterday);

  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2500);
  await page.evaluate(() => Promise.all([...document.images].map(img =>
    img.complete ? Promise.resolve() : new Promise(r => { img.onload = img.onerror = r; setTimeout(r, 5000); })
  )));
  await page.waitForTimeout(500);

  // Click Start
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(b => /^start$/i.test(b.textContent.trim()));
    if (b) b.click();
  });
  await page.waitForTimeout(2500);
  await page.evaluate(() => Promise.all([...document.images].map(img =>
    img.complete ? Promise.resolve() : new Promise(r => { img.onload = img.onerror = r; setTimeout(r, 5000); })
  )));

  // Scroll the action buttons into view
  await page.evaluate(() => {
    const completeBtn = [...document.querySelectorAll('button')].find(b => /complete set 1/i.test(b.textContent));
    completeBtn?.scrollIntoView({ block: 'center', behavior: 'instant' });
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/post-cut-active-2.png', fullPage: false });
  console.log('saved: /tmp/post-cut-active-2.png');

  // Also screenshot the dashboard
  await page.goto('https://getshift6.com/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2500);
  await page.evaluate(() => Promise.all([...document.images].map(img =>
    img.complete ? Promise.resolve() : new Promise(r => { img.onload = img.onerror = r; setTimeout(r, 5000); })
  )));
  // Visit home tab via aria-label=Today
  await page.evaluate(() => {
    const t = document.querySelector('button[aria-label="Today"]');
    if (t) t.click();
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/post-cut-dashboard-2.png', fullPage: false });
  console.log('saved: /tmp/post-cut-dashboard-2.png');

  await browser.close();
})();
