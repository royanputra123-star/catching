/*
 * SHAPE CATCHER — Classroom Arcade
 *
 * Add starter pictures by dropping image paths into the shapeAssets arrays below.
 * Teacher uploads added in the Object Library are stored locally in this browser.
 */

const shapeOrder = ['triangle', 'circle', 'square', 'rectangle', 'star'];

const shapeInfo = {
  triangle: { label: 'TRIANGLE', symbol: '▲', color: '#5df3ed', glow: 'rgba(65, 239, 225, .42)' },
  circle: { label: 'CIRCLE', symbol: '●', color: '#ff78c4', glow: 'rgba(255, 93, 178, .42)' },
  square: { label: 'SQUARE', symbol: '■', color: '#b89aff', glow: 'rgba(158, 110, 255, .45)' },
  rectangle: { label: 'RECTANGLE', symbol: '▰', color: '#81c7ff', glow: 'rgba(85, 151, 255, .45)' },
  star: { label: 'STAR', symbol: '★', color: '#ffdb6c', glow: 'rgba(255, 195, 71, .45)' },
};

// Starter image assets. Add more paths to any list to give that shape more variety.
// IMPORTANT: keep these paths RELATIVE (no leading "/"). A leading slash points at the
// root of the host, so on a file:// page it resolves to file:///assets/... and on a
// project page such as https://user.github.io/catching/ it resolves to the wrong folder.
// Relative paths work everywhere: opened from disk, served from a folder, or hosted in a
// sub-directory (GitHub Pages, Netlify sub-paths, classroom intranet folders...).
const shapeAssets = {
  triangle: [
    // Photo objects
    'assets/shapes/triangle/pizza-slice-photo.png',
    'assets/shapes/triangle/watermelon-slice.png',
    'assets/shapes/triangle/triangle-sandwich.png',
    'assets/shapes/triangle/tortilla-chip.png',
    'assets/shapes/triangle/triangle-clock.png',
    'assets/shapes/triangle/warning-road-sign.png',
    'assets/shapes/triangle/pyramid-puzzle-cube.png',
    'assets/shapes/triangle/pyramid-eye.png',
    'assets/shapes/triangle/drive-triangle-logo.png',
    'assets/shapes/triangle/triangle-cartoon-buddy.png',
    'assets/shapes/triangle/triangle-cartoon-fish.png',
    // Drawn starter art
    'assets/shapes/triangle/pizza-slice.svg',
    'assets/shapes/triangle/party-hat.svg',
    'assets/shapes/triangle/mountain-peak.svg',
  ],
  circle: [
    // Photo objects
    'assets/shapes/circle/soccer-ball.png',
    'assets/shapes/circle/glazed-donut.png',
    'assets/shapes/circle/whole-pizza.png',
    'assets/shapes/circle/round-wall-clock.png',
    'assets/shapes/circle/rupiah-coin.png',
    'assets/shapes/circle/full-moon.png',
    'assets/shapes/circle/yin-yang.png',
    'assets/shapes/circle/bull-round-logo.png',
    // Drawn starter art
    'assets/shapes/circle/orange.svg',
    'assets/shapes/circle/clock-face.svg',
  ],
  square: [
    // Photo objects
    'assets/shapes/square/chess-board.png',
    'assets/shapes/square/square-wall-clock.png',
    'assets/shapes/square/grilled-sandwich.png',
    'assets/shapes/square/plaid-handkerchief.png',
    'assets/shapes/square/attention-square-sign.png',
    'assets/shapes/square/computer-processor.png',
    'assets/shapes/square/roblox-logo.png',
    'assets/shapes/square/earth-cube.png',
    // Drawn starter art
    'assets/shapes/square/gift-box.svg',
    'assets/shapes/square/window-box.svg',
    'assets/shapes/square/snack-cracker.svg',
  ],
  rectangle: [
    // Photo objects
    'assets/shapes/rectangle/red-story-book.png',
    'assets/shapes/rectangle/wooden-door.png',
    'assets/shapes/rectangle/flat-television.png',
    'assets/shapes/rectangle/playing-card.png',
    'assets/shapes/rectangle/denmark-flag.png',
    'assets/shapes/rectangle/philippine-flag.png',
    'assets/shapes/rectangle/lunch-food-tray.png',
    'assets/shapes/rectangle/tall-twin-towers.png',
    // Drawn starter art
    'assets/shapes/rectangle/story-book.svg',
    'assets/shapes/rectangle/chocolate-bar.svg',
    'assets/shapes/rectangle/envelope-letter.svg',
    'assets/shapes/rectangle/bus-driver.svg',
  ],
  star: [
    // Photo objects
    'assets/shapes/star/yellow-star.png',
    'assets/shapes/star/starfish.png',
    'assets/shapes/star/paper-star.png',
    'assets/shapes/star/six-point-star.png',
    // Drawn starter art
    'assets/shapes/star/magic-wand.svg',
    'assets/shapes/star/sheriff-badge.svg',
    'assets/shapes/star/space-rocket.svg',
  ],
};

// Roughly how often the picture that falls belongs to the shape the class is hunting.
// Picking all five shapes with equal odds made the target appear only 1 time in 5, which
// left long stretches with nothing to catch.
const TARGET_SPAWN_SHARE = 0.5;
// Hard guarantee: never let this many non-matching pictures fall in a row.
const MAX_NON_TARGET_STREAK = 3;

const GAME_DURATION_SECONDS = 120;
const STARTING_LIVES = 3;
const POINTS_PER_CATCH = 15;
const READY_DURATION_MS = 2000;

const selectionScreen = document.getElementById('selection-screen');
const gameScreen = document.getElementById('game-screen');
const resultsScreen = document.getElementById('results-screen');
const libraryDialog = document.getElementById('library-dialog');
const libraryOpenButton = document.getElementById('library-open');
const soundToggle = document.getElementById('sound-toggle');
const arena = document.getElementById('arena');
const fallingLayer = document.getElementById('falling-layer');
const effectLayer = document.getElementById('effect-layer');
const catcher = document.getElementById('catcher');
const readyOverlay = document.getElementById('ready-overlay');
const speedNotice = document.getElementById('speed-notice');
const timerCard = document.querySelector('.timer-card');
const scoreCard = document.getElementById('score-card');
const hudToggle = document.getElementById('hud-toggle');

