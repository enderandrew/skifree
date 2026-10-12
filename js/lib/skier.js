import Sprite from './sprite.js';
import {
	SKIER_STANDARD_SPEED,
	SKIER_BOOST_MULTIPLIER,
	SKIER_TURN_EASE_CYCLES,
	SKIER_DEAD_ZONE_X,
	SKIER_DIRECTION_THRESHOLD_SHARP,
	SKIER_BOOST_DURATION_MS,
	SKIER_BOOST_COOLDOWN_MS,
	SKIER_OUCH_DURATION_MS,
	SKIER_CRASH_RECOVERY_MS,
	SKIER_JUMP_DURATION_MS,
	SKIER_JUMP_SPEED_BONUS,
} from './constants.js';

const WALK_FRAMES = 8;
const LUNGE_FRAMES = 3;
const LUNGE_FRAME_MS = 110;

const DISCRETE_DIRECTIONS = {
	west:   270,
	wsWest: 240,
	sWest:  195,
	south:  180,
	sEast:  165,
	esEast: 120,
	east:   90
};

class Skier extends Sprite {
	constructor(data) {
		super(data);

		this._cancelableStateTimeout = null;
		this._boostTimeout = null;
		this._boostCooldownTimeout = null;
		this._canSpeedBoost = true;
		this._obstaclesHit = [];
		this._pixelsTravelled = 0;
		this._standardSpeed = SKIER_STANDARD_SPEED;
		this._turnEaseCycles = SKIER_TURN_EASE_CYCLES;
		this._speedX = 0;
		this._speedXFactor = 0;
		this._speedY = 0;
		this._speedYFactor = 1;

		// Trick & style points system
		this.stylePoints = 0;
		this._pendingTrickPoints = 0;
		this._trickPose = null;
		this._somersaultStage = 0; // 0 = upright, 1 = tuck, 2 = inverted
		this._isWalkingUp = false;
		this._walkStep = 0;
		this._walkDirection = 'east';
		this._crashPose = null;   // overrides 'ouch' while the crash plays (e.g. 'tumble')
		this._lungeFrame = 0;     // 0 = not lunging, 1-3 = lunge animation frame
		this._lungeTimeout = null;
		this.skin = 'default';

		this.isMoving = true;
		this.hasBeenHit = false;
		this.isOuching = false;
		this.isJumping = false;
		this.isHidden = false; // true while drawn as part of another sprite (yeti fight)
		this.onHitObstacleCb = () => {};
		this.onStylePointsCb = () => {};

		this.setSpeed(this._standardSpeed);
	}

	_clearTimers() {
		if (this._cancelableStateTimeout) {
			clearTimeout(this._cancelableStateTimeout);
			this._cancelableStateTimeout = null;
		}
	}

	_setNormal() {
		this.setSpeed(this._standardSpeed);
		this.isMoving = true;
		this.hasBeenHit = false;
		this.isOuching = false;
		this.isJumping = false;
		this._trickPose = null;
		this._crashPose = null;
		this._somersaultStage = 0;
		this._clearTimers();
		this.setMapPosition(undefined, undefined, 0);
	}

	_setOuching() {
		this.isMoving = false;
		this.hasBeenHit = true;
		this.isOuching = true;
		this.isJumping = false;
		this._trickPose = null;
		this._somersaultStage = 0;
		this._clearTimers();
		this.setMapPosition(undefined, undefined, 0);
	}

	_setCrashed() {
		this.isMoving = false;
		this.hasBeenHit = true;
		this.isOuching = false;
		this.isJumping = false;
		this._trickPose = null;
		this._crashPose = null;
		this._somersaultStage = 0;
		this._clearTimers();
		this.setMapPosition(undefined, undefined, 0);
	}

	_setJumping(duration = SKIER_JUMP_DURATION_MS) {
		const currentSpeed = this.getSpeed();
		this.setSpeed(currentSpeed + SKIER_JUMP_SPEED_BONUS);
		this.setSpeedY(currentSpeed + SKIER_JUMP_SPEED_BONUS);
		this.isMoving = true;
		this.hasBeenHit = false;
		this.isJumping = true;
		this._trickPose = 'jumping';
		this._somersaultStage = 0;
		this._pendingTrickPoints = 0;
		this._isWalkingUp = false;
		this.setMapPosition(undefined, undefined, 1);

		if (this._cancelableStateTimeout) clearTimeout(this._cancelableStateTimeout);
		this._cancelableStateTimeout = setTimeout(() => this._land(), duration);
	}

