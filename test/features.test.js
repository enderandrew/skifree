import { describe, it, expect, vi, afterEach } from 'vitest';
import sprites from '../js/spriteInfo.js';
import Sprite from '../js/lib/sprite.js';
import Skier from '../js/lib/skier.js';
import Monster from '../js/lib/monster.js';
import Dog from '../js/lib/dog.js';
import NoviceSkier from '../js/lib/noviceSkier.js';
import Snowboarder from '../js/lib/snowboarder.js';
import { SkiLift, SkiLiftManager, DOWN_CABLE_OFFSET, UP_CABLE_OFFSET } from '../js/lib/skiLift.js';
import { SKI_LIFT_STANDARD_SPEED } from '../js/lib/constants.js';

function makeCtx() {
	return {
		mapPositionToCanvasPosition: p => [p[0], p[1]],
		logicalWidth: () => 2000,
		logicalHeight: () => 2000,
		getLoadedImage: () => ({}),
		drawImage: vi.fn(),
		save: vi.fn(),
		restore: vi.fn(),
		translate: vi.fn(),
		scale: vi.fn(),
	};
}

// Draws a sprite and returns the [sx, sy, sw, sh] it asked the canvas for
function drawnRegion(sprite) {
	const ctx = makeCtx();
	sprite.draw(ctx);
	const call = ctx.drawImage.mock.calls[0];
	return { region: call ? call.slice(1, 5) : null, mirrored: ctx.scale.mock.calls.length > 0 };
}

afterEach(() => {
	vi.useRealTimers();
});

describe('sprite sheet data', () => {
	it('every animation frame the code asks for exists', () => {
		const needed = {
			skier: ['jumping', 'somersault1', 'somersault2', 'daffy', 'trickSkisUp',
				'trickTwistEast', 'trickTwistWest', 'tumble', 'ouch', 'hit',
				...Array.from({ length: 8 }, (_, i) => `walkEast${i + 1}`),
				...Array.from({ length: 8 }, (_, i) => `walkWest${i + 1}`),
				'lungeEast1', 'lungeEast3', 'lungeWest1', 'lungeWest3'],
			monster: ['roar1', 'roar2', 'patBelly', 'eating1', 'eating5', 'eatingAlt1',
				'eatingAlt2', 'stabbed', 'stabbedWest', 'fightRoar', 'knockout'],
			dog: ['runEast1', 'runEast2', 'runWest1', 'barkEast1', 'barkWest2'],
			snowboarder: ['sEast', 'sWest', 'grab', 'somersault', 'hit'],
			noviceSkier: ['sEast', 'sWest', 'dazed'],
		};
		for (const [name, parts] of Object.entries(needed)) {
			for (const part of parts) {
				expect(sprites[name].parts[part], `${name}.${part}`).toBeDefined();
			}
		}
		// The alt skin has every frame the default skin has
		for (const part of Object.keys(sprites.skier.parts)) {
			expect(sprites.skierAlt.parts[part], `skierAlt.${part}`).toBeDefined();
		}
	});
});

describe('mirrored frames', () => {
	it('draws a [x,y,w,h,true] part flipped horizontally', () => {
		const skier = new Skier(sprites.skier);
		skier._isWalkingUp = true;
		skier._walkDirection = 'west';
		skier._walkStep = 0;
		const { region, mirrored } = drawnRegion(skier);
		expect(mirrored).toBe(true);
		expect(region).toEqual(sprites.skier.parts.walkEast1.slice(0, 4));
	});

	it('draws a normal part without flipping', () => {
		const skier = new Skier(sprites.skier);
		skier._isWalkingUp = true;
		skier._walkDirection = 'east';
		expect(drawnRegion(skier).mirrored).toBe(false);
	});
});

describe('Skier tricks', () => {
	function airborne() {
		vi.useFakeTimers();
		const skier = new Skier(sprites.skier);
		skier.jump();
		return skier;
	}

	it('up does a daffy, then the skis-up pose', () => {
		const skier = airborne();
		skier.trickDaffy();
		expect(skier._trickPose).toBe('daffy');
		skier.trickDaffy();
		expect(skier._trickPose).toBe('trickSkisUp');
	});

	it('left and right twist toward the pressed side', () => {
		const skier = airborne();
		skier.trickTwisterLeft();
		expect(skier._trickPose).toBe('trickTwistWest');
		skier.trickTwisterRight();
		expect(skier._trickPose).toBe('trickTwistEast');
	});

	it('flip cycles jumping → somersault1 → somersault2 → jumping', () => {
		const skier = airborne();
		const poses = [];
		for (let i = 0; i < 3; i++) {
			skier.trickFlip();
			poses.push(skier._trickPose);
		}
		expect(poses).toEqual(['somersault1', 'somersault2', 'jumping']);
	});

	it('landing mid-flip shows the crossed-skis tumble, not the tree OUCH', () => {
		const skier = airborne();
		skier.trickFlip();
		vi.advanceTimersByTime(1000);
		expect(skier.isOuching).toBe(true);
		const { region } = drawnRegion(skier);
		expect(region).toEqual(sprites.skier.parts.tumble.slice(0, 4));
	});

	it('cannot switch to another pose mid-flip', () => {
		const skier = airborne();
		skier.trickFlip();
		skier.trickDaffy();
		skier.trickTwisterLeft();
		expect(skier._trickPose).toBe('somersault1');
	});
});

