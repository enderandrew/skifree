class Camera {
	constructor(ctx) {
		this._ctx = ctx;
		this._images = {};
		this._centralSprite = null;
		this._zoom = 1; // CSS pixels per game pixel (see viewport.js)
		this._shake = null;
		this._shakeEnabled = true;
		this._random = Math.random;
	}

	_now() {
		return typeof performance !== 'undefined' ? performance.now() : Date.now();
	}

	// ─── Screen shake ────────────────────────────────────────────────────────
	// Shake is a draw-time offset only (see Game.draw); it never moves
	// anything on the map, so collisions are unaffected.

	setShakeEnabled(enabled) {
		this._shakeEnabled = enabled;
		if (!enabled) this._shake = null;
	}

	// amplitude in game pixels; a stronger shake replaces a weaker one
	shake(amplitude, ms = 250) {
		if (!this._shakeEnabled || amplitude <= 0) return;
		const now = this._now();
		if (this._shake && this._currentAmplitude(now) >= amplitude) return;
		this._shake = { amplitude, start: now, ms };
	}

	_currentAmplitude(now) {
		if (!this._shake) return 0;
		const t = (now - this._shake.start) / this._shake.ms;
		if (t >= 1) return 0;
		return this._shake.amplitude * (1 - t) * (1 - t); // eases out
	}

	// Whole-pixel offset for this frame, so the pixel art stays crisp
	getShakeOffset(now = this._now()) {
		const a = this._currentAmplitude(now);
		if (a < 0.5) {
			this._shake = a > 0 ? this._shake : null;
			return [0, 0];
		}
		return [
			Math.round((this._random() * 2 - 1) * a),
			Math.round((this._random() * 2 - 1) * a),
		];
	}

	setZoom(zoom) {
		this._zoom = zoom > 0 ? zoom : 1;
	}

	getZoom() {
		return this._zoom;
	}

	// CSS-pixel coordinates (e.g. from a pointer event) → game coordinates
	cssToLogical(x, y) {
		return [x / this._zoom, y / this._zoom];
	}

	// Logical (CSS) dimensions — independent of devicePixelRatio.
	// All game coordinate calculations must use these so that world coordinates
	// stay in logical pixels regardless of the backing-store scale.
	// Logical size is in game pixels: the CSS size divided by the zoom.
	logicalWidth() {
		const styleWidth = this._ctx.canvas.style?.width;
		const css = styleWidth ? parseFloat(styleWidth) : this._ctx.canvas.width;
		return css / this._zoom;
	}

	logicalHeight() {
		const styleHeight = this._ctx.canvas.style?.height;
		const css = styleHeight ? parseFloat(styleHeight) : this._ctx.canvas.height;
		return css / this._zoom;
	}

	storeLoadedImage(key, image) {
		this._images[key] = image;
	}

	getLoadedImage(key) {
		return this._images[key];
	}

	followSprite(sprite) {
		this._centralSprite = sprite;
	}

	getCentralPosition() {
		return {
			map: this._centralSprite?.mapPosition ?? [0, 0, 0],
			canvas: [
				Math.round(this.logicalWidth() * 0.5),
				Math.round(this.logicalHeight() * 0.5),
				0
			]
		};
	}

	mapPositionToCanvasPosition(position) {
		const central = this.getCentralPosition();
		const mapDifferenceX = central.map[0] - position[0];
		const mapDifferenceY = central.map[1] - position[1];
		return [central.canvas[0] - mapDifferenceX, central.canvas[1] - mapDifferenceY];
	}

	canvasPositionToMapPosition(position) {
		const central = this.getCentralPosition();
		const mapDifferenceX = central.canvas[0] - position[0];
		const mapDifferenceY = central.canvas[1] - position[1];
		return [central.map[0] - mapDifferenceX, central.map[1] - mapDifferenceY];
	}

	getCentreOfViewport() {
		return Math.floor(this.logicalWidth() / 2);
	}

	getMiddleOfViewport() {
		return Math.floor(this.logicalHeight() / 2);
	}

	getBelowViewport() {
		return Math.floor(this.logicalHeight());
	}

	getMapBelowViewport() {
		const below = this.getBelowViewport();
		return this.canvasPositionToMapPosition([0, below])[1];
	}

	getAboveViewport() {
		return -Math.floor(this.logicalHeight() / 4);
	}

	getTopOfViewport() {
		return this.canvasPositionToMapPosition([0, 0])[1];
	}

	getRandomlyInTheCentreOfCanvas(buffer = 0) {
		const min = -buffer;
		const max = this.logicalWidth() + buffer;
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	getRandomlyInTheCentreOfMap(buffer = 0) {
		const random = this.getRandomlyInTheCentreOfCanvas(buffer);
		return this.canvasPositionToMapPosition([random, 0])[0];
	}

	getRandomMapPositionBelowViewport() {
		const xCanvas = this.getRandomlyInTheCentreOfCanvas();
		const yCanvas = this.getBelowViewport();
		return this.canvasPositionToMapPosition([xCanvas, yCanvas]);
	}

	getRandomMapPositionAboveViewport() {
		const xCanvas = this.getRandomlyInTheCentreOfCanvas();
		const yCanvas = this.getAboveViewport();
		return this.canvasPositionToMapPosition([xCanvas, yCanvas]);
	}

	// Returns a proxy that forwards unknown property access to the underlying
	// CanvasRenderingContext2D, so callers can use native canvas API methods
	// (drawImage, fillText, measureText, clearRect, font, canvas, etc.) directly.
	static create(ctx) {
		const camera = new Camera(ctx);
		return new Proxy(camera, {
			get(target, prop) {
				if (prop in target) {
					const val = target[prop];
					return typeof val === 'function' ? val.bind(target) : val;
				}
				const ctxVal = ctx[prop];
				return typeof ctxVal === 'function' ? ctxVal.bind(ctx) : ctxVal;
			},
			set(target, prop, value) {
				if (prop in target) {
					target[prop] = value;
				} else {
					ctx[prop] = value;
				}
				return true;
			}
		});
	}
}

export default Camera;