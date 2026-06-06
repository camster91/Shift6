# Tester Team — Index

**Generated:** 2026-06-06
**Personas:** 8
**Rounds:** 3
**Total scripts:** 24

## Personas

| # | Name | Slug | Script directory |
|---|------|------|------------------|
| 1 | Home Hero Hannah | hannah | `~/Shift6/docs/tester-scripts/tester-1-hannah-*.md` |
| 2 | Gym Bro Gary | gary | `~/Shift6/docs/tester-scripts/tester-2-gary-*.md` |
| 3 | Hybrid Heather | heather | `~/Shift6/docs/tester-scripts/tester-3-heather-*.md` |
| 4 | Busy Parent Pat | pat | `~/Shift6/docs/tester-scripts/tester-4-pat-*.md` |
| 5 | Senior Steve | steve | `~/Shift6/docs/tester-scripts/tester-5-steve-*.md` |
| 6 | Athlete Alex | alex | `~/Shift6/docs/tester-scripts/tester-6-alex-*.md` |
| 7 | Returning Rita | rita | `~/Shift6/docs/tester-scripts/tester-7-rita-*.md` |
| 8 | First-Timer Finn | finn | `~/Shift6/docs/tester-scripts/tester-8-finn-*.md` |

## Rounds

| Round | Theme | Time/persona | Output |
|-------|-------|--------------|--------|
| 1 | Happy path (onboarding → workout → progress) | 30 min | `tester-<n>-<slug>-round1.md` |
| 2 | Edge cases (sign up, set 1RMs, switch tracks, toggle modifiers, background) | 30 min | `tester-<n>-<slug>-round2.md` |
| 3 | Competitor comparison (Strong, Hevy, Future, Apple Fitness+) | 30-60 min | `tester-<n>-<slug>-round3.md` |

## Execution

Run rounds in sequence. Within a round, all 8 personas run in parallel.

```bash
# Day 2 — Round 1 (8 parallel background processes)
for n in 1 2 3 4 5 6 7 8; do
  cat ~/Shift6/docs/tester-scripts/tester-$n-*-round1.md \
    | claude-code --acp --stdio --system-prompt - &
done

# Day 3 — Round 2 (same pattern)
# Day 4 — Round 3 (same pattern)
# Day 5 — orchestrator consolidates
```

## Output structure

Each report follows this shape:

```
# <Persona> — Round <N>

## What worked
## What was confusing
## What broke
## What felt off
## Top 3 issues (ranked by severity)
## Persona-specific notes
## Verdict
```

## Consolidation

The orchestrator reads all 24 reports and writes `tester-findings-<date>.md` with P0/P1/P2/P3 ranking, deduped, grouped by component.