// Background music is optional. The game tries these files in order and plays the first
// one it finds, so a teacher can drop "Rush E" in the project root OR in assets/audio/.
//   • Rush E_1.mp3                  ← next to index.html (project root)
//   • assets/audio/Rush E_1.mp3     ← same file name, tidied into a folder
//   • assets/audio/rush-e.mp3       ← renamed without spaces
//   • assets/audio/background-music.mp3 / .ogg
// Any of them works; if none exist the game simply plays with sound effects only.
const MUSIC_SOURCES = [
  'Rush%20E_1.mp3',
  'assets/audio/Rush%20E_1.mp3',
  'assets/audio/rush-e.mp3',
  'assets/audio/background-music.mp3',
  'assets/audio/background-music.ogg',
  'assets/music/Rush%20E_1.mp3',
];

const music = new Audio();
let musicSourceIndex = 0;
let musicCurrentSource = '';

music.loop = true;
music.preload = 'none';
music.volume = 0.2;

function loadMusicSource() {
  musicCurrentSource = MUSIC_SOURCES[musicSourceIndex];
  music.setAttribute('src', musicCurrentSource);
}

let gameState = 'idle'; // idle, ready, playing, finished
let selectedShape = null;
let score = 0;
let lives = STARTING_LIVES;
let shapesCaught = 0;
let wrongCatches = 0;
let elapsedSeconds = 0;
let bestSpeed = 1;
let startedAt = 0;
let lastFrameAt = 0;
let nextSpawnAt = 0;
let animationFrame = 0;
let readyTimeout = 0;
let currentX = 0;
let desiredX = 0;
let dragPointerId = null;
let pausedAt = 0;
let soundEnabled = true;
let musicUnavailable = false;
let audioContext = null;
let uploadedAssets = [];
let assetDatabase = null;
let assetDatabaseUnavailable = false;
let nonTargetStreak = 0;
let catcherWidth = 0;
let catcherHeight = 0;
const fallingObjects = [];
const heldDirections = { left: false, right: false };
// One shuffled "bag" per shape so the same picture does not fall twice in a row.
const spawnBags = new Map();
// Pictures are decoded once and kept warm, so a falling object is never an empty frame.
const imageCache = new Map();

const keyToDirection = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
};

// Local teacher uploads are stored as image Blobs in IndexedDB, not sent anywhere.
function openAssetDatabase() {
  if (!('indexedDB' in window)) return Promise.resolve(null);

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open('shape-catcher-library', 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains('images')) {
        database.createObjectStore('images', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open image storage.'));
    request.onblocked = () => reject(new Error('Image storage is busy in another tab.'));
  });
}

function databaseRequest(storeName, mode, action) {
  if (!assetDatabase) return Promise.reject(new Error('Local image storage is unavailable.'));

  return new Promise((resolve, reject) => {
    let result;
    const transaction = assetDatabase.transaction(storeName, mode);
    const request = action(transaction.objectStore(storeName));
    request.onsuccess = () => { result = request.result; };
    request.onerror = () => reject(request.error || new Error('Image library request failed.'));
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error || new Error('Image library could not be updated.'));
    transaction.onabort = () => reject(transaction.error || new Error('Image library update was cancelled.'));
  });
}

// Every picture gets a short list of places to load from, so a leading-slash path or a
// moved file still resolves instead of leaving an empty tile on screen.
function assetSourceCandidates(src) {
  if (typeof src !== 'string' || !src) return [];
  const candidates = [src];
  const relative = src.replace(/^\/+/, '');
  if (relative && relative !== src) candidates.push(relative);
  return candidates;
}

// Attaches an <img> to a tile and walks through its candidate sources. If none of them
// load, `onAllFailed` draws a friendly fallback so the round never breaks.
function attachPicture(image, sources, onAllFailed) {
  const list = (sources || []).filter(Boolean);
  let index = 0;
  let finished = false;
  const tryNextSource = () => {
    if (finished) return; // browsers may fire "error" more than once for one picture
    index += 1;
    if (index < list.length) {
      image.src = list[index];
      return;
    }
    finished = true;
    image.remove();
    if (typeof onAllFailed === 'function') onAllFailed();
  };
  image.addEventListener('error', tryNextSource);
  if (list.length) image.src = list[0];
  else tryNextSource();
  return list;
}

// A dropped picture shows the shape symbol instead, so children can still play and learn.
function addFallbackGlyph(container, shape, extraClassName) {
  const info = shapeInfo[shape];
  const glyph = document.createElement('span');
  glyph.className = `missing-picture ${extraClassName || ''}`.trim();
  glyph.style.setProperty('--object-color', info.color);
  glyph.style.setProperty('--object-glow', info.glow);
  glyph.textContent = info.symbol;
  glyph.setAttribute('aria-hidden', 'true');
  container.append(glyph);
  return glyph;
}

function warnMissingPicture(asset) {
  console.warn(
    `Shape Catcher: the picture "${asset.name}" (${asset.src}) could not be loaded, ` +
      `so the ${shapeInfo[asset.shape].label.toLowerCase()} symbol is shown instead. ` +
      'Check that the file exists under assets/ and that the path in shapeAssets is spelled correctly.',
  );
}

function getAssetsFor(shape) {
  const builtInAssets = (shapeAssets[shape] || []).map((src, index) => ({
    id: `starter-${shape}-${index}`,
    shape,
    name: friendlyFileName(src),
    src,
    sources: assetSourceCandidates(src),
    uploaded: false,
  }));
  const teacherAssets = uploadedAssets
    .filter((asset) => asset.shape === shape)
    .map((asset) => ({ ...asset, sources: [asset.src], uploaded: true }));
  return [...builtInAssets, ...teacherAssets];
}

function friendlyFileName(path) {
  const fileName = path.split('/').pop() || 'picture';
  return fileName.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
}

