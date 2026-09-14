# SHIFT6

SHIFT6 is a free-first mobile fitness platform for iOS and Android built around one core idea: **progress is easier to understand and sustain when training is organized into focused 6-week cycles.**

The app combines structured workout programming, hundreds of exercises, equipment-aware program building, health and recovery context, and a provider-agnostic AI personal-training coach that helps users plan, execute, review, and adapt their training.

## Product promise

**Train with a plan. Review every 6 weeks. Keep moving forward.**

SHIFT6 is intended to become a long-term fitness operating system rather than a single workout app. Users can:

- follow curated programs;
- choose from at least 20 launch programs;
- build their own programs and workouts;
- add, remove, reorder, substitute, or edit exercises;
- search hundreds of exercises by movement, muscle, equipment, goal, difficulty, or accessibility needs;
- track strength, conditioning, mobility, cardio, body metrics, consistency, and health signals;
- progress through 6-week training cycles;
- work with an AI PT coach that reviews performance and proposes safe, explainable changes;
- connect Apple Health / Health Connect where supported;
- train offline and sync later;
- keep core functionality free at launch on the App Store and Google Play.

## Current repository status

This repository was intentionally reset on 2026-09-13 to become the canonical SHIFT6 rebuild. The previous implementation is preserved on:

`archive/pre-shift6-rebuild-2026-09-13`

The default branch now contains planning only. Do not restore old application code into `main` without an explicit migration decision.

### Foundation implementation checkpoint

The first implementation branch is `feat/shift6-rebuild-foundation`. It introduces a clean Expo SDK 57 / React Native 0.86 / TypeScript application shell, Expo Router tabs, token-driven UI primitives, typed domain fixtures, versioned SQLite migrations for native builds, an idempotent workout-session/completed-set outbox and flush contract, persisted guest onboarding/profile setup, a versioned Barbell 30 six-week cycle start flow, local progress aggregation from completed workout records, a searchable 50-record draft exercise library with equipment-aware filtering, metadata for the planned 20-program library with explicit startability status, and a copy-on-write custom builder foundation.

The branch deliberately does not restore the archived web application. The archived implementation was inspected and rejected for direct reuse because it is a Vite/Capacitor app built around browser `localStorage`, a single mutable state payload, and fixed progression assumptions that conflict with the new program-version and program-specific Week 6 model.

The web target is a UI preview only: it uses a platform-specific no-persistence provider because the SDK 57 SQLite web worker requires a WASM asset that is not present in the resolved package. iOS and Android continue to use the real SQLite provider. Native simulator/device boot remains a separate verification gate because this workstation has no usable `simctl` runtime or connected Android device.

## Canonical planning docs

1. `docs/00_MASTER_PRODUCT_PLAN.md` — vision, scope, principles, launch definition
2. `docs/01_BRAND_AND_DESIGN_SYSTEM.md` — SHIFT6 identity and Figma-first design direction
3. `docs/02_SCREEN_BY_SCREEN_SPEC.md` — end-to-end mobile information architecture and screen requirements
4. `docs/03_SHIFT6_PROGRESSION_ENGINE.md` — six-week progression model and adaptation rules
5. `docs/04_AI_PT_COACH.md` — AI coach architecture, behaviour, guardrails, and prompt strategy
6. `docs/05_PROGRAMS_EXERCISES_EQUIPMENT.md` — program builder, 20 seed programs, exercise/equipment catalogue
7. `docs/06_TECHNICAL_ARCHITECTURE.md` — proposed mobile/backend/offline/integration architecture
8. `docs/07_ASSET_AND_ICON_PROMPTS.md` — prompts and production plan for custom imagery and icons
9. `docs/08_PRIVACY_ACCESSIBILITY_SAFETY.md` — health-data privacy, accessibility, safety, and AI boundaries
10. `docs/09_ROADMAP_AND_EPICS.md` — build phases, issue structure, acceptance gates
11. `docs/10_QA_RELEASE_ANALYTICS.md` — QA matrix, analytics, App Store/Play Store, release and rollback
12. `docs/11_MASTER_BUILD_PROMPT.md` — implementation handoff prompt for coding agents/harnesses

## Design reference

Primary visual direction supplied for this rebuild:

https://dribbble.com/shots/23040815-Fitness-App-Design-Concept

The goal is **not to clone the reference**. SHIFT6 should reinterpret its light premium aesthetic, large typography, soft lavender background, white surfaces, black pill navigation, playful pastel category cards, 3D object accents, generous spacing, and rounded geometry into a distinct brand and accessible product system.

## Initial product architecture recommendation

- React Native + Expo + TypeScript
- Expo Router
- token-driven component library built from Figma variables
- local-first workout logging with SQLite and an explicit sync/outbox layer
- PostgreSQL backend with strict row-level access control
- provider-agnostic AI gateway on the server
- Apple Health / HealthKit and Android Health Connect integration through native adapters
- GitHub Actions + EAS build/release pipeline

The architecture remains replaceable behind interfaces where possible. Product behaviour and data models are more important than any single vendor.

## Definition of success

A first public release is successful when a new user can install SHIFT6, onboard in a few minutes, choose or build a program, complete workouts offline, see progress across a six-week cycle, receive useful coach feedback, safely edit their plan, and understand exactly what to do next without encountering a paywall for core training functionality.
