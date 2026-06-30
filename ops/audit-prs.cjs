// Verify PR feed on Progress tab
const { chromium } = require('/Users/biancabienaime/repos/Shift6/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 1400 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('https://getshift6.com/');
  await page.evaluate(() => {
    const data = {
      userProfile: { displayName: 'Cam', estimated1RMs: { barbell_squat: 245, bench_press: 185, deadlift: 315 }, onboardedAt: '2026-06-01' },
      preferences: { unit: 'lbs', theme: 'dark', equipmentTrack: 'full_gym' },
      currentCycle: { week: 3, day: 5, totalCyclesCompleted: 0, completedDaysThisWeek: [] },
      activeModifiers: { mvdMode: false, travelMode: false, timeCrunch: false, highFatigue: false },
      dailyHabitState: {},
      workoutHistory: [
        { date: '2026-06-01', day: 1, week: 1, completed: true, exercises: [
          { id: 'barbell_squat', sets: [{ reps: 8, weight: 200 }] },
          { id: 'bench_press', sets: [{ reps: 5, weight: 150 }] },
        ]},
        { date: '2026-06-08', day: 1, week: 2, completed: true, exercises: [
          { id: 'barbell_squat', sets: [{ reps: 8, weight: 220 }] },
          { id: 'bench_press', sets: [{ reps: 5, weight: 165 }] },
        ]},
        { date: '2026-06-15', day: 1, week: 3, completed: true, exercises: [
          { id: 'barbell_squat', sets: [{ reps: 8, weight: 245 }] },
          { id: 'bench_press', sets: [{ reps: 5, weight: 175 }] },
        ]},
      ],
      streakData: { currentStreak: 3, longestStreak: 3, mvdDates: [], freezesAvailable: 1, lastActiveDate: '2026-06-15' },
    };
    localStorage.setItem('armor_data', JSON.stringify(data));
    localStorage.setItem('armor_revision', '1');
    localStorage.setItem('armor_migrated_from_shift6', 'true');
    localStorage.setItem('armor_tour_shown', '1');
  });
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2500);
  // Click Progress tab
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button[role="tab"]')];
    const t = btns.find(b => /progress/i.test(b.textContent || b.getAttribute('aria-label') || ''));
    if (t) t.click();
  });
  await page.waitForTimeout(2000);
  await page.evaluate(() => Promise.all([...document.images].map(img => img.complete ? Promise.resolve() : new Promise(r => { img.onload = img.onerror = r; setTimeout(r, 5000); }))));
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/tmp/audit-progress-prs.png', fullPage: true });

  const info = await page.evaluate(() => {
    const prs = document.querySelector('[data-testid="personal-records"]');
    if (!prs) return { error: 'no PR feed' };
    return {
      rows: [...prs.querySelectorAll('.rounded-xl')].map(r => r.innerText.slice(0, 80)),
    };
  });
  console.log('PR FEED:', JSON.stringify(info, null, 2));
  await browser.close();
})();
