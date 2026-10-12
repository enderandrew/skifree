// Decorative falling snow, drawn with CSS over the canvas.
// The flakes are plain DOM elements animated by the browser, so they cost the
// game loop nothing. Gusts lean and shove the whole layer sideways.

const FLAKES_PER_MEGAPIXEL = 120;
const MIN_FLAKES = 30;
const MAX_FLAKES = 160;

class Snow {
	constructor({ doc = document, win = window, parent = doc.body } = {}) {
		this._doc = doc;
		this._win = win;
		this.layer = doc.createElement('div');
		this.layer.className = 'snow-layer';
		this.layer.setAttribute('aria-hidden', 'true');
		parent.appendChild(this.layer);
		this.populate();
	}

	_flakeCount() {
		const area = (this._win.innerWidth * this._win.innerHeight) / 1e6;
		return Math.round(Math.min(MAX_FLAKES, Math.max(MIN_FLAKES, area * FLAKES_PER_MEGAPIXEL)));
	}

	// (Re)build the flakes for the current window size
	populate() {
		this.layer.textContent = '';
		const count = this._flakeCount();
		const fragment = this._doc.createDocumentFragment();
		for (let i = 0; i < count; i++) {
			const flake = this._doc.createElement('span');
			flake.className = 'snowflake';
			const size = 2 + Math.random() * 3;              // 2–5 px
			const fall = 7 + Math.random() * 9;              // seconds to fall the screen
			const sway = 2.5 + Math.random() * 3;            // seconds per side-to-side sway
			flake.style.setProperty('--x', `${(Math.random() * 100).toFixed(2)}vw`);
			flake.style.setProperty('--size', `${size.toFixed(1)}px`);
			flake.style.setProperty('--fall', `${fall.toFixed(2)}s`);
			flake.style.setProperty('--sway', `${sway.toFixed(2)}s`);
			flake.style.setProperty('--drift', `${(10 + Math.random() * 30).toFixed(0)}px`);
			// Negative delays start each flake part-way through its fall
			flake.style.setProperty('--delay', `${(-Math.random() * fall).toFixed(2)}s`);
			flake.style.setProperty('--opacity', (0.55 + Math.random() * 0.45).toFixed(2));
			fragment.appendChild(flake);
		}
		this.layer.appendChild(fragment);
	}

	// strength: -1 (hard westward gust) .. 0 (calm) .. 1 (hard eastward gust)
	setWind(strength) {
		this.layer.style.setProperty('--wind', strength.toFixed(3));
	}
}

export default Snow;
