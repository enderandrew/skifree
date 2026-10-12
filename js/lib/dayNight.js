import Sprite from './sprite.js';

// Time of day driven by distance down the mountain, repeating every 4000 m:
//
//      0 –1000 m  midday sun
//   1000 –2000 m  sunset   (warm orange wash)
//   2000 –3000 m  night    (dark, with a light circle around the skier)
//   3000 –4000 m  sunrise  (warm orange wash)
//   4000 m        day again, and round it goes
//
// Each change fades in over TRANSITION_M after its boundary rather than
// snapping. At night tall trees stay faintly visible as silhouettes and a
// chasing yeti's red eyes glow.

export const CYCLE_M = 4000;
const TRANSITION_M = 200;

const LOOKS = {
	day:     { warm: 0,    dark: 0 },
	sunset:  { warm: 0.32, dark: 0.12 },
	night:   { warm: 0,    dark: 0.86 },
	sunrise: { warm: 0.24, dark: 0.08 },
};

// [start metre within the cycle, phase that starts there]
const SCHEDULE = [
	[0, 'day'],
	[1000, 'sunset'],
	[2000, 'night'],
	[3000, 'sunrise'],
];

const smoothstep = t => t * t * (3 - 2 * t);

export function phaseAt(metres) {
	const m = ((metres % CYCLE_M) + CYCLE_M) % CYCLE_M;
	let name = SCHEDULE[0][1];
	for (const [start, phase] of SCHEDULE) if (m >= start) name = phase;
	return name;
}

// { warm, dark, phase } for a distance travelled, in metres
export function lightingAt(metres) {
	const d = Math.max(0, metres);
	const m = d % CYCLE_M;
	let index = 0;
	for (let i = 0; i < SCHEDULE.length; i++) if (m >= SCHEDULE[i][0]) index = i;
	const [start, phase] = SCHEDULE[index];
	const to = LOOKS[phase];
	// The very first stretch of a run is plain daylight, not the tail of a sunrise
	const previousPhase = d < CYCLE_M && index === 0
		? 'day'
		: SCHEDULE[(index + SCHEDULE.length - 1) % SCHEDULE.length][1];
	const from = LOOKS[previousPhase];
	const t = smoothstep(Math.min(1, (m - start) / TRANSITION_M));
	return {
		phase,
		warm: from.warm + (to.warm - from.warm) * t,
		dark: from.dark + (to.dark - from.dark) * t,
	};
}

// Glowing eyes: the yeti frames used while it hunts, and the pure red pixels
// in each (found at load time by findEyePixels).
export const EYE_FRAMES = ['roar1', 'roar2', 'sEast1', 'sEast2', 'sWest1', 'sWest2', 'patBelly', 'fightRoar'];

export function findEyePixels(image, parts, createCanvas, frames = EYE_FRAMES) {
	const eyes = {};
	try {
		const canvas = createCanvas(image.width, image.height);
		const ctx = canvas.getContext('2d');
		ctx.drawImage(image, 0, 0);
		const { data, width } = ctx.getImageData(0, 0, image.width, image.height);
		for (const frame of frames) {
			const box = parts[frame];
			if (!box) continue;
			const [x0, y0, w, h] = box;
			const found = [];
			// Eyes sit in the head, so only the top half of the frame is searched
			for (let y = y0; y < y0 + h / 2; y++) {
				for (let x = x0; x < x0 + w; x++) {
					const i = (y * width + x) * 4;
					if (data[i] === 255 && data[i + 1] === 0 && data[i + 2] === 0 && data[i + 3] > 0) {
						found.push([x - x0, y - y0]);
					}
				}
			}
			if (found.length) eyes[frame] = found.slice(0, 6);
		}
	} catch {
		// can't read pixels here: no eye glow, everything else still works
	}
	return eyes;
}

export class DayNight {
	/**
	 * @param {object} opts
	 * @param {() => number} opts.getMetres  distance travelled
	 * @param {object} opts.player
	 * @param {() => Iterable} opts.getStaticObjects
	 * @param {() => Iterable} opts.getMonsters
	 * @param {object} opts.tallTreeData   sprite data whose instances stay visible at night
	 * @param {object} opts.eyes            frame name -> eye pixel offsets
	 */
	constructor({ getMetres, player, getStaticObjects = () => [], getMonsters = () => [], tallTreeData = null, eyes = {} }) {
		this._getMetres = getMetres;
		this.player = player;
		this._getStaticObjects = getStaticObjects;
		this._getMonsters = getMonsters;
		this._tallTreeData = tallTreeData;
		this.eyes = eyes;
		this.deleted = false;
		this.state = lightingAt(0);
	}

