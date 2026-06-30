// Verify the at-risk streak banner on the dashboard
const { chromium } = require('/Users/biancabienaime/repos/Shift6/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 1200 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('https://getshift6.com/');
  // 7-day streak, last active yesterday
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  await page.evaluate((y) => {
    const data = {
      userProfile: { displayName: 'Cam', estimated1RMs: { barbell_squat: 245 }, onboardedAt: '2026-06-01' },
      preferences: { unit: 'lbs', theme: 'dark', equipmentTrack: 'full_gym' },
      currentCycle: { week: 1, day: 1, totalCyclesCompleted: 0, completedDaysThisWeek: [] },
      activeModifiers: { mvdMode: false, travelMode: false, timeCrunch: false, highFatigue: false },
      dailyHabitState: {},
      workoutHistory: [
        { date: '2026-06-23', day: 1, week: 1, completed: true, exercises: [] },
        { date: '2026-06-24', day: 2, week: 1, completed: true, exercises: [] },
        { date: '2026-06-25', day: 3, week: 1, completed: true, exercises: [] },
        { date: '2026-06-26', day: 4, week: 1, completed: true, exercises: [] },
        { date: '2026-06-27', day: 5, week: 1, completed: true, exercises: [] },
        { date: '2026-06-28', day: 1, week: 2, completed: true, exercises: [] },
        { date: '2026-06-29', day: 2, week: 2, completed: true, exercises: [] },
        { date: y, day: 3, week: 2, completed: true, exercises: [] },
      ],
      streakData: {
        currentStreak: 8,
        longestStreak: 14,
        mvdDates: [],
        freezesAvailable: 1,
        lastActiveDate: y,
      },
    };
    localStorage.setItem('armor_data', JSON.stringify(data));
    localStorage.setItem('armor_revision', '1');
    localStorage.setItem('armor_migrated_from_shift6', 'true');
    localStorage.setItem('armor_tour_shown', '1');
  }, yesterday);
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2500);
  await page.evaluate(() => Promise.all([...document.images].map(img => img.complete ? Promise.resolve() : new Promise(r => { img.onload = img.onerror = r; setTimeout(r, 5000); }))));
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/tmp/audit-streak-at-risk.png', fullPage: true });

  const info = await page.evaluate(() => {
    const banner = document.querySelector('[data-testid="streak-banner"]');
    return {
      visible: !!banner,
      text: banner?.innerText?.slice(0, 200),
    };
  });
  console.log('STREAK BANNER:', JSON.stringify(info, null, 2));
  await browser.close();
})();
