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

## Pictures

Every shape comes with starter art in `assets/shapes/<shape>/`:

| Shape | Starter pictures | Uploaded pictures |
| --- | --- | --- |
| triangle | pizza slice, party hat, mountain peak | 11 |
| circle | orange, clock face | 13 |
| square | gift box, window, snack cracker | 5 |
| rectangle | story book, chocolate bar, envelope, bus | 7 |
| star | magic wand, sheriff badge, space rocket | 5 |

The uploaded pictures were sorted into those folders from the loose files that used to sit
directly in `assets/shapes/`. They were shrunk to at most 512 px wide so a round loads
quickly on a classroom screen.

### Checking the sort

Open **`picture-sorter.html`** to see every picture next to the folder it was filed under.
Click a different shape on a card to move it, then press **SALIN DAFTAR KOREKSI** and paste
the copied list into a reply so the folders and `game.js` can be corrected.

Add your own starter pictures by dropping files into the matching folder and listing their **relative** paths in `game.js`:

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

Place the optional `Rush E_1.mp3` file in the project root. The game will loop it during a round. If the file is missing or cannot play, the game continues normally with its built-in sound effects.
