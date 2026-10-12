// One-shot sound effects. Each file is loaded once; every play() uses a fresh
// copy so the same sound can overlap itself (two dogs in quick succession).
// Every failure is silent: a missing file, a browser that blocks audio until
// the player has pressed something, or no Audio support at all.
export const SOUND_FILES = {
	yummy: 'yummy.mp3',
	tree: 'tree.mp3',
	snow: 'snow.mp3',
	woof: 'woof.mp3',
	bigfoot: 'Bigfoot.mp3',
	konami: 'Konami.mp3',
	spooky: 'spooky.mp3',
};

// The same sound won't restart within this window. Stops e.g. snow.mp3
// machine-gunning when skiing across a run of moguls.
const MIN_REPEAT_MS = 150;

class SoundBank {
	constructor(files = SOUND_FILES, { AudioClass = globalThis.Audio, now } = {}) {
		this._files = files;
		this._Audio = AudioClass;
		this._now = now || (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
		this._sources = {};
		this._failed = new Set();
		this._lastPlayed = {};
		this.muted = false;
		this.volume = 0.8;
	}

	_source(name) {
		if (this._failed.has(name) || !this._Audio || !this._files[name]) return null;
		if (!this._sources[name]) {
			const audio = new this._Audio(this._files[name]);
			audio.preload = 'auto';
			audio.addEventListener?.('error', () => this._failed.add(name));
			this._sources[name] = audio;
		}
		return this._sources[name];
	}

	preload() {
		for (const name of Object.keys(this._files)) this._source(name);
	}

	// Returns true if a play was attempted
	play(name) {
		if (this.muted) return false;
		const now = this._now();
		if (now - (this._lastPlayed[name] ?? -Infinity) < MIN_REPEAT_MS) return false;
		const source = this._source(name);
		if (!source) return false;
		this._lastPlayed[name] = now;
		try {
			const copy = source.cloneNode ? source.cloneNode() : source;
			copy.volume = this.volume;
			const playing = copy.play();
			if (playing?.catch) playing.catch(() => {});
		} catch {
			// ignore: sound is never essential
		}
		return true;
	}
}

export default SoundBank;