	cycle() {
		this.state = lightingAt(this._getMetres());
	}

	isDark() {
		return this.state.dark > 0.45;
	}

	_onScreen(sprite, width, height) {
		return sprite.canvasX + (sprite.width || 0) > 0 && sprite.canvasX < width
			&& sprite.canvasY + (sprite.height || 0) > 0 && sprite.canvasY < height;
	}

	draw(dContext) {
		const { warm, dark } = this.state;
		if (warm <= 0.005 && dark <= 0.005) return;
		const width = dContext.logicalWidth();
		const height = dContext.logicalHeight();

		dContext.save();

		// Sunset / sunrise: multiply a warm orange over everything
		if (warm > 0.005) {
			dContext.globalCompositeOperation = 'multiply';
			dContext.fillStyle = `rgba(255, 128, 44, ${warm.toFixed(3)})`;
			dContext.fillRect(0, 0, width, height);
			dContext.globalCompositeOperation = 'source-over';
		}

		if (dark > 0.005) {
			// Darkness everywhere except a pool of light around the skier,
			// pushed a little downhill like a headlamp looking ahead
			const p = this.player;
			const cx = p.canvasX + (p.width || 0) / 2;
			const cy = p.canvasY + (p.height || 0) / 2 + 22;
			// At dusk the "pool" is so wide it just reads as an even dimming;
			// it tightens into a flashlight beam as night falls
			const nightFall = Math.min(1, dark / 0.6);
			const inner = 26 + (1 - nightFall) * 600;
			const outer = 150 + (1 - nightFall) * 1200;
			const night = 'rgba(6, 10, 32, ';
			const gradient = dContext.createRadialGradient(cx, cy, inner, cx, cy, outer);
			gradient.addColorStop(0, `${night}0)`);
			gradient.addColorStop(0.55, `${night}${(dark * 0.45).toFixed(3)})`);
			gradient.addColorStop(1, `${night}${dark.toFixed(3)})`);
			dContext.fillStyle = gradient;
			dContext.fillRect(0, 0, width, height);

			const nightness = Math.min(1, dark / 0.6);
			if (nightness > 0.1) {
				this._drawSilhouettes(dContext, width, height, nightness);
				this._drawEyes(dContext, width, height, nightness);
			}
		}

		dContext.restore();
	}

	// Tall trees show through the dark as faint shapes against the snow
	_drawSilhouettes(dContext, width, height, nightness) {
		if (!this._tallTreeData) return;
		dContext.globalAlpha = 0.42 * nightness;
		for (const obj of this._getStaticObjects()) {
			if (obj.data !== this._tallTreeData || obj.deleted || !this._onScreen(obj, width, height)) continue;
			Sprite.prototype.draw.call(obj, dContext, 'main');
		}
		// Monsters loom out of the dark too, a little more strongly
		dContext.globalAlpha = 0.55 * nightness;
		for (const m of this._getMonsters()) {
			if (m.deleted || !m.lastFrame || !this._onScreen(m, width, height)) continue;
			Sprite.prototype.draw.call(m, dContext, m.lastFrame); // same frame, no animation step
		}
		dContext.globalAlpha = 1;
	}

	// Red eyes glowing in the dark
	_drawEyes(dContext, width, height, nightness) {
		dContext.globalCompositeOperation = 'lighter';
		for (const m of this._getMonsters()) {
			if (m.deleted || !this._onScreen(m, width, height)) continue;
			const pixels = this.eyes[m.lastFrame];
			if (!pixels) continue;
			const scale = m.data.scale || 1;
			for (const [ex, ey] of pixels) {
				const x = m.canvasX + (ex + 0.5) * scale;
				const y = m.canvasY + (ey + 0.5) * scale;
				const r = 5 * scale;
				const glow = dContext.createRadialGradient(x, y, 0, x, y, r);
				glow.addColorStop(0, `rgba(255, 60, 40, ${(0.95 * nightness).toFixed(3)})`);
				glow.addColorStop(0.35, `rgba(255, 0, 0, ${(0.5 * nightness).toFixed(3)})`);
				glow.addColorStop(1, 'rgba(255, 0, 0, 0)');
				dContext.fillStyle = glow;
				dContext.fillRect(x - r, y - r, r * 2, r * 2);
			}
		}
		dContext.globalCompositeOperation = 'source-over';
	}
}
