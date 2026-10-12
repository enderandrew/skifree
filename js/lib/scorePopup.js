// A short-lived "+100" that floats up from where points were earned, so the
// player can see a bonus land without reading the HUD.
const LIFETIME_MS = 900;
const RISE_PX = 24;

class ScorePopup {
	// `anchor` is a sprite to float above (it follows the sprite as it moves)
	constructor(text, anchor, colour = '#2050ff') {
		this.text = text;
		this.colour = colour;
		this.anchor = anchor;
		this.deleted = false;
		this._born = ScorePopup.now();
	}

	static now() {
		return typeof performance !== 'undefined' ? performance.now() : Date.now();
	}

	cycle() {
		if (ScorePopup.now() - this._born > LIFETIME_MS) this.deleted = true;
	}

	deleteOnNextCycle() {
		this.deleted = true;
	}

	draw(dContext) {
		const age = Math.min(1, (ScorePopup.now() - this._born) / LIFETIME_MS);
		const [x, y] = dContext.mapPositionToCanvasPosition(this.anchor.mapPosition);
		dContext.save();
		dContext.globalAlpha = 1 - age * age;
		dContext.font = 'bold 12px monospace';
		dContext.fillStyle = this.colour;
		dContext.fillText(this.text, Math.round(x), Math.round(y - 6 - age * RISE_PX));
		dContext.restore();
	}
}

export default ScorePopup;
