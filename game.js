/*
 * SHAPE CATCHER — Classroom Arcade
 *
 * Add starter pictures by dropping image paths into the shapeAssets arrays below.
 * Teacher uploads added in the Object Library are stored locally in this browser.
 */

const shapeOrder = ['triangle', 'circle', 'square', 'rectangle', 'star'];

// Resolve bundled pictures beside this script, not against the current page URL. The
// page may be mounted below a sub-path or include a <base> element that changes how
// ordinary relative URLs are resolved.
const gameScriptUrl = document.currentScript?.src || document.baseURI;
const appBaseUrl = new URL('.', gameScriptUrl);

const shapeInfo = {
  triangle: { label: 'TRIANGLE', symbol: '▲', color: '#5df3ed', glow: 'rgba(65, 239, 225, .42)' },
  circle: { label: 'CIRCLE', symbol: '●', color: '#ff78c4', glow: 'rgba(255, 93, 178, .42)' },
  square: { label: 'SQUARE', symbol: '■', color: '#b89aff', glow: 'rgba(158, 110, 255, .45)' },
  rectangle: { label: 'RECTANGLE', symbol: '▰', color: '#81c7ff', glow: 'rgba(85, 151, 255, .45)' },
  star: { label: 'STAR', symbol: '★', color: '#ffdb6c', glow: 'rgba(255, 195, 71, .45)' },
};

// Starter image assets. Add more paths to any list to give that shape more variety.
// Keep these paths relative to this app (normally without a leading slash). The loader
// resolves them beside game.js so they work from disk, a web server, or a hosted subpath.
const shapeAssets = {
  triangle: [
    'assets/shapes/triangle/pizza-slice.svg',
    'assets/shapes/triangle/party-hat.svg',
    'assets/shapes/triangle/mountain-peak.svg',
  ],
  circle: [
    'assets/shapes/circle/orange.svg',
    'assets/shapes/circle/clock-face.svg',
  ],
  square: [
    'assets/shapes/square/gift-box.svg',
    'assets/shapes/square/window-box.svg',
    'assets/shapes/square/snack-cracker.svg',
  ],
  rectangle: [
    'assets/shapes/rectangle/story-book.svg',
    'assets/shapes/rectangle/chocolate-bar.svg',
    'assets/shapes/rectangle/envelope-letter.svg',
    'assets/shapes/rectangle/bus-driver.svg',
  ],
  star: [
    'assets/shapes/star/magic-wand.svg',
    'assets/shapes/star/sheriff-badge.svg',
    'assets/shapes/star/space-rocket.svg',
  ],
};

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
const music = new Audio('./Rush%20E_1.mp3');

music.loop = true;
music.preload = 'none';
music.volume = 0.2;

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
const fallingObjects = [];
const heldDirections = { left: false, right: false };

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

// Resolve bundled pictures beside game.js first, then try the page URL for custom paths.
// This keeps assets working when the app is mounted under a sub-path or uses <base>.
function assetSourceCandidates(src) {
  if (typeof src !== 'string' || !src) return [];
  const appRelative = src.startsWith('//') ? src : src.replace(/^\/+/, '');
  const candidates = [];
  for (const base of [appBaseUrl, document.baseURI]) {
    try {
      const candidate = new URL(appRelative, base).href;
      if (!candidates.includes(candidate)) candidates.push(candidate);
    } catch {
      // Ignore malformed optional paths and let the normal missing-image fallback run.
    }
  }
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
}

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

function startBackgroundMusic() {
  if (!soundEnabled || musicUnavailable || gameState !== 'playing') return;
  try {
    const playback = music.play();
    if (playback && typeof playback.catch === 'function') {
      playback.catch(() => {
        // Rush E_1.mp3 is optional. Catch sounds are generated locally and still work.
      });
    }
  } catch {
    // Unsupported or missing background audio never blocks the game.
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

music.addEventListener('error', () => { musicUnavailable = true; });

function speedMultiplierAt(seconds) {
  if (seconds < 10) return 1;
  if (seconds < 15) return 1.5;
  if (seconds < 25) return 2;
  if (seconds < 30) return 2.5;
  if (seconds < 35) return 3;
  if (seconds < 40) return 3.5;
  if (seconds < 45) return 4;
  if (seconds < 50) return 4.5;
  return 6;
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

  requestAnimationFrame(() => {
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

  const shape = shapeOrder[Math.floor(Math.random() * shapeOrder.length)];
  const assets = getAssetsFor(shape);
  const asset = assets[Math.floor(Math.random() * assets.length)];
  if (!asset) return;

  const maxSize = Math.min(118, Math.max(78, arenaWidth * .095));
  const minSize = Math.min(76, maxSize - 4);
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
  const catcherHeight = catcher.getBoundingClientRect().height;
  const catcherTop = arenaHeight - catcherHeight - 5;
  const catcherHalfWidth = catcher.getBoundingClientRect().width / 2;

  for (let index = fallingObjects.length - 1; index >= 0; index -= 1) {
    const object = fallingObjects[index];
    const previousY = object.y;
    object.y += object.baseSpeed * speed * deltaSeconds;
    object.element.style.transform = `translate3d(0, ${object.y}px, 0)`;

    const overlapsCatcherVertically = object.y + object.size >= catcherTop && object.y <= catcherTop + catcherHeight * .58;
    const overlapsCatcherHorizontally = Math.abs(object.x - currentX) <= catcherHalfWidth + object.size * .32;
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
  const half = catcher.getBoundingClientRect().width / 2;
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
  const half = catcher.getBoundingClientRect().width / 2;
  const minX = half + 9;
  const maxX = arena.clientWidth - half - 9;
  desiredX = Math.max(minX, Math.min(maxX, event.clientX - bounds.left));
}

// Load selection-card art through the same resolver as in-game pictures. The source is
// stored as data, so the error handler is attached before the browser requests the file.
function attachSelectionCardFallbacks() {
  for (const card of document.querySelectorAll('[data-select-shape]')) {
    const shape = card.dataset.selectShape;
    const example = card.querySelector('.shape-card-example');
    const image = example ? example.querySelector('img') : null;
    if (!image) continue;

    const src = image.dataset.pictureSrc || image.getAttribute('src') || '';
    if (!src) continue;
    const asset = { name: friendlyFileName(src), src, shape };
    attachPicture(image, assetSourceCandidates(src), () => {
      if (!example.querySelector('.missing-picture')) {
        addFallbackGlyph(example, shape, 'card-missing-picture');
      }
      warnMissingPicture(asset);
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
  if (gameState === 'playing' || gameState === 'ready') {
    const half = catcher.getBoundingClientRect().width / 2;
    const minX = half + 9;
    const maxX = arena.clientWidth - half - 9;
    currentX = Math.max(minX, Math.min(maxX, currentX));
    desiredX = Math.max(minX, Math.min(maxX, desiredX));
    catcher.style.left = `${currentX}px`;
  }
});

updateSoundButton();
updateAssetCounts();
attachSelectionCardFallbacks();
renderLibrary();
loadSavedAssets();
