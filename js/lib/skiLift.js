import Sprite from './sprite.js';
import sprites from '../spriteInfo.js';
import {
	SKI_LIFT_STANDARD_SPEED,
	SKI_LIFT_COLUMN_SPACING,
	SKI_LIFT_TOWER_SPACING,
	SKI_LIFT_CHAIR_SPACING,
	SKI_LIFT_BASE_COLUMN_X,
} from './constants.js';

// Where the two cables hang, measured from the tower sprite's left edge.
// These are the hooks at the two ends of the tower's cross-arm.
export const DOWN_CABLE_OFFSET = 1;   // left arm: empty chairs travelling downhill
export const UP_CABLE_OFFSET = 22;    // right arm: occupied chairs travelling uphill

// Where each chair sprite grips its cable, measured from the chair's left edge.
const CHAIR_GRIP_OFFSET = {
	down: 15,  // emptyChairLift hook
	up: 10,    // occupiedChairLift hook
};

// How far beyond the viewport chairs may travel before being wrapped round.
const WRAP_MARGIN = 400;

export class SkiLift extends Sprite {
	/**
	 * @param {object} data    sprite data (emptyChairLift or occupiedChairLift)
	 * @param {'down'|'up'} travel
	 */
	constructor(data = sprites.emptyChairLift, travel = 'down') {
		super(data);
		this.travel = travel;
		this.loopLength = 0; // set by the manager: distance to jump when wrapping
		this.setSpeed(SKI_LIFT_STANDARD_SPEED);
		this.setDirection(travel === 'up' ? 0 : 180);
		this.setMapPosition(undefined, undefined, 1); // Aerial layer (z = 1)
	}

	static gripOffset(travel) {
		return CHAIR_GRIP_OFFSET[travel];
	}

	cycle(dt = 1) {
		super.cycle(dt);

		// Keep every chair inside a band around the viewport by shifting it a
		// whole loop length. The loop is an exact multiple of the chair spacing,
		// so chairs stay evenly spaced however fast the player skis, boosts or
		// walks back uphill.
		if (this._camera && this.loopLength > 0) {
			const top = this._camera.getTopOfViewport() - WRAP_MARGIN;
			const bottom = this._camera.getMapBelowViewport() + WRAP_MARGIN;
			let y = this.mapPosition[1];
			while (y > bottom) y -= this.loopLength;
			while (y < top) y += this.loopLength;
			if (y !== this.mapPosition[1]) {
				this.setMapPosition(this.mapPosition[0], y, 1);
			}
		}
	}

	draw(dContext) {
		return super.draw(dContext, 'main');
	}
}

// Draws both cables of one lift column. It is added before the chairs so the
// chairs (and the static towers) render on top of the lines.
export class LiftCables {
	constructor(columnX) {
		this.columnX = columnX;
		this.deleted = false;
		this.mapPosition = [columnX, 0, 1];
	}

	cycle() {}

	draw(dContext) {
		const pos = dContext.mapPositionToCanvasPosition([this.columnX, 0]);
		const height = dContext.logicalHeight();
		const width = dContext.logicalWidth();

		dContext.save();
		dContext.strokeStyle = '#555555';
		dContext.lineWidth = 1;
		dContext.beginPath();
		for (const offset of [DOWN_CABLE_OFFSET, UP_CABLE_OFFSET]) {
			// +0.5 keeps a 1px line crisp instead of smearing it over two pixels
			const x = Math.round(pos[0] + offset) + 0.5;
			if (x < -10 || x > width + 10) continue;
			dContext.moveTo(x, 0);
			dContext.lineTo(x, height);
		}
		dContext.stroke();
		dContext.restore();
	}

	deleteOnNextCycle() {
		this.deleted = true;
	}
}

export class SkiLiftManager {
	constructor({
		game,
		camera,
		player,
		columnSpacing = SKI_LIFT_COLUMN_SPACING,
		baseColumnX = SKI_LIFT_BASE_COLUMN_X,
	}) {
		this.game = game;
		this.camera = camera;
		this.player = player;
		this.columnSpacing = columnSpacing;
		this.baseColumnX = baseColumnX;
		this.towerSpacing = SKI_LIFT_TOWER_SPACING;
		this.chairSpacing = SKI_LIFT_CHAIR_SPACING;

		this.spawnedTowers = new Map(); // "colX:towerY" -> tower sprite
		this.activeColumns = new Map(); // colX -> { cables, chairs: SkiLift[] }
	}

	reset() {
		this.spawnedTowers.clear();
		for (const column of this.activeColumns.values()) {
			column.cables.deleteOnNextCycle();
			for (const chair of column.chairs) {
				chair.deleteOnNextCycle();
			}
		}
		this.activeColumns.clear();
	}

	_spawnColumn(colX, viewTop) {
		const cables = new LiftCables(colX);
		this.game.addMovingObject(cables);

		// Enough chairs per cable to cover the viewport plus both wrap margins
		const span = this.camera.logicalHeight() + WRAP_MARGIN * 2 + this.chairSpacing;
		const chairsPerCable = Math.ceil(span / this.chairSpacing);
		const loopLength = chairsPerCable * this.chairSpacing;
		const firstY = viewTop - WRAP_MARGIN;

		const lines = [
			{ travel: 'down', data: sprites.emptyChairLift, cable: DOWN_CABLE_OFFSET, phase: 0 },
			// Half a spacing out of step, so the up and down chairs pass between each other
			{ travel: 'up', data: sprites.occupiedChairLift, cable: UP_CABLE_OFFSET, phase: this.chairSpacing / 2 },
		];

		const chairs = [];
		for (const line of lines) {
			const chairX = colX + line.cable - SkiLift.gripOffset(line.travel);
			for (let i = 0; i < chairsPerCable; i++) {
				const chair = new SkiLift(line.data, line.travel);
				chair.loopLength = loopLength;
				chair.setMapPosition(chairX, firstY + line.phase + i * this.chairSpacing, 1);
				chair.onHitting(this.player, line.data.hitBehaviour.skier);
				this.game.addMovingObject(chair);
				chairs.push(chair);
			}
		}

		return { cables, chairs };
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

				// Respawn towers that were pruned, e.g. when walking back uphill
				const existing = this.spawnedTowers.get(key);
				if (!existing || existing.deleted) {
					const tower = new Sprite(sprites.liftTower);
					// No z argument: passing one would overwrite the tower's
					// zIndexesOccupied [0, 1] and let jumping skiers pass through it.
					tower.setMapPosition(colX, towerY);
					tower.onHitting(this.player, sprites.liftTower.hitBehaviour.skier);
					this.game.addStaticObject(tower);
					this.spawnedTowers.set(key, tower);
				}
			}

			// 2. Cables and moving chairs along this column
			if (!this.activeColumns.has(colX)) {
				this.activeColumns.set(colX, this._spawnColumn(colX, topLeft[1]));
			}
		}

		// Despawn columns that have scrolled out of range
		for (const [colX, column] of this.activeColumns.entries()) {
			if (!visibleColumns.has(colX)) {
				column.cables.deleteOnNextCycle();
				for (const chair of column.chairs) {
					chair.deleteOnNextCycle();
				}
				this.activeColumns.delete(colX);
			}
		}
	}
}

export default SkiLift;
