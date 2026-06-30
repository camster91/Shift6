// Verify Full Gym Day 3 (Heavy Bench) and Day 1 (Heavy Squats) show the new accessories
const { chromium } = require('/Users/biancabienaime/repos/Shift6/node_modules/playwright');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 420, height: 1400 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));

  for (const [day, label] of [[1, 'heavy-squats'], [3, 'heavy-bench']]) {
    await page.goto('https://getshift6.com/');
    await page.evaluate((day) => {
      const data = {
        userProfile: {
          displayName: 'Cam',
          estimated1RMs: {
            barbell_squat: 245, bench_press: 185, deadlift: 315,
            goblet_squat: 50, dumbbell_press: 60, romanian_deadlift: 95,
            leg_press: 400, leg_curls: 95, calf_raises: 200,
            incline_bench: 165, lateral_raise: 25, tricep_pushdown: 100,
            bicep_curl: 35, tricep_dips: 1, pushups: 0, plank: 0,
          },
          onboardedAt: '2026-06-01',
        },
        preferences: { unit: 'lbs', theme: 'dark', equipmentTrack: 'full_gym' },
        currentCycle: { week: 2, day, totalCyclesCompleted: 0, completedDaysThisWeek: [] },
        activeModifiers: { mvdMode: false, travelMode: false, timeCrunch: false, highFatigue: false },
        dailyHabitState: {},
        workoutHistory: [],
        streakData: { currentStreak: 0, longestStreak: 0, mvdDates: [], freezesAvailable: 1, lastActiveDate: null },
      };
      localStorage.setItem('armor_data', JSON.stringify(data));
      localStorage.setItem('armor_revision', '1');
      localStorage.setItem('armor_migrated_from_shift6', 'true');
      localStorage.setItem('armor_first_run_done', 'true');
    }, day);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);

    await page.evaluate(() => Promise.all(
      [...document.images].map(img => img.complete ? Promise.resolve() :
        new Promise(r => { img.onload = img.onerror = r; setTimeout(r, 5000); })
      )
    ));
    await page.waitForTimeout(1000);

    await page.screenshot({ path: `/tmp/dashboard-${label}.png`, fullPage: true });
    console.log(`Saved /tmp/dashboard-${label}.png`);
  }

  await browser.close();
})();