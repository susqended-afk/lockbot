// Game data: cars, upgrades, character options, economy.
// All makes/models are fictional parody names — real brands (Dodge, Jeep, etc.) need a license before shipping on Steam.

export const WORLD = {
  N: 8, // blocks per side
  BLOCK: 64, // block size (m)
  ROAD: 14, // road width (m)
  SIDEWALK: 3.5,
  CURB: 0.15,
  LANE: 3.5, // lane centre offset from road centre
};
WORLD.PITCH = WORLD.BLOCK + WORLD.ROAD;
WORLD.HALF = (WORLD.N / 2) * WORLD.PITCH; // outer road centre line

export const roadCoord = (i) => (i - WORLD.N / 2) * WORLD.PITCH;

// ------------------------------------------------------------------ cars
// accel m/s², top m/s, grip = lateral friction, mass kg, sound profile
export const CARS = {
  hellhound: {
    name: 'Hellhound SRT', make: 'Stallion', body: 'muscle', value: 32000,
    accel: 11.5, top: 74, grip: 4.6, mass: 1950, sound: 'v8sc', rarity: 6,
    hood: 'scoop', rims: 'fivespoke', rimColor: 'black', taillight: 'bar', headlight: 'quad',
    colors: ['#4a1f78', '#5ccc2e', '#ff6a13', '#0c0c0f', '#e9e9ea', '#a8101a', '#4c5259', '#123b8c'],
  },
  scatpack: {
    name: 'Scat Pack', make: 'Stallion', body: 'charger', value: 23000,
    accel: 9.8, top: 68, grip: 4.9, mass: 1900, sound: 'v8', rarity: 10,
    hood: 'scoop', rims: 'fivespoke', rimColor: 'gunmetal', taillight: 'bar', headlight: 'slim',
    colors: ['#0c0c0f', '#a8101a', '#e9e9ea', '#2c3a52', '#6b6f75', '#5ccc2e', '#ff6a13'],
  },
  trackhound: {
    name: 'Trackhound', make: 'Stallion', body: 'suv', value: 38000,
    accel: 10.8, top: 69, grip: 5.1, mass: 2400, sound: 'v8sc', rarity: 5,
    hood: 'stock', rims: 'turbine', rimColor: 'black', taillight: 'split', headlight: 'slim',
    colors: ['#0c0c0f', '#e9e9ea', '#a8101a', '#3a4048', '#1c2d4a', '#6b6f75'],
  },
  kaiser: {
    name: '750 Li', make: 'Kaiser', body: 'sedan', value: 27000,
    accel: 9.4, top: 71, grip: 5.8, mass: 2000, sound: 'v8tt', rarity: 9,
    hood: 'stock', rims: 'mesh', rimColor: 'silver', taillight: 'split', headlight: 'slim',
    colors: ['#0c0c0f', '#1a2233', '#e9e9ea', '#5a5f66', '#3c1a1a', '#22313f'],
  },
  raiden: {
    name: 'Raiden GT-X', make: 'Nakamura', body: 'sport', value: 55000,
    accel: 12.8, top: 81, grip: 7.4, mass: 1750, sound: 'v6tt', rarity: 3,
    hood: 'stock', rims: 'forged', rimColor: 'gunmetal', taillight: 'round', headlight: 'slim',
    colors: ['#e9e9ea', '#0c0c0f', '#2a5bd7', '#a8101a', '#7b8087', '#f2c200'],
  },
  royale: {
    name: 'Royale Caprice', make: 'Cortez', body: 'donk', value: 16000,
    accel: 7.4, top: 55, grip: 3.9, mass: 1850, sound: 'v8big', rarity: 9,
    hood: 'stock', rims: 'donk', rimColor: 'chrome', rimSize: 3, taillight: 'split', headlight: 'square',
    colors: ['#ff2a6d', '#00a6a6', '#ffd400', '#8a2be2', '#e9e9ea', '#1bc45a', '#ff7a00', '#0c0c0f'],
  },
  workhorse: {
    name: 'Workhorse 1500', make: 'Cortez', body: 'truck', value: 13000,
    accel: 7.8, top: 56, grip: 5.0, mass: 2300, sound: 'v8', rarity: 16,
    hood: 'stock', rims: 'steelie', rimColor: 'silver', taillight: 'split', headlight: 'square',
    colors: ['#e9e9ea', '#0c0c0f', '#8a1c1c', '#3d4a3a', '#5a5f66', '#1e3a6b'],
  },
  civi: {
    name: 'Civi Si', make: 'Hikari', body: 'hatch', value: 7500,
    accel: 7.6, top: 53, grip: 6.2, mass: 1250, sound: 'i4', rarity: 26,
    hood: 'stock', rims: 'fivespoke', rimColor: 'silver', taillight: 'split', headlight: 'slim',
    colors: ['#e9e9ea', '#0c0c0f', '#a8101a', '#2a5bd7', '#7b8087', '#d7d2c0', '#4b5d3a'],
  },
  camri: {
    name: 'Camri LE', make: 'Sakura', body: 'sedan', value: 9500,
    accel: 7.2, top: 55, grip: 5.6, mass: 1500, sound: 'i4', rarity: 26,
    hood: 'stock', rims: 'steelie', rimColor: 'silver', taillight: 'split', headlight: 'slim',
    colors: ['#e9e9ea', '#9aa0a6', '#5a5f66', '#1a2233', '#7a1414', '#c9c2b0'],
  },
  interceptor: {
    name: 'Interceptor', make: 'Marshal', body: 'sedan', value: 21000,
    accel: 10.4, top: 72, grip: 6.0, mass: 2000, sound: 'v8', rarity: 0, police: true,
    hood: 'stock', rims: 'steelie', rimColor: 'black', taillight: 'split', headlight: 'slim',
    colors: ['#0c0c0f'],
  },
};

