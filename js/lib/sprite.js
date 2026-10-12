import GUID from './guid.js';

class Sprite {
	constructor(data) {
		this._hittableObjects = {};
		this._zIndexesOccupied = [0];
		this._trackedSpriteToMoveToward = undefined;

		this.direction = undefined;
		this.mapPosition = [0, 0, 0];
		this.id = GUID();
		this.canvasX = 0;
		this.canvasY = 0;
		this.canvasZ = 0;
		this.height = 0;
		this.speed = 0;
		this.data = data || { parts: {} };
		this.movingToward = [0, 0];
		this.metresDownTheMountain = 0;
		this.movingWithConviction = false;
		this.deleted = false;

		if (!this.data.parts) {
			this.data.parts = {};
		}

		const heights = Object.values(this.data.parts).map(p => p[3]);
		this.maxHeight = heights.length ? Math.max(...heights) : undefined;
		this.isMoving = true;

		if (data?.id) {
			this.id = data.id;
		}

		if (data?.zIndexesOccupied) {
			this._zIndexesOccupied = data.zIndexesOccupied;
		}
	}

	_incrementX(amount) {
		this.canvasX += parseFloat(amount);
	}

	_incrementY(amount) {
		this.canvasY += parseFloat(amount);
	}

	_getHitBox(forZIndex) {
		return this.data.hitBoxes?.[forZIndex];
	}

	_roundHalf(num) {
		return Math.round(num * 2) / 2;
	}

	_move(dt = 1) {
		if (!this.isMoving) {
			return;
		}

		let currentX = this.mapPosition[0];
		let currentY = this.mapPosition[1];

		if (this.direction !== undefined) {
			let d = this.direction - 90;
			if (d < 0) d = 360 + d;
			currentX += this._roundHalf(this.speed * dt * Math.cos(d * (Math.PI / 180)));
			currentY += this._roundHalf(this.speed * dt * Math.sin(d * (Math.PI / 180)));
		} else {
			if (this.movingToward?.[0] !== undefined) {
				if (currentX > this.movingToward[0]) {
					currentX -= Math.min(this.getSpeedX() * dt, Math.abs(currentX - this.movingToward[0]));
				} else if (currentX < this.movingToward[0]) {
					currentX += Math.min(this.getSpeedX() * dt, Math.abs(currentX - this.movingToward[0]));
				}
			}

			if (this.movingToward?.[1] !== undefined) {
				if (currentY > this.movingToward[1]) {
					currentY -= Math.min(this.getSpeedY() * dt, Math.abs(currentY - this.movingToward[1]));
				} else if (currentY < this.movingToward[1]) {
					currentY += Math.min(this.getSpeedY() * dt, Math.abs(currentY - this.movingToward[1]));
				}
			}
		}

		this.setMapPosition(currentX, currentY);
	}

	draw(dCtx, spriteFrame) {
		const fr = this.data.parts[spriteFrame];
		if (!fr) return;
	
		this.height = fr[3];
		this.width = fr[2];
	
		const newCanvasPosition = dCtx.mapPositionToCanvasPosition(this.mapPosition);
		this.setCanvasPosition(newCanvasPosition[0], newCanvasPosition[1]);
	
		// Viewport Culling: Skip drawing if completely outside canvas bounds
		const screenW = dCtx.logicalWidth();
		const screenH = dCtx.logicalHeight();
		if (
			this.canvasX + this.width < 0 ||
			this.canvasX > screenW ||
			this.canvasY + this.height < 0 ||
			this.canvasY > screenH
		) {
			return;
		}
	
		const image = dCtx.getLoadedImage(this.data.$imageFile);

		// A fifth element of `true` draws the region mirrored horizontally
		if (fr[4]) {
			dCtx.save();
			dCtx.translate(this.canvasX + fr[2], this.canvasY);
			dCtx.scale(-1, 1);
			dCtx.drawImage(image, fr[0], fr[1], fr[2], fr[3], 0, 0, fr[2], fr[3]);
			dCtx.restore();
			return;
		}

		dCtx.drawImage(
			image,
			fr[0], fr[1], fr[2], fr[3],
			this.canvasX, this.canvasY, fr[2], fr[3]
		);
	}

	setMapPosition(x, y, z) {
		if (x === undefined) x = this.mapPosition[0];
		if (y === undefined) y = this.mapPosition[1];
		if (z === undefined) {
			z = this.mapPosition[2];
		} else {
			this._zIndexesOccupied = [z];
		}
		this.mapPosition = [x, y, z];
	}

	setCanvasPosition(cx, cy) {
		if (cx !== undefined && cx !== null) {
			if (typeof cx === 'string' && (cx[0] === '+' || cx[0] === '-')) {
				this._incrementX(cx);
			} else {
				this.canvasX = cx;
			}
		}
		if (cy !== undefined && cy !== null) {
			if (typeof cy === 'string' && (cy[0] === '+' || cy[0] === '-')) {
				this._incrementY(cy);
			} else {
				this.canvasY = cy;
			}
		}
	}

	getCanvasPositionX() { return this.canvasX; }
	getCanvasPositionY() { return this.canvasY; }

