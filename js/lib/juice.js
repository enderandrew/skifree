// Visual "juice": ski tracks in the snow and powder sprays on hard turns.
// Both keep their own clock, advanced by the game loop, so they freeze while
// the game is paused and are easy to test.

const FRAME_MS = 20; // one game cycle at dt = 1 (see game.js)

// ─── Ski tracks ─────────────────────────────────────────────────────────────

const TRACK_LIFETIME_MS = 3500;
const TRACK_MIN_STEP = 4;      // map px between samples
const TRACK_HALF_GAP = 2.5;    // half the distance between the two skis
const TRACK_MAX_SEGMENTS = 360;
const TRACK_ALPHA = 0.5;

export class SkiTracks {
	constructor(player) {
		this.player = player;
		this.deleted = false;
		this._clock = 0;
		this._last = null;      // last sampled point, or null when the trail is broken
		this._segments = [];    // { x1, y1, x2, y2, nx, ny, born }
	}

	reset() {
		this._segments = [];
		this._last = null;
	}

	// Where the skis meet the snow: bottom centre of the skier sprite
	_skiPoint() {
		const p = this.player;
		return [p.mapPosition[0] + p.width / 2, p.mapPosition[1] + p.height - 3];
	}

	_onSnow() {
		const p = this.player;
		return p.isMoving && !p.isJumping && !p.hasBeenHit && !p._isWalkingUp
			&& !p.isBeingEaten && !p.isHidden && p.width > 0;
	}

	cycle(dt = 1) {
		this._clock += dt * FRAME_MS;

		// Old segments fade out completely, then go
		const cutoff = this._clock - TRACK_LIFETIME_MS;
		while (this._segments.length && this._segments[0].born < cutoff) this._segments.shift();

		if (!this._onSnow()) {
			this._last = null; // airborne or down: leave a gap in the trail
			return;
		}

		const [x, y] = this._skiPoint();
		if (!this._last) {
			this._last = [x, y];
			return;
		}
		const dx = x - this._last[0];
		const dy = y - this._last[1];
		const len = Math.hypot(dx, dy);
		if (len < TRACK_MIN_STEP) return;

		// Unit normal to the direction of travel: the two skis sit either side
		this._segments.push({
			x1: this._last[0], y1: this._last[1], x2: x, y2: y,
			nx: -dy / len, ny: dx / len,
			born: this._clock,
		});
		if (this._segments.length > TRACK_MAX_SEGMENTS) this._segments.shift();
		this._last = [x, y];
	}

	segmentCount() {
		return this._segments.length;
	}

	draw(dContext) {
		if (!this._segments.length) return;
		dContext.save();
		dContext.strokeStyle = '#9fb0c8';
		dContext.lineWidth = 1;
		for (const s of this._segments) {
			const age = (this._clock - s.born) / TRACK_LIFETIME_MS;
			dContext.globalAlpha = TRACK_ALPHA * (1 - age);
			const [ax, ay] = dContext.mapPositionToCanvasPosition([s.x1, s.y1]);
			const [bx, by] = dContext.mapPositionToCanvasPosition([s.x2, s.y2]);
			const ox = s.nx * TRACK_HALF_GAP;
			const oy = s.ny * TRACK_HALF_GAP;
			dContext.beginPath();
			dContext.moveTo(ax + ox, ay + oy);
			dContext.lineTo(bx + ox, by + oy);
			dContext.moveTo(ax - ox, ay - oy);
			dContext.lineTo(bx - ox, by - oy);
			dContext.stroke();
		}
		dContext.restore();
	}
}

// ─── Powder spray ───────────────────────────────────────────────────────────

const POWDER_LIFETIME_MS = 480;
const POWDER_GRAVITY = 0.09;
const POWDER_MAX = 120;
const CARVE_COOLDOWN_MS = 180;

// Left-to-right order of the skier's headings, used to measure how sharp a turn is
const HEADINGS = ['west', 'wsWest', 'sWest', 'south', 'sEast', 'esEast', 'east'];

export class PowderSpray {
	constructor(player, { random = Math.random } = {}) {
		this.player = player;
		this.deleted = false;
		this._random = random;
		this._clock = 0;
		this._particles = [];
		this._lastHeading = null;
		this._lastCarveAt = -Infinity;
	}

	reset() {
		this._particles = [];
		this._lastHeading = null;
	}

	particleCount() {
		return this._particles.length;
	}

	// Throw a burst of powder from map position (x, y).
	// dirX: -1 sprays west, +1 sprays east, 0 sprays both ways.
	burst(x, y, dirX, count) {
		for (let i = 0; i < count && this._particles.length < POWDER_MAX; i++) {
			const side = dirX || (this._random() < 0.5 ? -1 : 1);
			this._particles.push({
				x: x + (this._random() - 0.5) * 6,
				y: y + (this._random() - 0.5) * 3,
				vx: side * (0.8 + this._random() * 2.4),
				vy: -(0.4 + this._random() * 1.8),
				r: 1 + this._random() * 1.8,
				born: this._clock,
			});
		}
	}

	// Ski-level point on the player
	_feet() {
		const p = this.player;
		return [p.mapPosition[0] + p.width / 2, p.mapPosition[1] + p.height - 3];
	}

	_watchForCarves() {
		const p = this.player;
		const onSnow = p.isMoving && !p.isJumping && !p.hasBeenHit && !p._isWalkingUp && p.width > 0;
		const heading = p._getDiscreteDirection?.();
		if (!onSnow || !HEADINGS.includes(heading)) {
			this._lastHeading = onSnow ? heading : null;
			return;
		}
		const previous = this._lastHeading;
		this._lastHeading = heading;
		if (!previous || previous === heading || !HEADINGS.includes(previous)) return;
		if (this._clock - this._lastCarveAt < CARVE_COOLDOWN_MS) return;

		// Turning east throws snow out to the west, and vice versa.
		// A sharper change of heading throws more.
		const delta = HEADINGS.indexOf(heading) - HEADINGS.indexOf(previous);
		const [x, y] = this._feet();
		this.burst(x, y, -Math.sign(delta), 6 + Math.abs(delta) * 5);
		this._lastCarveAt = this._clock;
	}

	cycle(dt = 1) {
		this._clock += dt * FRAME_MS;
		this._watchForCarves();
		for (const pt of this._particles) {
			pt.x += pt.vx * dt;
			pt.y += pt.vy * dt;
			pt.vy += POWDER_GRAVITY * dt;
			pt.vx *= Math.pow(0.94, dt);
		}
		const cutoff = this._clock - POWDER_LIFETIME_MS;
		this._particles = this._particles.filter(pt => pt.born > cutoff);
	}

	draw(dContext) {
		if (!this._particles.length) return;
		dContext.save();
		dContext.fillStyle = '#ffffff';
		dContext.strokeStyle = '#8fa6c4'; // a pale rim so white powder shows on white snow
		dContext.lineWidth = 1;
		for (const pt of this._particles) {
			const age = (this._clock - pt.born) / POWDER_LIFETIME_MS;
			dContext.globalAlpha = 1 - age;
			const [cx, cy] = dContext.mapPositionToCanvasPosition([pt.x, pt.y]);
			dContext.beginPath();
			dContext.arc(cx, cy, pt.r * (1 - age * 0.4), 0, Math.PI * 2);
			dContext.fill();
			dContext.stroke();
		}
		dContext.restore();
	}
}
