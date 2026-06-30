// Desktop audit walk
const { chromium } = require('/Users/biancabienaime/repos/Shift6/node_modules/playwright');

const SEED = {
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
  currentCycle: { week: 2, day: 1, totalCyclesCompleted: 0, completedDaysThisWeek: [] },
  activeModifiers: { mvdMode: false, travelMode: false, timeCrunch: false, highFatigue: false },
  dailyHabitState: {},
  workoutHistory: [],
  streakData: { currentStreak: 0, longestStreak: 0, mvdDates: [], freezesAvailable: 1, lastActiveDate: null },
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on('pageerror', err => { pageErrors.push(err.message); console.log('PAGE ERROR:', err.message); });
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('requestfailed', req => failedRequests.push(`${req.url()} (${req.failure()?.errorText})`));
  page.on('response', res => {
    if (res.status() >= 400) failedRequests.push(`${res.status()} ${res.url()}`);
  });

  await page.goto('https://getshift6.com/');
  await page.evaluate((data) => {
    localStorage.setItem('armor_data', JSON.stringify(data));
    localStorage.setItem('armor_revision', '1');
    localStorage.setItem('armor_migrated_from_shift6', 'true');
    localStorage.setItem('armor_tour_shown', '1');
  }, SEED);
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2500);
  await page.evaluate(() => Promise.all([...document.images].map(img => img.complete ? Promise.resolve() : new Promise(r => { img.onload = img.onerror = r; setTimeout(r, 5000); }))));
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/tmp/audit-desktop-dashboard.png', fullPage: true });
  console.log('1/5 desktop dashboard saved');

  // Active set
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const m = btns.find(b => /start/i.test(b.textContent) && !b.disabled);
    if (m) m.click();
  });
  await page.waitForTimeout(2500);
  await page.evaluate(() => Promise.all([...document.images].map(img => img.complete ? Promise.resolve() : new Promise(r => { img.onload = img.onerror = r; setTimeout(r, 5000); }))));
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/audit-desktop-active.png', fullPage: true });
  console.log('2/5 active set saved');

  // Rest
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const t = btns.find(b => /complete set/i.test(b.textContent));
    if (t) t.click();
  });
  await page.waitForTimeout(2500);
  await page.evaluate(() => Promise.all([...document.images].map(img => img.complete ? Promise.resolve() : new Promise(r => { img.onload = img.onerror = r; setTimeout(r, 5000); }))));
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/audit-desktop-rest.png', fullPage: true });
  console.log('3/5 rest saved');

  // End workout, navigate to settings tab
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const t = btns.find(b => /end workout/i.test(b.textContent));
    if (t) t.click();
  });
  await page.waitForTimeout(1500);
  // Click settings tab
  const settingsResult = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button, a, [role="tab"]')];
    const t = btns.find(b => /settings/i.test(b.textContent || b.getAttribute('aria-label') || ''));
    if (t) { t.click(); return 'clicked: ' + (t.textContent || t.getAttribute('aria-label')); }
    return 'not found';
  });
  console.log('Settings nav:', settingsResult);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/audit-desktop-settings.png', fullPage: true });
  console.log('4/5 settings saved');

  // Light theme
  await page.evaluate((data) => {
    data.preferences.theme = 'light';
    localStorage.setItem('armor_data', JSON.stringify(data));
  }, SEED);
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: '/tmp/audit-desktop-light.png', fullPage: true });
  console.log('5/5 light saved');

  console.log('\n=== Console errors:', consoleErrors.length);
  consoleErrors.forEach(e => console.log('  -', e.slice(0, 200)));
  console.log('=== Page errors:', pageErrors.length);
  pageErrors.forEach(e => console.log('  -', e.slice(0, 200)));
  console.log('=== Failed requests:', failedRequests.length);
  failedRequests.forEach(r => console.log('  -', r.slice(0, 200)));

  await browser.close();
})();