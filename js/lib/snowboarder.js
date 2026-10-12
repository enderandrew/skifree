import Sprite from './sprite.js';
import { SNOWBOARDER_STANDARD_SPEED, SNOWBOARDER_TRICK_MS, SNOWBOARDER_CRASH_MS } from './constants.js';

const TRICK_CHANCE = 0.006; // per cycle

class Snowboarder extends Sprite {
	constructor(data) {
		super(data);
		this._standardSpeed = SNOWBOARDER_STANDARD_SPEED;
		this._camera = null; // Set by Game.addMovingObject before the first cycle
		this._trick = null;  // 'grab' | 'somersault' while showing off
		this._trickTimeout = null;
		this._crashTimeout = null;
		this.isCrashed = false;
		this.despawnAboveViewport = true;
		this.setSpeed(this._standardSpeed);
	}

	_getDirection() {
		const targetX = this.movingToward ? this.movingToward[0] : this.mapPosition[0];
		const xDiff = targetX - this.mapPosition[0];
		return xDiff > 0 ? 'sEast' : 'sWest';
	}

	doTrick(trick = Math.random() < 0.5 ? 'grab' : 'somersault') {
		if (this.isCrashed || this._trick) return;
		this._trick = trick;
		this._trickTimeout = setTimeout(() => {
			this._trick = null;
			this._trickTimeout = null;
		}, SNOWBOARDER_TRICK_MS);
	}

	// Knocked down by the player: lies in the snow, then carries on.
	crash(ms = SNOWBOARDER_CRASH_MS) {
		this.isCrashed = true;
		this.isMoving = false;
		this._trick = null;
		if (this._crashTimeout) clearTimeout(this._crashTimeout);
		this._crashTimeout = setTimeout(() => {
			this.isCrashed = false;
			this.isMoving = true;
			this._crashTimeout = null;
		}, ms);
	}

	cycle(dt = 1) {
		if (this.isCrashed) {
			this.checkHittableObjects();
			return;
		}
		if (Math.random() < TRICK_CHANCE) {
			this.doTrick();
		}
		if (Math.floor(Math.random() * 11) === 1 && this._camera) {
			this.setMapPositionTarget(this._camera.getRandomlyInTheCentreOfMap());
			this.setSpeed(this._standardSpeed + Math.floor(Math.random() * 3) - 1);
		}
		if (this._camera) {
			this.setMapPositionTarget(undefined, this._camera.getMapBelowViewport() + 600);
		}
		super.cycle(dt);
	}

	draw(dContext) {
		if (this.isCrashed) return super.draw(dContext, 'hit');
		return super.draw(dContext, this._trick || this._getDirection());
	}
}

export default Snowboarder;
