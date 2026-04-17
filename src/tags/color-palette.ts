const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{6})$/;
const DARK_TEXT_COLOR = "#33263f";

const LEGACY_PASTEL_COLOR_POOL = [
	"#f8c8dc",
	"#ffd7ba",
	"#ffe7a3",
	"#e5f0b6",
	"#cfecc7",
	"#bce9da",
	"#b7e3ec",
	"#c6dcff",
	"#d8d1ff",
	"#edd1ff",
	"#f7d4f2",
	"#f9d6de",
	"#ffd9c8",
	"#ffe6c7",
	"#faf1b5",
	"#e3efc0",
	"#d4edcf",
	"#cdeee5",
	"#cae7f5",
	"#d4defc",
	"#dfd6ff",
	"#ecd8ff",
	"#f4d9f5",
	"#fad9e7",
] as const;

export const DEFAULT_PASTEL_COLOR_POOL = [
	"#ff8fab",
	"#ffb86b",
	"#ffd93d",
	"#9be564",
	"#5eead4",
	"#67c6ff",
	"#7aa2ff",
	"#b794ff",
	"#ff96e8",
	"#ff6b9a",
	"#ff9f5a",
	"#64d2ff",
] as const;

type RgbColor = {
	red: number;
	green: number;
	blue: number;
};

export type TagColorTokens = {
	backgroundColor: string;
	borderColor: string;
	textColor: string;
};

export function sanitizeColorPool(colorPool?: string[]): string[] {
	const source = colorPool && colorPool.length > 0
		? migrateLegacyPalette(colorPool)
		: DEFAULT_PASTEL_COLOR_POOL;
	const uniqueColors = new Set<string>();

	for (const color of source) {
		const normalizedColor = normalizeHexColor(color);
		if (normalizedColor) {
			uniqueColors.add(normalizedColor);
		}
	}

	return uniqueColors.size > 0
		? [...uniqueColors]
		: [...DEFAULT_PASTEL_COLOR_POOL];
}

function migrateLegacyPalette(colorPool: string[]): string[] {
	if (colorPool.length !== LEGACY_PASTEL_COLOR_POOL.length) {
		return colorPool;
	}

	const matchesLegacyPalette = colorPool.every((color, index) =>
		color.toLowerCase() === LEGACY_PASTEL_COLOR_POOL[index],
	);

	return matchesLegacyPalette
		? [...DEFAULT_PASTEL_COLOR_POOL]
		: colorPool;
}

export function normalizeHexColor(color: string): string | null {
	const trimmedColor = color.trim();
	if (HEX_COLOR_PATTERN.test(trimmedColor)) {
		return trimmedColor.toLowerCase();
	}

	return null;
}

export function getNextPaletteColor(colorPool: string[]): string {
	const normalizedPool = new Set(sanitizeColorPool(colorPool));
	for (const defaultColor of DEFAULT_PASTEL_COLOR_POOL) {
		if (!normalizedPool.has(defaultColor)) {
			return defaultColor;
		}
	}

	return createGeneratedPaletteColor(normalizedPool.size);
}

export function getFallbackPoolColor(
	scopeKey: string,
	tag: string,
	colorPool: string[],
	assignmentSeed: string,
): string {
	const normalizedPool = sanitizeColorPool(colorPool);
	const hashKey = `${assignmentSeed}::${scopeKey}::${tag}`;
	return normalizedPool[hashString(hashKey) % normalizedPool.length]
		?? DEFAULT_PASTEL_COLOR_POOL[0];
}

export function getTagColorTokens(baseColor: string): TagColorTokens {
	return {
		backgroundColor: mixColors(baseColor, "#ffffff", 0.12),
		borderColor: mixColors(baseColor, "#59406b", 0.16),
		textColor: mixColors(baseColor, DARK_TEXT_COLOR, 0.72),
	};
}

export function getTagStyleVariables(color: string): string {
	const { backgroundColor, borderColor, textColor } = getTagColorTokens(color);

	return [
		`--local-tag-background:${backgroundColor}`,
		`--local-tag-border:${borderColor}`,
		`--local-tag-text:${textColor}`,
	].join(";");
}

function hashString(input: string): number {
	let hash = 0;

	for (let index = 0; index < input.length; index += 1) {
		hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
	}

	return hash;
}

function mixColors(baseColor: string, mixColor: string, mixAmount: number): string {
	const baseRgb = hexToRgb(baseColor);
	const mixRgb = hexToRgb(mixColor);

	return rgbToHex({
		red: Math.round(baseRgb.red + (mixRgb.red - baseRgb.red) * mixAmount),
		green: Math.round(baseRgb.green + (mixRgb.green - baseRgb.green) * mixAmount),
		blue: Math.round(baseRgb.blue + (mixRgb.blue - baseRgb.blue) * mixAmount),
	});
}

function hexToRgb(hexColor: string): RgbColor {
	return {
		red: Number.parseInt(hexColor.slice(1, 3), 16),
		green: Number.parseInt(hexColor.slice(3, 5), 16),
		blue: Number.parseInt(hexColor.slice(5, 7), 16),
	};
}

function rgbToHex(rgbColor: RgbColor): string {
	return `#${[rgbColor.red, rgbColor.green, rgbColor.blue]
		.map((value) => value.toString(16).padStart(2, "0"))
		.join("")}`;
}

function createGeneratedPaletteColor(index: number): string {
	const hue = (index * 47) % 360;
	return hslToHex(hue, 88, 70);
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
	const normalizedSaturation = saturation / 100;
	const normalizedLightness = lightness / 100;
	const chroma = (1 - Math.abs((2 * normalizedLightness) - 1)) * normalizedSaturation;
	const hueSegment = hue / 60;
	const x = chroma * (1 - Math.abs((hueSegment % 2) - 1));

	let red = 0;
	let green = 0;
	let blue = 0;

	if (hueSegment >= 0 && hueSegment < 1) {
		red = chroma;
		green = x;
	} else if (hueSegment < 2) {
		red = x;
		green = chroma;
	} else if (hueSegment < 3) {
		green = chroma;
		blue = x;
	} else if (hueSegment < 4) {
		green = x;
		blue = chroma;
	} else if (hueSegment < 5) {
		red = x;
		blue = chroma;
	} else {
		red = chroma;
		blue = x;
	}

	const match = normalizedLightness - (chroma / 2);
	return rgbToHex({
		red: Math.round((red + match) * 255),
		green: Math.round((green + match) * 255),
		blue: Math.round((blue + match) * 255),
	});
}
