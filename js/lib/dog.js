import Sprite from './sprite.js';
import { DOG_STANDARD_SPEED, DOG_BARK_MS, DOG_FLEE_SPEED, DOG_FLEE_MS } from './constants.js';

const RUN_FRAME_MS = 120;
const BARK_FRAME_MS = 220;
const BARK_RANGE_PX = 140;   // starts barking when the skier comes this close
const TURN_CHANCE = 0.004;   // per cycle: wanders the other way now and then

// A dog that trots across the slope. It yaps at a skier who comes near, and
// trips one who runs into it.
class Dog extends Sprite {
	constructor(data) {
		super(data);
		this.despawnAboveViewport = true;
		this.isBarking = false;
		this._barkTimeout = null;
		this._hasBarkedAtPlayer = false;
		this._player = null;
		this._animStart = this._now();
		this._fleeUntil = 0;
		this.setSpeed(DOG_STANDARD_SPEED);
		this.runToward(Math.random() < 0.5 ? 'east' : 'west');
	}

	_now() {
		return typeof performance !== 'undefined' ? performance.now() : Date.now();
	}

	get facing() {
		return this.direction > 180 ? 'west' : 'east';
	}

	isFleeing() {
		return this._now() < this._fleeUntil;
	}

	// Bolt away from a yeti: fast, downhill and away to the side
	fleeFrom(chaser, ms = DOG_FLEE_MS) {
		const away = chaser.mapPosition[0] > this.mapPosition[0] ? 'west' : 'east';
		this.isBarking = false;
		this.isMoving = true;
		this._hasBarkedAtPlayer = true; // too busy running to yap at the skier
		if (this._barkTimeout) clearTimeout(this._barkTimeout);
		this.setDirection(away === 'west' ? 230 : 130);
		this.setSpeed(DOG_FLEE_SPEED);
		this._fleeUntil = this._now() + ms;
	}

	runToward(side) {
		this.setDirection(side === 'west' ? 270 : 90);
	}

	// Remember the player so the dog can bark when they get close
	watch(player) {
		this._player = player;
	}

	bark(ms = DOG_BARK_MS) {
		this.isBarking = true;
		this.isMoving = false;
		this._animStart = this._now();
		if (this._barkTimeout) clearTimeout(this._barkTimeout);
		this._barkTimeout = setTimeout(() => {
			this.isBarking = false;
			this.isMoving = true;
			this._barkTimeout = null;
		}, ms);
	}

	cycle(dt = 1) {
		if (this._fleeUntil && !this.isFleeing()) {
			// Safe again: back to a trot across the slope
			this._fleeUntil = 0;
			this.setSpeed(DOG_STANDARD_SPEED);
			this.runToward(this.facing);
		}
		if (!this.isBarking && !this.isFleeing() && Math.random() < TURN_CHANCE) {
			this.runToward(this.facing === 'east' ? 'west' : 'east');
		}

		if (this._player && !this._hasBarkedAtPlayer) {
			const dx = this._player.mapPosition[0] - this.mapPosition[0];
			const dy = this._player.mapPosition[1] - this.mapPosition[1];
			if (Math.hypot(dx, dy) < BARK_RANGE_PX) {
				this._hasBarkedAtPlayer = true;
				this.runToward(dx < 0 ? 'west' : 'east'); // turn to face the skier
				this.bark();
			}
		}

		super.cycle(dt);
	}

	draw(dContext) {
		const side = this.facing === 'west' ? 'West' : 'East';
		const elapsed = this._now() - this._animStart;
		const runFrameMs = this.isFleeing() ? RUN_FRAME_MS / 2.5 : RUN_FRAME_MS; // legs a blur
		const frame = this.isBarking
			? (Math.floor(elapsed / BARK_FRAME_MS) % 2) + 1
			: (Math.floor(elapsed / runFrameMs) % 2) + 1;
		return super.draw(dContext, `${this.isBarking ? 'bark' : 'run'}${side}${frame}`);
	}
}

export default Dog;
