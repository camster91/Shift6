const { chromium } = require('/Users/biancabienaime/repos/Shift6/node_modules/playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 1300 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto('https://getshift6.com/');
  await page.evaluate(() => {
    const data = {
      userProfile: { displayName: 'Cam', estimated1RMs: {}, onboardedAt: null },
      preferences: { unit: 'lbs', theme: 'dark', equipmentTrack: 'full_gym' },
      currentCycle: { week: 1, day: 1, totalCyclesCompleted: 0, completedDaysThisWeek: [] },
      activeModifiers: { mvdMode: false, travelMode: false, timeCrunch: false, highFatigue: false, heavyMeal: false },
      dailyHabitState: {},
      workoutHistory: [],
      streakData: { currentStreak: 0, longestStreak: 0, mvdDates: [], freezesAvailable: 1, lastActiveDate: null },
    };
    localStorage.setItem('shift6_data', JSON.stringify(data));
    localStorage.setItem('shift6_revision', '1');
    localStorage.setItem('shift6_migrated_from_v1', '1');
    localStorage.setItem('shift6_migrated_from_armor', '1');
    localStorage.setItem('shift6_tour_shown', '1');
  });
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2500);
  await page.evaluate(() => Promise.all([...document.images].map(img =>
    img.complete ? Promise.resolve() : new Promise(r => { img.onload = img.onerror = r; setTimeout(r, 3000); })
  )));
  await page.screenshot({ path: '/tmp/qa-fix-empty-dashboard.png', fullPage: true });

  // Count occurrences of "Set your 1RM" text in DOM
  const stats = await page.evaluate(() => {
    const text = document.body.textContent;
    const matches = (text.match(/Set your 1RMs?/g) || []);
    return { count: matches.length };
  });
  console.log('Set 1RM mentions:', JSON.stringify(stats));
  await b.close();
})();
