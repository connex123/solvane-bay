# solvane-bay

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/connex123/solvane-bay/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/connex123/solvane-bay/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

SOLVANE BAY is an original open-world crime game for desktop Chrome (keyboard + mouse): a sun-soaked low-poly coastal city you explore on foot and by car, as newcomer Nico Varela working up from Dex's Club Velvet to a marina heist.

- Procedural three.js city at golden hour: azure-to-peach sky dome with the sun setting over the sea, pastel art-deco stucco blocks (balconies, awnings, cornices, rooftop AC units and water tanks), glass towers downtown, curved-trunk palm boulevards, bus stops, benches, hydrants, our own billboard ads, beach, marina, neon nightlife district, docks, parks; day/night clock, lit windows
- Hand-written post-processing: HDR render target, bright-pass bloom pyramid, ACES filmic tone mapping, warm colour grade with a saturated magic-hour look at sunset (magenta-to-orange sky, purple-blue shadows), vignette and a speed-driven chromatic fringe ; Settings > Graphics quality defaults to Auto, which steps resolution, shadows and bloom down until the frame rate holds
- Sleek extruded car models with clearcoat paint, tinted glass, spoked rims and glowing head/tail lights: VELOCE GT sports car, SBPD cruisers in a navy/teal livery with red/blue light bars, taxi, van, SUV, compact, convertible
- Smooth low-poly people: rounded heads with faces and hair styles, open jackets with collars, hands and shoes; varied pedestrian outfits, SBPD officers in navy uniforms with caps and badges, Nico in a teal bomber over a white tee
- Third-person on foot (WASD, aim, SMG/pistol/shotgun/fists) and arcade driving with drift, damage, smoke, explosions, skid marks, chase camera with speed FOV
- Driving systems: NITRO (Shift or N while driving) with a draining/refilling tank, extra thrust, exhaust flames and FOV kick; vehicle CONDITION % from collision damage with engine smoke and fire when low; DRIFT xN chains that pay cash for sustained slides and NEAR MISS bonuses for threading past traffic at speed, shown as floating popups; counter-steering front wheels and tyre smoke
- Steal any car; lane-following traffic with signals; pedestrians that flee gunfire
- Wanted level 0-5: SBPD patrol cars that pursue and ram, roadblocks, officers on foot, a police helicopter, CUFFED / FLATLINED respawns
- Police line of sight: units only see you with a clear sight line within range (IN SIGHT / SEARCHING tag), and heat only cools while nobody has eyes on you; roadblocks lay spike strips that shred your tyres
- Six-chapter story with portraits and dialogue (steal, deliver, collect, shoot-out, car chase, escape, heist), plus taxi fares, a street race, 16 hidden packages
- Respect levels unlock weapons at the Calder Arms shop; Glow Coat Respray clears heat; health/armor pickups
- Game HUD in condensed display type with colour-coded cards: huge money with +gains, WANTED with big stars and the line-of-sight tag, RESPECT level bar, weapon card with drawn icon and mag/reserve ammo, car card with speed, CONDITION and NITRO bars, mission card with stage bar, timer and NEXT step; mission card, SBPD response list, radio card, speedometer, on-screen waypoint with distance, and a rotating minimap with the road network, parks, beach and sea, a GPS route along the streets, north marker, icon blips (flashing police, objective star, shops), district name and a red/blue rim when wanted
- City map (M) with street names and clear district labels, pause menu, save/load, three synthesized radio stations
- Fixed-step simulation (1/60 s with an accumulator) so low frame rates never run in slow motion; menu clicks never fire the gun
- No build step, no network, no binary assets: all geometry, textures and sound are generated at run time

## Run it

```sh
node serve.ts   # then open http://localhost:8080 in desktop Chrome
```

Checks: `?selftest=1` (page title SELFTEST PASS/FAIL), `node tools/playtest.mjs` (drives the real game over the Chrome DevTools Protocol: New Game, walk, sprint, shoot, wanted level and police, steal a car, drive, map, pause, resume; prints errors and fps), `node tools/take-screenshots.mjs [scene]`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=pvmn372b&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
