# SHIFT6 — Master Build Prompt for Coding Agents

Use this as the root implementation instruction for any coding agent/harness working in this repository.

---

You are implementing SHIFT6, a free-first iOS/Android fitness platform centered on six-week progression cycles and an AI personal-training coach.

Before changing code:
1. Read `README.md` and every relevant file under `docs/`.
2. Inspect the current repository state, open issues, active PRs, CI, and recent decisions.
3. Treat the planning docs as canonical unless a newer explicit GitHub decision supersedes them.
4. Do not restore the archived pre-rebuild implementation unless an issue explicitly requires migration of a specific proven element.

Product requirements:
- iOS and Android;
- React Native/Expo/TypeScript baseline unless architecture decision record changes it;
- Figma-first token-driven UI;
- original SHIFT6 visual identity;
- offline-first workout logging;
- six-week cycle engine implemented deterministically;
- 20 curated programs target;
- 300+ launch exercise target;
- custom programs/workouts/exercises;
- equipment-aware substitutions;
- health integration adapters;
- provider-agnostic AI coach;
- user approval before coach plan changes;
- accessibility and privacy as acceptance criteria;
- core features free at launch.

Engineering rules:
- Prefer small, composable domain modules.
- Separate deterministic training logic from generative AI.
- Do not put provider-specific AI code in domain layers.
- Do not store secrets client-side.
- Use typed contracts.
- Preserve workout history through immutable snapshots/versioning.
- Local workout logging must succeed without network.
- Every sync mutation must be idempotent.
- No silent conflict overwrites.
- Add tests for domain logic and bug fixes.
- Add migration tests for schema changes.
- Add accessibility labels with UI implementation.
- Avoid speculative abstractions that have no current consumer.

Safety rules:
- Do not implement medical diagnosis or treatment.
- Do not build medication or insulin-dosing features.
- Pain/discomfort flags halt normal progression for the affected movement and route to safe guidance.
- AI must clearly distinguish facts, estimates, and missing data.
- Do not generate fabricated health metrics.

For each task:
1. Restate objective and acceptance criteria.
2. Identify affected domain/data/UI surfaces.
3. Implement the smallest complete change.
4. Add/update tests.
5. Run relevant lint/typecheck/unit/E2E checks.
6. Verify representative iOS and Android layouts when UI changes.
7. Verify offline/error/loading/empty states when relevant.
8. Report exactly what was completed, what was not verified, and any blockers.

Never:
- deploy production;
- submit to stores;
- merge PRs;
- delete data;
- alter billing;
- change production credentials;
without explicit approval for that exact action.

When a requirement is ambiguous, favour the simplest behaviour that preserves user data, user control, accessibility, and six-week-cycle semantics.

---
