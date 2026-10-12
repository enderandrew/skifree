import Sprite from './sprite.js';
import { UFO_SPEED, UFO_BOB_PX } from './constants.js';

// A UFO that crosses the screen at a fixed height and then leaves. It flies
// at z = 1, so only a jumping skier can run into it.
//
// It holds its height on screen rather than on the map, so it stays in view
// however fast the skier is going downhill.
class Ufo extends Sprite {
	constructor(data, { camera, fromSide = Math.random() < 0.5 ? 'west' : 'east', screenY = 0.3 + Math.random() * 0.25 }) {
		super(data);
		this._camera = camera;
		this._screenY = screenY;          // 0..1 of the screen height
		this._dir = fromSide === 'west' ? 1 : -1;
		this._age = 0;
		this.isMoving = false;            // positioned by hand, not by Sprite._move

		const width = camera.logicalWidth();
		const startCanvasX = fromSide === 'west' ? -this._width() - 10 : width + 10;
		const [mapX] = camera.canvasPositionToMapPosition([startCanvasX, 0]);
		this.setMapPosition(mapX, this._mapYForScreen(), 1);
	}

	_width() {
		return this.data.parts.main[2] * (this.data.scale || 1);
	}

	_mapYForScreen() {
		const canvasY = this._screenY * this._camera.logicalHeight();
		const bob = Math.sin(this._age / 8) * UFO_BOB_PX;
		return this._camera.canvasPositionToMapPosition([0, canvasY + bob])[1];
	}

	cycle(dt = 1) {
		this._age += dt;
		const x = this.mapPosition[0] + this._dir * UFO_SPEED * dt;
		this.setMapPosition(x, this._mapYForScreen(), 1);
		this.checkHittableObjects();

		// Gone once fully off the far side
		const [canvasX] = this._camera.mapPositionToCanvasPosition(this.mapPosition);
		const width = this._camera.logicalWidth();
		if ((this._dir > 0 && canvasX > width + 20) || (this._dir < 0 && canvasX < -this._width() - 20)) {
			this.deleteOnNextCycle();
		}
	}

	draw(dContext) {
		return super.draw(dContext, 'main');
	}
}

export default Ufo;
