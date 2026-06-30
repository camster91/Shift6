// Mobile audit walk — capture screenshots of every screen at 390x844 (iPhone 13/14)
const { chromium } = require('/Users/biancabienaime/repos/Shift6/node_modules/playwright');
const fs = require('fs');

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
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
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

  // 1. Dashboard (today's workout)
  await page.goto('https://getshift6.com/');
  await page.evaluate((data) => {
    localStorage.setItem('armor_data', JSON.stringify(data));
    localStorage.setItem('armor_revision', '1');
    localStorage.setItem('armor_migrated_from_shift6', 'true');
    localStorage.setItem('armor_first_run_done', 'true');
  }, SEED);
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2500);
  await page.evaluate(() => Promise.all([...document.images].map(img => img.complete ? Promise.resolve() : new Promise(r => { img.onload = img.onerror = r; setTimeout(r, 5000); }))));
  await page.waitForTimeout(800);
  // Dismiss the first-run tour if visible
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const closeBtn = btns.find(b => /^×$|^✕$/.test(b.textContent.trim()) || (b.getAttribute('aria-label') || '').toLowerCase().includes('close'));
    if (closeBtn) closeBtn.click();
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/tmp/audit-mobile-dashboard.png', fullPage: true });
  console.log('1/6 dashboard saved');

  // 2. Dashboard — home_gym, Day 3 (bench day)
  await page.evaluate((data) => {
    data.preferences.equipmentTrack = 'home_gym';
    data.currentCycle.day = 3;
    localStorage.setItem('armor_data', JSON.stringify(data));
  }, SEED);
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const closeBtn = btns.find(b => /^×$|^✕$/.test(b.textContent.trim()) || (b.getAttribute('aria-label') || '').toLowerCase().includes('close'));
    if (closeBtn) closeBtn.click();
  });
  await page.waitForTimeout(800);
  await page.evaluate(() => Promise.all([...document.images].map(img => img.complete ? Promise.resolve() : new Promise(r => { img.onload = img.onerror = r; setTimeout(r, 5000); }))));
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/audit-mobile-dashboard-home.png', fullPage: true });
  console.log('2/6 home_gym dashboard saved');

  // 3. Active workout — click Start
  const startBtn = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const m = btns.find(b => /start/i.test(b.textContent) && !b.disabled);
    if (m) { m.click(); return 'clicked'; }
    return 'not found';
  });
  console.log('Start click:', startBtn);
  await page.waitForTimeout(2500);
  await page.evaluate(() => Promise.all([...document.images].map(img => img.complete ? Promise.resolve() : new Promise(r => { img.onload = img.onerror = r; setTimeout(r, 5000); }))));
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/audit-mobile-active-set.png', fullPage: true });
  console.log('3/6 active set saved');

  // 4. Rest screen — complete set
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const t = btns.find(b => /complete set/i.test(b.textContent));
    if (t) t.click();
  });
  await page.waitForTimeout(2500);
  await page.evaluate(() => Promise.all([...document.images].map(img => img.complete ? Promise.resolve() : new Promise(r => { img.onload = img.onerror = r; setTimeout(r, 5000); }))));
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/audit-mobile-rest.png', fullPage: true });
  console.log('4/6 rest saved');

  // 5. Settings — navigate to settings tab
  // First go back from workout
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const t = btns.find(b => /end workout/i.test(b.textContent));
    if (t) t.click();
  });
  await page.waitForTimeout(1500);
  // Tap settings tab in bottom nav
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button, [role="tab"], a')];
    const t = btns.find(b => /settings/i.test(b.textContent || b.getAttribute('aria-label') || ''));
    if (t) t.click();
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/audit-mobile-settings.png', fullPage: true });
  console.log('5/6 settings saved');

  // 6. Light theme
  await page.evaluate((data) => {
    data.preferences.theme = 'light';
    localStorage.setItem('armor_data', JSON.stringify(data));
  }, SEED);
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const closeBtn = btns.find(b => /^×$|^✕$/.test(b.textContent.trim()) || (b.getAttribute('aria-label') || '').toLowerCase().includes('close'));
    if (closeBtn) closeBtn.click();
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/tmp/audit-mobile-light.png', fullPage: true });
  console.log('6/6 light saved');

  console.log('\n=== Console errors:', consoleErrors.length);
  consoleErrors.forEach(e => console.log('  -', e.slice(0, 200)));
  console.log('=== Page errors:', pageErrors.length);
  pageErrors.forEach(e => console.log('  -', e.slice(0, 200)));
  console.log('=== Failed requests:', failedRequests.length);
  failedRequests.forEach(r => console.log('  -', r.slice(0, 200)));

  await browser.close();
})();