class InfoBox {
	constructor(data) {
		this.lines = data.initialLines;
		this.top = data.position.top;
		this.right = data.position.right;
		this.bottom = data.position.bottom;
		this.left = data.position.left;
		this.width = data.width;
		this.height = data.height;
	}

	setLines(lines) {
		this.lines = lines;
	}

	draw(dContext) {
		dContext.font = '11px monospace';
		const fontSizeMatch = dContext.font.match(/(\d+)px/);
		const fontSize = fontSizeMatch ? Number(fontSizeMatch[1]) : 11;
		const textHeight = fontSize * 1.5;

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