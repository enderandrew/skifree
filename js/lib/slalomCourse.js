import Sprite from './sprite.js';
import sprites from '../spriteInfo.js';
import { PIXELS_PER_METRE } from './constants.js';

export class SlalomCourse {
	constructor({ game, player, camera }) {
		this.game = game;
		this.player = player;
		this.camera = camera;

		this.mode = 'free'; // 'free' | 'slalom' | 'treeSlalom'
		this.isActive = false;
		this.isFinished = false;

		this.startTime = null;
		this.elapsedMs = 0;
		this.penaltySeconds = 0;
		this.finishTimeSeconds = null;

		this.gates = []; // Array of { sprite, type: 'red'|'blue', resolved: boolean, x, y }
		this.courseObjects = [];
		this.finishY = 0;
		this.courseStartX = 0;

		this.bestSlalomTime = Number(localStorage.getItem('bestSlalomTime')) || null;
		this.bestTreeSlalomTime = Number(localStorage.getItem('bestTreeSlalomTime')) || null;
	}

	buildCourse(mode, startX = 0) {
		this.reset();
		this.mode = mode;
		this.courseStartX = startX;

		// Original course distances: Slalom = 540m, Tree Slalom = 1040m
		const distanceM = mode === 'treeSlalom' ? 1040 : 540;
		this.finishY = distanceM * PIXELS_PER_METRE;

		// 1. Starting Gate at Y = 20
		const leftPost = new Sprite(sprites.signStart);
		leftPost.setMapPosition(startX - 60, 20);
		const rightPost = new Sprite(sprites.signStartLeft);
		rightPost.setMapPosition(startX + 60, 20);

		this.game.addStaticObject(leftPost);
		this.game.addStaticObject(rightPost);
		this.courseObjects.push(leftPost, rightPost);

		// 2. Generate Alternating Slalom Gates down the slope
		// Spaced every ~28 meters (around 500px in Y)
		const gateSpacingY = 500;
		let currentY = 300;
		let gateIndex = 0;

		while (currentY < this.finishY - 200) {
			const isRed = gateIndex % 2 === 0;
			// Weave gates gently between left (-90px) and right (+90px)
			const weaveX = isRed ? -80 : 80;
			const gateX = startX + weaveX;

			const gateSprite = new Sprite(isRed ? sprites.gateRed : sprites.gateBlue);
			gateSprite.setMapPosition(gateX, currentY);
			this.game.addStaticObject(gateSprite);

			this.gates.push({
				sprite: gateSprite,
				type: isRed ? 'red' : 'blue',
				x: gateX,
				y: currentY,
				resolved: false
			});
			this.courseObjects.push(gateSprite);

			// In Tree Slalom mode: Place trees between the gates
			if (mode === 'treeSlalom') {
				const treeTypes = [sprites.smallTree, sprites.tallTree];
				const tree1 = new Sprite(treeTypes[gateIndex % 2]);
				tree1.setMapPosition(startX + (isRed ? 40 : -40), currentY + 220);
				tree1.onHitting(this.player, tree1.data.hitBehaviour?.skier);
				this.game.addStaticObject(tree1);
				this.courseObjects.push(tree1);
			}

			currentY += gateSpacingY;
			gateIndex++;
		}

		// 3. Finish Line Banners at Y = this.finishY
		const finishLeft = new Sprite(sprites.signFinishLeft);
		finishLeft.setMapPosition(startX - 90, this.finishY);
		const finishRight = new Sprite(sprites.signFinishRight);
		finishRight.setMapPosition(startX + 90, this.finishY);

		this.game.addStaticObject(finishLeft);
		this.game.addStaticObject(finishRight);
		this.courseObjects.push(finishLeft, finishRight);
	}

	start() {
		this.isActive = true;
		this.isFinished = false;
		this.startTime = performance.now();
		this.penaltySeconds = 0;
		this.finishTimeSeconds = null;
	}

	update() {
		if (!this.isActive || this.isFinished) return;

		this.elapsedMs = performance.now() - this.startTime;
		const skierY = this.player.mapPosition[1];
		const skierX = this.player.mapPosition[0];

		// Check Gates as player passes them
		for (const gate of this.gates) {
			if (!gate.resolved && skierY >= gate.y) {
				gate.resolved = true;

				// Red: must pass on the left (skierX < gate.x)
				// Blue: must pass on the right (skierX > gate.x)
				const isCorrectSide = gate.type === 'red' ? skierX < gate.x : skierX > gate.x;
				const isWithinCorridor = Math.abs(skierX - gate.x) < 320;

				if (isCorrectSide && isWithinCorridor) {
					// Cleared: Swap gate to green smiley face
					gate.sprite.data = sprites.poleSmiley;
				} else {
					// Missed: Swap gate to red frowny face and add 5 second penalty
					gate.sprite.data = sprites.poleFrowny;
					this.penaltySeconds += 5;
				}
			}
		}

		// Check Finish Line
		if (skierY >= this.finishY && Math.abs(skierX - this.courseStartX) < 200) {
			this.isFinished = true;
			const totalTime = Number(((this.elapsedMs / 1000) + this.penaltySeconds).toFixed(2));
			this.finishTimeSeconds = totalTime;

			if (this.mode === 'slalom') {
				if (!this.bestSlalomTime || totalTime < this.bestSlalomTime) {
					this.bestSlalomTime = totalTime;
					localStorage.setItem('bestSlalomTime', String(totalTime));
				}
			} else if (this.mode === 'treeSlalom') {
				if (!this.bestTreeSlalomTime || totalTime < this.bestTreeSlalomTime) {
					this.bestTreeSlalomTime = totalTime;
					localStorage.setItem('bestTreeSlalomTime', String(totalTime));
				}
			}
		}
	}

	getHUDLines() {
		if (!this.isActive) return null;

		const currentSeconds = (this.elapsedMs / 1000).toFixed(1);
		const courseTitle = this.mode === 'treeSlalom' ? 'Tree Slalom' : 'Slalom';
		const best = this.mode === 'treeSlalom' ? this.bestTreeSlalomTime : this.bestSlalomTime;

		if (this.isFinished) {
			return [
				`--- ${courseTitle} FINISH ---`,
				`Final Time: ${this.finishTimeSeconds}s`,
				`Penalties: +${this.penaltySeconds}s`,
				`Course Record: ${best ? best + 's' : 'N/A'}`,
			];
		}

		const clearedCount = this.gates.filter(g => g.resolved && g.sprite.data === sprites.poleSmiley).length;
		const missedCount = this.gates.filter(g => g.resolved && g.sprite.data === sprites.poleFrowny).length;

		return [
			`Mode: ${courseTitle}`,
			`Time: ${currentSeconds}s (+${this.penaltySeconds}s pen)`,
			`Gates: ${clearedCount + missedCount}/${this.gates.length} (${missedCount} missed)`,
			`Record: ${best ? best + 's' : 'N/A'}`
		];
	}

	reset() {
		this.isActive = false;
		this.isFinished = false;
		this.startTime = null;
		this.elapsedMs = 0;
		this.penaltySeconds = 0;
		this.finishTimeSeconds = null;

		for (const obj of this.courseObjects) {
			obj.deleteOnNextCycle();
		}
		this.courseObjects = [];
		this.gates = [];
	}
}