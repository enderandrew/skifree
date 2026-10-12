import { describe, it, expect, vi, afterEach } from 'vitest';
import sprites from '../js/spriteInfo.js';
import Skier from '../js/lib/skier.js';
import Camera from '../js/lib/camera.js';
import { SkiTracks, PowderSpray } from '../js/lib/juice.js';
import { lightingAt, phaseAt, findEyePixels } from '../js/lib/dayNight.js';

afterEach(() => vi.useRealTimers());

function skiingSkier() {
	const skier = new Skier(sprites.skier);
	skier.width = 16;
	skier.height = 34;
	skier.isMoving = true;
	skier.setDirection(180);
	return skier;
}

describe('SkiTracks', () => {
	it('lays down segments while skiing and fades them out', () => {
		const skier = skiingSkier();
		const tracks = new SkiTracks(skier);
		for (let i = 0; i < 20; i++) {
			skier.mapPosition[1] += 5;
			tracks.cycle(1);
		}
		expect(tracks.segmentCount()).toBeGreaterThan(10);
		skier.isMoving = false;
		for (let i = 0; i < 200; i++) tracks.cycle(1); // 4 seconds
		expect(tracks.segmentCount()).toBe(0);
	});

	it('leaves a gap while airborne', () => {
		const skier = skiingSkier();
		const tracks = new SkiTracks(skier);
		for (let i = 0; i < 5; i++) { skier.mapPosition[1] += 5; tracks.cycle(1); }
		const before = tracks.segmentCount();
		skier.isJumping = true;
		for (let i = 0; i < 10; i++) { skier.mapPosition[1] += 5; tracks.cycle(1); }
		expect(tracks.segmentCount()).toBe(before);
	});

	it('draws two parallel lines per segment, either side of the path', () => {
		const skier = skiingSkier();
		const tracks = new SkiTracks(skier);
		skier.mapPosition[1] += 5; tracks.cycle(1);
		skier.mapPosition[1] += 5; tracks.cycle(1);
		const moves = [];
		const ctx = {
			save() {}, restore() {}, beginPath() {}, stroke() {},
			moveTo: (x, y) => moves.push([x, y]), lineTo() {},
			mapPositionToCanvasPosition: p => p,
		};
		tracks.draw(ctx);
		expect(moves.length).toBe(2);
		expect(Math.abs(moves[0][0] - moves[1][0])).toBeCloseTo(5); // straight downhill: side by side
	});
});

describe('PowderSpray', () => {
	it('sprays on a hard turn, to the outside of the turn', () => {
		const skier = skiingSkier();
		const powder = new PowderSpray(skier, { random: () => 0.5 });
		powder.cycle(1);                // heading south
		expect(powder.particleCount()).toBe(0);
		skier.turnEast();               // south → sEast
		powder.cycle(1);
		expect(powder.particleCount()).toBeGreaterThan(5);
		expect(powder._particles.every(p => p.vx < 0)).toBe(true); // thrown west
	});

	it('does not spray while airborne or going straight', () => {
		const skier = skiingSkier();
		const powder = new PowderSpray(skier);
		for (let i = 0; i < 10; i++) powder.cycle(1);
		skier.isJumping = true;
		skier.setDirection(150);
		powder.cycle(1);
		expect(powder.particleCount()).toBe(0);
	});

	it('particles fade away', () => {
		const powder = new PowderSpray(skiingSkier());
		powder.burst(0, 0, 0, 10);
		for (let i = 0; i < 30; i++) powder.cycle(1);
		expect(powder.particleCount()).toBe(0);
	});
});

describe('day / night', () => {
	it('follows the schedule and repeats every 4000 m', () => {
		expect(phaseAt(500)).toBe('day');
		expect(phaseAt(1500)).toBe('sunset');
		expect(phaseAt(2500)).toBe('night');
		expect(phaseAt(3500)).toBe('sunrise');
		expect(phaseAt(4500)).toBe('day');
		expect(phaseAt(6500)).toBe('night');
	});

	it('starts in plain daylight', () => {
		expect(lightingAt(0)).toMatchObject({ warm: 0, dark: 0 });
		expect(lightingAt(150)).toMatchObject({ warm: 0, dark: 0 });
	});

	it('fades between phases instead of snapping', () => {
		const a = lightingAt(2000);
		const b = lightingAt(2100);
		const c = lightingAt(2400);
		expect(a.dark).toBeLessThan(b.dark);
		expect(b.dark).toBeLessThan(c.dark);
		expect(c.dark).toBeGreaterThan(0.8);
		expect(lightingAt(1500).warm).toBeGreaterThan(0.2);
		expect(lightingAt(4500)).toMatchObject({ warm: 0, dark: 0 });
		expect(lightingAt(4050).warm).toBeGreaterThan(0); // the sunrise wash fading out
	});

	it('finds the red eye pixels in a frame', () => {
		const width = 4;
		const data = new Uint8ClampedArray(width * 4 * 4);
		const set = (x, y, rgba) => data.set(rgba, (y * width + x) * 4);
		set(1, 1, [255, 0, 0, 255]);   // eye
		set(2, 3, [255, 0, 0, 255]);   // red, but in the bottom half: not an eye
		const ctx = { drawImage() {}, getImageData: () => ({ data, width }) };
		const eyes = findEyePixels({ width: 4, height: 4 }, { sEast1: [0, 0, 4, 4] }, () => ({ getContext: () => ctx }));
		expect(eyes).toEqual({ sEast1: [[1, 1]] });
	});
});

describe('screen shake', () => {
	function camera() {
		const cam = new Camera({ canvas: { style: {} } });
		cam._random = () => 1;
		return cam;
	}

	it('offsets by up to the amplitude and settles back to zero', () => {
		const cam = camera();
		cam._now = () => 0;
		cam.shake(6, 300);
		expect(cam.getShakeOffset(0)).toEqual([6, 6]);
		expect(Math.abs(cam.getShakeOffset(150)[0])).toBeLessThan(6);
		expect(cam.getShakeOffset(300)).toEqual([0, 0]);
	});

	it('a weaker shake does not cut short a stronger one', () => {
		const cam = camera();
		cam._now = () => 0;
		cam.shake(8, 300);
		cam.shake(2, 300);
		expect(cam.getShakeOffset(0)).toEqual([8, 8]);
	});

	it('can be switched off for reduced motion', () => {
		const cam = camera();
		cam.setShakeEnabled(false);
		cam.shake(8, 300);
		expect(cam.getShakeOffset()).toEqual([0, 0]);
	});
});

describe('skier callbacks used for juice', () => {
	it('reports a clean ramp landing', () => {
		vi.useFakeTimers();
		const skier = skiingSkier();
		const landed = vi.fn();
		skier.setLandCb(landed);
		skier.hasHitJump({});
		vi.advanceTimersByTime(1100);
		expect(landed).toHaveBeenCalledWith({ source: 'ramp' });
		skier.jump();
		vi.advanceTimersByTime(1100);
		expect(landed).toHaveBeenLastCalledWith({ source: 'button' });
	});

	it('reports impact speed on a crash', () => {
		const skier = skiingSkier();
		const info = [];
		skier.setHitObstacleCb((o, i) => info.push(i.impactSpeed));
		skier.speedBoost();
		skier.hasHitObstacle({ id: 't' });
		expect(info[0]).toBeGreaterThan(5);
	});
});
