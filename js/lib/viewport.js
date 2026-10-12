// Responsive sizing for the game canvas.
//
// Two separate scale factors are involved:
//  - devicePixelRatio (dpr): how many physical pixels make one CSS pixel.
//    The backing store is sized in physical pixels so nothing is blurry.
//  - zoom: how many CSS pixels one game pixel occupies. On a big screen the
//    world would otherwise be a vast field of tiny sprites, so once the
//    window is comfortably larger than the design size we enlarge the game.
//
// Zoom is snapped so that zoom * dpr is a whole number. Every sprite pixel
// then covers an exact number of physical pixels and the pixel art stays
// crisp instead of shimmering as it scrolls.

// Roughly how much mountain the 1991 game showed. The zoom is the largest
// crisp step that still shows at least this much.
export const DESIGN_WIDTH = 640;
export const DESIGN_HEIGHT = 480;

// Never zoom in so far that less than this is visible, whatever the bias
const MIN_VISIBLE_WIDTH = 320;
const MIN_VISIBLE_HEIGHT = 240;

// bias: extra zoom steps chosen by the player (+ closer, - further out).
// One step is one more device pixel per game pixel.
export function computeZoom(cssWidth, cssHeight, dpr = 1, bias = 0) {
	const fit = Math.min(cssWidth / DESIGN_WIDTH, cssHeight / DESIGN_HEIGHT);
	// Small screens (phones, small windows) stay at 1 game px = 1 CSS px
	let steps = fit > 1 ? Math.max(1, Math.floor(fit * dpr)) : Math.max(1, Math.round(dpr));
	steps += Math.round(bias);

	const maxSteps = Math.max(1, Math.floor(Math.min(cssWidth / MIN_VISIBLE_WIDTH, cssHeight / MIN_VISIBLE_HEIGHT) * dpr));
	steps = Math.min(Math.max(1, steps), maxSteps);
	const zoom = steps / dpr;
	// Don't zoom out past 1:1 unless the player asked to
	return bias < 0 ? zoom : Math.max(zoom, Math.min(1, maxSteps / dpr));
}

// Sizes the canvas for the current window and returns the values used.
export function fitCanvasToWindow(canvas, camera, win = window, bias = 0) {
	const dpr = win.devicePixelRatio || 1;
	const cssWidth = win.innerWidth;
	const cssHeight = win.innerHeight;
	const zoom = computeZoom(cssWidth, cssHeight, dpr, bias);

	canvas.style.width = `${cssWidth}px`;
	canvas.style.height = `${cssHeight}px`;
	// Assigning width/height also resets the context transform and smoothing
	canvas.width = Math.round(cssWidth * dpr);
	canvas.height = Math.round(cssHeight * dpr);

	camera.setZoom(zoom);
	camera.scale(dpr * zoom, dpr * zoom);
	camera.imageSmoothingEnabled = false;

	return { dpr, zoom, cssWidth, cssHeight };
}

// Calls `onChange` when the window resizes, the phone rotates, or the
// window is dragged to a monitor with a different pixel density.
export function watchViewport(onChange, win = window) {
	win.addEventListener('resize', onChange, false);
	win.addEventListener('orientationchange', onChange, false);
	win.visualViewport?.addEventListener('resize', onChange, false);

	let mql = null;
	const watchDpr = () => {
		mql?.removeEventListener?.('change', handleDprChange);
		if (!win.matchMedia) return;
		mql = win.matchMedia(`(resolution: ${win.devicePixelRatio || 1}dppx)`);
		mql.addEventListener?.('change', handleDprChange);
	};
	function handleDprChange() {
		onChange();
		watchDpr(); // the query is for one specific ratio, so re-arm it
	}
	watchDpr();
}
