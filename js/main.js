import Camera from './lib/camera.js';
import Monster from './lib/monster.js';
import Sprite from './lib/sprite.js';
import Snowboarder from './lib/snowboarder.js';
import Dog from './lib/dog.js';
import NoviceSkier from './lib/noviceSkier.js';
import ScorePopup from './lib/scorePopup.js';
import Wind from './lib/wind.js';
import WindSound from './lib/windSound.js';
import Snow from './lib/snow.js';
import { fitCanvasToWindow, watchViewport } from './lib/viewport.js';
import SoundBank from './lib/sounds.js';
import KonamiCode from './lib/konami.js';
import Ufo from './lib/ufo.js';
import { makeTintedSheet } from './lib/recolor.js';
import { SkiTracks, PowderSpray } from './lib/juice.js';
import { DayNight, findEyePixels } from './lib/dayNight.js';
import Skier from './lib/skier.js';
import InfoBox from './lib/infoBox.js';
import Game from './lib/game.js';
import setupInput from './lib/input.js';
import isMobileDevice from './lib/isMobileDevice.js';
import sprites from './spriteInfo.js';
import SkiLift, { SkiLiftManager } from './lib/skiLift.js';
import { SlalomCourse } from './lib/slalomCourse.js';
import {
	PIXELS_PER_METRE,
	MONSTER_DISTANCE_THRESHOLD,
	MONSTER_STRIKE_REACH_X,
	MONSTER_STRIKE_REACH_Y,
	MONSTER_KNOCKOUT_POINTS,
	KONAMI_LIVES,
	UFO_CHANCE_PER_SECOND,
	SKIER_STANDARD_SPEED,
} from './lib/constants.js';

// Screen-shake strengths, in game pixels
const SHAKE_TREE = 4;          // tree crash at normal speed
const SHAKE_TREE_FAST = 8;     // tree crash while boosting or straight off a jump
const SHAKE_RAMP_LANDING = 4;
const SHAKE_YETI_STEP = 2;
const SHAKE_BIGFOOT_STEP = 4;
const SHAKE_YETI_TRIP = 5;
const STOMP_STEP_MS = 330;     // time between footfalls
const STOMP_DURATION_MS = 2600; // footfalls shake for this long after it comes into view

// Red eye pixels in the yeti frames, found when the images load
let monsterEyes = {};

const mainCanvas = document.getElementById('skifree-canvas');
const snow = new Snow();
const windSound = new WindSound('wind.mp3');
const sounds = new SoundBank();
sounds.preload();

// Which crashes count as hitting a tree (for tree.mp3)
const TREE_SPRITES = new Set([
	sprites.smallTree, sprites.tallTree, sprites.deadTree, sprites.burningTree,
	sprites.decoratedTree, sprites.decoratedTree2,
]);
const camera = Camera.create(mainCanvas.getContext('2d'));
const imageSources = ['sprite-characters.png', 'skifree-objects.png'];
const infoBoxControls = isMobileDevice()
	? 'Tap or drag on the piste to control the player'
	: 'Use the mouse or WASD to control the player';

const dropRates = {
	smallTree: 4,
	tallTree: 2,
	decoratedTree: 0.3,
	decoratedTree2: 0.3,
	jump: 1,
	thickSnow: 1,
	rock: 1,
	stump: 1,
	deadTree: 1,
	mogul: 1,
	mogulSmall: 0.5,
	mogulA: 0.5,
	mogulB: 0.5,
	mogulC: 0.5,
	mushroom: 0.2
};

const state = {
	livesLeft: 5,
	endReason: null,
	highScore: Number(localStorage.getItem('highScore')) || 0,
	distanceTravelled: 0,
};

function loadImage(src) {
	return new Promise((resolve, reject) => {
		const im = new Image();
		im.onload = () => {
			camera.storeLoadedImage(src, im);
			resolve(im);
		};
		im.onerror = reject;
		im.src = src;
	});
}

function loadImages(sources) {
	return Promise.all(sources.map(loadImage));
}

