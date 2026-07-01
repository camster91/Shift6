// QA grid: capture every meaningful screen × viewport × state.
// Outputs to /tmp/qa-<screen>-<viewport>.png so the analysis can
// run separately from the capture.
const { chromium } = require('/Users/biancabienaime/repos/Shift6/node_modules/playwright');
const fs = require('fs');

const SEEDS = {
  empty: {
    // first-run user
    userProfile: { displayName: 'Cam', estimated1RMs: {}, onboardedAt: null },
    preferences: { unit: 'lbs', theme: 'dark', equipmentTrack: 'full_gym' },
    currentCycle: { week: 1, day: 1, totalCyclesCompleted: 0, completedDaysThisWeek: [] },
    activeModifiers: { mvdMode: false, travelMode: false, timeCrunch: false, highFatigue: false, heavyMeal: false },
    dailyHabitState: {},
    workoutHistory: [],
    streakData: { currentStreak: 0, longestStreak: 0, mvdDates: [], freezesAvailable: 1, lastActiveDate: null },
  },
  midCycle: {
    userProfile: {
      displayName: 'Cam',
      estimated1RMs: { barbell_squat: 245, bench_press: 185, deadlift: 315, leg_press: 400, leg_curls: 90, calf_raises: 195, barbell_row: 175, shoulder_press: 115 },
      onboardedAt: '2026-05-01',
    },
    preferences: { unit: 'lbs', theme: 'dark', equipmentTrack: 'full_gym' },
    currentCycle: { week: 2, day: 1, totalCyclesCompleted: 0, completedDaysThisWeek: ['1', '2'] },
    activeModifiers: { mvdMode: false, travelMode: false, timeCrunch: false, highFatigue: false, heavyMeal: false },
    dailyHabitState: { balance: false, lunchWalk: true, postWalk: false, evening: false },
    workoutHistory: [
      { date: '2026-06-23', day: 1, week: 1, completed: true, exercises: [{ id: 'barbell_squat', sets: [{ reps: 8, weight: 200 }] }] },
      { date: '2026-06-24', day: 2, week: 1, completed: true, exercises: [{ id: 'bench_press', sets: [{ reps: 5, weight: 175 }] }] },
      { date: '2026-06-25', day: 3, week: 1, completed: true, exercises: [{ id: 'deadlift', sets: [{ reps: 3, weight: 295 }] }] },
      { date: '2026-06-27', day: 5, week: 1, completed: true, exercises: [{ id: 'vo2max', sets: [] }] },
      { date: '2026-06-28', day: 1, week: 2, completed: true, exercises: [{ id: 'barbell_squat', sets: [{ reps: 8, weight: 215 }] }] },
      { date: '2026-06-29', day: 2, week: 2, completed: true, exercises: [{ id: 'bench_press', sets: [{ reps: 5, weight: 180 }] }] },
    ],
    streakData: { currentStreak: 8, longestStreak: 14, mvdDates: [], freezesAvailable: 1, lastActiveDate: '2026-06-29' },
  },
  travel: {
    userProfile: {
      displayName: 'Cam',
      estimated1RMs: { barbell_squat: 245, leg_press: 400 },
      onboardedAt: '2026-05-01',
    },
    preferences: { unit: 'lbs', theme: 'dark', equipmentTrack: 'full_gym' },
    currentCycle: { week: 1, day: 3, totalCyclesCompleted: 0, completedDaysThisWeek: ['1', '2'] },
    activeModifiers: { mvdMode: false, travelMode: true, timeCrunch: false, highFatigue: false, heavyMeal: false },
    dailyHabitState: {},
    workoutHistory: [],
    streakData: { currentStreak: 0, longestStreak: 3, mvdDates: [], freezesAvailable: 1, lastActiveDate: null },
  },
};

async function loadSeed(page, seed) {
  await page.evaluate((s) => {
    const data = JSON.parse(s);
    localStorage.setItem('shift6_data', JSON.stringify(data));
    localStorage.setItem('shift6_revision', '1');
    localStorage.setItem('shift6_migrated_from_v1', '1');
    localStorage.setItem('shift6_migrated_from_armor', '1');
    localStorage.setItem('shift6_tour_shown', '1');
    document.documentElement.classList.toggle('light', data.preferences.theme === 'light');
  }, JSON.stringify(seed));
}