	_land() {
		if (!this.isJumping) return;

		// Crash if landed mid-somersault / upside down
		if (this._somersaultStage !== 0) {
			this.hasHitObstacle({ id: 'bad-landing' });
			this._crashPose = 'tumble'; // upside down in crossed skis, not the tree "OUCH!"
			this.deductStylePoints(300);
			return;
		}

		// Clean landing awards accumulated trick points
		if (this._pendingTrickPoints > 0) {
			this.addStylePoints(this._pendingTrickPoints);
			this._pendingTrickPoints = 0;
		}

		this._setNormal();
	}

	jump(duration) {
		if (this.isJumping || this.hasBeenHit || this.isBeingEaten) return;
		this._setJumping(duration);
	}

	// ─── Mid-Air Tricks ───────────────────────────────────────────────────────

	trickFlip() {
		if (!this.isJumping) return;
		this._somersaultStage = (this._somersaultStage + 1) % 3;

		if (this._somersaultStage === 1) {
			this._trickPose = 'somersault1';
		} else if (this._somersaultStage === 2) {
			this._trickPose = 'somersault2';
		} else {
			this._trickPose = 'jumping';
			this._pendingTrickPoints += 500; // Completed full 360 flip!
		}
	}

	// Up in the air. A second press while holding the daffy switches to the
	// skis-up pose, so both up-trick frames on the sheet get used.
	trickDaffy() {
		if (!this.isJumping || this._somersaultStage !== 0) return;
		if (this._trickPose === 'daffy') {
			this._trickPose = 'trickSkisUp';
			this._pendingTrickPoints += 150;
		} else {
			this._trickPose = 'daffy';
			this._pendingTrickPoints += 200;
		}
	}

	// Left/right in the air twist the body side-on, facing the pressed way.
	trickTwisterLeft() {
		if (!this.isJumping || this._somersaultStage !== 0) return;
		this._trickPose = 'trickTwistWest';
		this._pendingTrickPoints += 100;
	}

	trickTwisterRight() {
		if (!this.isJumping || this._somersaultStage !== 0) return;
		this._trickPose = 'trickTwistEast';
		this._pendingTrickPoints += 100;
	}

	attemptTrick() {
		this.trickFlip();
	}

	// ─── Style Points ─────────────────────────────────────────────────────────

	addStylePoints(pts) {
		this.stylePoints += pts;
		this.onStylePointsCb(this.stylePoints, pts);
	}

	deductStylePoints(pts) {
		this.stylePoints = Math.max(0, this.stylePoints - pts);
		this.onStylePointsCb(this.stylePoints, -pts);
	}

	// ─── Steering & Uphill Movement ──────────────────────────────────────────

	_getDiscreteDirection() {
		if (this.direction) {
			if (this.direction <= 90) return 'east';
			if (this.direction > 90 && this.direction < 150) return 'esEast';
			if (this.direction >= 150 && this.direction < 180) return 'sEast';
			if (this.direction === 180) return 'south';
			if (this.direction > 180 && this.direction <= 210) return 'sWest';
			if (this.direction > 210 && this.direction < 270) return 'wsWest';
			if (this.direction >= 270) return 'west';
			return 'south';
		}

		const xDiff = this.movingToward[0] - this.mapPosition[0];
		const yDiff = this.movingToward[1] - this.mapPosition[1];

		if (yDiff <= 0) {
			return xDiff > 0 ? 'east' : 'west';
		}

		if (xDiff > SKIER_DIRECTION_THRESHOLD_SHARP) return 'esEast';
		if (xDiff > SKIER_DEAD_ZONE_X) return 'sEast';
		if (xDiff < -SKIER_DIRECTION_THRESHOLD_SHARP) return 'wsWest';
		if (xDiff < -SKIER_DEAD_ZONE_X) return 'sWest';

		return 'south';
	}

	_setDiscreteDirection(d) {
		this._isWalkingUp = false;
		if (DISCRETE_DIRECTIONS[d]) {
			this.setDirection(DISCRETE_DIRECTIONS[d]);
		}
		this.isMoving = (d !== 'west' && d !== 'east');
	}

	stepWest() {
		if (this.hasBeenHit) return;
		this._isWalkingUp = false;
		this.mapPosition[0] -= this.speed * 2;
	}

	stepEast() {
		if (this.hasBeenHit) return;
		this._isWalkingUp = false;
		this.mapPosition[0] += this.speed * 2;
	}

	stepUp() {
		if (this.hasBeenHit || this.isJumping) return;
		const dir = this._getDiscreteDirection();
		if (dir === 'east' || dir === 'west') {
			this.mapPosition[1] -= this.speed * 1.5;
			this._isWalkingUp = true;
			this._walkDirection = dir;
			this._walkStep = (this._walkStep + 1) % WALK_FRAMES;
		}
	}

	stop() {
		if (this.isJumping) return;
		this._isWalkingUp = false;
		if (this.direction > 180) {
			this._setDiscreteDirection('west');
		} else {
			this._setDiscreteDirection('east');
		}
	}

