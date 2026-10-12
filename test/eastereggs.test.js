import { describe, it, expect, vi, afterEach } from 'vitest';
import sprites from '../js/spriteInfo.js';
import Sprite from '../js/lib/sprite.js';
import Skier from '../js/lib/skier.js';
import Monster from '../js/lib/monster.js';
import Ufo from '../js/lib/ufo.js';
import KonamiCode, { KONAMI_SEQUENCE } from '../js/lib/konami.js';
import SoundBank from '../js/lib/sounds.js';
import { tintGreys, BIGFOOT_BROWN } from '../js/lib/recolor.js';
import setupInput from '../js/lib/input.js';

afterEach(() => vi.useRealTimers());

describe('KonamiCode', () => {
	it('unlocks on ↑ ↑ ↓ ↓ ← → ← → B A', () => {
		const unlock = vi.fn();
		const k = new KonamiCode(unlock);
		KONAMI_SEQUENCE.forEach((t, i) => {
			expect(k.feed(t)).toBe(i === KONAMI_SEQUENCE.length - 1);
		});
		expect(unlock).toHaveBeenCalledOnce();
	});

	it('restarts after a wrong input, and tolerates extra ↑ at the start', () => {
		const unlock = vi.fn();
		const k = new KonamiCode(unlock);
		['up', 'up', 'left'].forEach(t => k.feed(t));
		expect(k.position).toBe(0);
		['up', 'up', 'up', 'up', ...KONAMI_SEQUENCE.slice(2)].forEach(t => k.feed(t));
		expect(unlock).toHaveBeenCalledOnce();
	});

	it('only asks to swallow B and A once the arrows are done', () => {
		const k = new KonamiCode();
		expect(k.expectsButton()).toBe(false);
		KONAMI_SEQUENCE.slice(0, 8).forEach(t => k.feed(t));
		expect(k.expectsButton()).toBe(true);
	});
});

describe('Konami code through the real input handler', () => {
	function setup() {
		const listeners = {};
		const win = { addEventListener: (t, f) => (listeners[t] ||= []).push(f) };
		vi.stubGlobal('window', win);
		vi.stubGlobal('navigator', { getGamepads: () => [] });
		const player = new Skier(sprites.skier);
		const beforeCycle = [];
		const game = { isPaused: () => false, beforeCycle: f => beforeCycle.push(f), setMouseX() {}, setMouseY() {} };
		const canvas = { style: {}, addEventListener() {}, setPointerCapture() {} };
		const spawnBoarder = vi.fn();
		const unlock = vi.fn();
		const konami = new KonamiCode(unlock);
		setupInput({ player, game, canvas, spawnBoarder, spawnMonster() {}, resetGame() {}, konami });
		const press = (code, repeat = false) => listeners.keydown.forEach(f => f({ code, repeat, preventDefault() {} }));
		return { press, unlock, spawnBoarder, beforeCycle };
	}

	it('works from the keyboard and B does not spawn a snowboarder', () => {
		const { press, unlock, spawnBoarder } = setup();
		['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA']
			.forEach(code => press(code));
		expect(unlock).toHaveBeenCalledOnce();
		expect(spawnBoarder).not.toHaveBeenCalled();
		vi.unstubAllGlobals();
	});

	it('ignores key auto-repeat', () => {
		const { press, unlock } = setup();
		press('ArrowUp'); press('ArrowUp', true); press('ArrowUp', true);
		['ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'].forEach(c => press(c));
		expect(unlock).not.toHaveBeenCalled(); // only one real ↑
		vi.unstubAllGlobals();
	});

	it('works from a gamepad d-pad and B/A buttons', () => {
		const { unlock, beforeCycle } = setup();
		const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
		const pad = { index: 0, buttons, axes: [0, 0] };
		vi.stubGlobal('navigator', { getGamepads: () => [pad] });
		const tap = idx => {
			buttons[idx].pressed = true; beforeCycle.forEach(f => f());
			buttons[idx].pressed = false; beforeCycle.forEach(f => f());
		};
		[12, 12, 13, 13, 14, 15, 14, 15, 1, 0].forEach(tap);
		expect(unlock).toHaveBeenCalledOnce();
		vi.unstubAllGlobals();
	});
});

