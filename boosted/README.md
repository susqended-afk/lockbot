# BOOSTED (working title)

Open-world car boosting game prototype: steal cars, lose the cops, chop them for parts,
export them for full value, or keep them at your garage and build them up.

Status: **early prototype** — runs in the browser (three.js). Character models are placeholders
built from code; they are being replaced with real rigged 3D models.

## Run it

```bash
cd boosted
npm install
npm run dev      # open the printed localhost URL
npm run build    # production build in dist/
```

## Controls

| Action | Keys |
| --- | --- |
| Move / drive | W A S D |
| Look | Mouse (click the game to capture) |
| Sprint / nitrous | Shift |
| Jump / handbrake | Space |
| Break in (hold) · carjack · enter · exit | E |
| Horn · radio · map · pause | H · R · M · Esc |

Gamepad: RT/LT drive, A handbrake, B nitrous, Y enter/exit, Start pause.

## What's in

- Procedural city (San Bravo): hood blocks, projects, strip malls, downtown, industrial, docks.
- Locations: The Spot (your garage), EZ Auto Parts (chop shop), Port Exports, Fresh Coat body shop, police station.
- Stealing: hold E to break into parked cars (alarms), carjack traffic, police cruisers for big heat.
- Wanted level 1-5 with pursuit AI, line-of-sight evasion, busting.
- Economy: chop (~half value), export (full value when clean), boost-list contracts for specific builds.
- Garage: store 5 cars, performance upgrades (engine, blower, tires, suspension, brakes, nitrous, armor),
  paint + finishes, rims/size/color, tint, underglow, spoilers, hoods, vanity plates.
- Character creator (placeholder models), day/night cycle, synthesized engine/siren audio and a trap-beat radio.

All car makes/models are fictional parody names; real brands need licensing before a Steam release.
