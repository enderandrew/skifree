import SpriteArray from './spriteArray.js';

// One target frame at the legacy 50 fps rate (20ms per tick).
// All speed values in the game are expressed in "pixels per 20 ms", so we
// normalise every rAF delta against this constant to keep movement consistent
// across different display refresh rates (60Hz, 120Hz, 144Hz, etc.).
const TARGET_FRAME_MS = 20;

class Game {
	constructor(camera, player) {
		this._camera = camera;
		this._player = player;
		this._staticObjects = new SpriteArray();
		this._movingObjects = new SpriteArray();
		this._uiElements = new SpriteArray();
		this._groundEffects = new SpriteArray(); // drawn on the snow, under every sprite (ski tracks)
		this._airEffects = new SpriteArray();    // drawn over the world sprites (powder spray)
		this._overlays = new SpriteArray();      // full-screen, after the world, before the HUD (lighting)
		this._mouseX = camera.getCentreOfViewport();
		this._mouseY = 0;
		this._paused = false;
		this._beforeCycleCallbacks = [];
		this._afterCycleCallbacks = [];
		this._rafId = null;
		this._lastTimestamp = null;

		player.setMapPosition(0, 0);
		player.setMapPositionTarget(0, -10);
		camera.followSprite(player);
	}

	// ─── Object management ────────────────────────────────────────────────────

	addStaticObject(sprite) {
		this._staticObjects.push(sprite);
	}

	addStaticObjects(sprites) {
		if (!sprites || !Array.isArray(sprites)) return;
		for (const sprite of sprites) {
			this.addStaticObject(sprite);
		}
	}

	addMovingObject(movingObject, movingObjectType) {
		// Provide camera reference to allow viewport coordinate queries
		movingObject._camera = this._camera;

		if (movingObjectType) {
			this._staticObjects.onPush(obj => {
				if (obj.data?.hitBehaviour?.[movingObjectType]) {
					obj.onHitting(movingObject, obj.data.hitBehaviour[movingObjectType]);
				}
			}, true);
		}
		this._movingObjects.push(movingObject);
	}

	addUIElement(element) {
		this._uiElements.push(element);
	}

	addGroundEffect(effect) {
		this._groundEffects.push(effect);
	}

	addAirEffect(effect) {
		this._airEffects.push(effect);
	}

	addOverlay(overlay) {
		this._overlays.push(overlay);
	}

	// Read-only views for effects that need to find things (e.g. night lighting)
	staticObjects() {
		return this._staticObjects;
	}

	movingObjects() {
		return this._movingObjects;
	}

	player() {
		return this._player;
	}

	// ─── Callbacks ────────────────────────────────────────────────────────────

	beforeCycle(callback) {
		this._beforeCycleCallbacks.push(callback);
	}

	afterCycle(callback) {
		this._afterCycleCallbacks.push(callback);
	}

	// ─── Input ────────────────────────────────────────────────────────────────

	setMouseX(x) { this._mouseX = x; }
	setMouseY(y) { this._mouseY = y; }

	// ─── Game loop ────────────────────────────────────────────────────

	_tick(timestamp) {
		if (this._paused) return;

		if (this._lastTimestamp === null) {
			this._lastTimestamp = timestamp;
		}

		// Cap delta at 100 ms to prevent physics tunneling on tab switch
		const elapsed = Math.min(timestamp - this._lastTimestamp, 100);
		const dt = elapsed / TARGET_FRAME_MS;
		this._lastTimestamp = timestamp;

		this.cycle(dt);
		this.draw();

		this._rafId = requestAnimationFrame(ts => this._tick(ts));
	}

	start() {
		if (this._rafId !== null) return;
		this._paused = false;
		this._lastTimestamp = null;
		this._rafId = requestAnimationFrame(ts => this._tick(ts));
	}

	pause() {
		this._paused = true;
		if (this._rafId !== null) {
			cancelAnimationFrame(this._rafId);
			this._rafId = null;
		}
	}

	isPaused() { 
		return this._paused; 
	}

	reset() {
		this.pause();
		this._paused = false;
		this._staticObjects = new SpriteArray();
		this._movingObjects = new SpriteArray();
		// Effects and overlays survive a reset; they clear themselves via reset()
		for (const layer of [this._groundEffects, this._airEffects, this._overlays]) {
			layer.forEach(obj => obj.reset?.());
		}
		this._mouseX = this._camera.getCentreOfViewport();
		this._mouseY = 0;
		this._player.reset();
		this._player.setMapPosition(0, 0, 0);
		this._lastTimestamp = null;
		this.start();
	}

	// ─── Per-frame logic and rendering ────────────────────────────────────────

	cycle(dt = 1) {
		for (const cb of this._beforeCycleCallbacks) {
			cb();
		}

		const mouseMapPosition = this._camera.canvasPositionToMapPosition([this._mouseX, this._mouseY]);

		if (!this._player.isJumping) {
			this._player.setMapPositionTarget(mouseMapPosition[0], mouseMapPosition[1]);
		}

		this._player.cycle(dt);

		// Moving objects flagged with deleteOnNextCycle() (despawned lift chairs,
		// NPCs that left the screen) were never removed and kept cycling forever.
		this._movingObjects.cull();
		this._movingObjects.forEach(obj => obj.cycle(dt));

		// Prune static objects that have scrolled 500px above the top of the viewport
		if (typeof this._camera?.getTopOfViewport === 'function') {
			const pruneThresholdY = this._camera.getTopOfViewport() - 500;
			this._staticObjects.forEach(obj => {
				if (obj.mapPosition && obj.mapPosition[1] < pruneThresholdY) {
					obj.deleteOnNextCycle();
				}
			});
			// NPCs that opt in (dogs, novices, snowboarders) go the same way
			this._movingObjects.forEach(obj => {
				if (obj.despawnAboveViewport && obj.mapPosition[1] < pruneThresholdY) {
					obj.deleteOnNextCycle();
				}
			});
		}

		this._staticObjects.cull();
		this._staticObjects.forEach(obj => {
			if (obj.cycle) obj.cycle(dt);
		});

		for (const layer of [this._groundEffects, this._airEffects, this._overlays]) {
			layer.cull();
			layer.forEach(obj => obj.cycle?.(dt));
		}

		this._uiElements.cull(); // e.g. a UFO that has flown off-screen
		this._uiElements.forEach(obj => {
			if (obj.cycle) obj.cycle(dt);
		});

		for (const cb of this._afterCycleCallbacks) {
			cb();
		}
	}

	draw() {
		const camera = this._camera;
		camera.clearRect(0, 0, camera.logicalWidth(), camera.logicalHeight());

		// The world shakes; the lighting overlay and HUD stay put
		const [shakeX, shakeY] = camera.getShakeOffset?.() ?? [0, 0];
		const shaking = shakeX !== 0 || shakeY !== 0;
		if (shaking) {
			camera.save();
			camera.translate(shakeX, shakeY);
		}

		this._groundEffects.forEach(obj => obj.draw(camera));

		this._player.draw(camera);

		this._movingObjects.forEach(obj => obj.draw(camera));

		this._staticObjects.forEach(obj => {
			if (obj.draw) obj.draw(camera, 'main');
		});

		this._airEffects.forEach(obj => obj.draw(camera));

		if (shaking) camera.restore();

		this._overlays.forEach(obj => obj.draw(camera));

		this._uiElements.forEach(obj => {
			if (obj.draw) obj.draw(this._camera, 'main');
		});
	}
}

export default Game;