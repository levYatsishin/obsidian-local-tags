import {
	DEFAULT_PASTEL_COLOR_POOL,
	normalizeHexColor,
	sanitizeColorPool,
} from "./tags/color-palette";

export interface FileTagColorAssignments {
	[filePath: string]: Record<string, string>;
}

export interface LocalTagHighlighterSettings {
	highlightEnabled: boolean;
	colorPool: string[];
	borderRadius: number;
	fontWeight: number;
	assignmentSeed: string;
	fileTagColors: FileTagColorAssignments;
}

export const DEFAULT_SETTINGS: LocalTagHighlighterSettings = {
	highlightEnabled: true,
	colorPool: [...DEFAULT_PASTEL_COLOR_POOL],
	borderRadius: 8,
	fontWeight: 500,
	assignmentSeed: "local-tag-seed",
	fileTagColors: {},
};

export function normalizeSettings(
	data: Partial<LocalTagHighlighterSettings> | null | undefined,
): LocalTagHighlighterSettings {
	const colorPool = sanitizeColorPool(data?.colorPool);

	return {
		highlightEnabled: data?.highlightEnabled ?? DEFAULT_SETTINGS.highlightEnabled,
		colorPool,
		borderRadius: data?.borderRadius ?? DEFAULT_SETTINGS.borderRadius,
		fontWeight: data?.fontWeight ?? DEFAULT_SETTINGS.fontWeight,
		assignmentSeed: data?.assignmentSeed?.trim() || createAssignmentSeed(),
		fileTagColors: normalizeFileTagColors(data?.fileTagColors, colorPool),
	};
}

function createAssignmentSeed(): string {
	return Math.random().toString(36).slice(2, 10);
}

function normalizeFileTagColors(
	fileTagColors: FileTagColorAssignments | undefined,
	colorPool: string[],
): FileTagColorAssignments {
	const normalizedAssignments: FileTagColorAssignments = {};
	const allowedColors = new Set(colorPool);

	for (const [filePath, tagAssignments] of Object.entries(fileTagColors ?? {})) {
		const normalizedTagAssignments: Record<string, string> = {};

		for (const [tag, color] of Object.entries(tagAssignments ?? {})) {
			const normalizedColor = normalizeHexColor(color);
			if (normalizedColor && allowedColors.has(normalizedColor)) {
				normalizedTagAssignments[tag] = normalizedColor;
			}
		}

		if (Object.keys(normalizedTagAssignments).length > 0) {
			normalizedAssignments[filePath] = normalizedTagAssignments;
		}
	}

	return normalizedAssignments;
}