export const CIVILIAN_CARS = Object.keys(CARS).filter((k) => !CARS[k].police);

// ------------------------------------------------------------------ upgrades
export const PERF = {
  engine: { label: 'Engine', levels: ['Stock', 'Stage 1', 'Stage 2', 'Stage 3'], cost: [0, 3000, 7500, 16000], cred: [1, 1, 2, 4] },
  blower: { label: 'Blower', levels: ['None', 'Pro-Mod Blower'], cost: [0, 14000], cred: [1, 3] },
  tires: { label: 'Tires', levels: ['Stock', 'Street', 'Sport', 'Drag Radials'], cost: [0, 1500, 3200, 6000], cred: [1, 1, 1, 2] },
  suspension: { label: 'Suspension', levels: ['Stock', 'Lowered', 'Coilovers', 'Air Ride'], cost: [0, 1200, 2800, 5500], cred: [1, 1, 1, 2] },
  brakes: { label: 'Brakes', levels: ['Stock', 'Street', 'Big Brake Kit'], cost: [0, 1000, 3500], cred: [1, 1, 2] },
  nitro: { label: 'Nitrous', levels: ['None', '10 lb Shot', '20 lb Shot', '35 lb Shot'], cost: [0, 4000, 8000, 15000], cred: [1, 1, 2, 3] },
  armor: { label: 'Armor', levels: ['None', '20%', '40%', '60%'], cost: [0, 3000, 6500, 12000], cred: [1, 1, 2, 3] },
};

export const PAINTS = [
  ['Plum Crazy', '#4a1f78'], ['Sublime', '#5ccc2e'], ['Go Mango', '#ff6a13'], ['Torred', '#a8101a'],
  ['Pitch Black', '#0c0c0f'], ['White Knuckle', '#e9e9ea'], ['Destroyer Gray', '#4c5259'], ['Indigo', '#123b8c'],
  ['Candy Pink', '#ff2a6d'], ['Teal Drip', '#00a6a6'], ['Lemon', '#ffd400'], ['Grape', '#8a2be2'],
  ['Money Green', '#1d6b3a'], ['Sky', '#4fa8ff'], ['Bronze', '#8a5a2b'], ['Gold Rush', '#c9a227'],
];

export const FINISHES = [
  { id: 'gloss', label: 'Gloss', cost: 0 },
  { id: 'metallic', label: 'Metallic', cost: 800 },
  { id: 'matte', label: 'Matte', cost: 1500 },
  { id: 'pearl', label: 'Pearl', cost: 3000 },
  { id: 'chrome', label: 'Chrome', cost: 9000, cred: 3 },
];

export const RIMS = [
  { id: 'stock', label: 'Stock', cost: 0 },
  { id: 'steelie', label: 'Steelies', cost: 300 },
  { id: 'fivespoke', label: '5-Spoke', cost: 1500 },
  { id: 'mesh', label: 'Mesh', cost: 2200 },
  { id: 'turbine', label: 'Turbine', cost: 2500 },
  { id: 'forged', label: 'Forged', cost: 4000 },
  { id: 'deepdish', label: 'Deep Dish', cost: 4500 },
  { id: 'donk', label: 'Donk Blades', cost: 6000 },
];

