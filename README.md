# solvane-bay

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/connex123/solvane-bay/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/connex123/solvane-bay/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

SOLVANE BAY is an original open-world crime game for desktop Chrome (keyboard + mouse): a sun-soaked low-poly coastal city you explore on foot and by car, as newcomer Nico Varela working up from Dex's Club Velvet to a marina heist.

- Procedural three.js city in a teal-and-coral colour script: each story act has its own grade (Act I morning mint, Act II golden hour, Act III dusk teal sky into a coral horizon), long teal shadows, an amber sun low over a turquoise sea
- Landmarks: the coral-red cable-stayed Causeway with two pylons and cable fans over the sea, the striped Point Wren light with a lamp glow and turning beam, Crown Tower (tallest glass tower in Crown Heights, gold crown crest that glows at dusk), the Old Town lagoon market on stilts
- Street life: yellow TIDE BUS minibuses in traffic, moto-taxis with riders weaving through, beach-goers, umbrellas, lifeguard towers and a volleyball net along the Strand
- Hand-written post-processing: HDR render target, controlled bright-pass bloom pyramid, ACES filmic tone mapping, the act grade from render/colourScript.js, vignette and speed fringe
- Sleek extruded car models with clearcoat paint, tinted glass, spoked rims and glowing head/tail lights: VELOCE GT sports car, SBPD cruisers in a navy/teal livery with red/blue light bars, taxi, van, SUV, compact, convertible
- Smooth low-poly people: rounded heads with faces and hair styles, open jackets with collars, hands and shoes; varied pedestrian outfits, SBPD officers in navy uniforms with caps and badges, Nico in a teal bomber over a white tee
- Third-person on foot (WASD, aim, SMG/pistol/shotgun/fists) and arcade driving with drift, damage, smoke, explosions, skid marks, chase camera with speed FOV
- Driving systems: NITRO (Shift or N while driving) with a draining/refilling tank, extra thrust, exhaust flames and FOV kick; vehicle CONDITION % from collision damage with engine smoke and fire when low; DRIFT xN chains that pay cash for sustained slides and NEAR MISS bonuses for threading past traffic at speed, shown as floating popups; counter-steering front wheels and tyre smoke
- Steal any car; lane-following traffic with signals; pedestrians that flee gunfire
- Wanted level 0-5: SBPD patrol cars that pursue and ram, roadblocks, officers on foot, a police helicopter, CUFFED / FLATLINED respawns
- Police line of sight: units only see you with a clear sight line within range (IN SIGHT / SEARCHING tag), and heat only cools while nobody has eyes on you; roadblocks lay spike strips that shred your tyres
- Story, SOLVANE BAY: LOW TIDE: Nico Varela comes home on the night ferry to find his mother's diner taken by Viktor Brandt's Crown Syndicate. 8 chapters in 3 acts (steal, deliver, collect, shoot-outs, car chase, transmitter plant, yacht heist, live broadcast escape) with portraits and dialogue, a countdown to the Causeway Gala, and a chapter-complete card (beat, cash, rep, unlocks, turf change)
- Chapter 7 set piece, THE LEDGER: steal Brandt's Veloce GT, drive through the Marina Cala gate, walk pier nine and board his three-deck coral-and-cream yacht the CROWN JEWEL on foot, take out the deck guards, crack the safe for the ledger, then escape in the Skipjack speedboat with SBPD harbour launches ramming at your wake, under the Causeway to Sol at the Point Wren light
- Boats: water-only arcade physics (thrust, drag, stern slide, buoyancy bob, bow lift, roll into turns), a white wake ribbon and bow spray, boat-to-boat ramming and sinking, pursuit AI; F boards a boat at a pier and steps ashore only at a dock or jetty
- Chapter 8 finale, CAUSEWAY GALA: Tamsin reads the ledger live on TIDE FM while you drive the broadcast van up the new on-ramp onto the Causeway at dusk; an SBPD roadblock wall of cruisers with spike strips and flashing bars blocks the deck, AIR-1 sweeps its searchlight lane to lane and Captain Reyne's own car is on your bumper; ram the weak point (nitro, BLACKOUT, PATCH UP help) to send it flying and reach the Gala stage at the far pylon
- Territory: every district is held by the CROWN or the LOW TIDE crew; chapters flip them; HUD waterfront bar and city map tinted by holder
- Crew abilities unlocked by the story: Sol HOT SWAP (Z, a car delivered beside you), Tamsin BLACKOUT (X, police lose sight for 10 s), Wren PATCH UP (C, instant repair), with cooldown rings on the HUD crew cards
- Five weapon slots (fists, pistol, SMG, shotgun, thrown MOLOTOV that sets cars alight), HUD slot bar and a Tab weapon wheel; rep levels unlock guns at Calder Arms; Glow Coat Respray clears heat; health/armor pickups
- Crew & Chapters screen (J or pause menu): crew cards, act/chapter list, territory, days to the Gala, unlocks
- Wren's garage at Point Wren: engine, armour plating, nitro tank and respray upgrades; save/load covers chapters, territory, crew, weapons and garage
- "Tide Chart" HUD language: one card system for the HUD and every menu (deep-teal glass, cream keyline, coral accent stripe, condensed display numbers, mint money, gold stars); illustrated portraits with distinct silhouettes in the crew stack, dialogue and Crew & Chapters
- City map (M) drawn as a nautical chart: sounding contours and depth figures, lagoon basin, districts tinted by territory holder, landmark symbols, compass rose and a large legend; pause menu, save/load, three synthesized radio stations
- Fixed-step simulation (1/60 s with an accumulator) so low frame rates never run in slow motion; boot shader warm-up and quality calibration so play never stalls on shader compiles; menu clicks never fire the gun
- No build step, no network, no binary assets: all geometry, textures and sound are generated at run time

## Run it

```sh
node serve.ts   # then open http://localhost:8080 in desktop Chrome
```

Checks: `?selftest=1` (page title SELFTEST PASS/FAIL; also covers boarding the yacht, the speedboat, the Causeway roadblock and both finale chapter cards; `node tools/run-selftest.mjs` runs it headless), `node tools/playtest.mjs` (drives the real game over the Chrome DevTools Protocol: New Game, walk, sprint, shoot, wanted level and police, steal a car, drive, map, pause, resume; prints errors and fps), `node tools/take-screenshots.mjs [scene]`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=pvmn372b&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
