// Watches a stream of inputs for ↑ ↑ ↓ ↓ ← → ← → B A.
// Works for any input source: the keyboard and the gamepad each feed it
// tokens. A wrong input restarts the sequence (or starts it again if that
// input was itself an ↑).
export const KONAMI_SEQUENCE = ['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right', 'b', 'a'];

class KonamiCode {
	constructor(onUnlock = () => {}) {
		this._onUnlock = onUnlock;
		this._position = 0;
	}

	get position() {
		return this._position;
	}

	// True when the next input the sequence needs is B or A. Callers use this
	// to stop those presses doing their normal job (spawning a snowboarder,
	// jumping) while someone is clearly entering the code.
	expectsButton() {
		return this._position >= 8;
	}

	// Returns true if this token completed the code
	feed(token) {
		if (token === KONAMI_SEQUENCE[this._position]) {
			this._position += 1;
		} else if (token === 'up' && this._position === 2) {
			// ↑ ↑ ↑ … still has the last two ↑ as a valid start
			this._position = 2;
		} else {
			this._position = token === KONAMI_SEQUENCE[0] ? 1 : 0;
		}

		if (this._position === KONAMI_SEQUENCE.length) {
			this._position = 0;
			this._onUnlock();
			return true;
		}
		return false;
	}
}

export default KonamiCode;
