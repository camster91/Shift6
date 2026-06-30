const { chromium } = require('/Users/biancabienaime/repos/Shift6/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto('https://getshift6.com/');
  await page.evaluate(() => {
    const data = {
      userProfile: { displayName: 'Cam', estimated1RMs: { dumbbell_press: 60, pushups: 0, lateral_raise: 25, tricep_dips: 1 }, onboardedAt: '2026-06-01' },
      preferences: { unit: 'lbs', theme: 'dark', equipmentTrack: 'home_gym' },
      currentCycle: { week: 2, day: 3, totalCyclesCompleted: 0, completedDaysThisWeek: [] },
      activeModifiers: { mvdMode: false, travelMode: false, timeCrunch: false, highFatigue: false },
      dailyHabitState: {}, workoutHistory: [],
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
  await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(b=>/start/i.test(b.textContent)&&!b.disabled); if(b)b.click(); });
  await page.waitForTimeout(2500);
  await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(b=>/complete set/i.test(b.textContent)); if(b)b.click(); });
  await page.waitForTimeout(2500);

  const dump = await page.evaluate(() => {
    const upNext = [...document.querySelectorAll('p')].find(p => /up next/i.test(p.textContent));
    if (!upNext) return { error: 'no up next' };
    const section = upNext.parentElement;
    const flexRow = section.querySelector('.flex.items-center');
    if (!flexRow) return { error: 'no flex row' };
    const result = {
      sectionWidth: section.getBoundingClientRect().width,
      flexRowHTML: flexRow.outerHTML.slice(0, 600),
      children: [...flexRow.children].map(c => ({
        tag: c.tagName,
        cls: c.className.slice(0, 80),
        text: c.textContent.slice(0, 50),
        w: c.getBoundingClientRect().width,
        r: c.getBoundingClientRect().right,
      })),
    };
    return result;
  });
  console.log(JSON.stringify(dump, null, 2));
  await page.screenshot({ path: '/tmp/rest-fixed.png', fullPage: false });
  await browser.close();
})();