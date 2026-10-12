class SpriteArray extends Array {
	constructor() {
		super();
		this.pushHandlers = [];
	}

	onPush(f, retroactive) {
		this.pushHandlers.push(f);
		if (retroactive) {
			this.forEach(f);
		}
	}

	push(...items) {
		for (const item of items) {
			super.push(item);
			for (const handler of this.pushHandlers) {
				handler(item);
			}
		}
		return this.length;
	}

	cull() {
		for (let i = this.length - 1; i >= 0; i--) {
			if (!this[i] || this[i].deleted) {
				this.splice(i, 1);
			}
		}
	}
}

export default SpriteArray;