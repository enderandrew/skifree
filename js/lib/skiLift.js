import Sprite from './sprite.js';
import sprites from '../spriteInfo.js';
import { SKI_LIFT_STANDARD_SPEED } from './constants.js';

export class SkiLift extends Sprite {
	constructor(data = sprites.emptyChairLift) {
		super(data);
		this.setSpeed(SKI_LIFT_STANDARD_SPEED);
		this.setDirection(180); // Travels down the mountain
		this.setMapPosition(undefined, undefined, 1); // Aerial layer (z = 1)
	}

	cycle(dt = 1) {
		super.cycle(dt);

		if (this._camera) {
			const mapBottom = this._camera.getMapBelowViewport();
			if (this.mapPosition[1] > mapBottom + 300) {
				const topY = this._camera.getTopOfViewport() - 300;
				this.setMapPosition(this.mapPosition[0], topY, 1);
			}
		}
	}

	draw(dContext) {
		const pos = dContext.mapPositionToCanvasPosition(this.mapPosition);
		const cableX = Math.round(pos[0] + 13);

		// Only draw the overhead cable if within horizontal canvas bounds
		if (cableX >= -10 && cableX <= dContext.logicalWidth() + 10) {
			dContext.save();
			dContext.strokeStyle = '#555555';
			dContext.lineWidth = 1;
			dContext.beginPath();
			dContext.moveTo(cableX, 0);
			dContext.lineTo(cableX, dContext.logicalHeight());
			dContext.stroke();
			dContext.restore();
		}

		return super.draw(dContext, 'main');
	}
}

export class SkiLiftManager {
	constructor({ game, camera, player, columnSpacing = 1500, baseColumnX = -250 }) {
		this.game = game;
		this.camera = camera;
		this.player = player;
		this.columnSpacing = columnSpacing;
		this.baseColumnX = baseColumnX;
		this.towerSpacing = 450;
		this.chairSpacing = 300;

		this.spawnedTowers = new Set();
		this.activeColumns = new Map(); // colX -> Array of SkiLift chair sprites
	}

	reset() {
		this.spawnedTowers.clear();
		for (const chairs of this.activeColumns.values()) {
			for (const chair of chairs) {
				chair.deleteOnNextCycle();
			}
		}
		this.activeColumns.clear();
	}

	update() {
		const topLeft = this.camera.canvasPositionToMapPosition([0, 0]);
		const bottomRight = this.camera.canvasPositionToMapPosition([
			this.camera.logicalWidth(),
			this.camera.logicalHeight()
		]);

		const minX = Math.min(topLeft[0], bottomRight[0]) - 600;
		const maxX = Math.max(topLeft[0], bottomRight[0]) + 600;
		const minY = Math.min(topLeft[1], bottomRight[1]) - 600;
		const maxY = Math.max(topLeft[1], bottomRight[1]) + 800;

		// Calculate columns in visible horizontal range
		const kMin = Math.floor((minX - this.baseColumnX) / this.columnSpacing);
		const kMax = Math.ceil((maxX - this.baseColumnX) / this.columnSpacing);

		const visibleColumns = new Set();

		for (let k = kMin; k <= kMax; k++) {
			const colX = this.baseColumnX + (k * this.columnSpacing);
			visibleColumns.add(colX);

			// 1. Static towers along this column
			const nMin = Math.floor(minY / this.towerSpacing);
			const nMax = Math.ceil(maxY / this.towerSpacing);

			for (let n = nMin; n <= nMax; n++) {
				const towerY = n * this.towerSpacing;
				const key = `${colX}:${towerY}`;

				if (!this.spawnedTowers.has(key)) {
					this.spawnedTowers.add(key);
					const tower = new Sprite(sprites.liftTower);
					tower.setMapPosition(colX, towerY, 0);
					tower.onHitting(this.player, sprites.liftTower.hitBehaviour.skier);
					this.game.addStaticObject(tower);
				}
			}

			// 2. Moving chairs along this column
			if (!this.activeColumns.has(colX)) {
				const chairs = [];
				for (let yOffset = -300; yOffset <= 1200; yOffset += this.chairSpacing) {
					const chair = new SkiLift(sprites.emptyChairLift);
					chair.setMapPosition(colX - 1, topLeft[1] + yOffset, 1);
					chair.onHitting(this.player, sprites.emptyChairLift.hitBehaviour.skier);
					this.game.addMovingObject(chair);
					chairs.push(chair);
				}
				this.activeColumns.set(colX, chairs);
			}
		}

		// Despawn chairs for columns no longer visible
		for (const [colX, chairs] of this.activeColumns.entries()) {
			if (!visibleColumns.has(colX)) {
				for (const chair of chairs) {
					chair.deleteOnNextCycle();
				}
				this.activeColumns.delete(colX);
			}
		}
	}
}

export default SkiLift;