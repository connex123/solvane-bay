# solvane-bay

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/connex123/solvane-bay/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/connex123/solvane-bay/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

SOLVANE BAY is an original open-world crime game for desktop Chrome (keyboard + mouse): a sun-soaked low-poly coastal city you explore on foot and by car, as newcomer Nico Varela working up from Dex's Club Velvet to a marina heist.

- Procedural three.js city at golden hour: pastel art-deco stucco blocks with balconies, striped awnings and rooftop water tanks, glass curtain-wall towers downtown, curved-trunk palms lining every boulevard, bus stops and street lamps, billboards for our own in-world brands, a shader sea with a sun glitter path at the end of the east-west boulevards, marina, neon district, docks, parks; day/night clock
- Hand-written post-processing (no add-ons): HDR scene target, bright-pass + separable gaussian bloom at 1/2 and 1/4 resolution, ACES filmic composite, warm grade, vignette and a speed-driven chromatic fringe; toggle in Settings, automatic fallback to plain rendering
- Sculpted low-poly cars from extruded side profiles with wheel arches, clearcoat paint with sky reflections, spoked rims and blooming head/tail lights: VELOCE GT, sedans, cab, pickup, SUV, van, hatch, open-top spider, and SBPD interceptors in navy/teal livery with red/blue light bars
- Smooth low-poly people: rounded heads with faces, six hair styles, jackets with lapels over shirts, jointed arms and legs; SBPD officers in navy uniform with patrol cap and badge; Nico in a teal bomber, white tee, dark jeans and white sneakers
- Third-person on foot (WASD, aim, SMG/pistol/shotgun/fists) and arcade driving with drift, damage, smoke, explosions, skid marks, chase camera with speed FOV
- Steal any car; lane-following traffic with signals; pedestrians that flee gunfire
- Wanted level 0-5: SBPD patrol cars that pursue and ram, roadblocks, officers on foot, a police helicopter, CUFFED / FLATLINED respawns
- Six-chapter story with portraits and dialogue (steal, deliver, collect, shoot-out, car chase, escape, heist), plus taxi fares, a street race, 16 hidden packages
- Respect levels unlock weapons at the Calder Arms shop; Glow Coat Respray clears heat; health/armor pickups
- Full HUD (mission card, SBPD response list, radio card, speedometer) and a rotating minimap with the outlined road network, building blocks, parks, beach and sea, a GPS route to the objective, north marker, icon blips (flashing police, objective star, shops), district name and a red/blue wanted rim
- City map (M) with collision-free district labels and a next-mission card, pause menu, save/load, three synthesized radio stations
- Fixed-step simulation that stays real-time at low frame rates, plus automatic quality scaling (Settings > Effects: Auto)
- No build step, no network, no binary assets: all geometry, textures and sound are generated at run time

## Run it

```sh
node serve.ts   # then open http://localhost:8080 in desktop Chrome
```

Checks: `index.html?selftest=1` runs a scripted smoke test (title becomes SELFTEST PASS/FAIL); `node tools/playtest.mjs` drives the real game in headless Chrome over the DevTools Protocol (New Game, walk, sprint, shoot, steal a car, drive, map, pause) and prints a report; `node tools/take-screenshots.mjs` re-shoots `screenshots/`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=pvmn372b&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
