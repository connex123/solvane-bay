// The LOW TIDE story arc: three acts and eight chapters, what each chapter puts at stake and what it wins,
// plus the countdown to the Causeway Gala (a day goes by with each finished chapter).

export const STORY_TITLE = 'LOW TIDE';
export const GALA_DAYS = 7;
const CHAPTER_COUNT = 8;

export const ACTS = [
  { n: 1, title: 'BACK ON THE WATER', chapters: ['m1', 'm2', 'm3'] },
  { n: 2, title: 'LOW TIDE', chapters: ['m4', 'm5', 'm6'] },
  { n: 3, title: 'HIGH TIDE', chapters: ['m7', 'm8'] },
];

// stakes: why the chapter matters (Crew & Chapters screen). beat: the single line on the chapter-complete card.
// unlocks: reward lines. flips: [district, new holder] pairs. recruits: the crew member who joins, if any.
function chapter(act, { stakes, beat, unlocks, flips, recruits }) {
  const entry = { act, stakes, beat };
  if (recruits) entry.recruits = recruits;
  entry.unlocks = unlocks;
  entry.flips = flips;
  return entry;
}

export const ARC = {
  m1: chapter(1, {
    stakes: 'Nico needs cash, a car and one person in the Bay who still trusts him.',
    beat: 'Old Wren opens the Point Wren garage to Nico. The Low Tide crew has a mechanic.',
    recruits: 'wren',
    unlocks: ['WREN JOINS: PATCH UP (C)', "WREN'S GARAGE UPGRADES"],
    flips: [['hills', 'tide']],
  }),
  m2: chapter(1, {
    stakes: "Brandt's collectors are bleeding Old Town's shops dry before the Gala.",
    beat: "Old Town's envelopes went back to the shopkeepers, not to the Crown.",
    unlocks: ['SMG AT CALDER ARMS'],
    flips: [['old', 'tide']],
  }),
  m3: chapter(1, {
    stakes: "The Coral Kings are Brandt's muscle on the docks and in the Old Town market. They burned the diner's sign.",
    beat: 'The lagoon market is open again. The Coral Kings left a crate of bottles and a lot of petrol.',
    unlocks: ['MOLOTOV x3 (KEY 5)'],
    flips: [['docks', 'tide']],
  }),
  m4: chapter(2, {
    stakes: "Sol Ortega is boxed in by Brandt's enforcers on The Strand. Nobody else will stop for her.",
    beat: 'Sol is back behind the wheel, for Nico this time. The Strand runs on Low Tide time.',
    recruits: 'sol',
    unlocks: ['SOL JOINS: HOT SWAP (Z)'],
    flips: [['beach', 'tide']],
  }),
  m5: chapter(2, {
    stakes: 'Tamsin needs her transmitter on Crown Tower so TIDE FM 88.1 can reach the whole Bay.',
    beat: 'TIDE FM 88.1 is live from the roof of Crown Tower. Brandt hates the music.',
    recruits: 'tamsin',
    unlocks: ['TAMSIN JOINS: BLACKOUT (X)', 'TIDE FM 88.1'],
    flips: [['neon', 'tide']],
  }),
  m6: chapter(2, {
    stakes: 'Dex set up the meet at the marina. Dex has never once been late to a meet.',
    beat: 'Dex sold Nico to Brandt for a Gala invitation. Neon Row and Club Velvet go back to the Crown.',
    unlocks: ['4-STAR HEAT SURVIVED'],
    flips: [['neon', 'crown']],
  }),
  m7: chapter(3, {
    stakes: "Brandt's ledger lists every bribe, including Captain Reyne's. It sleeps on his yacht.",
    beat: 'The ledger made it by sea to Sol at the Point Wren light. Every name, every payment, Reyne on page one.',
    unlocks: ['THE LEDGER', 'VELOCE GT KEYS'],
    flips: [['marina', 'tide']],
  }),
  m8: chapter(3, {
    stakes: 'Tonight the Causeway opens. Read the ledger live on TIDE FM before Reyne shuts the bridge.',
    beat: 'The whole Bay heard the ledger. Brandt left in handcuffs; the Low Tide opens for breakfast.',
    unlocks: ['THE BAY IS FREE ROAM'],
    flips: [['downtown', 'tide'], ['neon', 'tide']],
  }),
};

/** The act a chapter id belongs to. */
export function actOf(id) {
  return ACTS.find((act) => act.chapters.includes(id));
}

export function daysToGala(done) {
  return Math.max(0, GALA_DAYS - done);
}

export function galaLabel(done) {
  if (done >= CHAPTER_COUNT) return 'GALA IS OVER';
  const days = daysToGala(done);
  if (days === 0) return 'GALA TONIGHT';
  return `GALA IN ${days} ${days > 1 ? 'DAYS' : 'DAY'}`;
}