// Images the game can run without. A missing file just disables its feature.
function loadOptionalImages() {
	const makeCanvas = (w, h) => {
		const c = document.createElement('canvas');
		c.width = w;
		c.height = h;
		return c;
	};

	// Bigfoot: a brown copy of the character sheet. If pixels can't be read
	// back, Bigfoot is drawn from the normal sheet (grey, but still bigger).
	const sheet = camera.getLoadedImage('sprite-characters.png');
	camera.storeLoadedImage(sprites.bigfoot.$imageFile, makeTintedSheet(sheet, makeCanvas) || sheet);
	monsterEyes = findEyePixels(sheet, sprites.monster.parts, makeCanvas);

	return loadImage('ufo.png').then(im => {
		const w = im.naturalWidth || im.width;
		const h = im.naturalHeight || im.height;
		sprites.ufo.parts.main = [0, 0, w, h];
		// Inset the hit box a little so grazing the edge of the saucer is a miss
		sprites.ufo.hitBoxes[1] = [Math.round(w * 0.1), Math.round(h * 0.2), Math.round(w * 0.9), Math.round(h * 0.9)];
	}, () => {
		// no ufo.png: no UFOs
	});
}

function monsterHitsSkierBehaviour(monster, skier) {
	sounds.play('yummy');
	skier.isEatenBy(monster, () => {
		// Being eaten ends the game however many skiers are left
		state.livesLeft = 0;
		state.endReason = monster.unkillable ? 'Bigfoot ate you!' : 'The yeti ate you!';
		monster.isFull = true;
		monster.isEating = false;
		skier.isBeingEaten = false;
		monster.setSpeed(skier.getSpeed());
		monster.stopFollowing();
		const randomPositionAbove = camera.getRandomMapPositionAboveViewport();
		monster.setMapPositionTarget(randomPositionAbove[0], randomPositionAbove[1]);
	});
}

