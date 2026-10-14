# BOOSTED: Unreal Engine 5 setup guide

Follow these steps on your gaming PC with Unreal Engine 5.8 installed. Total time is about 1–2 hours the first
time, mostly waiting on installs and the first build.

> **Heads up:** this C++ was written without being compiled yet. The first build might show a few errors.
> If it does, copy the error text (Step 3) and send it to Claude to fix.

---

## 1. Install Visual Studio (needed to build the C++ code)

1. Download **Visual Studio 2022 Community** (free): https://visualstudio.microsoft.com/
2. In the installer, tick these **Workloads**:
   - **Game development with C++**
   - **Desktop development with C++**
3. Under **Individual components**, make sure you have:
   - the latest **MSVC v143** build tools
   - a **Windows 11 SDK** (any recent one)
   - **.NET Framework 4.8 SDK** (or newer)
4. Install, then restart your PC.

Epic's official checklist (if anything's unclear):
https://dev.epicgames.com/documentation/en-us/unreal-engine/setting-up-visual-studio-development-environment-for-cplusplus-projects-in-unreal-engine

## 2. Get the project onto your PC

1. On GitHub open `susqended-afk/lockbot`, switch to the branch **`claude/compassionate-shannon-35xek9`**.
2. Click **Code → Download ZIP**, or clone it with GitHub Desktop.
3. Unzip somewhere with a short path, e.g. `C:\Games\lockbot\`.
   Long paths can break Unreal builds, so avoid putting it on the Desktop or deep inside folders.

You'll use the folder `BoostedUE` (it has `Boosted.uproject` inside).

## 3. Build and open it

1. Double-click **`BoostedUE\Boosted.uproject`**.
2. Unreal says *"The following modules are missing or built with a different engine version... Would you like to rebuild them now?"* → click **Yes**.
3. Wait. The first build can take 5–15 minutes, and then the editor opens.

**If the build fails:**
- Right-click `Boosted.uproject` → **Generate Visual Studio project files**.
- Open the new `Boosted.sln` in Visual Studio. Pick **Development Editor** and **Win64** at the top, then **Build → Build Solution**.
- Copy everything from the **Error List** window (or the Output window) and send it to Claude.

## 4. Add Epic's free starter content (mannequin + drivable cars)

In the editor:

1. Open the **Content Drawer** (Ctrl+Space) → click **+ Add** → **Add Feature or Content Pack**.
2. **Blueprint** tab → **Third Person** → **Add to Project**. This adds the animated mannequin.
3. Do the same for **Vehicle**. This adds a drivable sports car and an offroad truck.

## 5. Turn the template car into a BOOSTED car

1. In the Content Drawer go to `VehicleTemplate/Blueprints/SportsCar` and double-click the car Blueprint (named like `SportsCar_Pawn`).
2. Click **Class Settings** (toolbar) → look at **Parent Class** on the right.
   - If the parent is **another Blueprint** (e.g. something ending in `PawnBase`), open *that* Blueprint instead and do the next step there.
   - If the parent is **WheeledVehiclePawn**, do the next step on this one.
3. **Parent Class → BoostedVehicle**. Click **Compile**, then **Save**.
4. In that same Blueprint:
   - In the **Components** panel, delete its own **Camera** / **SpringArm** components if it has any. BOOSTED adds its own chase camera.
   - In the **Event Graph**, delete the input nodes (anything with `IA_` or "Input" in the name). BOOSTED handles driving input in C++.
   - Compile and save.
5. **Edit → Project Settings → Game → Boosted**:
   - **Default Vehicle Class** = the sports car Blueprint.
   - (Optional) **Police Vehicle Class** = the offroad truck Blueprint, or a duplicate of the car painted black and white.

**Paint not changing color?** Open the car's body material instance and note the name of its color parameter
(e.g. `Paint Color`). In the car Blueprint go to **Class Defaults → Boosted → Paint**, and add that name to
**Paint Color Parameters**. If the body material isn't detected at all, add its slot number to **Paint Material Slots**.

## 6. Make the level and press Play

1. **File → New Level → Empty Level**, then **File → Save Current Level As** → `Content/Maps/SanBravo`.
2. **Edit → Project Settings → Maps & Modes** → set **Editor Startup Map** and **Game Default Map** to `SanBravo`.
   The Game Mode is already set to `BoostedGameMode`.
3. (Optional) Open **Place Actors** (Window menu), search for **BoostedCity**, and drag it into the level to see the city in the editor.
   If you skip this, the city builds itself when you press Play.
4. Click **Play**. You'll get the title screen → **New Game** → character creator → **Hit the Streets**.

### Controls
| Action | Keyboard / Mouse | Gamepad |
| --- | --- | --- |
| Move / drive | W A S D | Left stick, RT gas, LT brake |
| Look | Mouse | Right stick |
| Sprint / nitrous | Shift | B |
| Jump / handbrake | Space | A |
| Break in (hold) · carjack · get in/out | E | Y |
| Horn | H | Left stick click |
| Pause / back | Esc | Start |

### How the game plays
- **Steal:** walk up to a parked car and **hold E** to break in. Alarms can bring heat. You can also press E next to a stopped car to carjack the driver.
  Police cruisers are worth 3 stars of heat.
- **Lose the cops:** break line of sight until the evade bar fills, or drive into **Fresh Coat** (pink pad) for a respray.
- **Make money:**
  - **EZ Auto Parts** (orange pad) chops any car for about half its value.
  - **Port Exports** (green pad) pays full value for clean cars, plus big bonuses from the **Boost List** for exact builds.
- **The Spot** (blue pad) is your garage: store 5 cars, buy upgrades, respray, swap VINs, and change your fit.
- Street Cred levels unlock Stage 3 engines, blowers, big nitrous shots and chrome paint.

---

## 7. Realistic hood characters (MetaHuman)

This is how you get the Hood Warfare 2 level of realism. Until you do this you'll see Epic's gray mannequin.

1. **Edit → Plugins**, search **MetaHuman**, enable the MetaHuman plugins, and restart the editor.
2. Content Drawer → right-click → **MetaHuman → MetaHuman Character**. Open it to build your guy or girl:
   face, skin tone, body shape, and hair (fades, waves, braids, locs and afros are in the groom library).
   Add facial hair and an outfit from the Wardrobe.
3. Click **Assemble** to produce the playable Blueprint (named like `BP_YourName`).
4. Make it playable:
   - Open that Blueprint → **Class Settings → Parent Class → BoostedCharacter**. Compile and save.
   - Select the inherited **Mesh** component. Set **Skeletal Mesh** to `SKM_Manny` (from the Third Person pack) and **Anim Class** to the Third Person
     animation Blueprint (`ABP_Unarmed` or `ABP_Manny`). Turn off **Visible**, and set **Visibility Based Anim Tick Option** to *Always Tick Pose and Refresh Bones*.
   - Make the MetaHuman's **Body** follow that animated mannequin. Use the retargeting setup from Epic's guide:
     search the docs for "MetaHuman Third Person template retarget" (the exact steps change between engine versions).
5. **Project Settings → Game → Boosted → Bodies**: add an entry with a **Name** and set **Character Class** to your MetaHuman Blueprint.
   Add several and they show up in the character creator.
6. **Pedestrian Classes**: add MetaHumans (or the free *City Sample Crowds* characters from Fab) for people walking the streets.

### Hood fits (outfits)
- On **Fab** (fab.com, built into the editor), search for MetaHuman-compatible clothing: *hoodie, puffer jacket, tracksuit,
  jersey, cargo pants, joggers, sneakers, durag, fitted cap, ski mask, chain*.
- Add them under **Project Settings → Game → Boosted → Wardrobe**: Tops, Bottoms, Shoes and Headwear (skeletal meshes),
  plus Chains (static meshes on a socket, `neck_01` by default).
- **Clothing Colors** are the colors offered in the creator. **Clothing Color Parameters** lists the material parameter names to tint.
  Check the outfit's material and add its color parameter name if it's not already listed.
- On a MetaHuman, BOOSTED dresses the **Torso**, **Legs** and **Feet** components. On other characters it uses its own outfit slots.

## 8. Realistic cars and city

- **Cars:** Epic's free **City Sample Vehicles** pack on Fab has realistic drivable cars. Give each car model its own Blueprint
  (reparent as in Step 5), then set **Vehicle Class** on the matching entry in **Project Settings → Boosted → Cars**.
  Keep the fictional names (Stallion Hellhound, Cortez Royale...). Real brands need a license before you sell on Steam.
- **Buildings:** select the **BoostedCity** actor → **Details → Building Kits**, then add building meshes for houses, shops,
  apartments, towers and warehouses. The city swaps the gray boxes for them, scaled to fit each lot.
  Fab has free modular city and hood building packs.
- **Ground materials:** **City → Materials** sets materials for the roads, sidewalks and grass. Quixel Megascans on Fab has photoreal asphalt and concrete.
- **Time of day:** Project Settings → Boosted → **Day Night Speed** (0 = frozen at golden hour).

## 9. Extra polish hooks (optional, all Blueprint)

- **Car Blueprint → OnUpgradesApplied event:** swap wheel / spoiler meshes using `Upgrades.Wheels` and `Upgrades.Spoiler`.
- **Car Blueprint → OnHeavyImpact event:** sparks, crash sounds, camera shake.
- **Car Blueprint → Engine Audio component:** give it a looping MetaSound. It receives a float parameter `RPM` and one called `Throttle`.
- **Character Blueprint → OnBreakInStarted / OnBreakInStopped events:** play a lock-pick or window-smash animation montage.

## 10. Shipping on Steam (later)

1. **Platforms → Windows → Package Project** builds a standalone game.
2. Sign up for Steamworks (one-time $100 app fee), then add the Steam Online Subsystem plugin for achievements and overlay.
3. Before release: replace any placeholder or template assets you don't own the rights to, and keep car brands fictional.

---

## What's in the code (`Source/Boosted`)

| File | What it does |
| --- | --- |
| `BoostedTypes` | Upgrades, stored cars, character looks, contracts, prices and Street Cred math |
| `BoostedSettings` | The **Project Settings → Game → Boosted** page: car catalog, bodies, wardrobe, world tuning |
| `BoostedGameInstance` / `BoostedSaveGame` | Your profile (cash, XP, garage, look, boost list) and saving |
| `BoostedInputConfig` | All key and gamepad bindings, created in code |
| `BoostedVehicle` | Drivable car: input, upgrades to physics, paint, nitrous, damage, police lights, underglow |
| `BoostedCharacter` | Third-person player and pedestrians: break-ins, carjacking, outfits, ragdoll |
| `BoostedCity` | Generates San Bravo, the road grid, parking spots and landmarks |
| `BoostedLocation` | Drive-in pads: garage, chop shop, exports, body shop |
| `BoostedAI` | Traffic and police drivers, pedestrians |
| `BoostedGameMode` | Wanted level, busting, spawning, chop/export/respray/garage actions |
| `BoostedPlayerController` | Getting in and out of cars, and all the menus |
| `UI/*` | HUD and menu widgets (built in code, no widget Blueprints needed) |
