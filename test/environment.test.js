import { describe, it, expect } from 'vitest';
import sprites from '../js/spriteInfo.js';
import Skier from '../js/lib/skier.js';
import Camera from '../js/lib/camera.js';
import Wind from '../js/lib/wind.js';
import { computeZoom, fitCanvasToWindow, DESIGN_WIDTH, DESIGN_HEIGHT } from '../js/lib/viewport.js';
import { WIND_MAX_PUSH, WIND_AIRBORNE_FACTOR, WIND_STANDING_FACTOR } from '../js/lib/constants.js';

describe('computeZoom', () => {
	it('never zooms on screens at or below the design size', () => {
		expect(computeZoom(390, 844, 3)).toBe(1);        // phone portrait
		expect(computeZoom(1024, 768, 1)).toBe(1);
		expect(computeZoom(DESIGN_WIDTH, DESIGN_HEIGHT, 2)).toBe(1);
	});

	it('enlarges the game on big screens', () => {
		expect(computeZoom(3840, 2160, 1)).toBe(4);      // 4K at 100%
		expect(computeZoom(2560, 1440, 1)).toBe(3);      // 1440p full screen
		expect(computeZoom(2000, 1020, 1)).toBe(2);      // 1440p browser window
	});

	it('keeps every sprite pixel on a whole number of physical pixels', () => {
		for (const [w, h, dpr] of [[1920, 1080, 2], [2560, 1440, 1.5], [1536, 864, 1.25], [3840, 2160, 1], [1280, 800, 2]]) {
			const zoom = computeZoom(w, h, dpr);
			if (zoom > 1) expect(Number.isInteger(Math.round(zoom * dpr * 1e6) / 1e6)).toBe(true);
		}
		expect(computeZoom(1920, 1080, 2)).toBe(2);      // 4K panel at 200% → 4 physical px per sprite px
		expect(computeZoom(1536, 864, 1.25)).toBe(1.6);  // 1080p laptop at 125% → 2 physical px
	});

	it('never shows less mountain than the design size', () => {
		for (const [w, h, dpr] of [[1920, 1080, 2], [3840, 2160, 1], [2560, 1600, 2], [5120, 2880, 2]]) {
			const zoom = computeZoom(w, h, dpr);
			expect(w / zoom).toBeGreaterThanOrEqual(DESIGN_WIDTH);
			expect(h / zoom).toBeGreaterThanOrEqual(DESIGN_HEIGHT);
		}
	});
});

describe('player zoom adjustment', () => {
	it('steps closer and further out, within limits', () => {
		expect(computeZoom(2000, 1020, 1, 1)).toBe(3);
		expect(computeZoom(2000, 1020, 1, -1)).toBe(1);
		expect(computeZoom(2000, 1020, 1, 50)).toBe(4);   // still shows at least 320x240
		expect(computeZoom(2000, 1020, 1, -50)).toBe(1);  // never below one device pixel
		expect(computeZoom(1920, 1080, 2, -1)).toBe(1.5); // half steps on a 2x display
	});
});

describe('fitCanvasToWindow', () => {
	function setup(innerWidth, innerHeight, devicePixelRatio) {
		const calls = [];
		const ctx = { scale: (x, y) => calls.push([x, y]) };
		const canvas = { style: {}, getContext: () => ctx };
		ctx.canvas = canvas;
		const camera = Camera.create(ctx);
		const result = fitCanvasToWindow(canvas, camera, { innerWidth, innerHeight, devicePixelRatio });
		return { canvas, camera, calls, result };
	}

	it('sizes the backing store in physical pixels and the camera in game pixels', () => {
		const { canvas, camera, calls } = setup(1920, 1080, 2);
		expect(canvas.width).toBe(3840);
		expect(canvas.height).toBe(2160);
		expect(canvas.style.width).toBe('1920px');
		expect(camera.logicalWidth()).toBe(960);    // zoom 2
		expect(camera.logicalHeight()).toBe(540);
		expect(calls).toEqual([[4, 4]]);
	});

	it('maps pointer CSS coordinates into game coordinates', () => {
		const { camera } = setup(1920, 1080, 2);
		expect(camera.cssToLogical(960, 540)).toEqual([480, 270]);
	});

	it('leaves an ordinary laptop screen at 1:1', () => {
		const { camera, calls } = setup(1366, 768, 1);
		expect(camera.logicalWidth()).toBe(1366);
		expect(calls).toEqual([[1, 1]]);
	});
});