function startNeverEndingGame() {
	let player;
	let startSign;
	let infoBox;
	let game;
	let skiLiftManager;
	let slalomCourse;
	let monsters = [];
	let wind;

	function resetGame() {
		state.distanceTravelled = 0;
		state.livesLeft = 5;
		state.endReason = null;
		state.highScore = Number(localStorage.getItem('highScore')) || 0;
		game.reset();
		monsters = [];
		wind.reset();
		if (currentUfo) currentUfo.deleteOnNextCycle();
		game.addStaticObject(startSign);
		skiLiftManager.reset();
		slalomCourse.reset();
		spawnStartingSignArea();
	}

	function spawnStartingSignArea() {
		// 1. Slalom billboard (Left route: X = -500)
		const slalomSign = new Sprite(sprites.signSlalom);
		slalomSign.setMapPosition(-500, -20);
		game.addStaticObject(slalomSign);

		// 2. Freestyle billboard (Center route: X = 0)
		const freestyleSign = new Sprite(sprites.signFreestyle);
		freestyleSign.setMapPosition(0, -20);
		game.addStaticObject(freestyleSign);

		// 3. Tree Slalom billboard (Right route: X = 500)
		const treeSlalomSign = new Sprite(sprites.signTreeSlalom);
		treeSlalomSign.setMapPosition(500, -20);
		game.addStaticObject(treeSlalomSign);
	}

	function detectEnd() {
		if (!game.isPaused()) {
			const finalDistance = Number(state.distanceTravelled);
			if (finalDistance > state.highScore) {
				state.highScore = finalDistance;
				localStorage.setItem('highScore', String(state.highScore));
			}
			infoBox.setLines([
				'Game over!',
				state.endReason || 'Out of skiers!',
				'Hit space to restart',
			]);
			game.pause();
			game.cycle();
			game.draw();
			windSound.stop();
			snow.setWind(0);
		}
	}

	function spawnMonster() {
		const newMonster = new Monster(sprites.monster);
		const randomPosition = camera.getRandomMapPositionAboveViewport();
		newMonster.setMapPosition(randomPosition[0], randomPosition[1]);
		newMonster.follow(player);
		newMonster.setSpeed(player.getStandardSpeed());
		newMonster.onHitting(player, monsterHitsSkierBehaviour);
		game.addMovingObject(newMonster, 'monster');
		monsters.push(newMonster);
	}

	// Killing a yeti summons Bigfoot from off-screen. He can't be killed.
	function spawnBigfoot() {
		const bigfoot = new Monster(sprites.bigfoot);
		const pos = camera.getRandomMapPositionAboveViewport();
		bigfoot.setMapPosition(pos[0], pos[1] - 200); // a little further out than a yeti
		bigfoot.follow(player);
		bigfoot.setSpeed(player.getStandardSpeed());
		bigfoot.onHitting(player, monsterHitsSkierBehaviour);
		game.addMovingObject(bigfoot, 'monster');
		monsters.push(bigfoot);
		sounds.play('bigfoot');
	}

	// Each second of play there's a 1 in 200 chance a UFO crosses the screen
	let currentUfo = null;
	const ufoSpawner = {
		_ms: 0,
		cycle(dt = 1) {
			if (!sprites.ufo.parts.main[2]) return; // ufo.png never loaded
			this._ms += dt * 20;
			while (this._ms >= 1000) {
				this._ms -= 1000;
				if ((!currentUfo || currentUfo.deleted) && Math.random() < UFO_CHANCE_PER_SECOND) {
					spawnUfo();
				}
			}
		},
		draw() {},
	};

	function spawnUfo() {
		currentUfo = new Ufo(sprites.ufo, { camera });
		currentUfo.onHitting(player, sprites.ufo.hitBehaviour.skier);
		// A UI element so it draws above the trees, like something in the sky
		game.addUIElement(currentUfo);
		sounds.play('spooky');
	}

	function spawnBoarder() {
		const newBoarder = new Snowboarder(sprites.snowboarder);
		const randomPositionAbove = camera.getRandomMapPositionAboveViewport();
		const randomPositionBelow = camera.getRandomMapPositionBelowViewport();
		newBoarder.setMapPosition(randomPositionAbove[0], randomPositionAbove[1]);
		newBoarder.setMapPositionTarget(randomPositionBelow[0], randomPositionBelow[1]);
		newBoarder.onHitting(player, (boarder, skier) => {
			skier.hasHitObstacle(boarder);
			boarder.crash();
		});
		game.addMovingObject(newBoarder);
	}

	// Dogs appear just below the screen, trotting across the slope
	function spawnDog() {
		const dog = new Dog(sprites.dog);
		const pos = camera.getRandomMapPositionBelowViewport();
		dog.setMapPosition(pos[0], pos[1]);
		dog.watch(player);
		dog.onHitting(player, (d, skier) => {
			skier.hasHitObstacle(d);
			d.bark();
		});
		game.addMovingObject(dog);
	}

	// Beginners appear below the screen, so the player catches up with them
	function spawnNoviceSkier() {
		const novice = new NoviceSkier(sprites.noviceSkier);
		const pos = camera.getRandomMapPositionBelowViewport();
		novice.setMapPosition(pos[0], pos[1]);
		novice.onHitting(player, (n, skier) => {
			skier.hasHitObstacle(n);
			n.knockOver();
		});
		game.addMovingObject(novice);
	}

	// X: jab with the ski pole. While the pole is extended, a yeti within reach
	// in front of the skier is stabbed and knocked out (the fight-back row at
	// the bottom of the sheet). Checked every cycle in checkPoleStrike().
	function playerLunge() {
		player.lunge();
	}

	function checkPoleStrike() {
		if (!player.isStriking()) return;
		const facingWest = player._facing() === 'west';
		for (const monster of monsters) {
			if (monster.deleted || monster.unkillable || monster.isKnockedOut() || monster.isEating) continue;
			const dx = monster.mapPosition[0] - player.mapPosition[0];
			const dy = monster.mapPosition[1] - player.mapPosition[1];
			const inFront = facingWest ? dx <= 8 : dx >= -8;
			const inReach = Math.abs(dx) <= MONSTER_STRIKE_REACH_X
				&& dy >= -MONSTER_STRIKE_REACH_Y && dy <= MONSTER_STRIKE_REACH_Y;
			if (inFront && inReach && monster.getStabbed(player)) {
				player.addStylePoints(MONSTER_KNOCKOUT_POINTS);
				spawnBigfoot();
				return;
			}
		}
	}

	// C: swap between the default skier and the olive-haired alternate
	function toggleSkin() {
		if (player.skin === 'alt') {
			player.setSkin('default', sprites.skier);
		} else {
			player.setSkin('alt', sprites.skierAlt);
		}
	}

	function randomlySpawnNPC(spawnFunction, dropRate) {
		const rateModifier = Math.max(800 - camera.logicalWidth(), 0);
		if (Math.floor(Math.random() * (1001 + rateModifier)) <= dropRate) {
			spawnFunction();
		}
	}

	function spawnTerrain() {
		if (!player.isMoving) return [];
		return Sprite.createObjects([
			{ sprite: sprites.smallTree, dropRate: dropRates.smallTree },
			{ sprite: sprites.tallTree, dropRate: dropRates.tallTree },
			{ sprite: sprites.decoratedTree, dropRate: dropRates.decoratedTree },
			{ sprite: sprites.decoratedTree2, dropRate: dropRates.decoratedTree2 },
			{ sprite: sprites.jump, dropRate: dropRates.jump },
			{ sprite: sprites.thickSnow, dropRate: dropRates.thickSnow },
			{ sprite: sprites.rock, dropRate: dropRates.rock },
			{ sprite: sprites.stump, dropRate: dropRates.stump },
			{ sprite: sprites.deadTree, dropRate: dropRates.deadTree },
			{ sprite: sprites.mogul, dropRate: dropRates.mogul },
			{ sprite: sprites.mogulSmall, dropRate: dropRates.mogulSmall },
			{ sprite: sprites.mogulA, dropRate: dropRates.mogulA },
			{ sprite: sprites.mogulB, dropRate: dropRates.mogulB },
			{ sprite: sprites.mogulC, dropRate: dropRates.mogulC },
			{ sprite: sprites.mushroom, dropRate: dropRates.mushroom },
		], {
			rateModifier: Math.max(800 - camera.logicalWidth(), 0),
			position: () => camera.getRandomMapPositionBelowViewport(),
			player,
		});
	}

	function tickNPCs() {
		randomlySpawnNPC(spawnBoarder, 0.1);
		if (player.isMoving) {
			randomlySpawnNPC(spawnDog, 0.1);
			randomlySpawnNPC(spawnNoviceSkier, 0.1);
		}
		monsters = monsters.filter(m => !m.deleted);
		state.distanceTravelled = Number((player.getPixelsTravelledDownMountain() / PIXELS_PER_METRE).toFixed(1));
		if (state.distanceTravelled > MONSTER_DISTANCE_THRESHOLD) {
			randomlySpawnNPC(spawnMonster, 0.001);
		}
	}

	function updateHUD() {
		const courseHUD = slalomCourse.getHUDLines();
		if (courseHUD) {
			infoBox.setLines([
				'SkiFree.js',
				...courseHUD,
				`Travelled: ${state.distanceTravelled.toFixed(1)}m`,
				`Style Points: ${player.stylePoints}`,
				`Speed: ${player.getSpeed()}`
			]);
		} else {
			infoBox.setLines([
				'SkiFree.js',
				'Space / Ins / Left-Click / E = Jump | Air: Down=Flip, Up=Daffy, Left/Right=Twist',
				'X = Pole jab (fight the yeti!) | C = Change skier',
				'Slalom (Left) | Freestyle (Center) | Tree Slalom (Right)',
				`Travelled ${state.distanceTravelled.toFixed(1)}m`,
				`Style Points: ${player.stylePoints}`,
				`Skiers left: ${state.livesLeft}`,
				`High Score: ${state.highScore.toFixed(1)}`,
				`Speed: ${player.getSpeed()}`,
			]);
		}
	}

	player = new Skier(sprites.skier);
	player.setMapPosition(0, -60);
	player.setMapPositionTarget(0, 0);

	game = new Game(camera, player);

	// ─── Juice ───────────────────────────────────────────────────────────────
	const skiTracks = new SkiTracks(player);
	const powder = new PowderSpray(player);
	game.addGroundEffect(skiTracks);
	game.addAirEffect(powder);

	const dayNight = new DayNight({
		getMetres: () => state.distanceTravelled,
		player,
		getStaticObjects: () => game.staticObjects(),
		getMonsters: () => monsters,
		tallTreeData: sprites.tallTree,
		eyes: monsterEyes,
	});
	game.addOverlay(dayNight);

	// Respect "reduce motion": no screen shake
	const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
	camera.setShakeEnabled(!reduceMotion?.matches);
	reduceMotion?.addEventListener?.('change', e => camera.setShakeEnabled(!e.matches));

	// Yetis and Bigfoot shake the screen with each footfall for a moment
	// after they stomp into view
	function stompMonstersIntoView() {
		const now = performance.now();
		const width = camera.logicalWidth();
		const height = camera.logicalHeight();
		for (const m of monsters) {
			if (m.deleted) continue;
			const [cx, cy] = camera.mapPositionToCanvasPosition(m.mapPosition);
			const onScreen = cx + (m.width || 0) > 0 && cx < width && cy + (m.height || 0) > 0 && cy < height;
			if (onScreen && !m._stompUntil) {
				m._stompUntil = now + STOMP_DURATION_MS;
				m._nextStomp = now;
			}
			const stomping = m._stompUntil && now < m._stompUntil && now >= m._nextStomp;
			if (stomping && !m.isStunned && !m.isKnockedOut() && !m.isEating) {
				camera.shake(m.unkillable ? SHAKE_BIGFOOT_STEP : SHAKE_YETI_STEP, 140);
				m._nextStomp = now + STOMP_STEP_MS;
			}
		}
	}
	skiLiftManager = new SkiLiftManager({ game, camera, player, columnSpacing: 1500, baseColumnX: -250 });
	slalomCourse = new SlalomCourse({ game, player, camera });

	// ─── Special Terrain Interactions ────────────────────────────────────────

	// Dead Tree: Ignites into animated burningTree when jumped over
	sprites.deadTree.hitBehaviour.skier = (deadTree, skier) => {
		if (skier.isJumping) {
			const burningTree = new Sprite(sprites.burningTree);
			burningTree.setMapPosition(deadTree.mapPosition[0], deadTree.mapPosition[1]);

			let frame = 1;
			let animTick = 0;
			burningTree.cycle = (dt = 1) => {
				// Keep running collision checks: replacing cycle() without this
				// meant nothing could ever hit a burning tree
				burningTree.checkHittableObjects();
				animTick += dt;
				if (animTick >= 6) { // Cycles fire frames every ~120ms
					frame = (frame % 3) + 1;
					animTick = 0;
				}
			};
			burningTree.draw = (ctx) => {
				return Sprite.prototype.draw.call(burningTree, ctx, `frame${frame}`);
			};

			// Skiing into it afterwards is still a crash; jumping over it is fine
			burningTree.onHitting(skier, sprites.burningTree.hitBehaviour.skier);

			deadTree.deleteOnNextCycle();
			game.addStaticObject(burningTree);
			skier.addStylePoints(200);
		} else {
			skier.hasHitObstacle(deadTree);
		}
	};

	// Moguls: Give the skier a mini-jump / hop when skied over
	const mogulHop = (mogul, skier) => {
		if (!skier.isJumping && skier.isMoving) {
			skier.jump(400); // 400ms mini-hop instead of the standard 1000ms jump
		}
	};
	for (const key of ['mogul', 'mogulSmall', 'mogulA', 'mogulB', 'mogulC']) {
		sprites[key].hitBehaviour.skier = mogulHop;
	}

	// Stump: as in the original, jumping over one turns it into a mushroom
	sprites.stump.hitBehaviour.skier = (stump, skier) => {
		if (skier.isJumping) {
			const mushroom = new Sprite(sprites.mushroom);
			mushroom.setMapPosition(stump.mapPosition[0] + 4, stump.mapPosition[1]);
			// Not collectable on the same jump that revealed it
			mushroom.revealedOnJump = skier.jumpCount;
			mushroom.onHitting(skier, sprites.mushroom.hitBehaviour.skier);
			stump.deleteOnNextCycle();
			game.addStaticObject(mushroom);
		} else {
			skier.hasHitObstacle(stump);
		}
	};

	// Mushroom: Vanishes and awards +100 Style Points when grabbed mid-air
	sprites.mushroom.hitBehaviour.skier = (mushroom, skier) => {
		if (skier.isJumping && mushroom.revealedOnJump !== skier.jumpCount) {
			skier.addStylePoints(100);
			mushroom.deleteOnNextCycle();
		}
	};

	// Deep snow: ploughing through it slows the skier down
	sprites.thickSnow.hitBehaviour.skier = (snow, skier) => {
		if (!skier.isInDeepSnow()) sounds.play('snow'); // once, on the way in
		skier.enterDeepSnow();
	};

	// Every crash costs a skier (being eaten is handled separately: it ends
	// the game outright). Then the sound for whatever was hit.
	player.setHitObstacleCb((obstacle, { alreadyDown, impactSpeed = 0 } = {}) => {
		if (obstacle instanceof Monster) return;
		if (!alreadyDown) {
			state.livesLeft = Math.max(0, state.livesLeft - 1);
		}
		if (TREE_SPRITES.has(obstacle?.data)) {
			sounds.play('tree');
			// The faster you hit it, the harder the screen shakes
			if (impactSpeed > SKIER_STANDARD_SPEED) camera.shake(SHAKE_TREE_FAST, 380);
			else if (impactSpeed >= SKIER_STANDARD_SPEED) camera.shake(SHAKE_TREE, 280);
		}
		else if (obstacle?.data === sprites.dog) sounds.play('woof');
	});

	// Every take-off kicks up snow: ramps, the jump button and mogul hops
	player.setJumpCb(() => sounds.play('snow'));

	// Landing off a rainbow ramp: a thump and a burst of powder both ways
	player.setLandCb(({ source }) => {
		if (source !== 'ramp') return;
		camera.shake(SHAKE_RAMP_LANDING, 220);
		const x = player.mapPosition[0] + player.width / 2;
		const y = player.mapPosition[1] + player.height - 3;
		powder.burst(x, y, 0, 18);
	});

	// Lead a yeti into a big tree, a burning tree or a lift tower and it's
	// knocked flat for a few seconds. Small trees it still tramples through.
	const yetiTrap = (obstacle, monster) => {
		if (monster.trip?.(obstacle)) {
			sounds.play('tree');
			camera.shake(SHAKE_YETI_TRIP, 260);
			player.addStylePoints(250); // the points callback shows the +250
		}
	};
	for (const key of ['tallTree', 'burningTree', 'liftTower']) {
		sprites[key].hitBehaviour.monster = yetiTrap;
	}

	// Float every bonus above the skier so it's obvious when points land
	player.setStylePointsCb((total, delta) => {
		if (delta > 0) {
			game.addMovingObject(new ScorePopup(`+${delta}`, player));
		} else if (delta < 0) {
			game.addMovingObject(new ScorePopup(`${delta}`, player, '#d02020'));
		}
	});

	spawnStartingSignArea();

	startSign = new Sprite(sprites.signStart);
	game.addStaticObject(startSign);
	startSign.setMapPosition(-50, 0);

	infoBox = new InfoBox({
		initialLines: [
			'SkiFree.js',
			infoBoxControls,
			'Travelled 0.0m',
			`High Score: ${state.highScore.toFixed(1)}`,
			`Skiers left: ${state.livesLeft}`,
			'Created by Dan Hough (@basicallydan)',
		],
		position: { top: 15, right: 10 },
	});

	game.beforeCycle(() => {
		skiLiftManager.update();

		// Check if player has initiated a course at the top of the mountain
		if (!slalomCourse.isActive && player.mapPosition[1] >= 0) {
			if (player.mapPosition[0] < -300) {
				slalomCourse.buildCourse('slalom', -500);
				slalomCourse.start();
			} else if (player.mapPosition[0] > 300) {
				slalomCourse.buildCourse('treeSlalom', 500);
				slalomCourse.start();
			}
		}

		slalomCourse.update();
		checkPoleStrike();

		const newTerrain = spawnTerrain();
		if (newTerrain && newTerrain.length) {
			game.addStaticObjects(newTerrain);
		}

		if (!game.isPaused()) {
			tickNPCs();
			updateHUD();
			stompMonstersIntoView();
			// Light HUD text once it gets dark
			infoBox.setColour(dayNight.isDark() ? '#dfe7f5' : '#000000');
		}
	});

	game.afterCycle(() => {
		if (state.livesLeft <= 0) detectEnd();
	});

	game.addUIElement(infoBox);

	// Gusts push the skier sideways, lean the CSS snow and play wind.mp3
	wind = new Wind({
		player,
		onGustStart: () => windSound.start(),
		onGustEnd: () => windSound.stop(),
		onChange: strength => {
			snow.setWind(strength);
			windSound.setStrength(strength);
		},
	});
	game.addUIElement(wind);
	game.addUIElement(ufoSpawner);

	// ↑ ↑ ↓ ↓ ← → ← → B A on the keyboard or a gamepad: 30 skiers
	const konami = new KonamiCode(() => {
		if (game.isPaused()) return;
		state.livesLeft = KONAMI_LIVES;
		sounds.play('konami');
		game.addMovingObject(new ScorePopup(`${KONAMI_LIVES} SKIERS!`, player, '#108020'));
	});
	windSound.preload();

	setupInput({
		player, game, canvas: mainCanvas, camera,
		spawnMonster, spawnBoarder, spawnDog, spawnNoviceSkier,
		playerLunge, toggleSkin, resetGame, konami,
	});

	player.isMoving = false;
	player.setDirection(270);

	game.start();
}

// Re-fit on resize, rotation or a move to a screen with a different pixel
// density. Snowflakes are rebuilt once the resizing settles.
let snowRebuild = null;
function resizeCanvas() {
	fitCanvasToWindow(mainCanvas, camera);
	clearTimeout(snowRebuild);
	snowRebuild = setTimeout(() => snow.populate(), 250);
}

watchViewport(resizeCanvas);
resizeCanvas();
loadImages(imageSources).then(loadOptionalImages).then(startNeverEndingGame);