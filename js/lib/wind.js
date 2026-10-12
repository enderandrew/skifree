import {
	WIND_MIN_GAP_MS,
	WIND_MAX_GAP_MS,
	WIND_MIN_GUST_MS,
	WIND_MAX_GUST_MS,
	WIND_MAX_PUSH,
	WIND_RAMP_FRACTION,
} from './constants.js';

const FRAME_MS = 20;      // one game cycle at dt = 1 (see game.js)
const MAX_STREAKS = 45;

// Occasional sideways gusts. Lives in the game's UI element list, so it only
// advances while the game is running and freezes when it is paused.
//
//  - strength() is signed: negative blows west, positive blows east, and it
//    ramps up and back down over the gust rather than switching on and off.
//  - The player is pushed sideways in proportion to the strength.
//  - Streaks of wind are drawn across the screen, plus an arrow indicator.
class Wind {
	constructor({
		player,
		random = Math.random,
		onGustStart = () => {},
		onGustEnd = () => {},
		onChange = () => {},
	} = {}) {
		this.player = player;
		this._random = random;
		this._onGustStart = onGustStart;
		this._onGustEnd = onGustEnd;
		this._onChange = onChange;
		this._clock = 0;
		this._gust = null;   // { start, duration, peak } in clock ms
		this._nextGustAt = this._randomGap();
		this._streaks = [];
		this._lastStrength = 0;
	}

	_randomBetween(min, max) {
		return min + this._random() * (max - min);
	}

	_randomGap() {
		return this._clock + this._randomBetween(WIND_MIN_GAP_MS, WIND_MAX_GAP_MS);
	}

	reset() {
		this._clock = 0;
		if (this._gust) this._onGustEnd();
		this._gust = null;
		this._nextGustAt = this._randomGap();
		this._streaks = [];
		this._setStrength(0);
	}

	isGusting() {
		return this._gust !== null;
	}

	// Start a gust now. direction: -1 west, +1 east. peak: 0..1.
	gust({
		direction = this._random() < 0.5 ? -1 : 1,
		peak = this._randomBetween(0.55, 1),
		duration = this._randomBetween(WIND_MIN_GUST_MS, WIND_MAX_GUST_MS),
	} = {}) {
		this._gust = { start: this._clock, duration, peak: peak * Math.sign(direction || 1) };
		this._onGustStart({ direction: Math.sign(this._gust.peak), peak: Math.abs(this._gust.peak), duration });
	}

	// Signed strength in -1..1
	strength() {
		if (!this._gust) return 0;
		const t = (this._clock - this._gust.start) / this._gust.duration;
		if (t <= 0 || t >= 1) return 0;
		// Smooth ramp up, hold, smooth ramp down
		const ramp = WIND_RAMP_FRACTION;
		let envelope = 1;
		if (t < ramp) envelope = Math.sin((t / ramp) * Math.PI / 2);
		else if (t > 1 - ramp) envelope = Math.sin(((1 - t) / ramp) * Math.PI / 2);
		return this._gust.peak * envelope;
	}

	// Sideways push in map pixels for one cycle of length dt
	push(dt = 1) {
		return this.strength() * WIND_MAX_PUSH * dt;
	}

	_setStrength(value) {
		if (Math.abs(value - this._lastStrength) > 0.01 || (value === 0 && this._lastStrength !== 0)) {
			this._lastStrength = value;
			this._onChange(value);
		}
	}

	cycle(dt = 1) {
		this._clock += dt * FRAME_MS;

		if (!this._gust && this._clock >= this._nextGustAt) {
			this.gust();
		}
		if (this._gust && this._clock - this._gust.start >= this._gust.duration) {
			this._gust = null;
			this._nextGustAt = this._randomGap();
			this._onGustEnd();
		}

		const s = this.strength();
		this._setStrength(s);

		if (s !== 0 && this.player?.applyWind) {
			this.player.applyWind(this.push(dt));
		}

		this._updateStreaks(dt, s);
	}

	_updateStreaks(dt, s) {
		const spawnRate = Math.abs(s) * 3; // streaks per cycle at full strength
		let toSpawn = spawnRate * dt;
		while (toSpawn > 0 && this._streaks.length < MAX_STREAKS) {
			if (toSpawn < 1 && this._random() > toSpawn) break;
			this._streaks.push({
				// Positions are 0..1 of the screen so they survive resizes
				x: s > 0 ? -0.1 * this._random() : 1 + 0.1 * this._random(),
				y: this._random(),
				length: this._randomBetween(18, 60),
				speed: this._randomBetween(0.008, 0.016),
				life: 1,
				dir: Math.sign(s) || 1,
			});
			toSpawn -= 1;
		}

		for (const streak of this._streaks) {
			streak.x += streak.dir * streak.speed * dt * (0.4 + Math.abs(s));
			if (s === 0) streak.life -= 0.05 * dt; // fade out once the gust is over
		}
		this._streaks = this._streaks.filter(st => st.life > 0 && st.x > -0.3 && st.x < 1.3);
	}

	draw(dContext) {
		const s = this.strength();
		if (!this._streaks.length && s === 0) return;

		const width = dContext.logicalWidth();
		const height = dContext.logicalHeight();

		dContext.save();
		dContext.lineWidth = 1;
		dContext.strokeStyle = '#7f9bb8';
		for (const streak of this._streaks) {
			dContext.globalAlpha = Math.max(0, Math.min(1, streak.life)) * (0.25 + 0.5 * Math.abs(s));
			const x = Math.round(streak.x * width);
			const y = Math.round(streak.y * height) + 0.5;
			dContext.beginPath();
			dContext.moveTo(x, y);
			dContext.lineTo(x - streak.dir * streak.length, y);
			// a little curl at the tail, the classic cartoon wind mark
			dContext.moveTo(x - streak.dir * streak.length, y);
			dContext.quadraticCurveTo(
				x - streak.dir * (streak.length + 6), y - 5,
				x - streak.dir * (streak.length + 2), y - 7
			);
			dContext.stroke();
		}

		// Indicator: "WIND" with up to three arrows showing direction and force
		if (Math.abs(s) > 0.05) {
			const arrows = Math.max(1, Math.round(Math.abs(s) * 3));
			const label = s > 0 ? `WIND ${'→'.repeat(arrows)}` : `${'←'.repeat(arrows)} WIND`;
			dContext.globalAlpha = 0.35 + 0.65 * Math.abs(s);
			dContext.font = 'bold 13px monospace';
			dContext.fillStyle = '#3d5a80';
			const textWidth = dContext.measureText(label).width;
			dContext.fillText(label, Math.round((width - textWidth) / 2), 24);
		}
		dContext.restore();
	}
}

export default Wind;
