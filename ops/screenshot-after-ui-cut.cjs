// Capture every screen of Shift6 after the rebrand + UI cut.
// The seed values are tuned so most screens render meaningful content
// (a non-empty workout history, an active streak, travel mode, etc.)
const { chromium } = require('/Users/biancabienaime/repos/Shift6/node_modules/playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];

  await page.goto('https://getshift6.com/');
  await page.evaluate((y) => {
    const todayWorkout = {
      type: 'strength',
      name: 'Heavy Squats',
      primary: 'barbell_squat',
      primaryLift: {
        exerciseId: 'barbell_squat',
        sets: 4,
        reps: 8,
        weight: 220,
        pct: 0.73,
      },
      accessories: [
        { exerciseId: 'leg_press', sets: 3, reps: 12, weight: 400 },
        { exerciseId: 'leg_curls', sets: 3, reps: 12, weight: 90 },
        { exerciseId: 'calf_raises', sets: 3, reps: 12, weight: 195 },
      ],
    };
    const data = {
      userProfile: {
        displayName: 'Cam',
        estimated1RMs: {
          barbell_squat: 245, leg_press: 400, leg_curls: 90,
          calf_raises: 195, bench_press: 185, deadlift: 315,
          barbell_row: 175, shoulder_press: 115,
          goblet_squat: 0, dumbbell_press: 0, romanian_deadlift: 0,
        },
        onboardedAt: '2026-06-01',
      },
      preferences: { unit: 'lbs', theme: 'dark', equipmentTrack: 'full_gym' },
      currentCycle: { week: 2, day: 1, totalCyclesCompleted: 0, completedDaysThisWeek: ['1', '2'] },
      activeModifiers: { mvdMode: false, travelMode: false, timeCrunch: false, highFatigue: false, heavyMeal: false },
      dailyHabitState: { balance: false, lunchWalk: true, postWalk: false, evening: false },
      workoutHistory: [
        { date: '2026-06-23', day: 1, week: 1, completed: true, exercises: [{id:'barbell_squat',sets:[{reps:8,weight:200}]}] },
        { date: '2026-06-24', day: 2, week: 1, completed: true, exercises: [{id:'bench_press',sets:[{reps:5,weight:175}]}] },
        { date: '2026-06-25', day: 3, week: 1, completed: true, exercises: [{id:'deadlift',sets:[{reps:3,weight:295}]}] },
        { date: '2026-06-27', day: 5, week: 1, completed: true, exercises: [{id:'vo2max',sets:[]}] },
        { date: '2026-06-28', day: 1, week: 2, completed: true, exercises: [{id:'barbell_squat',sets:[{reps:8,weight:215}]}] },
        { date: y, day: 2, week: 2, completed: true, exercises: [{id:'bench_press',sets:[{reps:5,weight:180}]}] },
      ],
      streakData: { currentStreak: 8, longestStreak: 14, mvdDates: [], freezesAvailable: 1, lastActiveDate: y },
    };
    // Make todayWorkout look like what getTodaysWorkout returns
    data._todaysWorkout = todayWorkout;
    localStorage.setItem('shift6_data', JSON.stringify(data));
    localStorage.setItem('shift6_revision', '1');
    localStorage.setItem('shift6_migrated_from_v1', '1');
    localStorage.setItem('shift6_migrated_from_armor', '1');
    localStorage.setItem('shift6_tour_shown', '1');
  }, yesterday);

  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2500);
  // Wait for all images
  await page.evaluate(() => Promise.all([...document.images].map(img =>
    img.complete ? Promise.resolve() : new Promise(r => { img.onload = img.onerror = r; setTimeout(r, 5000); })
  )));
  await page.waitForTimeout(800);

  await page.screenshot({ path: '/tmp/post-cut-dashboard.png', fullPage: false });
  console.log('✓ dashboard');

  // Active set — tap Start
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(b => /^start$/i.test(b.textContent.trim()));
    if (b) b.click();
  });
  await page.waitForTimeout(2500);
  await page.evaluate(() => Promise.all([...document.images].map(img =>
    img.complete ? Promise.resolve() : new Promise(r => { img.onload = img.onerror = r; setTimeout(r, 5000); })
  )));
  await page.screenshot({ path: '/tmp/post-cut-active.png', fullPage: false });
  console.log('✓ active set');

  // Rest — tap Complete Set
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(b => /complete set 1/i.test(b.textContent));
    if (b) b.click();
  });
  await page.waitForTimeout(2200);
  await page.screenshot({ path: '/tmp/post-cut-rest.png', fullPage: false });
  console.log('✓ rest');

  // Cancel out of rest back to dashboard
  await page.evaluate(() => { history.back(); });
  await page.waitForTimeout(1500);

  // Open progress tab
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button[role="tab"]')];
    const t = btns.find(b => /progress/i.test(b.textContent || b.getAttribute('aria-label') || ''));
    if (t) t.click();
  });
  await page.waitForTimeout(2500);
  await page.evaluate(() => Promise.all([...document.images].map(img =>
    img.complete ? Promise.resolve() : new Promise(r => { img.onload = img.onerror = r; setTimeout(r, 5000); })
  )));
  await page.screenshot({ path: '/tmp/post-cut-progress.png', fullPage: false });
  console.log('✓ progress');

  // Settings tab
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button[role="tab"]')];
    const t = btns.find(b => /settings/i.test(b.textContent || b.getAttribute('aria-label') || ''));
    if (t) t.click();
  });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/post-cut-settings.png', fullPage: false });
  console.log('✓ settings');

  // Travel-mode variant — toggle travel on, screenshot dashboard
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button[role="tab"]')];
    const t = btns.find(b => /today|home/i.test(b.textContent || b.getAttribute('aria-label') || ''));
    if (t) t.click();
  });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('shift6_data'));
    raw.activeModifiers.travelMode = true;
    localStorage.setItem('shift6_data', JSON.stringify(raw));
  });
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/post-cut-dashboard-travel.png', fullPage: false });
  console.log('✓ dashboard (travel mode)');

  await browser.close();
})();