export const RIM_COLORS = [
  ['Chrome', 'chrome'], ['Black', 'black'], ['Gunmetal', 'gunmetal'], ['Silver', 'silver'], ['Gold', 'gold'], ['Body', 'body'],
];
export const RIM_SIZES = [
  { label: 'Stock', cost: 0 }, { label: '20"', cost: 1500 }, { label: '24"', cost: 3500 }, { label: '26" Sitting High', cost: 6000 },
];

export const TINTS = [{ label: 'None', cost: 0 }, { label: '35%', cost: 300 }, { label: '20%', cost: 600 }, { label: 'Limo 5%', cost: 900 }];
export const UNDERGLOW = [
  ['None', null], ['Ice Blue', '#2fb8ff'], ['Purple', '#a53bff'], ['Red', '#ff2a3d'], ['Green', '#2bff6a'], ['Pink', '#ff3fb4'], ['White', '#ffffff'],
];
export const SPOILERS = [
  { id: 'none', label: 'None', cost: 0 }, { id: 'ducktail', label: 'Ducktail', cost: 800 },
  { id: 'wing', label: 'Street Wing', cost: 1800 }, { id: 'gt', label: 'GT Wing', cost: 3200 },
];
export const HOODS = [
  { id: 'stock', label: 'Stock', cost: 0 }, { id: 'scoop', label: 'Hellhound Scoop', cost: 1500 }, { id: 'carbon', label: 'Carbon Vented', cost: 2500 },
];

export const RESPRAY_COST = 300; // body shop respray, clears heat when unseen
export const GARAGE_SLOTS = 5;

/** Default look for a freshly spawned car of a given model. */
export function defaultUpgrades(specId, rng = Math.random) {
  const spec = CARS[specId];
  const col = spec.colors[Math.floor(rng() * spec.colors.length)];
  return {
    color: col,
    finish: rng() < 0.4 ? 'metallic' : 'gloss',
    rims: spec.rims || 'stock',
    rimColor: spec.rimColor || 'silver',
    rimSize: spec.rimSize || 0,
    tint: spec.police ? 0 : Math.floor(rng() * 3),
    underglow: null,
    spoiler: 'none',
    hood: spec.hood || 'stock',
    engine: 0, blower: 0, tires: 0, suspension: 0, brakes: 0, nitro: 0, armor: 0,
    plate: randomPlate(rng),
  };
}

export function randomPlate(rng = Math.random) {
  const L = 'ABCDEFGHJKLMNPRSTUVWXYZ';
  const pick = () => L[Math.floor(rng() * L.length)];
  return `${pick()}${pick()}${pick()} ${Math.floor(1000 + rng() * 8999)}`;
}

/** Money already sunk into a car's mods (used for resale value). */
export function upgradeSpend(specId, u) {
  const spec = CARS[specId];
  let s = 0;
  for (const k of Object.keys(PERF)) s += PERF[k].cost.slice(0, (u[k] || 0) + 1).reduce((a, b) => a + b, 0);
  const fin = FINISHES.find((f) => f.id === u.finish);
  if (fin) s += fin.cost;
  if (u.rims !== (spec.rims || 'stock')) s += RIMS.find((r) => r.id === u.rims)?.cost || 0;
  if (u.rimSize > (spec.rimSize || 0)) s += RIM_SIZES[u.rimSize].cost;
  s += TINTS[u.tint]?.cost || 0;
  if (u.underglow) s += 1500;
  s += SPOILERS.find((x) => x.id === u.spoiler)?.cost || 0;
  if (u.hood !== (spec.hood || 'stock')) s += HOODS.find((x) => x.id === u.hood)?.cost || 0;
  return s;
}

/** What a car is worth: base (scaled by damage) + most of the mod spend. */
export function carValue(specId, u, health = 1) {
  const spec = CARS[specId];
  return Math.round(spec.value * (0.45 + 0.55 * health) + upgradeSpend(specId, u) * 0.8);
}

