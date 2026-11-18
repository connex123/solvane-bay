// The six-chapter story of SOLVANE BAY as data: givers, dialogue, objective stages, rewards.
import { lineCoord } from '../core/config.js';
const P = (i, j, dx = 0, dz = 0) => ({ x: lineCoord(i) + dx, z: lineCoord(j) + dz });
export const corner = (i, j, sx = 1, sz = 1) => P(i, j, sx * 9, sz * 9);
export const HOME = corner(2, 6, 1, 1);
export const MISSIONS = [
  { id: 'm1', chapter: 1, title: 'FRESH OFF THE FERRY', giver: 'dex', start: corner(2, 6, 1, -1), reward: { money: 800, xp: 150 },
    intro: [{ who: 'dex', text: 'Nico Varela. Fresh off the ferry and already in my club. Bold. Wren needs a car, no questions.' }, { who: 'nico', text: 'I need cash and a name in this town. Where is it?' }, { who: 'dex', text: 'Red Marlin parked by the taco stand. Steal it and drive it to Wren in Casa Vieja. Do not scratch it.' }],
    stages: [{ type: 'steal', key: 'marlin', tint: 0xe83a5c, at: { ...P(3, 7, 5.4, -22), h: 0 }, text: 'Steal the red Marlin by the taco stand' }, { type: 'goto', at: P(2, 3), r: 7, car: 'mission', time: 170, text: 'Deliver the Marlin to Old Wren\'s garage' }],
    outro: [{ who: 'wren', text: 'Smooth ride, kid. Dex has more work if you want it. Tell him Wren says you are alright.' }] },
  { id: 'm2', chapter: 2, title: 'COLLECTION DAY', giver: 'dex', start: corner(2, 6, 1, -1), reward: { money: 1200, xp: 220 },
    intro: [{ who: 'dex', text: 'Four shops owe me protection money. Envelopes are waiting. Walk in, take it, smile.' }, { who: 'nico', text: 'And if they do not smile back?' }, { who: 'dex', text: 'Then you remind them who runs Neon Row.' }],
    stages: [{ type: 'collect', pts: [corner(3, 6, 1, 1), corner(4, 8, -1, -1), corner(1, 7, 1, -1), corner(3, 3, 1, 1)], text: 'Collect the four envelopes' }, { type: 'goto', at: corner(2, 6, 1, -1), r: 6, time: 120, text: 'Bring the money back to Dex at Club Velvet' }],
    outro: [{ who: 'dex', text: 'Light but honest. The Coral Kings have been selling on my streets. Tamsin will brief you.' }] },
  { id: 'm3', chapter: 3, title: 'CORAL KINGS DON\'T SHARE', giver: 'tamsin', start: corner(2, 2, 1, 1), reward: { money: 1800, xp: 300 },
    intro: [{ who: 'tamsin', text: 'The Coral Kings run a stash out of the Port Calder container yard. I mapped the cameras. You handle the people.' }, { who: 'nico', text: 'How many?' }, { who: 'tamsin', text: 'Four on the ground. Shoot first. Expect sirens if it gets loud.' }],
    stages: [{ type: 'goto', at: P(2, 0, 32, 32), r: 40, text: 'Go to the Port Calder container yard' }, { type: 'kill', at: P(2, 0, 32, 32), count: 4, gang: 'coral', text: 'Take out the Coral Kings' }],
    outro: [{ who: 'tamsin', text: 'Clean work. Their boss works for Brandt. Meet Sol, she has a lead on his courier.' }] },
  { id: 'm4', chapter: 4, title: 'RUN, SOL, RUN', giver: 'sol', start: corner(5, 5, 1, 1), reward: { money: 2400, xp: 380 },
    intro: [{ who: 'sol', text: 'Brandt\'s courier just left Crown Heights in a black Hawke with the ledger. He is fast. I am faster, but I cannot shoot.' }, { who: 'nico', text: 'Then keep it steady. I will run him off the road.' }],
    stages: [{ type: 'chase', key: 'hawke', tint: 0x15151a, at: P(6, 5), text: 'Chase down and destroy the courier\'s Hawke' }],
    outro: [{ who: 'sol', text: 'You drove like you were born here. Brandt will want you dead now. Good.' }] },
  { id: 'm5', chapter: 5, title: 'HEAT', giver: 'sol', start: corner(5, 5, 1, 1), reward: { money: 3000, xp: 450 },
    intro: [{ who: 'sol', text: 'We need the Veloce GT in the Crown Heights garage lot. It is hot, and I mean literally. Police will see you.' }, { who: 'nico', text: 'Then I will lose them and bring it to Wren.' }],
    stages: [{ type: 'steal', key: 'veloce', tint: 0x2f7fd8, at: { ...P(4, 4, 5.4, 22), h: 0 }, text: 'Steal the blue Veloce GT' }, { type: 'escape', stars: 3, text: 'Lose the police (3 stars)' }, { type: 'goto', at: P(2, 3), r: 7, car: 'mission', text: 'Take the Veloce to Wren\'s garage' }],
    outro: [{ who: 'wren', text: 'Paint, plates, new engine mapping. She will be unrecognisable by morning. Brandt hosts a party on his yacht tonight.' }] },
  { id: 'm6', chapter: 6, title: 'LAST CALL AT THE MARINA', giver: 'tamsin', start: corner(2, 2, 1, 1), reward: { money: 6000, xp: 700 },
    intro: [{ who: 'tamsin', text: 'Brandt\'s yacht is docked at Marina Cala. His guards, his safe, and his books that put him away for life.' }, { who: 'sol', text: 'I will wait at the safehouse in Alder Hills with the engine running.' }, { who: 'nico', text: 'Last call, then. Let us go.' }],
    stages: [{ type: 'goto', at: P(7, 1, 32, 32), r: 40, text: 'Go to the Marina Cala docks' }, { type: 'kill', at: P(7, 1, 32, 32), count: 5, gang: 'brandt', text: 'Clear Brandt\'s guards' }, { type: 'collect', pts: [P(7, 1, 32, 32)], text: 'Grab the ledger from the yacht safe' }, { type: 'escape', stars: 4, text: 'Escape the SBPD (4 stars)' }, { type: 'goto', at: corner(1, 4, 1, 1), r: 7, car: 'any', text: 'Reach the Alder Hills safehouse' }],
    outro: [{ who: 'sol', text: 'Nico Varela, the ferry kid who took the Bay. Welcome home.' }, { who: 'nico', text: 'Solvane Bay is mine now. Let us keep driving.' }] },
];
export const missionById = (id) => MISSIONS.find((m) => m.id === id);
