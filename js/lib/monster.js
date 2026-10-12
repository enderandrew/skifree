import Sprite from './sprite.js';
import {
	MONSTER_STANDARD_SPEED,
	MONSTER_EATING_INTERVAL_MS,
	MONSTER_EATING_STAGES,
	MONSTER_ROAR_MS,
	MONSTER_PAT_BELLY_MS,
	MONSTER_STABBED_MS,
	MONSTER_HURT_MS,
	MONSTER_KNOCKOUT_MS,
	MONSTER_STUN_MS,
} from './constants.js';

// How often the roar / run animations swap frames
const ROAR_FRAME_MS = 150;

class Monster extends Sprite {
	constructor(data) {
		super(data);
		this._spriteVersion = 1;
		this._eatingStage = 0;
		this._eatingTimeout = null;
		this._eatingSkin = 'default';
		this._stateTimeout = null;
		this._hasRoared = false;
		this._stateStartedAt = 0;

		this.isEating = false;
		this.isFull = false;
		this.unkillable = !!data?.unkillable; // Bigfoot shrugs off the pole
		// Stunned after running into a big tree or a lift tower
		this.isStunned = false;
		this._trippedOn = new Set(); // obstacles already run into, so waking up on one doesn't re-stun
		this.isRoaring = false;
		this.isPattingBelly = false;
		// Fight-back states: 'stabbed' → 'hurt' → 'knockedOut'
		this.fightState = null;
		this.setSpeed(MONSTER_STANDARD_SPEED);
	}

	_now() {
		return typeof performance !== 'undefined' ? performance.now() : Date.now();
	}

	_setTimer(fn, ms) {
		if (this._stateTimeout) clearTimeout(this._stateTimeout);
		this._stateTimeout = setTimeout(() => {
			this._stateTimeout = null;
			fn();
		}, ms);
	}

	isKnockedOut() {
		return this.fightState !== null;
	}

	// Stops and roars with raised arms the first time it comes into view,
	// giving the player a moment's warning before the chase starts.
	roar() {
		if (this._hasRoared || this.isEating || this.isKnockedOut() || this.isStunned) return;
		this._hasRoared = true;
		this.isRoaring = true;
		this.isMoving = false;
		this._stateStartedAt = this._now();
		this._setTimer(() => {
			this.isRoaring = false;
			this.isMoving = true;
		}, MONSTER_ROAR_MS);
	}

	cycle(dt = 1) {
		if (!this._hasRoared && this._camera && !this.isFull) {
			const screen = this._camera.mapPositionToCanvasPosition(this.mapPosition);
			if (screen[1] > 0) this.roar();
		}
		if (this.isKnockedOut() || this.isStunned) return; // harmless while flat out
		if (this.isRoaring || this.isPattingBelly) {
			// Stand still, but anyone skiing into it still gets caught
			this.checkHittableObjects();
			return;
		}
		super.cycle(dt);
	}

	_getFrame() {
		if (this.fightState === 'stabbed') return this._stabbedFrom === 'west' ? 'stabbedWest' : 'stabbed';
		if (this.fightState === 'hurt') return 'fightRoar';
		if (this.fightState === 'knockedOut') return 'knockout';
		if (this.isStunned) return 'knockout';

		if (this.isEating) {
			// Frames 1-2 show the skier's head, so they come in two skins
			if (this._eatingSkin === 'alt' && this._eatingStage <= 2) {
				return `eatingAlt${this._eatingStage}`;
			}
			return `eating${this._eatingStage}`;
		}

		if (this.isPattingBelly) return 'patBelly';

		if (this.isRoaring) {
			const elapsed = this._now() - this._stateStartedAt;
			return Math.floor(elapsed / ROAR_FRAME_MS) % 2 === 0 ? 'roar1' : 'roar2';
		}

		if (this._spriteVersion + 0.1 > 2) {
			this._spriteVersion = 0.1;
		} else {
			this._spriteVersion += 0.1;
		}

		// Clamp strictly to 1 or 2 to prevent missing sprite frame lookups
		const frameIndex = Math.min(2, Math.max(1, Math.ceil(this._spriteVersion)));
		const targetX = this.movingToward ? this.movingToward[0] : this.mapPosition[0];
		const xDiff = targetX - this.mapPosition[0];
		return (xDiff >= 0 ? 'sEast' : 'sWest') + frameIndex;
	}

