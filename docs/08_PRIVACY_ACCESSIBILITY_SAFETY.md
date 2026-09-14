# SHIFT6 — Privacy, Accessibility & Safety

## Privacy baseline

SHIFT6 handles potentially sensitive fitness and health information. Privacy is a product requirement, not legal copy added later.

### Principles
- collect only what a feature needs;
- health integrations are opt-in;
- no sale of health data;
- no health-data ad targeting;
- clear data export/delete;
- server access controlled by user identity and row-level authorization;
- AI receives minimum necessary context;
- secrets never embedded in app;
- raw health notes excluded from analytics;
- logs redact sensitive payloads.

## Data classes

### Account
Email/auth IDs, preferences.

### Training
Programs, workouts, exercises, set logs, notes, PRs.

### Health-connected
Steps, sleep summaries, heart-rate summaries, body metrics where permission exists.

### Sensitive free text
Pain/discomfort notes, coach messages, private workout notes. Treat with highest care.

## Health permissions

Ask contextually. Never request every permission during onboarding without explanation.

Example:
“You can connect steps so SHIFT6 can show your weekly movement next to training. This is optional and does not affect workout logging.”

The initial native connector configuration follows least privilege: HealthKit is read-only with no
background-delivery entitlement, and Android Health Connect declares only the read permissions for
the six supported summary types. The app imports only after an explicit user action, stores
normalized summaries in the user-scoped local database, and does not place health payloads in the
workout sync outbox. Device-level permission/revocation behavior and platform health-data
declarations remain release gates.

## AI privacy

- disclose that coach responses may be processed by an AI model provider;
- send minimal fields;
- no provider training on user data unless contracts/settings explicitly guarantee appropriate handling and user policy permits;
- support deletion of coach conversation history;
- maintain provider abstraction.

## Safety

SHIFT6 is general fitness/wellness software.

The app should encourage users to seek qualified medical advice when appropriate and emergency care for urgent warning signs. Do not present the AI coach as a clinician.

Pain/discomfort workflow:
1. user flags discomfort;
2. stop normal auto-progression for affected exercise;
3. coach may suggest stopping, reducing non-provocative training, or choosing a different movement only within safe general guidance;
4. persistent/severe/concerning symptoms prompt professional evaluation language;
5. no diagnosis.

## Accessibility

Target WCAG 2.2 AA principles adapted to native mobile.

### Required
- VoiceOver/TalkBack labels and logical focus order;
- dynamic type / font scaling;
- 44–48 px minimum targets;
- high contrast;
- no colour-only meaning;
- chart summaries;
- reduced-motion support;
- captions/written alternatives for exercise media;
- haptic/audio cues optional;
- accessible timers;
- forms with persistent labels;
- validation not dependent on colour;
- landscape/tablet support where practical;
- screen reader usable active workout.

## Inclusive design

- metric and imperial;
- gender-neutral defaults;
- avoid assumptions about body composition goals;
- exercise images represent varied adults;
- advanced goals are opt-in rather than presumed;
- no guilt for missed workouts;
- no holiday/patriotic engagement mechanics required.

## Security

- secure credential storage;
- short-lived access tokens;
- refresh-token protection;
- database RLS policies tested;
- signed media access for private content;
- rate limiting;
- AI abuse limits;
- dependency scanning;
- secret scanning;
- regular mobile dependency updates;
- account deletion verification;
- audit admin access.

## Regulatory posture

Do not market SHIFT6 as diagnosing, treating, curing, mitigating, or preventing disease without a separate regulatory strategy. Keep wellness features clearly within intended scope.
