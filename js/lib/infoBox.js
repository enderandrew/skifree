class InfoBox {
	constructor(data) {
		this.lines = data.initialLines;
		this.top = data.position.top;
		this.right = data.position.right;
		this.bottom = data.position.bottom;
		this.left = data.position.left;
		this.width = data.width;
		this.height = data.height;
		this.colour = data.colour || '#000000';
	}

	setColour(colour) {
		this.colour = colour;
	}

	setLines(lines) {
		this.lines = lines;
	}

	draw(dContext) {
		// Shrink the text on narrow screens (phones in portrait) so the
		// longest line still fits, down to a readable minimum.
		const BASE_SIZE = 11;
		const MIN_SIZE = 7;
		dContext.font = `${BASE_SIZE}px monospace`;
		const widest = Math.max(0, ...this.lines.map(line => dContext.measureText(line).width));
		const available = dContext.logicalWidth() - (this.right ?? this.left ?? 0) - 10;
		let fontSize = BASE_SIZE;
		if (widest > available && widest > 0) {
			fontSize = Math.max(MIN_SIZE, Math.floor(BASE_SIZE * available / widest));
			dContext.font = `${fontSize}px monospace`;
		}
		const textHeight = fontSize * 1.5;
		dContext.fillStyle = this.colour;

		let yOffset = 0;
		for (const line of this.lines) {
			const textWidth = dContext.measureText(line).width;
			let xPos = 0;
			let yPos = 0;

			if (this.top !== undefined) {
				yPos = this.top + yOffset;
			} else if (this.bottom !== undefined) {
				yPos = dContext.logicalHeight() - this.bottom - textHeight + yOffset;
			}

			if (this.right !== undefined) {
				xPos = dContext.logicalWidth() - this.right - textWidth;
			} else if (this.left !== undefined) {
				xPos = this.left;
			}

			yOffset += textHeight;
			dContext.fillText(line, xPos, yPos);
		}
	}
}

export default InfoBox;