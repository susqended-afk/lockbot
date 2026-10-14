# RUGGED

A first-person memecoin satire game set in your mom's basement. Launch coins,
post on Chirp to pull in buyers, grow a following, and decide every time:
run a real coin and earn creator fees, or rug it for more money and watch
your followers turn on you.

Run it with any static server, for example `npx serve rugged`, then open
`index.html`. `node tools/build.mjs` rebuilds `index.html` from `src/`.

## Layout

- `src/` — game source, concatenated in filename order into one module
- `assets/` — photo textures and the sofa model (see Credits)
- `tools/` — balance simulations and a headless preview renderer

## Credits

- Brick and pine plank textures: three.js examples (`examples/textures`)
- Coin art: Microsoft Fluent Emoji 3D, MIT (`assets/emoji/LICENSE.txt`)
- Glam Velvet Sofa: Khronos glTF Sample Assets, CC BY 4.0 (`assets/sofa-LICENSE.md`)
