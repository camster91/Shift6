const { chromium } = require('/Users/biancabienaime/repos/Shift6/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  // Bypass cache
  const ctx = await browser.newContext({
    viewport: { width: 420, height: 900 },
    deviceScaleFactor: 2,
    bypassCSP: true,
  });
  const page = await ctx.newPage();
  await page.route('**/exercises/*', route => route.continue());
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));
  page.on('console', (msg) => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });

  await page.goto('https://getshift6.com/', { waitUntil: 'networkidle' });
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
      dailyHabitState: {}, workoutHistory: [],
      streakData: { currentStreak: 0, longestStreak: 0, mvdDates: [], freezesAvailable: 1, lastActiveDate: null },
    };
    localStorage.setItem('armor_data', JSON.stringify(data));
    localStorage.setItem('armor_revision', '1');
    localStorage.setItem('armor_migrated_from_shift6', 'true');
    localStorage.setItem('armor_first_run_done', 'true');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  // Check if image is loaded and what computed style says
  const info = await page.evaluate(() => {
    const img = document.querySelector('.exercise-illustration-img');
    if (!img) return { error: 'no .exercise-illustration-img found' };
    const cs = getComputedStyle(img);
    return {
      src: img.getAttribute('src'),
      filter: cs.filter,
      parentBg: getComputedStyle(img.parentElement).backgroundColor,
      isLight: document.documentElement.classList.contains('light'),
    };
  });
  console.log('IMG INFO:', JSON.stringify(info, null, 2));

  await page.evaluate(() => Promise.all([...document.images].map(img => img.complete ? Promise.resolve() : new Promise(r => { img.onload = img.onerror = r; setTimeout(r, 5000); }))));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/dashboard-dark.png', fullPage: false });
  console.log('saved');

  await browser.close();
})();