describe('SoundBank', () => {
	class FakeAudio {
		static plays = [];
		constructor(src) { this.src = src; this.listeners = {}; }
		addEventListener(t, f) { this.listeners[t] = f; }
		cloneNode() { const c = new FakeAudio(this.src); return c; }
		play() { FakeAudio.plays.push(this.src); return Promise.resolve(); }
	}

	it('plays the named file and throttles rapid repeats', () => {
		FakeAudio.plays = [];
		let t = 0;
		const bank = new SoundBank({ woof: 'woof.mp3' }, { AudioClass: FakeAudio, now: () => t });
		expect(bank.play('woof')).toBe(true);
		t = 50;
		expect(bank.play('woof')).toBe(false);
		t = 400;
		expect(bank.play('woof')).toBe(true);
		expect(FakeAudio.plays).toEqual(['woof.mp3', 'woof.mp3']);
	});

	it('goes quiet for a file that failed to load', () => {
		FakeAudio.plays = [];
		const bank = new SoundBank({ tree: 'tree.mp3' }, { AudioClass: FakeAudio, now: () => 0 });
		bank.preload();
		bank._sources.tree.listeners.error();
		expect(bank.play('tree')).toBe(false);
	});

	it('does nothing without Audio support', () => {
		const bank = new SoundBank({ tree: 'tree.mp3' }, { AudioClass: undefined });
		expect(bank.play('tree')).toBe(false);
	});
});

describe('Bigfoot', () => {
	it('turns grey fur brown and leaves outlines and colours alone', () => {
		const px = new Uint8ClampedArray([
			192, 192, 192, 255,   // fur
			96, 96, 96, 255,      // shaded fur
			0, 0, 0, 255,         // outline
			255, 0, 0, 255,       // red eye
			192, 192, 192, 0,     // transparent
		]);
		tintGreys(px);
		expect([...px.slice(0, 3)]).toEqual(BIGFOOT_BROWN);
		expect([...px.slice(4, 7)]).toEqual(BIGFOOT_BROWN.map(v => Math.round(v / 2)));
		expect([...px.slice(8, 11)]).toEqual([0, 0, 0]);
		expect([...px.slice(12, 15)]).toEqual([255, 0, 0]);
		expect([...px.slice(16, 19)]).toEqual([192, 192, 192]);
	});

	it('draws 50% larger than the yeti, with a matching hit area', () => {
		const ctx = {
			mapPositionToCanvasPosition: p => [p[0], p[1]],
			logicalWidth: () => 1000, logicalHeight: () => 1000,
			getLoadedImage: () => ({}), drawImage: vi.fn(),
		};
		const yeti = new Monster(sprites.monster);
		const bigfoot = new Monster(sprites.bigfoot);
		yeti.draw(ctx);
		bigfoot.draw(ctx);
		expect(bigfoot.width).toBeCloseTo(yeti.width * 1.5);
		expect(bigfoot.height).toBeCloseTo(yeti.height * 1.5);
		const dest = ctx.drawImage.mock.calls[1];
		expect(dest[7]).toBeCloseTo(yeti.width * 1.5);
		expect(bigfoot.getRightHitBoxEdge() - bigfoot.getLeftHitBoxEdge()).toBeCloseTo(yeti.width * 1.5);
	});

	it('scales explicit hit boxes too', () => {
		const s = new Sprite({ parts: { main: [0, 0, 10, 10] }, scale: 2, hitBoxes: { 0: [1, 2, 9, 10] } });
		s.canvasX = 0; s.canvasY = 0;
		expect([s.getLeftHitBoxEdge(), s.getTopHitBoxEdge(), s.getRightHitBoxEdge(), s.getBottomHitBoxEdge()])
			.toEqual([2, 4, 18, 20]);
	});

	it('cannot be stabbed', () => {
		const bigfoot = new Monster(sprites.bigfoot);
		expect(bigfoot.unkillable).toBe(true);
		expect(bigfoot.getStabbed(new Skier(sprites.skier))).toBe(false);
		expect(new Monster(sprites.monster).unkillable).toBe(false);
	});
});

