# Shape Catcher

A classroom-friendly, big-screen vocabulary game for **triangle, circle, square, rectangle,** and **star**. It is a dependency-free static web app, designed for a 16:9 Smart TV or projector and also usable on touch screens.

## Run it

Open `index.html`, or serve the folder locally (recommended so browser storage works consistently):

```bash
python3 -m http.server 4173 --bind 0.0.0.0
```

Then open `http://localhost:4173`.

The game also works when it is published inside a sub-folder — for example `https://your-name.github.io/catching/` — as long as the whole folder is uploaded together.

## Play

1. Choose a target shape.
2. After the two-second **GET READY!** countdown, move the catcher with **← / →** or **A / D**. You can also drag in the play area or press and hold the on-screen arrows.
3. Catch matching pictures for **15 points**. Catching a different shape costs one of three lives. Let other pictures pass by.
4. A round ends after two minutes or when all three lives are gone. If you switch tabs or the screen locks, the round pauses and continues where it stopped.

The sound button mutes or unmutes music and effects. Short sound effects are synthesized by the browser, so they work even when no sound files are present.

## Play area and the mini HUD

The play area (the arena) takes almost the whole screen: while a round is running the page
drops its footer and wide margins, so pictures fall from much higher and stay in the air
longer on a projector or Smart TV.

Everything that used to sit above the arena now floats **inside** it as small chips:

| Chip | Default |
| --- | --- |
| Lives (small hearts) | always visible |
| Score | hidden |
| Time left | hidden |
| **CATCH THE …** banner | hidden |

Press the little round gauge button in the top-right corner of the arena — or press **H** —
to show or hide the score, the timer and the target banner. The choice is remembered in
that browser for the next round.

## Pictures

Every shape has its own folder in `assets/shapes/<shape>/`, and **every file in that folder
falls as that shape**. The library that ships with the game:

| Shape | Pictures | What falls |
| --- | --- | --- |
| triangle | 14 | pizza slice, watermelon slice, sandwich, tortilla chip, triangle clock, road sign, pyramid puzzle, pyramid eye, triangle logo, two cartoon triangles, party hat, mountain peak |
| circle | 10 | soccer ball, donut, pizza, wall clock, coin, full moon, yin-yang, round logo, orange, clock face |
| square | 11 | chess board, square clock, grilled sandwich, handkerchief, warning sign, processor chip, square logo, cube, gift box, window, cracker |
| rectangle | 12 | book, door, television, playing card, two flags, lunch tray, tall towers, story book, chocolate bar, envelope, bus |
| star | 7 | yellow star, starfish, paper star, six-point star, magic wand, sheriff badge, space rocket |

Every one of those raster pictures is one of the files that was originally uploaded loose
into `assets/shapes/`. They were sorted into the folder matching their outline, shrunk to at
most 512 px, and renamed after the object they show (`soccer-ball.png`, `denmark-flag.png`,
`glazed-donut.png`, …). Transparent backgrounds were kept, and the two photos that arrived
with a black or white background had that background removed.

### Checking the sort

Open **`picture-sorter.html`** to see every picture next to the folder it was filed under.
Click a different shape on a card to move it, then press **SALIN DAFTAR KOREKSI** and paste
the copied list into a reply so the folders and `game.js` can be corrected.

`assets/shapes/mixed/` holds pictures that show **several** shapes at once (the shape
sticker sheet). They are deliberately not used as falling objects, because they have no
single right answer.

All raster pictures are stored at a maximum of 512 px and are preloaded in the background,
so the whole library is about 1.4 MB and a picture is already decoded before it falls.

Add your own starter pictures by dropping files into the matching folder and listing their
**relative** paths in `game.js`:

```js
const shapeAssets = {
  triangle: ['assets/shapes/triangle/pizza-slice.svg', 'assets/shapes/triangle/my-picture.png'],
  circle: ['assets/shapes/circle/orange.svg'],
  square: ['assets/shapes/square/gift-box.svg'],
  rectangle: ['assets/shapes/rectangle/story-book.svg'],
  star: ['assets/shapes/star/magic-wand.svg'],
};
```

### Picture paths must stay relative

Write `assets/shapes/...`, never `/assets/shapes/...`. A leading slash points at the root of whatever hosts the game:

| Path | Opened from a folder | Published in `/catching/` |
| --- | --- | --- |
| `assets/shapes/star/magic-wand.svg` | ✅ works | ✅ works |
| `/assets/shapes/star/magic-wand.svg` | ❌ looks for `file:///assets/...` | ❌ looks for `/assets/...` on the host root |

If a file is missing or misspelled the game keeps playing: that picture is replaced by the shape symbol, and the browser console explains which path failed.

## Teacher pictures

Open **OBJECT LIBRARY**, choose a shape row, and select **ADD PICTURES**. Each row assigns its uploads to that shape; uploaded pictures fall alongside the built-in starter art. Uploads are kept locally in that browser using IndexedDB and are never sent to a server. Use the × on an uploaded thumbnail to remove it.

Accepted teacher uploads can be PNG, JPG, GIF, SVG, and other browser-supported image types.

## Background music

The game looks for a music file in these places, in order, and loops the first one it
finds during a round. You only need **one** of them:

| Where to put it | File name |
| --- | --- |
| project root (next to `index.html`) | `Rush E_1.mp3` |
| `assets/audio/` | `Rush E_1.mp3` |
| `assets/audio/` | `rush-e.mp3` |
| `assets/audio/` | `background-music.mp3` |
| `assets/audio/` | `background-music.ogg` |
| `assets/music/` | `Rush E_1.mp3` |

No code change is needed — drop the file in and reload the page. `assets/audio/` is
committed with a `README.md` inside it so the folder always exists in Git.

### Uploading it on GitHub

1. Open the repository on github.com.
2. **Add file → Upload files** (or open the `assets/audio/` folder first and press
   **Add file** there).
3. Drag `Rush E_1.mp3` into the box, press **Commit changes**.
4. Wait for the Pages deploy to finish, then reload the game.

If the file is missing or cannot play, the game continues normally with its built-in
sound effects, and the browser console lists the paths it looked for.

## Round pacing

A round is two minutes long. Pictures speed up gradually across the whole round
(1x -> 2.25x, one step every 20 seconds) instead of spiking early, and about half of the
pictures that fall belong to the shape the class is hunting - with a hard rule that never
more than three non-matching pictures fall in a row.
