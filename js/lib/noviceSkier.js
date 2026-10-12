import Sprite from './sprite.js';
import { NOVICE_SKIER_STANDARD_SPEED, NOVICE_SKIER_DAZED_MS } from './constants.js';

const WOBBLE_MS = 900; // how long a beginner holds a traverse before turning

// A beginner snow-ploughing slowly down the hill in wobbly traverses.
// Running into one knocks both of you over; they sit dazed for a while.
class NoviceSkier extends Sprite {
	constructor(data) {
		super(data);
		this.despawnAboveViewport = true;
		this.isDazed = false;
		this._dazedTimeout = null;
		this._traverse = Math.random() < 0.5 ? 'sEast' : 'sWest';
		this._lastTurn = this._now();
		this.setSpeed(NOVICE_SKIER_STANDARD_SPEED);
		this._applyTraverse();
	}

	_now() {
		return typeof performance !== 'undefined' ? performance.now() : Date.now();
	}

	_applyTraverse() {
		// 150° is down-and-east, 210° is down-and-west
		this.setDirection(this._traverse === 'sEast' ? 150 : 210);
	}

	knockOver(ms = NOVICE_SKIER_DAZED_MS) {
		this.isDazed = true;
		this.isMoving = false;
		if (this._dazedTimeout) clearTimeout(this._dazedTimeout);
		this._dazedTimeout = setTimeout(() => {
			this.isDazed = false;
			this.isMoving = true;
			this._dazedTimeout = null;
		}, ms);
	}

	cycle(dt = 1) {
		if (this.isHidden) return; // inside a yeti's eating frames
		if (!this.isDazed && this._now() - this._lastTurn > WOBBLE_MS) {
			this._traverse = this._traverse === 'sEast' ? 'sWest' : 'sEast';
			this._lastTurn = this._now();
			this._applyTraverse();
		}
		super.cycle(dt);
	}

	draw(dContext) {
		if (this.isHidden) return;
		return super.draw(dContext, this.isDazed ? 'dazed' : this._traverse);
	}
}

export default NoviceSkier;