	draw(dContext) {
		// Remembered so overlays (night-time eye glow) can redraw the same
		// frame without advancing the animation
		this.lastFrame = this._getFrame();
		return super.draw(dContext, this.lastFrame);
	}

	startEating(whenDone, skin = this._eatingSkin) {
		this._eatingSkin = skin;
		this._eatingStage += 1;
		this.isEating = true;
		this.isMoving = false;
		this.isRoaring = false;

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
			this.patBelly();
		}
	}

	// Catch and eat a novice skier or snowboarder. The NPC disappears into
	// the usual eating frames; onDone runs once it's been eaten.
	eatPrey(npc, onDone = () => {}) {
		npc.isHidden = true;
		npc.isMoving = false;
		this.setMapPosition(npc.mapPosition[0], npc.mapPosition[1]);
		this.startEating(() => {
			npc.deleteOnNextCycle();
			onDone();
		}, 'default');
	}

	// Satisfied belly pat after a meal, then it wanders off.
	patBelly() {
		this.isPattingBelly = true;
		this._setTimer(() => {
			this.isPattingBelly = false;
		}, MONSTER_PAT_BELLY_MS);
	}

	// The fight-back sequence: the combined skier-stabs-yeti frame, the yeti
	// howling, then the yeti flat on its back. onDone fires once it is gone.
	// Ran into a big tree, a burning tree or a lift tower: flat on its back
	// with X-eyes for a few seconds, then it gets up and resumes the chase.
	// Returns true if it actually went down.
	trip(obstacle, ms = MONSTER_STUN_MS) {
		if (this.isEating || this.isStunned || this.isKnockedOut()) return false;
		if (obstacle?.id !== undefined) {
			if (this._trippedOn.has(obstacle.id)) return false;
			this._trippedOn.add(obstacle.id);
		}
		this.isStunned = true;
		this.isRoaring = false;
		this.isPattingBelly = false;
		this._setTimer(() => {
			this.isStunned = false;
			this.isMoving = true;
		}, ms);
		return true;
	}

	getStabbed(skier, onDone = () => {}) {
		if (this.unkillable || this.isKnockedOut() || this.isEating) return false;
		this.isStunned = false; // a stunned yeti is a sitting target

		this.isRoaring = false;
		this.isPattingBelly = false;
		this.isMoving = false;
		this.stopFollowing();
		this.fightState = 'stabbed';
		this._stabbedFrom = skier._facing ? (skier._facing() === 'west' ? 'west' : 'east') : 'east';
		// The combined frame draws the skier at its left edge (or right edge
		// when mirrored), so line it up with where the skier is standing.
		const frameW = this.data.parts.stabbed[2];
		const skierW = skier.width || 0;
		this.setMapPosition(
			this._stabbedFrom === 'west' ? skier.mapPosition[0] + skierW - frameW : skier.mapPosition[0],
			skier.mapPosition[1]
		);
		skier.isHidden = true;  // the 'stabbed' frame already contains the skier
		skier.isMoving = false;

		this._setTimer(() => {
			skier.isHidden = false;
			this.fightState = 'hurt';
			this._setTimer(() => {
				this.fightState = 'knockedOut';
				this._setTimer(() => {
					this.deleteOnNextCycle();
					onDone();
				}, MONSTER_KNOCKOUT_MS);
			}, MONSTER_HURT_MS);
		}, MONSTER_STABBED_MS);

		return true;
	}
}

export default Monster;
