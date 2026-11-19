// The eight chapters of SOLVANE BAY: LOW TIDE as data: givers, dialogue, objective stages, rewards.
// A stage may carry `stars` to put the SBPD on Nico when it starts (on top of the escape stage type).
import { lineCoord, HALF } from '../core/config.js';
import { MARINA_GATE, GANGWAY, YACHT, GUARD_SPOTS, SAFE, DROP } from '../world/marina.js';
import { boardSpeedboat, boatEscape } from './ledgerHeist.js';
import { roadblockStage, RAMP_FOOT } from './causewayRoadblock.js';
const P = (i, j, dx = 0, dz = 0) => ({ x: lineCoord(i) + dx, z: lineCoord(j) + dz });
export const corner = (i, j, sx = 1, sz = 1) => P(i, j, sx * 9, sz * 9);
export const HOME = corner(2, 6, 1, 1);
// Chapter 3's fight: the road along the south side of the Old Town lagoon market, and where the Coral Kings stand on it
export const MARKET_ROAD = P(0, 8, 32, 0), KINGS_SPOTS = [P(0, 8, 36, -5), P(0, 8, 39.5, -2.2), P(0, 8, 42, -4.4), P(0, 8, 38, -0.5)];
const WREN = P(2, 3), MARINA = P(7, 1, 32, 32), TOWER = P(4, 4, 32, 32);
export const MISSIONS = [
  { id: 'm1', chapter: 1, title: 'FRESH OFF THE FERRY', giver: 'dex', start: corner(2, 6, 1, -1), reward: { money: 800, xp: 150 },
    intro: [{ who: 'dex', text: 'Nico Varela, off the night ferry. Five years and you still walk like you owe somebody money.' }, { who: 'nico', text: "Where's my mother, Dex? The Low Tide has Crown paper on the windows." }, { who: 'dex', text: 'Brandt "bought" it. She is fine, she is angry. You need wheels and friends. Old Wren has neither. Fix that.' }, { who: 'dex', text: 'Red Marlin by the taco stand. Take it to Wren at Point Wren. Not a scratch.' }],
    stages: [{ type: 'steal', key: 'marlin', tint: 0xe83a5c, at: { ...P(3, 7, 5.4, -22), h: 0 }, text: 'Steal the red Marlin by the taco stand' }, { type: 'goto', at: WREN, r: 7, car: 'mission', time: 170, text: "Deliver the Marlin to Old Wren's garage" }],
    outro: [{ who: 'wren', text: 'Your mother fed me for twenty years on credit. Garage is yours, kid.' }, { who: 'wren', text: 'Bring me a dented car and I will hand it back straight. Just say the word.' }] },
  { id: 'm2', chapter: 2, title: 'COLLECTION DAY', giver: 'dex', start: corner(2, 6, 1, -1), reward: { money: 1200, xp: 220 },
    intro: [{ who: 'dex', text: "Brandt's collectors left envelopes with every shop on the old waterfront. Rent for the Gala, he calls it." }, { who: 'nico', text: 'So we take the envelopes first.' }, { who: 'dex', text: 'And give them back. Shopkeepers remember who smiled at them. That is how a crew starts.' }],
    stages: [{ type: 'collect', pts: [corner(3, 6, 1, 1), corner(4, 8, -1, -1), corner(1, 7, 1, -1), corner(3, 3, 1, 1)], text: 'Collect the four Crown envelopes' }, { type: 'goto', at: corner(2, 6, 1, -1), r: 6, time: 120, text: 'Bring them to Dex at Club Velvet' }],
    outro: [{ who: 'dex', text: 'Four shops, four friends. The Crown will notice. Good. Let them sweat.' }, { who: 'brandt', text: 'Varela. Your mother signed. Go back to the ferry while it still runs.' }] },
  { id: 'm3', chapter: 3, title: "CORAL KINGS DON'T SHARE", giver: 'wren', start: corner(2, 3, 1, 1), reward: { money: 1800, xp: 300 },
    intro: [{ who: 'wren', text: 'The Coral Kings burned the Low Tide sign last night. Today they are squeezing the Old Town lagoon market for Brandt.' }, { who: 'nico', text: 'How many?' }, { who: 'wren', text: 'Four on the market road. Every stall cooks on bottled gas, so mind where you aim. Or do not.' }],
    stages: [{ type: 'goto', at: MARKET_ROAD, r: 34, text: 'Go to the Old Town lagoon market' }, { type: 'kill', at: MARKET_ROAD, spots: KINGS_SPOTS, count: 4, gang: 'coral', text: 'Run the Coral Kings out of the lagoon market' }],
    outro: [{ who: 'wren', text: 'Petrol and bottles in that stash. I wrapped a few. Throw them, don\'t drop them.' }, { who: 'wren', text: 'One more thing. Sol Ortega is back on The Strand, and Brandt\'s people are hunting her.' }] },
  { id: 'm4', chapter: 4, title: 'RUN, SOL, RUN', giver: 'sol', start: corner(5, 5, 1, 1), reward: { money: 2400, xp: 380 },
    intro: [{ who: 'sol', text: 'Five years, no postcard, and you show up mid car chase. Classic Nico.' }, { who: 'nico', text: 'Missed you too. Who is on you?' }, { who: 'sol', text: "Brandt's enforcer in a black Hawke. I drive, I don't shoot. Put him in the sea and I'm yours till the Gala." }],
    stages: [{ type: 'chase', key: 'hawke', tint: 0x15151a, at: P(6, 5), text: "Run down and wreck the enforcer's Hawke" }],
    outro: [{ who: 'sol', text: 'Okay. You still drive like a dropped shopping trolley, but it worked.' }, { who: 'sol', text: 'Need a car, any time, call. I will have one at the kerb before you hang up.' }] },
  { id: 'm5', chapter: 5, title: 'STATIC', giver: 'tamsin', start: corner(2, 2, 1, 1), reward: { money: 2600, xp: 420 },
    intro: [{ who: 'tamsin', text: 'TIDE FM 88.1. Six watts from a bathroom in Old Town. Nobody hears us past the market.' }, { who: 'tamsin', text: 'Put my transmitter on top of Crown Tower and the whole Bay hears whatever we say. Including on Gala night.' }, { who: 'nico', text: "On Brandt's own roof. I like you already." }],
    stages: [{ type: 'steal', key: 'cadia', tint: 0x4fd8ff, at: { ...P(3, 4, 5.4, 22), h: 0 }, text: "Take Tamsin's van with the transmitter" }, { type: 'goto', at: TOWER, r: 12, car: 'mission', time: 160, text: 'Drive the van to Crown Tower plaza' }, { type: 'kill', at: TOWER, count: 3, gang: 'brandt', text: "Clear Brandt's tower security" }, { type: 'collect', pts: [TOWER], text: 'Plant the transmitter on Crown Tower' }, { type: 'escape', stars: 2, text: 'Lose the SBPD (2 stars)' }],
    outro: [{ who: 'tamsin', text: "Signal's clean. Testing, testing: Viktor Brandt has terrible taste in shoes." }, { who: 'tamsin', text: "I'm in. And if you need the cops blind, I can drop the grid for ten seconds. Ten. Don't get greedy." }] },
  { id: 'm6', chapter: 6, title: 'LAST CALL AT THE MARINA', giver: 'dex', start: corner(2, 6, 1, -1), reward: { money: 3200, xp: 500 },
    intro: [{ who: 'dex', text: "I found a buyer for what you know about Brandt. Marina Cala, pier nine, midnight. Bring nobody." }, { who: 'sol', text: 'Dex has never been on time for anything in his life. Now he is early?' }, { who: 'nico', text: 'He is family. Keep the engine running anyway.' }],
    stages: [{ type: 'goto', at: MARINA, r: 40, text: "Meet Dex's buyer at the Marina Cala docks" }, { type: 'kill', at: MARINA, count: 5, gang: 'brandt', text: "It's a setup: survive Brandt's ambush" }, { type: 'escape', stars: 4, text: "Reyne's units are on the pier: lose 4 stars" }, { type: 'goto', at: corner(1, 4, 1, 1), r: 7, car: 'any', text: 'Reach the Point Wren safehouse' }],
    outro: [{ who: 'dex', text: 'Nothing personal, Nico. Brandt offered a seat at the Gala. You offered a bad week.' }, { who: 'sol', text: "Dex just sold you for a dinner invitation. We still have four days. Let's make them count." }] },
  { id: 'm7', chapter: 7, title: 'THE LEDGER', giver: 'tamsin', start: corner(2, 2, 1, 1), reward: { money: 4200, xp: 620 },
    intro: [{ who: 'tamsin', text: "Brandt writes every bribe down. Old habit. The ledger lives in the safe on his yacht, the Crown Jewel, at Marina Cala." }, { who: 'wren', text: 'His red Veloce GT has a dock pass on the dash. Guards wave it straight through.' }, { who: 'sol', text: 'I will wait at the Point Wren light. Come by sea, the roads will be crawling.' }, { who: 'nico', text: 'Steal his car, rob his boat, borrow his speedboat. Gentle start to the week.' }],
    stages: [{ type: 'steal', key: 'veloce', tint: 0xd01020, at: { ...P(4, 4, 5.4, 22), h: 0 }, text: "Steal Brandt's red Veloce GT", stars: 1 }, { type: 'goto', at: MARINA_GATE, r: 10, car: 'mission', text: 'Drive the Veloce through the Marina Cala gate' },
      { type: 'goto', at: GANGWAY, r: 3, foot: true, text: 'On foot: walk pier nine and board the Crown Jewel' }, { type: 'kill', at: YACHT, spots: GUARD_SPOTS, count: 4, gang: 'brandt', text: "Take out Brandt's deck guards" },
      { type: 'collect', pts: [SAFE], text: 'Crack the safe on the aft deck: grab the ledger' }, { type: 'boat', stars: 3, text: 'Alarm! Jump in the speedboat at the end of pier nine', ...boardSpeedboat },
      { type: 'goto', at: DROP, r: 10, car: 'boat', text: 'Outrun the harbour launches: run the ledger to Sol at the Point Wren light', ...boatEscape }],
    outro: [{ who: 'tamsin', text: "Page one: Captain Hollis Reyne, forty thousand a month. He's going to have a very public Gala." }, { who: 'reyne', text: 'Varela. Every unit in the Bay has your face. You will not reach that bridge.' }] },
  { id: 'm8', chapter: 8, title: 'CAUSEWAY GALA', giver: 'sol', start: corner(5, 5, 1, 1), reward: { money: 9000, xp: 900 },
    intro: [{ who: 'sol', text: 'Gala night. Brandt cuts the ribbon on the Causeway at nine, cameras everywhere.' }, { who: 'tamsin', text: "The van broadcasts on 88.1 while it moves. Keep it rolling, I read the ledger, the whole Bay listens." }, { who: 'nico', text: 'For the Low Tide. For Mom. Let us go be loud.' }],
    stages: [{ type: 'steal', key: 'cadia', tint: 0x4fd8ff, at: { ...P(5, 6, 5.4, -22), h: 0 }, text: 'Get in the TIDE FM broadcast van' }, { type: 'goto', at: RAMP_FOOT, r: 12, car: 'mission', stars: 3, text: 'On air: drive the van to the Causeway on-ramp' },
      { type: 'roadblock', text: 'Break the roadblock: ram the WEAK POINT', ...roadblockStage }],
    outro: [{ who: 'reyne', text: 'All units... stand down. That is an order. I said stand down!' }, { who: 'tamsin', text: 'And that was page forty. Viktor, wave to the cameras.' }, { who: 'nico', text: 'Mom. Put the coffee on. We are open.' }] },
];
export const missionById = (id) => MISSIONS.find((m) => m.id === id);