describe('Skier walking', () => {
	it('cycles through the 8 walking frames', () => {
		const skier = new Skier(sprites.skier);
		skier.setDirection(90);
		const steps = new Set();
		for (let i = 0; i < 20; i++) {
			skier.stepUp();
			steps.add(skier._walkStep);
		}
		expect([...steps].sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
	});
});

describe('jumping over things', () => {
	function placeOverlapping(skier, obj) {
		skier.canvasX = obj.canvasX = 100;
		skier.canvasY = obj.canvasY = 100;
		skier.width = skier.height = 30;
		obj.width = obj.height = 30;
	}

	it('a jumping skier touches a dead tree (so it can be set alight)', () => {
		const skier = new Skier(sprites.skier);
		const tree = new Sprite(sprites.deadTree);
		skier.jump();
		placeOverlapping(skier, tree);
		expect(skier.hits(tree)).toBe(true);
	});

	it('a jumping skier touches a mushroom (so it can be grabbed)', () => {
		const skier = new Skier(sprites.skier);
		const mushroom = new Sprite(sprites.mushroom);
		skier.jump();
		placeOverlapping(skier, mushroom);
		expect(skier.hits(mushroom)).toBe(true);
	});

	it('a jumping skier still clears a small tree', () => {
		const skier = new Skier(sprites.skier);
		const tree = new Sprite(sprites.smallTree);
		skier.jump();
		placeOverlapping(skier, tree);
		expect(skier.hits(tree)).toBe(false);
	});

	it('a jumping skier clears a dog', () => {
		const skier = new Skier(sprites.skier);
		const dog = new Dog(sprites.dog);
		skier.jump();
		placeOverlapping(skier, dog);
		expect(skier.hits(dog)).toBe(false);
	});
});

describe('Ski lift', () => {
	function makeCamera(top = 0) {
		return {
			getTopOfViewport: () => top,
			getMapBelowViewport: () => top + 800,
			canvasPositionToMapPosition: ([x, y]) => [x - 400, y + top],
			logicalWidth: () => 800,
			logicalHeight: () => 800,
		};
	}

	it('empty chairs go down, occupied chairs go up', () => {
		const down = new SkiLift(sprites.emptyChairLift, 'down');
		const up = new SkiLift(sprites.occupiedChairLift, 'up');
		const y0 = [down.mapPosition[1], up.mapPosition[1]];
		down.cycle(1);
		up.cycle(1);
		expect(down.mapPosition[1]).toBeGreaterThan(y0[0]);
		expect(up.mapPosition[1]).toBeLessThan(y0[1]);
	});

	it('wraps chairs that leave the band, keeping their spacing', () => {
		const camera = makeCamera(0);
		const chair = new SkiLift(sprites.occupiedChairLift, 'up');
		chair._camera = camera;
		chair.loopLength = 1800;
		chair.setMapPosition(0, -1000, 1);
		chair.cycle(1);
		// -1000 is above the band, so it moves down by whole loops
		expect((chair.mapPosition[1] - (-1000 - SKI_LIFT_STANDARD_SPEED)) % 1800).toBe(0);
		expect(chair.mapPosition[1]).toBeGreaterThanOrEqual(-400);
	});

	it('hangs each line of chairs from its own tower arm', () => {
		const added = [];
		const game = { addMovingObject: o => added.push(o), addStaticObject: o => added.push(o) };
		const player = new Skier(sprites.skier);
		const manager = new SkiLiftManager({ game, camera: makeCamera(), player, baseColumnX: 0, columnSpacing: 100000 });
		manager.update();

		const chairs = added.filter(o => o instanceof SkiLift);
		const downs = chairs.filter(c => c.travel === 'down');
		const ups = chairs.filter(c => c.travel === 'up');
		expect(downs.length).toBeGreaterThan(0);
		expect(ups.length).toBe(downs.length);
		expect(downs.every(c => c.data === sprites.emptyChairLift)).toBe(true);
		expect(ups.every(c => c.data === sprites.occupiedChairLift)).toBe(true);
		// Grip point of every chair sits on its cable
		const col = x => ((x % 100000) + 100000) % 100000;
		expect(new Set(downs.map(c => col(c.mapPosition[0] + 15)))).toEqual(new Set([DOWN_CABLE_OFFSET]));
		expect(new Set(ups.map(c => col(c.mapPosition[0] + 10)))).toEqual(new Set([UP_CABLE_OFFSET]));
	});

	it('towers keep their upper hit box (z=1)', () => {
		const added = [];
		const game = { addMovingObject: () => {}, addStaticObject: o => added.push(o) };
		const manager = new SkiLiftManager({ game, camera: makeCamera(), player: new Skier(sprites.skier), baseColumnX: 0, columnSpacing: 100000 });
		manager.update();
		expect(added.length).toBeGreaterThan(0);
		expect(added.every(t => t.occupiesZIndex(1))).toBe(true);
	});
});

describe('Monster', () => {
	it('pats its belly after eating', () => {
		vi.useFakeTimers();
		const monster = new Monster(sprites.monster);
		const done = vi.fn();
		monster.startEating(done);
		vi.advanceTimersByTime(300 * 6);
		expect(done).toHaveBeenCalledOnce();
		expect(monster._getFrame()).toBe('patBelly');
		vi.advanceTimersByTime(2000);
		expect(monster.isPattingBelly).toBe(false);
	});

	it('uses the alt-skin eating frames when it catches the alt skier', () => {
		vi.useFakeTimers();
		const monster = new Monster(sprites.monster);
		monster.startEating(() => {}, 'alt');
		expect(monster._getFrame()).toBe('eatingAlt1');
	});

	it('goes stabbed → hurt → knocked out → gone, hiding the skier only in the combined frame', () => {
		vi.useFakeTimers();
		const monster = new Monster(sprites.monster);
		const skier = new Skier(sprites.skier);
		skier.setDirection(90); // facing east
		const gone = vi.fn();
		expect(monster.getStabbed(skier, gone)).toBe(true);
		expect(monster._getFrame()).toBe('stabbed');
		expect(skier.isHidden).toBe(true);
		vi.advanceTimersByTime(500);
		expect(monster._getFrame()).toBe('fightRoar');
		expect(skier.isHidden).toBe(false);
		vi.advanceTimersByTime(600);
		expect(monster._getFrame()).toBe('knockout');
		vi.advanceTimersByTime(4000);
		expect(monster.deleted).toBe(true);
		expect(gone).toHaveBeenCalledOnce();
	});
});

describe('NPCs', () => {
	it('dog runs, barks when the skier comes close, then runs on', () => {
		vi.useFakeTimers();
		const dog = new Dog(sprites.dog);
		const skier = new Skier(sprites.skier);
		dog.setMapPosition(0, 0);
		skier.setMapPosition(500, 0);
		dog.watch(skier);
		dog.cycle(1);
		expect(dog.isBarking).toBe(false);
		skier.setMapPosition(50, 0);
		dog.cycle(1);
		expect(dog.isBarking).toBe(true);
		expect(dog.facing).toBe('east');
		vi.advanceTimersByTime(1000);
		expect(dog.isBarking).toBe(false);
	});

	it('dog draws mirrored frames when heading west', () => {
		const dog = new Dog(sprites.dog);
		dog.runToward('west');
		expect(drawnRegion(dog).mirrored).toBe(true);
		dog.runToward('east');
		expect(drawnRegion(dog).mirrored).toBe(false);
	});

	it('novice skier is dazed after a collision, then recovers', () => {
		vi.useFakeTimers();
		const novice = new NoviceSkier(sprites.noviceSkier);
		novice.knockOver();
		expect(drawnRegion(novice).region).toEqual(sprites.noviceSkier.parts.dazed.slice(0, 4));
		vi.advanceTimersByTime(3000);
		expect(novice.isDazed).toBe(false);
	});

	it('snowboarder shows its crash frame, then rides on', () => {
		vi.useFakeTimers();
		const boarder = new Snowboarder(sprites.snowboarder);
		boarder.crash();
		expect(drawnRegion(boarder).region).toEqual(sprites.snowboarder.parts.hit.slice(0, 4));
		vi.advanceTimersByTime(2500);
		expect(boarder.isCrashed).toBe(false);
	});

	it('snowboarder trick frames come from the sheet', () => {
		vi.useFakeTimers();
		const boarder = new Snowboarder(sprites.snowboarder);
		boarder.doTrick('grab');
		expect(drawnRegion(boarder).region).toEqual(sprites.snowboarder.parts.grab.slice(0, 4));
	});
});

describe('small objects and original-game behaviour', () => {
	it('registers a hit on an object narrower than the skier sitting inside its box', () => {
		const skier = new Skier(sprites.skier);
		const mushroom = new Sprite(sprites.mushroom);
		skier.jump();
		skier.canvasX = 100; skier.canvasY = 100; skier.width = 32; skier.height = 34;
		mushroom.canvasX = 112; mushroom.canvasY = 110; mushroom.width = 8; mushroom.height = 11;
		expect(skier.hits(mushroom)).toBe(true);
	});

	it('a jumping skier touches a stump (so it can turn into a mushroom)', () => {
		const skier = new Skier(sprites.skier);
		const stump = new Sprite(sprites.stump);
		skier.jump();
		skier.canvasX = stump.canvasX = 100; skier.canvasY = stump.canvasY = 100;
		skier.width = skier.height = stump.width = stump.height = 30;
		expect(skier.hits(stump)).toBe(true);
	});

	it('each take-off gets a new jump number', () => {
		vi.useFakeTimers();
		const skier = new Skier(sprites.skier);
		skier.jump();
		const first = skier.jumpCount;
		vi.advanceTimersByTime(1100);
		skier.jump();
		expect(skier.jumpCount).toBe(first + 1);
	});

	it('deep snow halves how far the skier travels while in it', () => {
		const a = new Skier(sprites.skier);
		const b = new Skier(sprites.skier);
		for (const s of [a, b]) { s.setDirection(180); s.setMapPosition(0, 0); }
		b.enterDeepSnow();
		a.cycle(1);
		b.cycle(1);
		expect(b.mapPosition[1]).toBeCloseTo(a.mapPosition[1] / 2, 0);
		b.cycle(1); b.cycle(1);
		expect(b.isInDeepSnow()).toBe(false); // wears off after leaving the patch
	});

	it('side-stepping shows the skating frames, mirrored when facing west', () => {
		const skier = new Skier(sprites.skier);
		skier.setDirection(270);
		skier.stepWest();
		let drawn = drawnRegion(skier);
		expect(drawn.mirrored).toBe(true);
		expect([sprites.skier.parts.skateEast1.slice(0, 4), sprites.skier.parts.skateEast2.slice(0, 4)])
			.toContainEqual(drawn.region);
		skier.setDirection(90);
		skier.stepEast();
		drawn = drawnRegion(skier);
		expect(drawn.mirrored).toBe(false);
	});

	it('lift chairs travel slower than a skier', async () => {
		const { SKI_LIFT_STANDARD_SPEED, SKIER_STANDARD_SPEED } = await import('../js/lib/constants.js');
		expect(SKI_LIFT_STANDARD_SPEED).toBeLessThan(SKIER_STANDARD_SPEED);
	});
});

describe('end-to-end through the game loop', () => {
	it('jumping over a mushroom collects it for 100 points', async () => {
		vi.useFakeTimers();
		const { default: Game } = await import('../js/lib/game.js');
		const player = new Skier(sprites.skier);
		const camera = {
			getCentreOfViewport: () => 400,
			logicalWidth: () => 800,
			logicalHeight: () => 600,
			followSprite: () => {},
			clearRect: () => {},
			getTopOfViewport: () => player.mapPosition[1] - 300,
			canvasPositionToMapPosition: ([x, y]) => [player.mapPosition[0] + x - 400, player.mapPosition[1] + y - 300],
			mapPositionToCanvasPosition: ([x, y]) => [x - player.mapPosition[0] + 400, y - player.mapPosition[1] + 300],
			getLoadedImage: () => ({}),
			drawImage: () => {}, save: () => {}, restore: () => {}, translate: () => {}, scale: () => {},
		};
		const game = new Game(camera, player);
		game.start = () => {};
		const mushroom = new Sprite(sprites.mushroom);
		mushroom.setMapPosition(8, 60);
		mushroom.onHitting(player, (m, skier) => {
			if (skier.isJumping) { skier.addStylePoints(100); m.deleteOnNextCycle(); }
		});
		game.addStaticObject(mushroom);

		player.setMapPosition(0, 0);
		player.setDirection(180);
		player.jump();
		for (let i = 0; i < 40 && !mushroom.deleted; i++) {
			game.cycle(1);
			game.draw();
		}
		expect(mushroom.deleted).toBe(true);
		expect(player.stylePoints).toBe(100);
	});
});