// Warm the browser cache so the very first time a picture falls it is already decoded.
// Without this the tile stays blank for a moment and the shape cannot be recognised.
function preloadPicture(src) {
  if (typeof src !== 'string' || !src || imageCache.has(src)) return;
  const image = new Image();
  image.decoding = 'async';
  image.addEventListener('error', () => imageCache.delete(src), { once: true });
  image.src = src;
  imageCache.set(src, image);
}

function preloadStarterPictures() {
  for (const shape of shapeOrder) {
    for (const src of shapeAssets[shape] || []) preloadPicture(src);
  }
}

function schedulePreload() {
  const run = () => preloadStarterPictures();
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(run, { timeout: 1200 });
  else window.setTimeout(run, 250);
}

// The library changed (upload/removal/restore), so the shuffled spawn bags are stale.
function resetSpawnBags() {
  spawnBags.clear();
  nonTargetStreak = 0;
}

function shuffled(list) {
  const copy = [...list];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

// Draw the next picture for a shape from its bag; refill (and reshuffle) when empty.
function takeAssetFor(shape) {
  const assets = getAssetsFor(shape);
  if (!assets.length) return null;
  let bag = spawnBags.get(shape);
  if (!Array.isArray(bag) || bag.length === 0) {
    bag = shuffled(assets);
    spawnBags.set(shape, bag);
  }
  const asset = bag.pop();
  // The bag can hold a picture a teacher has just deleted; fall back to a fresh pick.
  return assets.some((item) => item.id === asset.id) ? asset : assets[Math.floor(Math.random() * assets.length)];
}

function shapesWithPictures() {
  return shapeOrder.filter((shape) => getAssetsFor(shape).length > 0);
}

// Weighted pick: about half of the pictures match the shape the class chose, and a
// long run of non-matching pictures is impossible.
function pickSpawnShape() {
  const playable = shapesWithPictures();
  if (!playable.length) return null;
  if (!selectedShape || !playable.includes(selectedShape)) {
    return playable[Math.floor(Math.random() * playable.length)];
  }
  const others = playable.filter((shape) => shape !== selectedShape);
  if (!others.length) return selectedShape;
  if (nonTargetStreak >= MAX_NON_TARGET_STREAK || Math.random() < TARGET_SPAWN_SHARE) {
    nonTargetStreak = 0;
    return selectedShape;
  }
  nonTargetStreak += 1;
  return others[Math.floor(Math.random() * others.length)];
}

function measureCatcher() {
  const bounds = catcher.getBoundingClientRect();
  if (bounds.width) catcherWidth = bounds.width;
  if (bounds.height) catcherHeight = bounds.height;
}

function catcherHalfWidth() {
  if (!catcherWidth) measureCatcher();
  return catcherWidth / 2;
}

function updateAssetCounts() {
  let total = 0;
  for (const shape of shapeOrder) {
    const count = getAssetsFor(shape).length;
    total += count;
    const countLabel = document.getElementById(`count-${shape}`);
    if (countLabel) countLabel.textContent = `${count} ${count === 1 ? 'PICTURE' : 'PICTURES'}`;
  }
  document.getElementById('total-assets-count').textContent = String(total);
}

function setLibraryNote(message, isStatus = false) {
  const note = document.getElementById('library-note-text');
  if (!note) return;
  note.textContent = message;
  document.getElementById('library-note').classList.toggle('is-status', isStatus);
}

function renderLibrary() {
  const list = document.getElementById('library-list');
  list.replaceChildren();

  for (const shape of shapeOrder) {
    const info = shapeInfo[shape];
    const row = document.createElement('section');
    row.className = `library-row library-${shape}`;
    row.setAttribute('aria-label', `${info.label} pictures`);

    const shapeCell = document.createElement('div');
    shapeCell.className = 'library-shape';
    const shapeIcon = document.createElement('span');
    shapeIcon.className = 'library-shape-icon';
    shapeIcon.style.setProperty('--shape-color', info.color);
    shapeIcon.setAttribute('aria-hidden', 'true');
    shapeIcon.textContent = info.symbol;
    const shapeName = document.createElement('span');
    shapeName.className = 'library-shape-name';
    shapeName.textContent = info.label;
    shapeCell.append(shapeIcon, shapeName);

    const gallery = document.createElement('div');
    gallery.className = 'library-gallery';
    gallery.setAttribute('aria-label', `${getAssetsFor(shape).length} ${info.label.toLowerCase()} pictures`);
    for (const asset of getAssetsFor(shape)) {
      const item = document.createElement('div');
      item.className = 'library-item';
      const image = document.createElement('img');
      image.alt = `${asset.name}, for ${info.label.toLowerCase()}`;
      image.loading = 'lazy';
      item.append(image);
      attachPicture(image, asset.sources, () => {
        addFallbackGlyph(item, shape, 'library-missing-picture');
        warnMissingPicture(asset);
      });
      const name = document.createElement('span');
      name.className = 'library-item-name';
      name.textContent = asset.name;
      item.append(name);

      if (asset.uploaded) {
        const remove = document.createElement('button');
        remove.className = 'library-item-remove';
        remove.type = 'button';
        remove.textContent = '×';
        remove.setAttribute('aria-label', `Remove ${asset.name} from ${info.label.toLowerCase()} pictures`);
        remove.addEventListener('click', () => removeUploadedAsset(asset.id));
        item.append(remove);
      }
      gallery.append(item);
    }

    const uploadLabel = document.createElement('label');
    uploadLabel.className = 'upload-button';
    uploadLabel.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v5h14v-5"/></svg><span>ADD PICTURES</span>';
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.multiple = true;
    fileInput.setAttribute('aria-label', `Add pictures for ${info.label.toLowerCase()}`);
    fileInput.addEventListener('change', async (event) => {
      const files = [...event.target.files];
      if (files.length) await importImages(shape, files);
      event.target.value = '';
    });
    uploadLabel.append(fileInput);
    row.append(shapeCell, gallery, uploadLabel);
    list.append(row);
  }
}

async function importImages(shape, files) {
  const accepted = files.filter((file) => file.type.startsWith('image/'));
  if (accepted.length === 0) {
    setLibraryNote('Please choose image files such as PNG, JPG, GIF, or SVG.', true);
    return;
  }

  let savedCount = 0;
  for (const file of accepted) {
    const id = `${shape}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const record = {
      id,
      shape,
      name: file.name || `${shape}-picture`,
      blob: file,
      type: file.type,
      addedAt: Date.now(),
    };

    try {
      if (assetDatabase) await databaseRequest('images', 'readwrite', (store) => store.put(record));
      const src = URL.createObjectURL(file);
      uploadedAssets.push({ ...record, src });
      savedCount += 1;
    } catch (error) {
      console.warn('Shape Catcher could not save this picture permanently:', error);
      // Keep the selected picture available for this visit even if browser storage is full.
      try {
        const src = URL.createObjectURL(file);
        uploadedAssets.push({ ...record, src });
        savedCount += 1;
      } catch {
        // An invalid or unsupported image should never stop a round from being played.
      }
      assetDatabaseUnavailable = true;
    }
  }

  resetSpawnBags();
  updateAssetCounts();
  renderLibrary();
  const shapeLabel = shapeInfo[shape].label.toLowerCase();
  if (assetDatabaseUnavailable) {
    setLibraryNote(`${savedCount} ${savedCount === 1 ? 'picture is' : 'pictures are'} ready for ${shapeLabel}. Browser storage is unavailable, so they may not stay after closing this tab.`, true);
  } else {
    setLibraryNote(`${savedCount} ${savedCount === 1 ? 'picture added' : 'pictures added'} for ${shapeLabel}. They are saved in this browser.`, true);
  }
}

async function removeUploadedAsset(id) {
  const asset = uploadedAssets.find((item) => item.id === id);
  if (!asset) return;
  if (assetDatabase) {
    try {
      await databaseRequest('images', 'readwrite', (store) => store.delete(id));
    } catch (error) {
      console.warn('Shape Catcher could not remove this picture from browser storage:', error);
    }
  }
  URL.revokeObjectURL(asset.src);
  uploadedAssets = uploadedAssets.filter((item) => item.id !== id);
  resetSpawnBags();
  updateAssetCounts();
  renderLibrary();
  setLibraryNote(`${asset.name} was removed from ${shapeInfo[asset.shape].label.toLowerCase()} pictures.`, true);
}

async function loadSavedAssets() {
  try {
    assetDatabase = await openAssetDatabase();
    if (!assetDatabase) {
      assetDatabaseUnavailable = true;
      return;
    }
    const savedRecords = await databaseRequest('images', 'readonly', (store) => store.getAll());
    uploadedAssets = (savedRecords || [])
      .filter((record) => record && record.blob && shapeInfo[record.shape])
      .map((record) => ({ ...record, src: URL.createObjectURL(record.blob) }));
    resetSpawnBags();
    updateAssetCounts();
    if (libraryDialog.open) renderLibrary();
  } catch (error) {
    assetDatabaseUnavailable = true;
    console.info('The game will work without persistent picture storage.', error);
  }
}

function setScreen(screenName) {
  selectionScreen.hidden = screenName !== 'selection';
  gameScreen.hidden = screenName !== 'game';
  resultsScreen.hidden = screenName !== 'results';
  libraryOpenButton.disabled = gameState === 'playing' || gameState === 'ready';
  // During a round the page chrome (footer padding, wide margins) steps aside so the
  // arena can stretch across the whole screen.
  document.body.classList.toggle('is-playing', screenName === 'game');
}

// Minimal HUD: score, time and the "CATCH THE …" banner are hidden by default so the
// play area stays huge. The small gauge button (or the H key) brings them back, and the
// choice is remembered for the next round.
const HUD_STORAGE_KEY = 'shape-catcher:show-hud';

function isHudExpanded() {
  return document.body.classList.contains('show-game-hud');
}

function setHudExpanded(expanded) {
  document.body.classList.toggle('show-game-hud', expanded);
  hudToggle.setAttribute('aria-pressed', String(expanded));
  hudToggle.setAttribute('aria-label', expanded ? 'Hide score and time' : 'Show score and time');
  try {
    window.localStorage.setItem(HUD_STORAGE_KEY, expanded ? '1' : '0');
  } catch {
    // Private browsing modes can refuse storage; the toggle still works this session.
  }
}

hudToggle.addEventListener('click', () => setHudExpanded(!isHudExpanded()));
// The button floats over the arena, so a tap on it must not also drag the catcher.
hudToggle.addEventListener('pointerdown', (event) => event.stopPropagation());
window.addEventListener('keydown', (event) => {
  if (event.key !== 'h' && event.key !== 'H') return;
  if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
  const tagName = event.target && event.target.tagName ? event.target.tagName : '';
  if (tagName === 'INPUT' || tagName === 'TEXTAREA') return;
  setHudExpanded(!isHudExpanded());
});

function updateSoundButton() {
  soundToggle.setAttribute('aria-pressed', String(soundEnabled));
  soundToggle.setAttribute('aria-label', soundEnabled ? 'Mute game sounds' : 'Unmute game sounds');
  document.getElementById('sound-label').textContent = soundEnabled ? 'SOUND ON' : 'SOUND OFF';
}

function getAudioContext() {
  if (!soundEnabled) return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext) {
    try { audioContext = new AudioContextClass(); } catch { return null; }
  }
  if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
  return audioContext;
}

function playTone(frequency, duration, options = {}) {
  const context = getAudioContext();
  if (!context || !soundEnabled) return;
  try {
    const startAt = context.currentTime + (options.delay || 0);
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = options.type || 'sine';
    oscillator.frequency.setValueAtTime(frequency, startAt);
    if (options.endFrequency) oscillator.frequency.exponentialRampToValueAtTime(options.endFrequency, startAt + duration);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(options.volume || 0.045, startAt + Math.min(0.018, duration * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.025);
  } catch {
    // Browsers without audio support simply play silently.
  }
}

function playCorrectSound() {
  if (!soundEnabled) return;
  playTone(610, .15, { endFrequency: 850, volume: .052 });
  playTone(970, .22, { delay: .075, endFrequency: 1250, volume: .034 });
}

function playWrongSound() {
  if (!soundEnabled) return;
  playTone(220, .24, { type: 'triangle', endFrequency: 130, volume: .038 });
}

function playGameOverSound() {
  if (!soundEnabled) return;
  [440, 370, 294].forEach((frequency, index) => {
    playTone(frequency, .24, { delay: index * .16, type: 'sine', volume: .035 });
  });
}

function playVictorySound() {
  if (!soundEnabled) return;
  [523, 659, 784, 1047].forEach((frequency, index) => {
    playTone(frequency, .2, { delay: index * .11, endFrequency: frequency * 1.035, volume: .04 });
  });
}

// Called when a music file turns out to be missing or unplayable. It moves on to the
// next candidate in MUSIC_SOURCES so one wrong file name never silences the round.
function skipMusicSource() {
  if (musicUnavailable) return;
  // Both the error event and a rejected play() promise can report the same missing
  // file; comparing the source keeps the game from skipping two candidates at once.
  if ((music.getAttribute('src') || '') !== musicCurrentSource) return;
  musicSourceIndex += 1;
  if (musicSourceIndex >= MUSIC_SOURCES.length) {
    musicUnavailable = true;
    console.info('No background music found. Put "Rush E_1.mp3" in the project root or in assets/audio/ to add a soundtrack.');
    return;
  }
  loadMusicSource();
}

function startBackgroundMusic() {
  if (!soundEnabled || musicUnavailable || gameState !== 'playing') return;
  if (!music.getAttribute('src')) {
    musicSourceIndex = 0;
    loadMusicSource();
  }
  try {
    const playback = music.play();
    if (playback && typeof playback.catch === 'function') {
      playback.catch(() => {
        // Missing music file: try the next name/folder, then give up quietly.
        skipMusicSource();
        if (!musicUnavailable && gameState === 'playing') startBackgroundMusic();
      });
    }
  } catch {
    // Unsupported or missing background audio never blocks the game.
    skipMusicSource();
  }
}

function stopBackgroundMusic() {
  try {
    music.pause();
    music.currentTime = 0;
  } catch {
    // Missing/unsupported audio is intentionally ignored.
  }
}

music.addEventListener('error', skipMusicSource);

// The ramp is spread over the whole two-minute round. The old curve reached 6x after
// 50 seconds, which made pictures cross the arena faster than a child can react and
// left more than a minute of unplayable round.
function speedMultiplierAt(seconds) {
  if (seconds < 20) return 1;
  if (seconds < 40) return 1.25;
  if (seconds < 60) return 1.5;
  if (seconds < 80) return 1.75;
  if (seconds < 100) return 2;
  return 2.25;
}

function formatSpeed(multiplier) {
  return `${Number.isInteger(multiplier) ? multiplier : multiplier.toFixed(1)}×`;
}

function showSpeedUp(multiplier) {
  document.getElementById('speed-label').textContent = `SPEED ${formatSpeed(multiplier)}`;
  speedNotice.classList.remove('show');
  // Restart the one-second entrance/exit animation if this fires again.
  void speedNotice.offsetWidth;
  speedNotice.classList.add('show');
}

function setTargetVisuals(shape) {
  const info = shapeInfo[shape];
  document.getElementById('target-symbol').textContent = info.symbol;
  document.getElementById('ready-symbol').textContent = info.symbol;
  document.getElementById('ready-symbol').style.color = info.color;
  document.getElementById('target-word').textContent = `${info.label}!`;
  document.getElementById('ready-title').textContent = info.label;
  document.getElementById('target-banner').style.setProperty('--target-color', info.color);
  document.getElementById('target-banner').style.setProperty('--target-glow', info.glow);
  document.getElementById('target-symbol').style.color = info.color;
  document.getElementById('target-word').style.color = info.color;
  document.getElementById('ready-title').style.color = info.color;
}

function startRound(shape) {
  if (!shapeInfo[shape]) return;
  // Warm up Web Audio inside the click gesture so catches can sound on classroom browsers.
  getAudioContext();
  if (readyTimeout) window.clearTimeout(readyTimeout);
  if (animationFrame) cancelAnimationFrame(animationFrame);
  stopBackgroundMusic();
  clearFallingObjects();
  effectLayer.replaceChildren();

  selectedShape = shape;
  gameState = 'ready';
  score = 0;
  lives = STARTING_LIVES;
  shapesCaught = 0;
  wrongCatches = 0;
  elapsedSeconds = 0;
  bestSpeed = 1;
  startedAt = 0;
  nextSpawnAt = 0;
  pausedAt = 0;
  heldDirections.left = false;
  heldDirections.right = false;
  dragPointerId = null;

  setTargetVisuals(shape);
  document.getElementById('score-number').textContent = '0';
  document.getElementById('timer-number').textContent = '02:00';
  timerCard.classList.remove('is-urgent');
  scoreCard.classList.remove('is-popping');
  updateLivesDisplay();
  setScreen('game');
  readyOverlay.classList.remove('is-leaving');
  speedNotice.classList.remove('show');
  arena.classList.remove('wrong-shake');
  catcher.classList.remove('is-correct', 'is-wrong');

  resetSpawnBags();
  // The GET READY countdown doubles as a loading window for this round's pictures.
  preloadStarterPictures();

  requestAnimationFrame(() => {
    measureCatcher();
    const center = arena.clientWidth / 2;
    currentX = center;
    desiredX = center;
    catcher.style.left = `${center}px`;
  });

  scheduleReadyCountdown();
}

function scheduleReadyCountdown(delay = READY_DURATION_MS) {
  if (readyTimeout) window.clearTimeout(readyTimeout);
  readyTimeout = window.setTimeout(() => {
    readyTimeout = 0;
    beginPlay();
  }, delay);
}

function beginPlay() {
  if (gameState !== 'ready') return;
  gameState = 'playing';
  readyOverlay.classList.add('is-leaving');
  startedAt = performance.now();
  lastFrameAt = startedAt;
  nextSpawnAt = startedAt + 260;
  startBackgroundMusic();
  animationFrame = requestAnimationFrame(gameLoop);
}

// Switching tabs, opening the library or a teacher's pop-up should not eat the round:
// the timer and the falling pictures freeze and then continue where they stopped.
function pauseRound() {
  if (pausedAt) return;
  if (gameState === 'playing') {
    pausedAt = performance.now();
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    heldDirections.left = false;
    heldDirections.right = false;
    dragPointerId = null;
    try { music.pause(); } catch { /* optional background music */ }
  } else if (gameState === 'ready') {
    pausedAt = performance.now();
    if (readyTimeout) window.clearTimeout(readyTimeout);
    readyTimeout = 0;
  }
}

function resumeRound() {
  if (!pausedAt) return;
  const pauseLength = performance.now() - pausedAt;
  pausedAt = 0;
  if (gameState === 'playing') {
    startedAt += pauseLength;
    nextSpawnAt += pauseLength;
    lastFrameAt = performance.now();
    startBackgroundMusic();
    if (!animationFrame) animationFrame = requestAnimationFrame(gameLoop);
  } else if (gameState === 'ready') {
    // Play the GET READY countdown again from the top so nobody misses the start.
    scheduleReadyCountdown();
  }
}

function clearFallingObjects() {
  for (const object of fallingObjects) object.element.remove();
  fallingObjects.length = 0;
  fallingLayer.replaceChildren();
}

function updateLivesDisplay() {
  const hearts = document.getElementById('hearts');
  hearts.replaceChildren();
  for (let index = 0; index < STARTING_LIVES; index += 1) {
    const heart = document.createElement('span');
    const alive = index < lives;
    heart.className = `heart${alive ? '' : ' is-lost'}`;
    heart.textContent = alive ? '❤️' : '💔';
    heart.setAttribute('aria-hidden', 'true');
    hearts.append(heart);
  }
  hearts.setAttribute('aria-label', `${lives} ${lives === 1 ? 'life' : 'lives'} remaining`);
}

function formatTime(secondsRemaining) {
  const wholeSeconds = Math.max(0, Math.ceil(secondsRemaining));
  const minutes = Math.floor(wholeSeconds / 60).toString().padStart(2, '0');
  const seconds = (wholeSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function spawnFallingObject() {
  const arenaWidth = arena.clientWidth;
  const arenaHeight = arena.clientHeight;
  if (!arenaWidth || !arenaHeight) return;

  const shape = pickSpawnShape();
  if (!shape) return;
  const asset = takeAssetFor(shape);
  if (!asset) return;

  // Pictures are a touch bigger than before so they stay readable when they start
  // falling from the top of a much taller arena.
  const maxSize = Math.min(132, Math.max(82, arenaWidth * .088));
  const minSize = Math.min(86, maxSize - 4);
  const size = minSize + Math.random() * (maxSize - minSize);
  const safeMargin = size / 2 + 13;
  const x = safeMargin + Math.random() * Math.max(1, arenaWidth - safeMargin * 2);
  const info = shapeInfo[shape];
  const element = document.createElement('div');
  element.className = `falling-object falling-${shape}`;
  element.setAttribute('role', 'img');
  element.setAttribute('aria-label', `${asset.name}, ${info.label.toLowerCase()}`);
  element.style.width = `${size}px`;
  element.style.height = `${size}px`;
  element.style.left = `${x - size / 2}px`;
  element.style.setProperty('--object-color', info.color);
  element.style.setProperty('--object-glow', info.glow);
  element.style.transform = `translate3d(0, ${-size}px, 0)`;

  const image = document.createElement('img');
  image.alt = '';
  image.draggable = false;
  image.decoding = 'async';
  element.append(image);
  // A picture that cannot be loaded falls back to the shape symbol instead of
  // disappearing, so the arena is never empty and every round stays playable.
  attachPicture(image, asset.sources, () => {
    addFallbackGlyph(element, shape);
    warnMissingPicture(asset);
  });
  fallingLayer.append(element);

  const baseSpeed = 148 + Math.random() * 42;
  fallingObjects.push({
    element,
    shape,
    x,
    y: -size,
    size,
    baseSpeed,
    name: asset.name,
  });
}

function gameLoop(now) {
  if (gameState !== 'playing' || pausedAt) return;
  const deltaSeconds = Math.min((now - lastFrameAt) / 1000, .055);
  lastFrameAt = now;
  elapsedSeconds = (now - startedAt) / 1000;

  if (elapsedSeconds >= GAME_DURATION_SECONDS) {
    document.getElementById('timer-number').textContent = '00:00';
    finishRound('time');
    return;
  }

  const speed = speedMultiplierAt(elapsedSeconds);
  if (speed > bestSpeed) {
    bestSpeed = speed;
    showSpeedUp(speed);
  }
  document.getElementById('timer-number').textContent = formatTime(GAME_DURATION_SECONDS - elapsedSeconds);
  timerCard.classList.toggle('is-urgent', GAME_DURATION_SECONDS - elapsedSeconds <= 10);

  moveCatcher(deltaSeconds);

  if (now >= nextSpawnAt) {
    spawnFallingObject();
    const spawnDelay = Math.max(620, 1460 / Math.sqrt(speed));
    nextSpawnAt = now + spawnDelay * (.78 + Math.random() * .45);
  }

  const arenaHeight = arena.clientHeight;
  // Measured only when unknown instead of three times per frame, so a busy arena never
  // thrashes layout and the round keeps a steady frame rate.
  if (!catcherWidth || !catcherHeight) measureCatcher();
  const catcherTop = arenaHeight - catcherHeight - 5;
  const halfCatcher = catcherWidth / 2;

  for (let index = fallingObjects.length - 1; index >= 0; index -= 1) {
    const object = fallingObjects[index];
    const previousY = object.y;
    object.y += object.baseSpeed * speed * deltaSeconds;
    object.element.style.transform = `translate3d(0, ${object.y}px, 0)`;

    const overlapsCatcherVertically = object.y + object.size >= catcherTop && object.y <= catcherTop + catcherHeight * .58;
    const overlapsCatcherHorizontally = Math.abs(object.x - currentX) <= halfCatcher + object.size * .32;
    if (overlapsCatcherVertically && overlapsCatcherHorizontally) {
      handleCatch(object);
      object.element.remove();
      fallingObjects.splice(index, 1);
      if (gameState !== 'playing') return;
      continue;
    }

    if (object.y > arenaHeight + object.size) {
      object.element.remove();
      fallingObjects.splice(index, 1);
    } else if (previousY < 0 && object.y >= 0) {
      // A newly visible picture gets a fresh chance to be announced to assistive tech.
      object.element.setAttribute('aria-label', `${object.name}, ${shapeInfo[object.shape].label.toLowerCase()} shape`);
    }
  }

  animationFrame = requestAnimationFrame(gameLoop);
}

function moveCatcher(deltaSeconds) {
  const width = arena.clientWidth;
  const half = catcherHalfWidth();
  if (!width) return;
  if (heldDirections.left !== heldDirections.right) {
    const direction = heldDirections.left ? -1 : 1;
    desiredX += direction * Math.max(410, width * .56) * deltaSeconds;
  }
  const minX = half + 9;
  const maxX = width - half - 9;
  desiredX = Math.max(minX, Math.min(maxX, desiredX));
  currentX += (desiredX - currentX) * (1 - Math.exp(-deltaSeconds * 13));
  catcher.style.left = `${currentX}px`;
}

function handleCatch(object) {
  if (object.shape === selectedShape) {
    score += POINTS_PER_CATCH;
    shapesCaught += 1;
    document.getElementById('score-number').textContent = String(score);
    scoreCard.classList.remove('is-popping');
    void scoreCard.offsetWidth;
    scoreCard.classList.add('is-popping');
    window.setTimeout(() => scoreCard.classList.remove('is-popping'), 230);
    catcher.classList.remove('is-correct');
    void catcher.offsetWidth;
    catcher.classList.add('is-correct');
    window.setTimeout(() => catcher.classList.remove('is-correct'), 440);
    playCorrectSound();
    makeCatchEffects(object.x, Math.max(46, object.y + object.size * .25));
  } else {
    lives = Math.max(0, lives - 1);
    wrongCatches += 1;
    updateLivesDisplay();
    arena.classList.remove('wrong-shake');
    catcher.classList.remove('is-wrong');
    void arena.offsetWidth;
    arena.classList.add('wrong-shake');
    catcher.classList.add('is-wrong');
    window.setTimeout(() => {
      arena.classList.remove('wrong-shake');
      catcher.classList.remove('is-wrong');
    }, 430);
    playWrongSound();
    makeWrongEffect(object.x, Math.max(58, object.y + object.size * .24));
    if (lives <= 0) finishRound('lives');
  }
}

function makeWrongEffect(x, y) {
  const warning = document.createElement('span');
  warning.className = 'floating-wrong';
  warning.textContent = 'OOPS! WRONG SHAPE';
  warning.style.left = `${x}px`;
  warning.style.top = `${y}px`;
  effectLayer.append(warning);
  window.setTimeout(() => warning.remove(), 900);
}

function makeCatchEffects(x, y) {
  const scoreLabel = document.createElement('span');
  scoreLabel.className = 'floating-score';
  scoreLabel.textContent = `+${POINTS_PER_CATCH}`;
  scoreLabel.style.left = `${x}px`;
  scoreLabel.style.top = `${y}px`;
  effectLayer.append(scoreLabel);
  window.setTimeout(() => scoreLabel.remove(), 950);

  const burst = document.createElement('span');
  burst.className = 'particle-burst';
  burst.style.left = `${x}px`;
  burst.style.top = `${y + 17}px`;
  const colors = ['#b8ff72', '#58f5ef', '#ffd965', '#ff78c4', '#b296ff'];
  for (let index = 0; index < 9; index += 1) {
    const particle = document.createElement('i');
    const angle = (Math.PI * 2 * index) / 9 + Math.random() * .45;
    const distance = 28 + Math.random() * 38;
    particle.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
    particle.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
    particle.style.setProperty('--particle-color', colors[index % colors.length]);
    burst.append(particle);
  }
  effectLayer.append(burst);
  window.setTimeout(() => burst.remove(), 850);
}

function finishRound(reason) {
  if (gameState !== 'playing') return;
  gameState = 'finished';
  pausedAt = 0;
  if (animationFrame) cancelAnimationFrame(animationFrame);
  if (readyTimeout) window.clearTimeout(readyTimeout);
  heldDirections.left = false;
  heldDirections.right = false;
  dragPointerId = null;
  stopBackgroundMusic();
  clearFallingObjects();
  const isVictory = reason === 'time';

  if (isVictory) playVictorySound();
  else playGameOverSound();

  const attempts = shapesCaught + wrongCatches;
  const accuracy = attempts ? Math.round((shapesCaught / attempts) * 100) : 0;
  document.getElementById('result-kicker').textContent = isVictory ? 'TWO MINUTES. YOU DID IT!' : 'NICE TRY, SHAPE SPOTTER!';
  document.getElementById('result-title').textContent = isVictory ? "TIME'S UP!" : 'GAME OVER!';
  document.getElementById('result-subtitle').textContent = isVictory
    ? `AMAZING! You caught ${shapesCaught} ${shapesCaught === 1 ? 'shape' : 'shapes'}!`
    : `You caught ${shapesCaught} ${shapesCaught === 1 ? 'shape' : 'shapes'}!`;
  document.getElementById('final-score').textContent = String(score);
  document.getElementById('caught-total').textContent = String(shapesCaught);
  document.getElementById('accuracy-total').textContent = `${accuracy}%`;
  document.getElementById('best-speed').textContent = formatSpeed(bestSpeed);
  document.getElementById('result-emblem').textContent = isVictory ? '★' : '✦';
  document.getElementById('result-card').classList.toggle('is-victory', isVictory);
  makeResultConfetti(isVictory);
  setScreen('results');
}

function makeResultConfetti(isVictory) {
  const confetti = document.getElementById('result-confetti');
  confetti.replaceChildren();
  if (!isVictory) return;
  const colors = ['#58f3ec', '#ff78c4', '#b69aff', '#ffda6a', '#affb72', '#75baff'];
  for (let index = 0; index < 34; index += 1) {
    const piece = document.createElement('i');
    piece.className = 'confetti-piece';
    piece.style.setProperty('--left', `${Math.random() * 100}%`);
    piece.style.setProperty('--size', `${5 + Math.random() * 7}px`);
    piece.style.setProperty('--turn', `${Math.random() * 180}deg`);
    piece.style.setProperty('--drift', `${Math.random() * 160 - 80}px`);
    piece.style.setProperty('--duration', `${3.3 + Math.random() * 3.2}s`);
    piece.style.setProperty('--delay', `${Math.random() * -5}s`);
    piece.style.setProperty('--confetti-color', colors[index % colors.length]);
    confetti.append(piece);
  }
}

function returnToSelection() {
  if (readyTimeout) window.clearTimeout(readyTimeout);
  if (animationFrame) cancelAnimationFrame(animationFrame);
  gameState = 'idle';
  pausedAt = 0;
  heldDirections.left = false;
  heldDirections.right = false;
  dragPointerId = null;
  stopBackgroundMusic();
  clearFallingObjects();
  effectLayer.replaceChildren();
  readyOverlay.classList.remove('is-leaving');
  setScreen('selection');
}

function aimCatcherFromPointer(event) {
  const bounds = arena.getBoundingClientRect();
  const half = catcherHalfWidth();
  const minX = half + 9;
  const maxX = arena.clientWidth - half - 9;
  desiredX = Math.max(minX, Math.min(maxX, event.clientX - bounds.left));
}

// If a picture in the shape cards cannot be loaded, swap it for the shape symbol
// so the selection screen still teaches the shape.
function attachSelectionCardFallbacks() {
  for (const card of document.querySelectorAll('[data-select-shape]')) {
    const shape = card.dataset.selectShape;
    const example = card.querySelector('.shape-card-example');
    const image = example ? example.querySelector('img') : null;
    if (!image) continue;
    image.addEventListener('error', () => {
      image.hidden = true;
      if (!example.querySelector('.missing-picture')) {
        addFallbackGlyph(example, shape, 'card-missing-picture');
      }
      warnMissingPicture({
        name: friendlyFileName(image.getAttribute('src') || 'picture'),
        src: image.getAttribute('src'),
        shape,
      });
    });
  }
}

for (const button of document.querySelectorAll('[data-select-shape]')) {
  button.addEventListener('click', () => startRound(button.dataset.selectShape));
}

document.getElementById('play-again').addEventListener('click', () => {
  if (selectedShape) startRound(selectedShape);
});
document.getElementById('change-shape').addEventListener('click', returnToSelection);

soundToggle.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  updateSoundButton();
  if (soundEnabled) {
    if (gameState === 'playing') startBackgroundMusic();
    playTone(660, .08, { volume: .025 });
  } else {
    music.pause();
  }
});

libraryOpenButton.addEventListener('click', () => {
  renderLibrary();
  if (!libraryDialog.open) libraryDialog.showModal();
});
document.getElementById('library-close').addEventListener('click', () => libraryDialog.close());
libraryDialog.addEventListener('click', (event) => {
  if (event.target === libraryDialog) libraryDialog.close();
});
libraryDialog.addEventListener('close', () => libraryOpenButton.focus());

window.addEventListener('keydown', (event) => {
  const direction = keyToDirection[event.code] || keyToDirection[event.key];
  if (!direction || gameState !== 'playing') return;
  event.preventDefault();
  heldDirections[direction] = true;
});
window.addEventListener('keyup', (event) => {
  const direction = keyToDirection[event.code] || keyToDirection[event.key];
  if (direction) heldDirections[direction] = false;
});
window.addEventListener('blur', () => {
  heldDirections.left = false;
  heldDirections.right = false;
  dragPointerId = null;
});

for (const [buttonId, direction] of [['left-button', 'left'], ['right-button', 'right']]) {
  const button = document.getElementById(buttonId);
  button.addEventListener('pointerdown', (event) => {
    if (gameState !== 'playing') return;
    event.preventDefault();
    heldDirections[direction] = true;
    try { button.setPointerCapture(event.pointerId); } catch { /* optional browser feature */ }
  });
  for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    button.addEventListener(eventName, () => { heldDirections[direction] = false; });
  }
}

window.addEventListener('pointerup', () => {
  heldDirections.left = false;
  heldDirections.right = false;
  dragPointerId = null;
});

arena.addEventListener('pointerdown', (event) => {
  if (gameState !== 'playing' || event.button > 0) return;
  dragPointerId = event.pointerId;
  aimCatcherFromPointer(event);
  try { arena.setPointerCapture(event.pointerId); } catch { /* optional browser feature */ }
});
arena.addEventListener('pointermove', (event) => {
  if (dragPointerId !== event.pointerId || gameState !== 'playing') return;
  aimCatcherFromPointer(event);
});
arena.addEventListener('pointercancel', () => { dragPointerId = null; });
arena.addEventListener('lostpointercapture', () => { dragPointerId = null; });

document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseRound();
  else resumeRound();
});

window.addEventListener('resize', () => {
  catcherWidth = 0;
  catcherHeight = 0;
  if (gameState === 'playing' || gameState === 'ready') {
    measureCatcher();
    const half = catcherWidth / 2;
    const minX = half + 9;
    const maxX = arena.clientWidth - half - 9;
    currentX = Math.max(minX, Math.min(maxX, currentX));
    desiredX = Math.max(minX, Math.min(maxX, desiredX));
    catcher.style.left = `${currentX}px`;
  }
});

try {
  setHudExpanded(window.localStorage.getItem(HUD_STORAGE_KEY) === '1');
} catch {
  setHudExpanded(false);
}
updateSoundButton();
updateAssetCounts();
attachSelectionCardFallbacks();
renderLibrary();
loadSavedAssets();
schedulePreload();
