const { chromium } = require('/Users/biancabienaime/repos/Shift6/node_modules/playwright');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 420, height: 1400 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto('https://getshift6.com/');
  await page.evaluate(() => {
    const today = new Date();
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const data = {
      userProfile: { displayName: 'Cam', estimated1RMs: { barbell_squat: 245, bench_press: 185, deadlift: 315, goblet_squat: 50, dumbbell_press: 60, romanian_deadlift: 95 }, onboardedAt: '2026-06-01' },
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
  await page.waitForTimeout(2000);

  // Hide the first-run-tour by toggling state directly (not via UI)
  await page.evaluate(() => {
    // Force the first-run-tour to be closed by removing the React state via the persisted flag
    localStorage.setItem('armor_first_run_done', 'true');
  });
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2500);

  // Wait for images to load
  await page.evaluate(() => Promise.all(
    [...document.images].map(img => img.complete ? Promise.resolve() :
      new Promise(r => { img.onload = img.onerror = r; setTimeout(r, 5000); })
    )
  ));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/dashboard-clean2.png', fullPage: true });
  console.log('Dashboard saved');
  await browser.close();
})();