async function waitForImages(page) {
  await page.evaluate(() => Promise.all([...document.images].map(img =>
    img.complete ? Promise.resolve() : new Promise(r => { img.onload = img.onerror = r; setTimeout(r, 3000); })
  )));
  await page.waitForTimeout(400);
}

async function tapTab(page, label) {
  await page.evaluate(l => {
    const t = document.querySelector(`button[aria-label="${l}"]`);
    if (t) t.click();
  }, label);
}

async function startWorkout(page) {
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(b => /^start$/i.test(b.textContent.trim()));
    if (b) b.click();
  });
  await page.waitForTimeout(2500);
  await waitForImages(page);
}

async function completeOneSet(page) {
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(b => /complete set 1/i.test(b.textContent));
    if (b) b.click();
  });
  await page.waitForTimeout(2200);
}

async function runViewport(ctx, label, viewport, seedName) {
  const page = await ctx.newPage();
  page.on('pageerror', err => console.log(`  PAGE ERROR [${label}]:`, err.message));

  await page.goto('https://getshift6.com/');
  await page.setViewportSize(viewport);
  await loadSeed(page, SEEDS[seedName]);
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2500);
  await waitForImages(page);

  const dir = `/tmp/qa-${label}`;
  fs.mkdirSync(dir, { recursive: true });

  await page.screenshot({ path: `${dir}/01-dashboard.png`, fullPage: true });
  console.log(`  ✓ ${label}/01-dashboard`);

  await tapTab(page, 'Progress');
  await page.waitForTimeout(2000);
  await waitForImages(page);
  await page.screenshot({ path: `${dir}/02-progress.png`, fullPage: true });
  console.log(`  ✓ ${label}/02-progress`);

  await tapTab(page, 'Settings');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${dir}/03-settings.png`, fullPage: true });
  console.log(`  ✓ ${label}/03-settings`);

  await tapTab(page, 'Today');
  await page.waitForTimeout(1500);
  await startWorkout(page);
  await page.screenshot({ path: `${dir}/04-active-set.png`, fullPage: true });
  console.log(`  ✓ ${label}/04-active-set`);

  await completeOneSet(page);
  await page.screenshot({ path: `${dir}/05-rest.png`, fullPage: true });
  console.log(`  ✓ ${label}/05-rest`);

  await page.close();
}

(async () => {
  // Mobile dark — midCycle
  {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    await runViewport(ctx, 'mobile-dark-midcycle', { width: 390, height: 844 }, 'midCycle');
    await browser.close();
  }
  // Mobile light — midCycle (toggle theme via the saved data + html class)
  {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto('https://getshift6.com/');
    // Switch theme to light
    const data = { ...SEEDS.midCycle, preferences: { ...SEEDS.midCycle.preferences, theme: 'light' } };
    await loadSeed(page, data);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);
    await waitForImages(page);
    const dir = '/tmp/qa-mobile-light-midcycle';
    fs.mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: `${dir}/01-dashboard.png`, fullPage: true });
    console.log('  ✓ mobile-light-midcycle/01-dashboard');
    await tapTab(page, 'Progress');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${dir}/02-progress.png`, fullPage: true });
    console.log('  ✓ mobile-light-midcycle/02-progress');
    await startWorkout(page);
    await page.screenshot({ path: `${dir}/04-active-set.png`, fullPage: true });
    console.log('  ✓ mobile-light-midcycle/04-active-set');
    await page.close();
    await browser.close();
  }
  // Mobile dark — travel mode
  {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    await runViewport(ctx, 'mobile-dark-travel', { width: 390, height: 844 }, 'travel');
    await browser.close();
  }
  // Mobile dark — empty (first-run, no history)
  {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    await runViewport(ctx, 'mobile-dark-empty', { width: 390, height: 844 }, 'empty');
    await browser.close();
  }
  // Desktop — midCycle
  {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    await runViewport(ctx, 'desktop-dark-midcycle', { width: 1280, height: 800 }, 'midCycle');
    await browser.close();
  }
  console.log('All captures done.');
})().catch(e => { console.error('FAIL:', e); process.exit(1); });
