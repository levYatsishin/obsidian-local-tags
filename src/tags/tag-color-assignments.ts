import { FileTagColorAssignments } from "../settings";
import { getFallbackPoolColor, sanitizeColorPool } from "./color-palette";

export function getAssignedTagColor(
	fileTagColors: FileTagColorAssignments,
	filePath: string,
	tag: string,
): string | null {
	return fileTagColors[filePath]?.[tag] ?? null;
}

export function cycleTagColor(
	fileTagColors: FileTagColorAssignments,
	filePath: string,
	tag: string,
	colorPool: string[],
	currentColor: string,
): FileTagColorAssignments {
	const sanitizedPool = sanitizeColorPool(colorPool);
	const currentAssignments: Record<string, string> = fileTagColors[filePath] ?? {};
	const currentIndex = sanitizedPool.indexOf(currentColor);
	const nextColor = sanitizedPool[(currentIndex + 1) % sanitizedPool.length]
		?? sanitizedPool[0]
		?? "#f8c8dc";

	return {
		...fileTagColors,
		[filePath]: {
			...currentAssignments,
			[tag]: nextColor,
		},
	};
}

export function assignTagColor(
	fileTagColors: FileTagColorAssignments,
	filePath: string,
	tag: string,
	nextColor: string,
	currentColor: string,
	swapWithTag?: string,
): FileTagColorAssignments {
	const currentAssignments: Record<string, string> = fileTagColors[filePath] ?? {};
	const nextFileAssignments: Record<string, string> = {
		...currentAssignments,
		[tag]: nextColor,
	};

	if (swapWithTag) {
		nextFileAssignments[swapWithTag] = currentColor;
	}

	return {
		...fileTagColors,
		[filePath]: nextFileAssignments,
	};
}

export function resolveTagColorsForFile(
	fileTagColors: FileTagColorAssignments,
	filePath: string,
	tags: string[],
	colorPool: string[],
	assignmentSeed: string,
): Record<string, string> {
	const sanitizedPool = sanitizeColorPool(colorPool);
	const uniqueTags = [...new Set(tags)];
	const explicitAssignments = fileTagColors[filePath] ?? {};
	const resolvedAssignments: Record<string, string> = {};
	const usedColors = new Set<string>();

	for (const tag of uniqueTags) {
		const explicitColor = explicitAssignments[tag];
		if (!explicitColor) {
			continue;
		}

		resolvedAssignments[tag] = explicitColor;
		usedColors.add(explicitColor);
	}

	for (const tag of uniqueTags) {
		if (resolvedAssignments[tag]) {
			continue;
		}

		const preferredColor = getFallbackPoolColor(
			filePath,
			tag,
			sanitizedPool,
			assignmentSeed,
		);
		if (!usedColors.has(preferredColor)) {
			resolvedAssignments[tag] = preferredColor;
			usedColors.add(preferredColor);
			continue;
		}

		const firstUnusedColor = sanitizedPool.find((color) => !usedColors.has(color));
		if (firstUnusedColor) {
			resolvedAssignments[tag] = firstUnusedColor;
			usedColors.add(firstUnusedColor);
			continue;
		}

		resolvedAssignments[tag] = preferredColor;
	}

	return resolvedAssignments;
}
