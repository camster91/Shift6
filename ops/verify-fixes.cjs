// Verify the QA fixes on live:
// 1. Empty user starts a Leg Press workout — should see "Set your 1RM" nudge
// 2. Mid-cycle dashboard text-disabled contrast — should be readable
const { chromium } = require('/Users/biancabienaime/repos/Shift6/node_modules/playwright');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 1200 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  // Test 1: empty user, navigate to a non-primary workout
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

  // Probe: read computed style of --text-disabled color
  const colorInfo = await page.evaluate(() => {
    const styles = getComputedStyle(document.documentElement);
    return {
      textDisabled: styles.getPropertyValue('--text-disabled').trim(),
      bodyColor: styles.getPropertyValue('--text-primary').trim(),
    };
  });
  console.log('text-disabled:', JSON.stringify(colorInfo));

  // Click Start
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(b => /^start$/i.test(b.textContent.trim()));
    if (b) b.click();
  });
  await page.waitForTimeout(2500);

  // Check for the Set 1RM link
  const info = await page.evaluate(() => {
    const text = document.body.textContent;
    return {
      hasSet1RMLink: text.includes('Set your 1RM in Settings') || text.includes('Set 1RMs'),
      weightTileContent: [...document.querySelectorAll('*')].filter(el =>
        el.textContent.startsWith('0') && el.previousElementSibling?.textContent?.includes('Weight')
      ).map(el => el.textContent),
    };
  });
  console.log('active-set state:', JSON.stringify(info));
  await page.screenshot({ path: '/tmp/qa-fix-active.png', fullPage: false });

  await browser.close();
})();
