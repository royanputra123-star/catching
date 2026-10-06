# Shape Catcher

A classroom-friendly, big-screen vocabulary game for **triangle, circle, square, rectangle,** and **star**. It is a dependency-free static web app, designed for a 16:9 Smart TV or projector and also usable on touch screens.

## Run it

Open `index.html`, or serve the folder locally (recommended so browser storage works consistently):

```bash
python3 -m http.server 4173 --bind 0.0.0.0
```

Then open `http://localhost:4173`.

## Play

1. Choose a target shape.
2. After the two-second **GET READY!** countdown, move the catcher with **← / →** or **A / D**. You can also drag in the play area or press and hold the on-screen arrows.
3. Catch matching pictures for **15 points**. Catching a different shape costs one of three lives. Let other pictures pass by.
4. A round ends after two minutes or when all three lives are gone.

The sound button mutes or unmutes music and effects. Short sound effects are synthesized by the browser, so they work even when no sound files are present.

## Teacher pictures

Open **OBJECT LIBRARY**, choose a shape row, and select **ADD PICTURES**. Each row assigns its uploads to that shape; uploaded pictures fall alongside the built-in starter art. Uploads are kept locally in that browser using IndexedDB and are never sent to a server. Use the × on an uploaded thumbnail to remove it.

Starter images can also be added directly in `game.js`:

```js
const shapeAssets = {
  triangle: ['/assets/shapes/triangle/pizza-slice.svg', '/assets/shapes/triangle/another-picture.png'],
  circle: ['/assets/shapes/circle/orange.svg'],
  square: ['/assets/shapes/square/gift-box.svg'],
  rectangle: ['/assets/shapes/rectangle/story-book.svg'],
  star: ['/assets/shapes/star/magic-wand.svg'],
};
```

Add the corresponding files under `assets/shapes/<shape>/` and include their paths in the list. Accepted teacher uploads can be PNG, JPG, GIF, SVG, and other browser-supported image types.

## Background music

Place the optional `Rush E_1.mp3` file in the project root. The game will loop it during a round. If the file is missing or cannot play, the game continues normally with its built-in sound effects.
