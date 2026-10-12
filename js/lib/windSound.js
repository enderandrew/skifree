// Plays wind.mp3 during a gust, with the volume following the gust's strength.
// Every failure is silent: a missing file, a browser that blocks audio until
// the player has interacted with the page, or no Audio support at all.
const MAX_VOLUME = 0.8;

class WindSound {
	constructor(src = 'wind.mp3') {
		this._src = src;
		this._audio = null;
		this._failed = false;
		this.muted = false;
	}

	_element() {
		if (this._failed || typeof Audio === 'undefined') return null;
		if (!this._audio) {
			this._audio = new Audio(this._src);
			this._audio.preload = 'auto';
			this._audio.loop = true; // a short clip still covers a long gust
			this._audio.addEventListener('error', () => { this._failed = true; });
		}
		return this._audio;
	}

	// Load the file ahead of the first gust
	preload() {
		this._element();
	}

	start() {
		const audio = this._element();
		if (!audio || this.muted) return;
		audio.volume = 0;
		try { audio.currentTime = 0; } catch { /* not seekable yet */ }
		const playing = audio.play();
		if (playing?.catch) playing.catch(() => {});
	}

	// strength: -1..1 from Wind; only its size matters here
	setStrength(strength) {
		const audio = this._audio;
		if (!audio || this._failed) return;
		// iOS treats volume as read-only, so this is best effort there
		audio.volume = Math.min(1, Math.abs(strength)) * MAX_VOLUME;
	}

	stop() {
		if (!this._audio) return;
		this._audio.pause();
		this._audio.volume = 0;
	}
}

export default WindSound;
