# Human-use acceptance and the /100 assessment

Updated: 2026-10-12. This is a proposed acceptance standard for the **mobile-only,
guest-first** release, not a claim that SHIFT6 is 100/100. There is no universally
best app for every person. A credible maximum score means that all agreed
criteria for the intended audience and release scope have supporting evidence.
The earlier assessment is historical; code changes alone cannot establish a new
human-use score.

## Scoring rules

Score each row only against its stated criteria. Award proportional credit for
criteria actually demonstrated and cite dated evidence. Mark unknown criteria
**unverified**, rather than interpreting missing observations as passing or
silently redistributing their weight. Report evidence coverage alongside a score.
A provisional engineering score and a human-use score must remain distinguishable.
Any unresolved critical safety, privacy, data-loss or accessibility failure blocks
launch regardless of the arithmetic. Review criteria before testing, not after
seeing results. A perfect scoped score is not clinical efficacy or universal
accessibility certification.

| Area | Weight | Evidence required for full credit | Current evidence / remaining work |
| --- | ---: | --- | --- |
| Useful first experience | 20 | Intended users independently complete setup, reach a first workout, understand the private-plan route and choose a meaningful measurable goal | Six-step setup and local goal flows implemented; observed task success missing; public catalogue remains blocked |
| Training and measurement integrity | 20 | Correct saved values, comparable measurements, correction history, honest missing baselines, review and next-choice comprehension | Repository regression coverage; physical end-to-end and user comprehension missing |
| Reliability and recovery | 15 | Offline, force-close, upgrade, large export and deletion survive physical-device fault tests without loss | 502 tests and both native builds; complete physical fault matrix missing |
| Accessibility and ergonomics | 15 | Critical journeys operable with VoiceOver/TalkBack, largest text, keyboard and one-handed use on the device matrix | Accessibility primitives and tests; observed native results missing |
| Privacy and user control | 10 | Exact candidate traffic/permission audit agrees with disclosures; users understand local-only storage, exports and deletion | Guest boundaries and policy draft; signed-candidate audit/declarations missing |
| Visuals and motion | 5 | Captured native flows are legible, consistent and unobstructed; optional motion, reduced motion and fallback work on devices | Higgsfield assets/provenance and simulator launch evidence; full native visual review missing |
| Fitness content and expectations | 5 | Enabled instructions/programs have qualified version-bound review; users understand no guaranteed outcome | Empty public manifest protects against unreviewed publication; reviewed useful starter journey missing |
| Sustained usefulness | 5 | Consented six-week pilot demonstrates understandable progress/review and manageable burden; limitations reported with denominators | No observed cohort evidence yet |
| Distribution and support | 5 | Signed iOS/Android candidates, accurate listing, working support/policy URLs, store acceptance and recovery/support rehearsal | Reviewable PR and test artifacts; signing/store/support launch work missing |
| **Total** | **100** | All scoped criteria evidenced; no critical blockers | **No verified overall score yet** |

## Moderated usability round

Recruit 8–12 consenting beginners and returning exercisers, including people
who use large text and screen readers. Include both platforms and existing
tracker users. These are qualitative sessions, not population success estimates.
Use the same frozen candidate; participants use invented records when possible.
No public issue should include health data, exports or identifying recordings.

Before each session, record participant pseudonym, relevant experience, device,
OS, build, accessibility settings and consent for any recording. Say: “We're
testing the app. Try this as you normally would; you can stop at any time.” Do not
teach controls before the task. Count facilitator hints as assistance.

1. “Set up the app without connecting health data. Get ready for your first
   workout.” Observe setup comprehension and private-plan friction.
2. “Choose something you want to improve and record a goal. If you don't know
   your starting point, continue without guessing.” Check units and baseline.
3. “Start training and record a set. Correct one mistake.” Check next action,
   target versus actual values and correction discoverability.
4. Interrupt with backgrounding and force-close while offline. “Continue where
   you left off.” Check preservation against recorded expected values.
5. “You need to stop early. Save what you did.” Check partial versus completed.
6. “You missed a week. Show what you would do next.” Check re-entry understanding;
   record missing controls as findings, not user error.
7. “Record a result and explain what changed. Choose what comes next without
   taking a final measurement.” Check review access and honest missing data.
8. “Keep a copy of your records, then remove them from this phone. Explain where
   another copy might still exist.” Check sharing, deletion and backup expectations.

For each task record independent / assisted / failed / declined, time, error,
confusing label, expectation, recovery and evidence reference. Ask for ease on a
1–7 scale and “What did you expect?” after the task. Do not substitute ratings
for observed success. Avoid physical exertion or fitness testing in UI sessions.

Proposed acceptance, agreed before observation: no critical data-loss, privacy,
safety or accessibility failure; every participant can reach and complete the
core journey without an unresolved blocker; at least 80% independently complete
each core task, reported as counts (for example, 8/10), with assistance and
failures visible. These are product decision thresholds, not research-backed
population guarantees. Fix recurring confusion and rerun affected tasks with
new participants. Small-study percentages cannot justify a universal 100/100.

## Six-week pilot

After qualified content review and device gates, run a separately consented
pilot. Let participants decline assessment or take a break without penalty. Report
eligible, started, first-session, week-two return, assessment offered, comparable
measurement, reviewed and next-choice counts with explicit denominators. Record
input burden, support requests, reasons for stopping and comprehension of results.
Do not turn attendance into measured fitness improvement, infer outcomes for
missing participants, or claim efficacy from a small uncontrolled pilot.
Agree retention/usefulness decision thresholds before enrollment; none are
validated here. Recruitment and participant contact require separate instructions.

## Evidence record template

Duplicate one record per check; leave result unverified until actually observed.

```text
Check/task:
Candidate source SHA and binary build/hash:
Platform, model, OS and settings:
Tester/participant pseudonym and date:
Expected outcome:
Observed outcome and independent/assisted/failed/declined status:
Evidence reference (private if identifying):
Result: unverified / pass / fail / not applicable (reason)
Severity and issue reference if failed:
Fix candidate and retest reference:
Reviewer and decision:
```

## Immediate work order

1. Use the existing Android test artifact; configure the owner's Expo/Apple
   distribution project for a physical iPhone build. Keep artifacts tied to SHA.
2. Execute [doc 13](13_NATIVE_RELEASE_VERIFICATION.md) on real devices and collect
   accepted captures. No full visual audit is claimed from the unusable local
   Android emulator captures or the single iOS launch screenshot.
3. Run the moderated tasks; fix observed core-flow failures before catalogue,
   wearable, cloud or AI expansion. Obtain qualified starter-content review.
4. Complete candidate network review, final guest-only store copy, policy/support
   URLs, signing and declarations. Submit only after reviewing the exact package.
5. Run the six-week pilot and reassess the table using observed evidence.

Research rationale: [NN/G mobile onboarding](https://www.nngroup.com/articles/mobile-app-onboarding/),
[progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/),
[health-app engagement review](https://www.jmir.org/2020/5/e17572), and
[behavior-change review](https://mhealth.jmir.org/2020/3/e17046) inform hypotheses,
not proof of SHIFT6 outcomes. Native accessibility needs direct device testing;
[WCAG 2.2](https://www.w3.org/TR/WCAG22/) provides relevant criteria. These existing
research references have not been independently refreshed in this checkpoint.