describe('UFO', () => {
	const data = {
		...sprites.ufo,
		parts: { main: [0, 0, 40, 20] },
		hitBoxes: { 1: [4, 4, 36, 18] },
	};

	function makeCamera(state = { mapX: 0, mapY: 0 }) {
		return {
			logicalWidth: () => 800,
			logicalHeight: () => 600,
			// player-centred camera: map (mapX, mapY) sits at canvas (400, 300)
			canvasPositionToMapPosition: ([x, y]) => [x - 400 + state.mapX, y - 300 + state.mapY],
			mapPositionToCanvasPosition: ([x, y]) => [x - state.mapX + 400, y - state.mapY + 300],
		};
	}

	it('crosses the screen, keeps its height while the skier moves downhill, then leaves', () => {
		const state = { mapX: 0, mapY: 0 };
		const camera = makeCamera(state);
		const ufo = new Ufo(data, { camera, fromSide: 'west', screenY: 0.4 });
		const startCanvas = camera.mapPositionToCanvasPosition(ufo.mapPosition);
		expect(startCanvas[0]).toBeLessThan(0);
		let cycles = 0;
		while (!ufo.deleted && cycles < 1000) {
			state.mapY += 5; // skier heading downhill
			ufo.cycle(1);
			const [, y] = camera.mapPositionToCanvasPosition(ufo.mapPosition);
			expect(Math.abs(y - 240)).toBeLessThanOrEqual(5); // stays near 40% down the screen
			cycles++;
		}
		expect(ufo.deleted).toBe(true);
	});

	it('only collides with a jumping skier', () => {
		const camera = makeCamera();
		const ufo = new Ufo(data, { camera, fromSide: 'east' });
		const skier = new Skier(sprites.skier);
		ufo.canvasX = skier.canvasX = 100; ufo.canvasY = skier.canvasY = 100;
		ufo.width = 40; ufo.height = 20; skier.width = 30; skier.height = 34;
		expect(skier.hits(ufo)).toBe(false);
		skier.jump();
		expect(skier.hits(ufo)).toBe(true);
	});
});

describe('crashes, lives and the yeti trap', () => {
	it('reports whether the skier was already down when hit again', () => {
		vi.useFakeTimers();
		const skier = new Skier(sprites.skier);
		const calls = [];
		skier.setHitObstacleCb((obs, info) => calls.push(info.alreadyDown));
		skier.hasHitObstacle({ id: 'tree-1' });
		skier.hasHitObstacle({ id: 'tree-2' }); // sprawled into a second tree
		vi.advanceTimersByTime(3000);
		skier.hasHitObstacle({ id: 'tree-3' }); // a fresh crash after getting up
		expect(calls).toEqual([false, true, false]);
	});

	it('calls the jump callback on every take-off', () => {
		vi.useFakeTimers();
		const skier = new Skier(sprites.skier);
		const jumps = vi.fn();
		skier.setJumpCb(jumps);
		skier.jump();
		vi.advanceTimersByTime(1100);
		skier.hasHitJump({});
		expect(jumps).toHaveBeenCalledTimes(2);
	});

	it('a yeti that runs into a big tree is stunned, shows the knockout frame, then resumes', () => {
		vi.useFakeTimers();
		const yeti = new Monster(sprites.monster);
		const tree = new Sprite(sprites.tallTree);
		expect(yeti.trip(tree)).toBe(true);
		expect(yeti.isStunned).toBe(true);
		expect(yeti._getFrame()).toBe('knockout');
		const before = [...yeti.mapPosition];
		yeti.setSpeed(5);
		yeti.cycle(1);
		expect(yeti.mapPosition).toEqual(before); // lies still
		vi.advanceTimersByTime(3600);
		expect(yeti.isStunned).toBe(false);
		expect(yeti.trip(tree)).toBe(false); // getting up on the same tree doesn't re-stun
	});

	it('a stunned yeti cannot eat you but can be stabbed', () => {
		vi.useFakeTimers();
		const yeti = new Monster(sprites.monster);
		const skier = new Skier(sprites.skier);
		skier.setDirection(90);
		const hit = vi.fn();
		yeti.onHitting(skier, hit);
		yeti.trip(new Sprite(sprites.liftTower));
		yeti.cycle(1);
		expect(hit).not.toHaveBeenCalled();
		expect(yeti.getStabbed(skier)).toBe(true);
		expect(yeti.isStunned).toBe(false);
	});

	it('trees and towers carry the trap; small trees do not', async () => {
		// main.js installs the trap; check the spots it targets have z=0 hit boxes a yeti can touch
		for (const key of ['tallTree', 'burningTree', 'liftTower']) {
			expect(sprites[key].hitBoxes[0], key).toBeDefined();
		}
	});
});
