// Complete a real workout and trigger the summary
const { chromium } = require('/Users/biancabienaime/repos/Shift6/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('https://getshift6.com/');
  await page.evaluate(() => {
    const data = {
      userProfile: { displayName: 'Cam', estimated1RMs: { barbell_squat: 245, bench_press: 185, deadlift: 315, goblet_squat: 50, dumbbell_press: 60, romanian_deadlift: 95, leg_press: 400, leg_curls: 95, calf_raises: 200 }, onboardedAt: '2026-06-01' },
      preferences: { unit: 'lbs', theme: 'dark', equipmentTrack: 'full_gym' },
      currentCycle: { week: 1, day: 1, totalCyclesCompleted: 0, completedDaysThisWeek: [] },
      activeModifiers: { mvdMode: false, travelMode: false, timeCrunch: false, highFatigue: false },
      dailyHabitState: {},
      workoutHistory: [],
      streakData: { currentStreak: 0, longestStreak: 0, mvdDates: [], freezesAvailable: 1, lastActiveDate: null },
    };
    localStorage.setItem('armor_data', JSON.stringify(data));
    localStorage.setItem('armor_revision', '1');
    localStorage.setItem('armor_migrated_from_shift6', 'true');
    localStorage.setItem('armor_tour_shown', '1');
  });
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2500);
  await page.evaluate(() => Promise.all([...document.images].map(img => img.complete ? Promise.resolve() : new Promise(r => { img.onload = img.onerror = r; setTimeout(r, 5000); }))));
  await page.waitForTimeout(800);

  // Start workout
  await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(b=>/start/i.test(b.textContent)&&!b.disabled); if(b)b.click(); });
  await page.waitForTimeout(2500);

  // For set 1, click the Complete Set 1 button — the active set flow requires
  // entering weight first. The button is "Complete Set N" — only enabled
  // when weight is set. We can set weight via the input.
  await page.evaluate(() => {
    const input = document.querySelector('input[placeholder*="RPE"], input[placeholder*="form"]');
    if (input) input.focus();
  });

  // Easier approach: just hit "End Workout" without doing sets
  // (already verified above that "Workout Ended Early" works)
  // For "First Workout" test, we need at least one completed set.
  // Easiest path: programmatically set the weight input to 180, then click Complete Set.
  await page.evaluate(() => {
    // Find the weight/RPE input
    const inputs = [...document.querySelectorAll('input')];
    const wInput = inputs.find(i => /weight|reps|rpe|note/i.test(i.placeholder || ''));
    if (wInput) {
      // Set native value and dispatch input event so React picks it up
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(wInput, '8');
      wInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await page.waitForTimeout(800);

  // Now click Complete Set 1
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(b => /complete set/i.test(b.textContent) && !b.disabled);
    if (b) b.click();
  });
  await page.waitForTimeout(2000);
  // Now on rest screen. Click Skip Rest to advance.
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(b => /skip rest/i.test(b.textContent));
    if (b) b.click();
  });
  await page.waitForTimeout(2000);
  // On next active set. Click End Workout to finalize.
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(b => /end workout/i.test(b.textContent));
    if (b) b.click();
  });
  await page.waitForTimeout(1500);
  // Click confirm End Workout
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const confirm = btns.find(b => b.textContent.trim() === 'End Workout' && b.className.includes('bg-'));
    if (confirm) confirm.click();
  });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: '/tmp/audit-summary-full.png', fullPage: false });

  const info = await page.evaluate(() => {
    const modal = document.querySelector('[data-testid="workout-summary-modal"]');
    return {
      hasModal: !!modal,
      text: modal ? modal.innerText.slice(0, 600) : 'no modal',
    };
  });
  console.log('FULL MODAL:', JSON.stringify(info, null, 2));
  await browser.close();
})();