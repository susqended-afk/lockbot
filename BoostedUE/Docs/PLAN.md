# BOOSTED — Unreal Engine 5 plan

Decision (Oct 13): build the real game in **Unreal Engine 5.8** (same engine as Hood Warfare 2) with
**MetaHuman** characters, keeping the gameplay already proven in the browser prototype (`../boosted/`).

## Target look
- Realistic hood characters: MetaHumans (free, made in the editor) dressed in hood fits —
  hoodies, puffers, tracksuits, jerseys, durags, fitted caps, ski masks, chains, Timbs/sneakers/slides.
  Outfits come from Fab (MetaHuman-compatible clothing) and get color options in the character creator.
- Realistic drivable cars (Chaos Vehicles) — muscle cars, SUVs, donks, sports cars (fictional names).
- City: start with a generated block city that's playable on day one, then swap in realistic building packs.

## Done so far
- `Boosted.uproject` (UE 5.8, Chaos Vehicles + Enhanced Input), config files, build/target files.

## Next (C++ gameplay, ported from the prototype)
1. Core types, Project Settings page ("Boosted") for the car catalog, characters and wardrobe.
2. Save/profile (cash, Street Cred XP, garage of 5 cars, character look, boost-list contracts).
3. Player character: third-person movement, hold-E break-ins, carjacking, enter/exit cars, outfit slots.
4. Vehicles: driving input, upgrades (engine, blower, tires, suspension, brakes, nitrous, armor),
   paint + finishes, underglow, damage, police lights.
5. City generator, traffic + police AI, pedestrians, wanted level 1-5 with busting.
6. Locations: The Spot (garage), EZ Auto Parts (chop), Port Exports, Fresh Coat (body shop), police station.
7. UI: HUD, title screen, character creator, garage/upgrade shop, chop/export/body-shop menus, pause.
8. `Docs/SETUP.md`: install UE 5.8 + Visual Studio, build, create MetaHumans, add cars, first play.
