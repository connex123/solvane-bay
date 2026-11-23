// SOLVANE BAY: an original open-world crime game, entered in make.fun's gta6-01 bounty. Node 22, standard library only.
//
// The game itself is the game/ folder beside this file: static files a desktop Chrome opens offline. game/index.html
// maps "three" onto the vendored three.js r169 and loads the ES modules under game/src/; nothing is fetched from the
// network. The rest is procedural: a sun-soaked coastal city (beach strip, palm boulevards, downtown towers, the
// marina, a neon nightlife district, the docks) built from primitives, with canvas-painted textures and synthesised
// WebAudio sound. You play Nico Varela: steal and drive cars, fight through the story chapters, shake off the SBPD
// (patrol cars, roadblocks, a helicopter, harbour launches), race, drive taxi fares and hunt hidden packages.
//
// Running this program hands the entry in. It copies game/ and screenshots/ into the output folder and writes
// dossier.json there, the summary the judge reads, built by the vendored make.fun library.
//
//   play locally:     node serve.ts            then open http://localhost:8080
//   build an entry:   MAKEFUN_OUTPUT_DIR=out node main.ts      (the grader's container uses /output)

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const projectDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own limits (reference/gate.json). Only text_max_bytes changes what gets written; the rest make the
// build refuse an entry the scorer would refuse anyway: more than 4 screenshots or one over 256 KiB, more than 993
// files or 48 MiB in game/, or a game/ path over 1000 bytes (game/ shares /output's 1000-entry cap with
// screenshots/ and dossier.json).
const SCORER_CAPS = {
  text_max_bytes: 160 * 1024,
  screenshots: { max: 4, max_bytes: 256 * 1024 },
  game_max_files: 993,
  game_max_bytes: 48 * 1024 * 1024,
  game_path_max_bytes: 1000,
};

/** Copy a folder from beside this file into the output folder; an optional one may be absent. */
function copyAlongside(name: string, optional = false): void {
  const source = join(projectDir, name);
  if (optional && !existsSync(source)) return;
  cpSync(source, join(outputDir, name), { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
copyAlongside('game'); // required: without the game there is nothing to hand in
mkdirSync(join(outputDir, 'screenshots'), { recursive: true }); // present even when there are no screenshots yet
copyAlongside('screenshots', true);

writeFileSync(join(outputDir, 'dossier.json'), buildDossier(outputDir, SCORER_CAPS));
