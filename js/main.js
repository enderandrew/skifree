import Camera from './lib/camera.js';
import Monster from './lib/monster.js';
import Sprite from './lib/sprite.js';
import Snowboarder from './lib/snowboarder.js';
import Dog from './lib/dog.js';
import NoviceSkier from './lib/noviceSkier.js';
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
} from './lib/constants.js';

const mainCanvas = document.getElementById('skifree-canvas');
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
	highScore: Number(localStorage.getItem('highScore')) || 0,
	distanceTravelled: 0,
};

function loadImages(sources) {
	return Promise.all(
		sources.map(src => new Promise((resolve, reject) => {
			const im = new Image();
			im.onload = () => {
				camera.storeLoadedImage(src, im);
				resolve(im);
			};
			im.onerror = reject;
			im.src = src;
		}))
	);
}

function monsterHitsSkierBehaviour(monster, skier) {
	skier.isEatenBy(monster, () => {
		state.livesLeft -= 1;
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

	function resetGame() {
		state.distanceTravelled = 0;
		state.livesLeft = 5;
		state.highScore = Number(localStorage.getItem('highScore')) || 0;
		game.reset();
		monsters = [];
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
				'Hit space to restart',
			]);
			game.pause();
			game.cycle();
			game.draw();
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
			if (monster.deleted || monster.isKnockedOut() || monster.isEating) continue;
			const dx = monster.mapPosition[0] - player.mapPosition[0];
			const dy = monster.mapPosition[1] - player.mapPosition[1];
			const inFront = facingWest ? dx <= 8 : dx >= -8;
			const inReach = Math.abs(dx) <= MONSTER_STRIKE_REACH_X
				&& dy >= -MONSTER_STRIKE_REACH_Y && dy <= MONSTER_STRIKE_REACH_Y;
			if (inFront && inReach && monster.getStabbed(player)) {
				player.addStylePoints(MONSTER_KNOCKOUT_POINTS);
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

	// Mushroom: Vanishes and awards +100 Style Points when grabbed mid-air
	sprites.mushroom.hitBehaviour.skier = (mushroom, skier) => {
		if (skier.isJumping) {
			skier.addStylePoints(100);
			mushroom.deleteOnNextCycle();
		}
	};

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
		}
	});

	game.afterCycle(() => {
		if (state.livesLeft === 0) detectEnd();
	});

	game.addUIElement(infoBox);

	setupInput({
		player, game, canvas: mainCanvas,
		spawnMonster, spawnBoarder, spawnDog, spawnNoviceSkier,
		playerLunge, toggleSkin, resetGame,
	});

	player.isMoving = false;
	player.setDirection(270);

	game.start();
}

function resizeCanvas() {
	const dpr = window.devicePixelRatio || 1;
	mainCanvas.style.width = `${window.innerWidth}px`;
	mainCanvas.style.height = `${window.innerHeight}px`;
	mainCanvas.width = Math.round(window.innerWidth * dpr);
	mainCanvas.height = Math.round(window.innerHeight * dpr);
	camera.scale(dpr, dpr);
	camera.imageSmoothingEnabled = false;
}

window.addEventListener('resize', resizeCanvas, false);

resizeCanvas();
loadImages(imageSources).then(startNeverEndingGame);