describe('Wind', () => {
	// Deterministic random: always mid-range
	const random = () => 0.5;

	function runUntilGust(wind) {
		for (let i = 0; i < 5000 && !wind.isGusting(); i++) wind.cycle(1);
	}

	it('is calm until the first gust is due, then blows', () => {
		const wind = new Wind({ random });
		wind.cycle(1);
		expect(wind.strength()).toBe(0);
		runUntilGust(wind);
		expect(wind.isGusting()).toBe(true);
	});

	it('builds up and dies away rather than switching on and off', () => {
		const wind = new Wind({ random });
		wind.gust({ direction: 1, peak: 1, duration: 4000 });
		const samples = [];
		for (let i = 0; i < 200; i++) { wind.cycle(1); samples.push(wind.strength()); }
		const peakIndex = samples.indexOf(Math.max(...samples));
		expect(samples[1]).toBeLessThan(0.2);
		expect(Math.max(...samples)).toBeCloseTo(1, 1);
		expect(samples[samples.length - 1]).toBe(0);
		expect(peakIndex).toBeGreaterThan(10);
		expect(wind.isGusting()).toBe(false);
	});

	it('blows the way the gust is heading', () => {
		const west = new Wind({ random });
		west.gust({ direction: -1, peak: 1, duration: 2000 });
		for (let i = 0; i < 50; i++) west.cycle(1);
		expect(west.strength()).toBeLessThan(0);
	});

	it('reports gust start, end and strength changes', () => {
		const events = [];
		const wind = new Wind({
			random,
			onGustStart: g => events.push(['start', g.direction]),
			onGustEnd: () => events.push(['end']),
			onChange: s => events.push(['change', s]),
		});
		wind.gust({ direction: 1, peak: 0.8, duration: 1000 });
		for (let i = 0; i < 60; i++) wind.cycle(1);
		expect(events[0]).toEqual(['start', 1]);
		expect(events.some(e => e[0] === 'change' && e[1] > 0)).toBe(true);
		expect(events.at(-1)).toEqual(['change', 0]);
		expect(events.some(e => e[0] === 'end')).toBe(true);
	});

	it('pushes a moving skier sideways', () => {
		const skier = new Skier(sprites.skier);
		skier.setDirection(180);
		skier.isMoving = true;
		const wind = new Wind({ player: skier, random });
		wind.gust({ direction: 1, peak: 1, duration: 2000 });
		for (let i = 0; i < 50; i++) wind.cycle(1); // into the steady middle
		const x = skier.mapPosition[0];
		wind.cycle(1);
		expect(skier.mapPosition[0] - x).toBeCloseTo(WIND_MAX_PUSH, 1);
	});
});

describe('Skier.applyWind', () => {
	it('drifts further in the air and barely at all when stopped or crashed', () => {
		const moving = new Skier(sprites.skier);
		moving.isMoving = true;
		moving.applyWind(1);
		expect(moving.mapPosition[0]).toBe(1);

		const airborne = new Skier(sprites.skier);
		airborne.jump();
		airborne.applyWind(1);
		expect(airborne.mapPosition[0]).toBe(WIND_AIRBORNE_FACTOR);

		const stopped = new Skier(sprites.skier);
		stopped.isMoving = false;
		stopped.applyWind(1);
		expect(stopped.mapPosition[0]).toBeCloseTo(WIND_STANDING_FACTOR);

		const crashed = new Skier(sprites.skier);
		crashed.hasBeenHit = true;
		crashed.applyWind(1);
		expect(crashed.mapPosition[0]).toBe(0);
	});
});
