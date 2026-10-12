import Sprite from './sprite.js';
import { MONSTER_STANDARD_SPEED, MONSTER_EATING_INTERVAL_MS, MONSTER_EATING_STAGES } from './constants.js';

class Monster extends Sprite {
	constructor(data) {
		super(data);
		this._spriteVersion = 1;
		this._eatingStage = 0;
		this._eatingTimeout = null;

		this.isEating = false;
		this.isFull = false;
		this.setSpeed(MONSTER_STANDARD_SPEED);
	}

	draw(dContext) {
		const spritePartToUse = () => {
			const targetX = this.movingToward ? this.movingToward[0] : this.canvasX;
			const xDiff = targetX - this.canvasX;

			if (this.isEating) {
				return `eating${this._eatingStage}`;
			}

			if (this._spriteVersion + 0.1 > 2) {
				this._spriteVersion = 0.1;
			} else {
				this._spriteVersion += 0.1;
			}

			// Clamp strictly to 1 or 2 to prevent missing sprite frame lookups
			const frameIndex = Math.min(2, Math.max(1, Math.ceil(this._spriteVersion)));
			return (xDiff >= 0 ? 'sEast' : 'sWest') + frameIndex;
		};

		return super.draw(dContext, spritePartToUse());
	}

	startEating(whenDone) {
		this._eatingStage += 1;
		this.isEating = true;
		this.isMoving = false;

		if (this._eatingTimeout) {
			clearTimeout(this._eatingTimeout);
		}

		if (this._eatingStage < MONSTER_EATING_STAGES) {
			this._eatingTimeout = setTimeout(() => this.startEating(whenDone), MONSTER_EATING_INTERVAL_MS);
		} else {
			this._eatingStage = 0;
			this.isEating = false;
			this.isMoving = true;
			this._eatingTimeout = null;
			whenDone();
		}
	}
}

export default Monster;