	turnEast() {
		if (this.hasBeenHit) return;
		switch (this._getDiscreteDirection()) {
			case 'west':   this._setDiscreteDirection('wsWest'); break;
			case 'wsWest': this._setDiscreteDirection('sWest'); break;
			case 'sWest':  this._setDiscreteDirection('south'); break;
			case 'south':  this._setDiscreteDirection('sEast'); break;
			case 'sEast':  this._setDiscreteDirection('esEast'); break;
			case 'esEast': this._setDiscreteDirection('east'); break;
			default:       this._setDiscreteDirection('south'); break;
		}
	}

	turnWest() {
		if (this.hasBeenHit) return;
		switch (this._getDiscreteDirection()) {
			case 'east':   this._setDiscreteDirection('esEast'); break;
			case 'esEast': this._setDiscreteDirection('sEast'); break;
			case 'sEast':  this._setDiscreteDirection('south'); break;
			case 'south':  this._setDiscreteDirection('sWest'); break;
			case 'sWest':  this._setDiscreteDirection('wsWest'); break;
			case 'wsWest': this._setDiscreteDirection('west'); break;
			default:       this._setDiscreteDirection('south'); break;
		}
	}

	setMapPositionTarget(x, y) {
		if (this.hasBeenHit) return;
		if (Math.abs(this.mapPosition[0] - x) <= SKIER_DEAD_ZONE_X) {
			x = this.mapPosition[0];
		}
		this.movingToward = [x, y];
	}

	startMovingIfPossible() {
		if (!this.hasBeenHit && !this.isBeingEaten) {
			this.isMoving = true;
			this._isWalkingUp = false;
		}
	}

	setTurnEaseCycles(c) {
		this._turnEaseCycles = c;
	}

	getPixelsTravelledDownMountain() {
		return this._pixelsTravelled;
	}

	getStandardSpeed() {
		return this._standardSpeed;
	}

	resetSpeed() {
		this.setSpeed(this._standardSpeed);
	}

	setSpeedY(sy) {
		this._speedY = sy;
	}

	_easeSpeedToTargetUsingFactor(sp, targetSpeed, f) {
		if (f === 0 || f === 1) return targetSpeed;
		if (sp < targetSpeed) sp += this.getSpeed() * (f / this._turnEaseCycles);
		if (sp > targetSpeed) sp -= this.getSpeed() * (f / this._turnEaseCycles);
		return sp;
	}

	getSpeedX() {
		const dir = this._getDiscreteDirection();

		if (dir === 'esEast' || dir === 'wsWest') {
			this._speedXFactor = 0.5;
			this._speedX = this._easeSpeedToTargetUsingFactor(this._speedX, this.getSpeed() * 0.5, 0.5);
			return this._speedX;
		}

		if (dir === 'sEast' || dir === 'sWest') {
			this._speedXFactor = 0.33;
			this._speedX = this._easeSpeedToTargetUsingFactor(this._speedX, this.getSpeed() * 0.33, 0.33);
			return this._speedX;
		}

		this._speedX = this._easeSpeedToTargetUsingFactor(this._speedX, 0, this._speedXFactor);
		return this._speedX;
	}

	getSpeedY() {
		const dir = this._getDiscreteDirection();

		if (this.isJumping) return this._speedY;

		if (dir === 'esEast' || dir === 'wsWest') {
			this._speedYFactor = 0.6;
			this._speedY = this._easeSpeedToTargetUsingFactor(this._speedY, this.getSpeed() * 0.6, 0.6);
			return this._speedY;
		}

		if (dir === 'sEast' || dir === 'sWest') {
			this._speedYFactor = 0.85;
			this._speedY = this._easeSpeedToTargetUsingFactor(this._speedY, this.getSpeed() * 0.85, 0.85);
			return this._speedY;
		}

		if (dir === 'east' || dir === 'west') {
			this._speedYFactor = 1;
			this._speedY = 0;
			return this._speedY;
		}

		this._speedY = this._easeSpeedToTargetUsingFactor(this._speedY, this.getSpeed(), this._speedYFactor);
		return this._speedY;
	}

	cycle(dt = 1) {
		if (this.getSpeedX() <= 0 && this.getSpeedY() <= 0 && !this._isWalkingUp) {
			this.isMoving = false;
		}
		if (this.isMoving && !this._isWalkingUp) {
			this._pixelsTravelled += this.speed * dt;
		}
		if (this.isJumping) {
			this.setMapPositionTarget(undefined, this.mapPosition[1] + this.getSpeed() * dt);
		}
		super.cycle(dt);
		this.checkHittableObjects();
	}