// ------------------------------------------------------------------ character
export const SKIN_TONES = ['#2e1a12', '#4a2c1d', '#62391f', '#7a4a2c', '#8f5a37', '#a86d44', '#c48a5f', '#d9a57d', '#ecc4a2', '#f5d8c0'];
export const HAIR_COLORS = [
  ['Jet', '#0b0907'], ['Dark Brown', '#2a1a10'], ['Brown', '#4a2e1a'], ['Honey', '#9a6a32'], ['Blonde', '#d9b56b'],
  ['Platinum', '#e8e2d0'], ['Cherry', '#8e1b25'], ['Ice Blue', '#5fb8ff'],
];
export const HAIR_STYLES = [
  ['bald', 'Bald'], ['buzz', 'Buzz Cut'], ['waves', '360 Waves'], ['fade', 'High Top Fade'], ['afro', 'Fro'],
  ['twists', 'Twists'], ['dreads', 'Locs'], ['braids', 'Cornrows'], ['ponytail', 'Long Ponytail'],
];
export const FACIAL_HAIR = [['none', 'Clean'], ['mustache', 'Mustache'], ['goatee', 'Goatee'], ['chinstrap', 'Chinstrap'], ['beard', 'Full Beard']];
export const HEADWEAR = [['none', 'None'], ['fitted', 'Fitted Cap'], ['backwards', 'Backwards Cap'], ['durag', 'Durag'], ['beanie', 'Beanie'], ['skimask', 'Ski Mask']];
export const TOPS = [['tee', 'Oversized Tee'], ['hoodie', 'Hoodie'], ['puffer', 'Puffer Jacket'], ['tank', 'Tank Top'], ['jersey', 'Jersey'], ['flannel', 'Flannel'], ['tracksuit', 'Track Jacket']];
export const BOTTOMS = [['jeans', 'Jeans'], ['joggers', 'Joggers'], ['cargo', 'Cargos'], ['shorts', 'Ball Shorts'], ['camo', 'Camo Pants']];
export const SHOES = [['sneakers', 'Sneakers'], ['highs', 'High Tops'], ['boots', 'Wheat Boots'], ['slides', 'Slides & Socks']];
export const BUILDS = [['slim', 'Slim'], ['average', 'Average'], ['athletic', 'Athletic'], ['heavy', 'Heavy']];
export const CLOTH_COLORS = [
  '#111111', '#f2f2f2', '#7d8288', '#2b3a55', '#1d3b2a', '#6b1d1d', '#c41e3a', '#ff7a00', '#ffd100', '#3a7bd5',
  '#8a2be2', '#ff4fa3', '#c2a878', '#4b3621', '#00a3a3', '#5a6b3a',
];

export function defaultCharacter() {
  return {
    name: 'Lil Boost',
    skin: SKIN_TONES[3], build: 'athletic', height: 1.8,
    hair: 'waves', hairColor: '#0b0907', facial: 'goatee', headwear: 'none', headwearColor: '#111111',
    top: 'hoodie', topColor: '#111111', top2: '#c41e3a',
    bottom: 'jeans', bottomColor: '#2b3a55',
    shoes: 'sneakers', shoeColor: '#f2f2f2',
    chain: true, shades: false, watch: true, earrings: true,
  };
}

export function randomCharacter(rng = Math.random) {
  const p = (a) => a[Math.floor(rng() * a.length)];
  const pick = (a) => p(a)[0];
  const hair = pick(HAIR_STYLES);
  return {
    name: 'Stranger',
    skin: p(SKIN_TONES), build: pick(BUILDS), height: 1.68 + rng() * 0.24,
    hair, hairColor: rng() < 0.85 ? p(HAIR_COLORS.slice(0, 3))[1] : p(HAIR_COLORS)[1],
    facial: rng() < 0.5 ? 'none' : pick(FACIAL_HAIR),
    headwear: rng() < 0.55 ? 'none' : pick(HEADWEAR.slice(0, 5)), headwearColor: p(CLOTH_COLORS),
    top: pick(TOPS), topColor: p(CLOTH_COLORS), top2: p(CLOTH_COLORS),
    bottom: pick(BOTTOMS), bottomColor: p(['#2b3a55', '#111111', '#7d8288', '#c2a878', '#4b3621', '#1d3b2a']),
    shoes: pick(SHOES), shoeColor: p(['#f2f2f2', '#111111', '#c41e3a', '#3a7bd5', '#c2a878']),
    chain: rng() < 0.4, shades: rng() < 0.2, watch: rng() < 0.3, earrings: rng() < 0.3,
  };
}

// ------------------------------------------------------------------ progression
export const credLevel = (xp) => Math.floor((1 + Math.sqrt(1 + xp / 125)) / 2);
export const credForLevel = (lvl) => 500 * lvl * (lvl - 1); // inverse of credLevel