	getLeftHitBoxEdge(zIndex = 0) {
		let lhbe = this.getCanvasPositionX();
		const hitBox = this._getHitBox(zIndex);
		if (hitBox) lhbe += hitBox[0];
		return lhbe;
	}

	getTopHitBoxEdge(zIndex = 0) {
		let thbe = this.getCanvasPositionY();
		const hitBox = this._getHitBox(zIndex);
		if (hitBox) thbe += hitBox[1];
		return thbe;
	}

	getRightHitBoxEdge(zIndex = 0) {
		const hitBox = this._getHitBox(zIndex);
		if (hitBox) return this.canvasX + hitBox[2];
		return this.canvasX + (this.width || 0); // 0 until first drawn
	}

	getBottomHitBoxEdge(zIndex = 0) {
		const hitBox = this._getHitBox(zIndex);
		if (hitBox) return this.canvasY + hitBox[3];
		return this.canvasY + (this.height || 0);
	}

	getPositionInFrontOf() {
		return [this.canvasX, this.canvasY + this.height];
	}

	setSpeed(s) {
		this.speed = s;
		this.speedX = s;
		this.speedY = s;
	}

	incrementSpeedBy(s) {
		this.speed += s;
	}

	getSpeed() { return this.speed; }
	getSpeedX() { return this.speed; }
	getSpeedY() { return this.speed; }

	setHeight(h) { this.height = h; }
	setWidth(w) { this.width = w; }
	getMaxHeight() { return this.maxHeight; }

	checkHittableObjects() {
		for (const [key, objectData] of Object.entries(this._hittableObjects)) {
			if (objectData.object.deleted) {
				delete this._hittableObjects[key];
			} else if (objectData.object.hits(this)) {
				for (const callback of objectData.callbacks) {
					callback(this, objectData.object);
				}
			}
		}
	}

	cycle(dt = 1) {
		this.checkHittableObjects();

		if (this._trackedSpriteToMoveToward) {
			this.setMapPositionTarget(
				this._trackedSpriteToMoveToward.mapPosition[0],
				this._trackedSpriteToMoveToward.mapPosition[1],
				true
			);
		}

		this._move(dt);
	}

	setMapPositionTarget(x, y, override) {
		if (override) {
			this.movingWithConviction = false;
		}

		if (!this.movingWithConviction) {
			if (x === undefined) x = this.movingToward[0];
			if (y === undefined) y = this.movingToward[1];
			this.movingToward = [x, y];
			this.movingWithConviction = false;
		}
	}

	setDirection(angle) {
		if (angle >= 360) angle = 360 - angle;
		this.direction = angle;
		this.movingToward = undefined;
	}

	resetDirection() {
		this.direction = undefined;
	}

	setMapPositionTargetWithConviction(cx, cy) {
		this.setMapPositionTarget(cx, cy);
		this.movingWithConviction = true;
	}

	follow(sprite) {
		this._trackedSpriteToMoveToward = sprite;
	}

	stopFollowing() {
		this._trackedSpriteToMoveToward = false;
	}

	onHitting(objectToHit, callback) {
		if (this._hittableObjects[objectToHit.id]) {
			this._hittableObjects[objectToHit.id].callbacks.push(callback);
			return;
		}
		this._hittableObjects[objectToHit.id] = {
			object: objectToHit,
			callbacks: [callback]
		};
	}

	deleteOnNextCycle() {
		this.deleted = true;
	}

	occupiesZIndex(z) {
		return this._zIndexesOccupied.includes(z);
	}

	hits(other) {
		const z = this.mapPosition[2];

		// Standard box overlap. The old test only fired when one of this
		// sprite's own edges fell inside the other box, so anything narrower
		// than the skier (a mushroom, a gate pole) could sit entirely inside
		// the skier's box and never register a hit.
		const verticalIntersect =
			other.getTopHitBoxEdge(z) <= this.getBottomHitBoxEdge(z) &&
			other.getBottomHitBoxEdge(z) >= this.getTopHitBoxEdge(z);
		const horizontalIntersect =
			other.getLeftHitBoxEdge(z) <= this.getRightHitBoxEdge(z) &&
			other.getRightHitBoxEdge(z) >= this.getLeftHitBoxEdge(z);

		return verticalIntersect && horizontalIntersect;
	}

	isAboveOnCanvas(cy) {
		return (this.canvasY + this.height) < cy;
	}

	isBelowOnCanvas(cy) {
		return this.canvasY > cy;
	}

	static createObjects(spriteInfoArray, opts = {}) {
		const items = Array.isArray(spriteInfoArray) ? spriteInfoArray : [spriteInfoArray];
		const config = { rateModifier: 0, dropRate: 1, position: [0, 0], ...opts };

		return items
			.filter(info => {
				const rate = info.dropRate ?? config.dropRate;
				return Math.floor(Math.random() * (101 + config.rateModifier)) <= rate;
			})
			.map(info => {
				const sprite = new Sprite(info.sprite);
				sprite.setSpeed(0);

				const pos = typeof config.position === 'function' ? config.position() : config.position;
				sprite.setMapPosition(pos[0], pos[1]);

				if (info.sprite?.hitBehaviour?.skier && config.player) {
					sprite.onHitting(config.player, info.sprite.hitBehaviour.skier);
				}

				return sprite;
			});
	}
}

export default Sprite;