	draw(dContext) {
		const spritePartToUse = () => {
			if (this.isBeingEaten || this.isHidden) return 'blank';
			if (this.isJumping) return this._trickPose || 'jumping';
			if (this.isOuching) return this._crashPose || 'ouch';
			if (this.hasBeenHit) return 'hit';

			if (this._lungeFrame) {
				return `lunge${this._facing() === 'west' ? 'West' : 'East'}${this._lungeFrame}`;
			}

			if (this._isWalkingUp) {
				const prefix = this._walkDirection === 'west' ? 'walkWest' : 'walkEast';
				return `${prefix}${this._walkStep + 1}`;
			}

			return this._getDiscreteDirection();
		};

		return super.draw(dContext, spritePartToUse());
	}

	hits(obs) {
		if (this._obstaclesHit.includes(obs.id)) return false;
		if (!obs.occupiesZIndex(this.mapPosition[2])) return false;
		return super.hits(obs);
	}

	_facing() {
		if (this._isWalkingUp) return this._walkDirection;
		const dir = this._getDiscreteDirection();
		return ['west', 'wsWest', 'sWest'].includes(dir) ? 'west' : 'east';
	}

	isLunging() {
		return this._lungeFrame > 0;
	}

	// Thrust the ski pole forward (the walk/lunge rows of the sheet).
	isStriking() {
		return this._lungeFrame >= 2; // pole extended on frames 2-3
	}

	lunge() {
		if (this.isJumping || this.hasBeenHit || this.isBeingEaten || this._lungeFrame) return false;
		this._lungeFrame = 1;
		const advance = () => {
			if (this._lungeFrame >= LUNGE_FRAMES) {
				this._lungeFrame = 0;
				this._lungeTimeout = null;
				return;
			}
			this._lungeFrame += 1;
			this._lungeTimeout = setTimeout(advance, LUNGE_FRAME_MS);
		};
		this._lungeTimeout = setTimeout(advance, LUNGE_FRAME_MS);
		return true;
	}

	// Swap between the default skier and the olive-haired alternate rows.
	setSkin(skin, data) {
		this.skin = skin;
		this.data = data;
		const heights = Object.values(data.parts).map(p => p[3]);
		this.maxHeight = Math.max(...heights);
	}

	speedBoost() {
		if (!this._canSpeedBoost) return;

		const originalSpeed = this.speed;
		this._canSpeedBoost = false;
		this.setSpeed(this.speed * SKIER_BOOST_MULTIPLIER);

		this._boostTimeout = setTimeout(() => {
			this.setSpeed(originalSpeed);
			this._boostCooldownTimeout = setTimeout(() => {
				this._canSpeedBoost = true;
			}, SKIER_BOOST_COOLDOWN_MS);
		}, SKIER_BOOST_DURATION_MS);
	}

	hasHitObstacle(obs) {
		this._setOuching();
		this.deductStylePoints(100);

		if (typeof navigator !== 'undefined') {
			navigator.vibrate?.(500);
		}

		if (obs?.id) this._obstaclesHit.push(obs.id);
		this.resetSpeed();
		this.onHitObstacleCb(obs);

		if (this._cancelableStateTimeout) clearTimeout(this._cancelableStateTimeout);
		this._cancelableStateTimeout = setTimeout(() => {
			this._setCrashed();
			this._cancelableStateTimeout = setTimeout(
				() => this._setNormal(),
				SKIER_CRASH_RECOVERY_MS - SKIER_OUCH_DURATION_MS
			);
		}, SKIER_OUCH_DURATION_MS);
	}

	hasHitJump(jumpObj) {
		if (!this.isMoving) return;
		this._setJumping();
	}

	isEatenBy(monster, whenEaten) {
		this.hasHitObstacle(monster);
		monster.startEating(whenEaten, this.skin);
		this._obstaclesHit.push(monster.id);
		this.isMoving = false;
		this.isBeingEaten = true;
	}

	reset() {
		this._clearTimers();
		if (this._lungeTimeout) clearTimeout(this._lungeTimeout);
		this._lungeFrame = 0;
		this._crashPose = null;
		this.isHidden = false;
		if (this._boostTimeout) clearTimeout(this._boostTimeout);
		if (this._boostCooldownTimeout) clearTimeout(this._boostCooldownTimeout);

		this._obstaclesHit = [];
		this._pixelsTravelled = 0;
		this.stylePoints = 0;
		this._pendingTrickPoints = 0;
		this._isWalkingUp = false;
		this.isMoving = true;
		this.isJumping = false;
		this.hasBeenHit = false;
		this.isOuching = false;
		this.isBeingEaten = false;
		this._canSpeedBoost = true;
		this.resetSpeed();
	}

	setHitObstacleCb(fn) {
		this.onHitObstacleCb = fn || (() => {});
	}

	setStylePointsCb(fn) {
		this.onStylePointsCb = fn || (() => {});
	}
}

export default Skier;