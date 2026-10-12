// Builds a recoloured copy of a sprite sheet at load time.
//
// The yeti's fur is pure greys (equal R, G and B). A hue shift does nothing to
// grey, so instead each grey pixel is replaced by the same lightness of the
// target colour. Black outlines and the coloured eyes, teeth and skier are
// left alone.

// Light grey (192) maps to this brown; darker greys map to darker browns.
export const BIGFOOT_BROWN = [156, 102, 52];
const REFERENCE_GREY = 192;

export function tintGreys(data, target = BIGFOOT_BROWN) {
	for (let i = 0; i < data.length; i += 4) {
		const r = data[i];
		const g = data[i + 1];
		const b = data[i + 2];
		const a = data[i + 3];
		// Skip transparent pixels, black outlines and pure white highlights
		if (a === 0 || r !== g || g !== b || r === 0 || r === 255) continue;
		const k = r / REFERENCE_GREY;
		data[i] = Math.min(255, Math.round(target[0] * k));
		data[i + 1] = Math.min(255, Math.round(target[1] * k));
		data[i + 2] = Math.min(255, Math.round(target[2] * k));
	}
	return data;
}

// Returns a canvas holding the tinted sheet, or null if this environment
// can't read pixels back (the caller then falls back to the normal sheet).
export function makeTintedSheet(image, createCanvas, target = BIGFOOT_BROWN) {
	try {
		const canvas = createCanvas(image.width, image.height);
		const ctx = canvas.getContext('2d');
		ctx.drawImage(image, 0, 0);
		const pixels = ctx.getImageData(0, 0, image.width, image.height);
		tintGreys(pixels.data, target);
		ctx.putImageData(pixels, 0, 0);
		return canvas;
	} catch {
		return null;
	}
}
