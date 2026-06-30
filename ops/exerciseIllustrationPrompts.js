/**
 * exerciseIllustrationPrompts.js — text-to-image prompts for the 6
 * Armor primary lifts.
 *
 * No reference images — these are pure T2I prompts. Output is owned
 * outright under MiniMax's commercial-use terms. Style is anchored
 * at the suffix level so the 6 images read as a consistent set.
 *
 * Anatomy / pose language is intentionally detailed. The model is
 * good at technical illustration but bad at "show me a back squat"
 * — vague prompts yield vague output.
 */
export const STYLE_SUFFIX = `
Style: modern fitness app illustration, instructional and clean.
Flat color with subtle gradient shading, defined linework on
limbs and equipment. Athlete wearing neutral athletic clothing
(dark shorts, plain light-gray shirt, bare feet or simple
training shoes). Single athlete, centered, side or 3/4 view,
full body visible from head to feet. Neutral light-gray
background (#f1f5f9).
Strictly no text, no logos, no watermarks, no brand names, no
signs, no labels, no badges, no photo borders, no frames, no
composite scene elements. The image must show ONLY the
athlete on a plain background — nothing else.
`;

export const EXERCISE_PROMPTS = {
  barbell_squat: `
A clean technical illustration of an athlete viewed from
behind, performing a deep bodyweight-style exercise with a
barbell across the upper back. The athlete is in a deep
squat: thighs parallel to the floor or below, hip crease
below the top of the knee cap, knees bent past 90 degrees
and pushed out. Torso leans slightly forward, spine neutral,
chest up. The barbell is racked across the trapezius muscles
of the upper back, behind the neck — clearly visible from
this rear angle as a horizontal bar across the upper back.
The athlete's elbows point DOWN toward the floor, hands
gripping the bar with a full overhand grip. Feet flat on
the floor, planted just past shoulder-width apart. Back of
head and upper back are the most visible parts of the figure.
` + STYLE_SUFFIX,

  bench_press: `
A clean technical illustration of a barbell bench press, frozen
at the bottom of the lift with the bar touching the chest.
Athlete is lying flat on a horizontal bench — head, upper back,
and hips all in contact with the bench. Feet are planted on the
floor with knees bent. Hands are gripping the barbell just
wider than shoulders, full grip with thumbs wrapped. Elbows are
tucked at or just below bench level, forearms vertical, wrists
stacked over elbows. Lower back has a slight natural arch.
Head is resting on the bench, gaze up toward the bar. Barbell
loaded with plates visible on each end of the bar.
` + STYLE_SUFFIX,

  deadlift: `
A clean technical illustration of a conventional barbell
deadlift, frozen in the starting position with the bar on the
floor, just before the athlete begins to pull. The athlete
is in a hinge position: hips are above knee level, knees are
bent to about 135 degrees, shins are vertical and close to the
bar, back is flat and tight, shoulders are slightly in front of
the bar, arms are straight down with hands gripping the bar
just outside the knees with a double-overhand or mixed grip.
Chest is up, head aligned with the spine, gaze at a point on
the floor a few feet ahead. Bar loaded with plates visible on
each side. Ground is a simple flat platform, no texture.
` + STYLE_SUFFIX,

  goblet_squat: `
A clean technical illustration of a dumbbell goblet squat,
frozen at the bottom of the rep with hips fully descended.
Athlete's body is in a deep squat: thighs are parallel to the
floor or below, hip crease at or below the top of the knee cap,
knees bent past 90 degrees and pushed out. The athlete holds a
single dumbbell vertically at chest height, both hands cupping
the top plate of the dumbbell, elbows tucked close to the torso
pointing down between the knees. Torso leans slightly forward,
spine stays neutral, chest stays up. Feet are planted
shoulder-width apart. Head aligned with the spine, gaze forward.
No bench, no rack, open floor.
` + STYLE_SUFFIX,

  dumbbell_press: `
A clean technical illustration of a flat dumbbell bench press,
frozen at the bottom of the lift with the dumbbells at chest
level. Athlete is lying flat on a horizontal bench — head,
upper back, and hips all in contact with the bench. Feet are
planted on the floor with knees bent. Holding a dumbbell in
each hand at chest level, arms bent at 90 degrees with elbows
at or just below bench height, forearms vertical. Wrists are
neutral, palms facing forward. Head is resting on the bench,
gaze up. No rack frame.
` + STYLE_SUFFIX,

  romanian_deadlift: `
A clean technical illustration of a dumbbell Romanian
deadlift, frozen at the bottom of the descent with the
dumbbells at mid-shin level. Athlete is in a deep hip-hinge
position: hips are pushed back, knees are nearly straight but
not locked with a soft bend, back is flat and neutral, spine
stays long. Two dumbbells hang in front of the legs from the
athlete's hands with an overhand grip, palms facing the body.
Shoulders are pulled back, head aligned with the spine, gaze
forward. No bench, open floor.
` + STYLE_SUFFIX,
};

/**
 * Friendly display label per exercise, used in the QA preview grid
 * and any debug logs. Matches the text shown in the app's exercise
 * picker.
 */
export const EXERCISE_LABELS = {
  barbell_squat: 'Barbell Back Squat',
  bench_press: 'Barbell Bench Press',
  deadlift: 'Conventional Deadlift',
  goblet_squat: 'Dumbbell Goblet Squat',
  dumbbell_press: 'Dumbbell Bench Press',
  romanian_deadlift: 'Romanian Deadlift (DB)',
};