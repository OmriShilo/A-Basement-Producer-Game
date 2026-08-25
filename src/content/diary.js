/**
 * diary.js — pure content.
 *
 * One line is written at the end of every turn. Lines accumulate into the
 * run's story and three of them end up on the career card. Cards carry their
 * own lines (see cards.js); this file covers focus, condition, and ending.
 *
 * Tokens: {age} {name}
 * Every line is written to be finished by the reader, not by the game.
 */

const YOUNG = 'young'; // 14–22
const PEAK = 'peak'; //  22–34
const LATE = 'late'; //  34–50

export function bandOf(age) {
  if (age < 22) return YOUNG;
  if (age < 34) return PEAK;
  return LATE;
}

/* ------------------------------------------------------------------ */
/* FOCUS LINES — the default texture of a turn                         */
/* ------------------------------------------------------------------ */

export const QUIET_LINES = {
  ROOM: {
    young: [
      'you learned what a compressor actually does. It took the whole summer.',
      "you told your mother you weren't going to apply anywhere.",
      'you rebuilt the same eight bars four hundred times and only the last one survived.',
      'the laptop fan gave out in July. You worked with a bag of frozen peas under it.',
      'you stopped playing the beats for anyone. They got better immediately.',
      "somebody's older brother said your drums were flat. He was right, and it took a week to fix.",
      'you started hearing the room in other people’s records and could not stop.',
      'you missed the thing everyone went to and heard about it Monday, secondhand.',
    ],
    peak: [
      'you got the low end right for the first time and nobody noticed but you.',
      'you spent nine months on a record that came out to no one.',
      'you stopped taking work you did not like. The calendar got quiet and the music got better.',
      "you learned to say “that’s the take” and mean it.",
      'you threw out an album’s worth of material in one afternoon and slept fine.',
      'you finally bought the room instead of another plugin.',
      'you started writing at the piano again, badly, on purpose.',
      'you did the thing where you solo the vocal at 4 AM and decide the whole record is wrong.',
    ],
    late: [
      'you were faster than you had ever been, and fewer people were asking.',
      'you spent two years on twelve minutes of music.',
      'you finally made the thing you had been circling since you were nineteen.',
      'you taught yourself an instrument out of order, at forty-one, for no particular reason.',
      'the mixes were the best of your life. The rooms were smaller.',
      'you stopped chasing the sound and let it come to the house.',
    ],
  },
  CIRCUIT: {
    young: [
      'you sent two hundred emails and got three replies. Two were polite.',
      'you drove four hours to hand somebody a USB stick in a parking lot.',
      'you posted every day for a year. One of them did something.',
      'you learned every name at the studio on 8th and stopped paying for time.',
      'you got into a room by walking in like you had been invited.',
      "you became useful to people. That's the whole trick and nobody tells you.",
    ],
    peak: [
      'you became the person people text at 2 AM.',
      'you went to everything. You cannot remember most of it.',
      'you got a reputation for showing up, which is worth more than it sounds.',
      'you spent the year being introduced as “the guy who did that record.”',
      'the DMs turned into calls and the calls turned into sessions.',
      'you learned which rooms mattered and stopped going to the others.',
    ],
    late: [
      'you were the oldest person in the room and worked twice as hard to be in it.',
      'you posted a clip of an old session and it outperformed everything new.',
      'you said “when I was coming up” out loud and heard yourself say it.',
      'you got the meeting. The meeting was with someone twenty-four years old.',
      'you kept a list of everyone who stopped calling and never did anything with it.',
    ],
  },
  LONGSHOT: {
    young: [
      'you turned down three things waiting on one that never called.',
      'you spent the year making a single beat for a single person who did not know you existed.',
      'you refused everything small and sat by the phone like an idiot, and were right about half of it.',
      'you picked one door and knocked on it until your hand hurt.',
      'you told everyone you were busy. You were not busy.',
    ],
    peak: [
      'you cleared the calendar for something that was not confirmed and never became confirmed.',
      'you bet the year on one room and walked in like you belonged there.',
      'you said no to the sure thing. Twice.',
      'you spent eleven months waiting on a yes and got it in the twelfth.',
      'you stopped taking meetings that were not the meeting.',
    ],
    late: [
      'you were too old to be gambling and did it anyway.',
      'you held out for the one that mattered and the phone did not ring once.',
      'you chased the record you had wanted since you were nineteen and very nearly got it.',
      'everyone told you to take the work. You did not take the work.',
    ],
  },
};

/* ------------------------------------------------------------------ */
/* CONDITION LINES — these outrank focus lines when they fire          */
/* ------------------------------------------------------------------ */

export const CONDITION_LINES = {
  promoted: [
    'people started saying your name like it meant something specific.',
    'a stranger knew what you did before you said it.',
    'the emails started coming from people who did not have to send them.',
    'you got a table without asking for one.',
  ],
  demoted: [
    'the calls slowed. Nobody announced anything.',
    'you found out you were no longer on the list by getting to the door.',
    'somebody described your sound in the past tense in front of you.',
    'the room was the same room. You were in a different part of it.',
  ],
  firstPlacement: [
    'you heard it in a car that was not yours.',
    'somebody played it back to you not knowing you made it.',
    'your name was in the credits, spelled wrong.',
  ],
};

/* ------------------------------------------------------------------ */
/* ENDING LINES — written when the run stops                           */
/* ------------------------------------------------------------------ */

export const RETIREMENT_LINES = {
  voluntary: {
    young: 'you stopped at {age}. Nobody asked why, because nobody was watching.',
    peak: 'you stopped at {age}, on purpose, while the phone still rang.',
    late: 'you stopped at {age}. You told two people and neither was surprised.',
  },
  forced: 'you turned 50. The decision had made itself some years earlier.',
};

/* ------------------------------------------------------------------ */

export function pick(list, rand) {
  return list[Math.floor(rand() * list.length)];
}

export function fill(line, vars) {
  return line.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
}

const QUIET_KEYS = Object.keys(QUIET_LINES);

/**
 * Choose the diary line for a year.
 * `weight` decides what makes the career card: the year's card outranks a
 * condition line, which outranks the filler used for an empty year.
 */
export function writeDiaryLine(ctx, rand) {
  const { age, cardLine, condition } = ctx;
  if (cardLine) return { text: cardLine, weight: 5 };
  if (condition && CONDITION_LINES[condition]) {
    return { text: pick(CONDITION_LINES[condition], rand), weight: 3 };
  }
  const band = bandOf(age);
  const key = QUIET_KEYS[Math.floor(rand() * QUIET_KEYS.length)];
  return { text: pick(QUIET_LINES[key][band], rand), weight: 1 };
}
