export const TAG_CHARACTER = /[\p{L}\p{N}_/-]/u;
const TAG_START_CHARACTER = /[\p{L}\p{N}]/u;

export interface LocalTagOccurrence {
	tag: string;
	start: number;
	end: number;
}

export interface LocalTagSummary {
	tag: string;
	count: number;
	occurrences: LocalTagOccurrence[];
}

export function collectLocalTagOccurrences(text: string): LocalTagOccurrence[] {
	const occurrences: LocalTagOccurrence[] = [];
	let index = 0;
	let inFencedCodeBlock = false;

	while (index < text.length) {
		if (isFenceStart(text, index)) {
			inFencedCodeBlock = !inFencedCodeBlock;
			index = advanceToNextLine(text, index);
			continue;
		}

		if (inFencedCodeBlock) {
			index = advanceToNextLine(text, index);
			continue;
		}

		if (text.charAt(index) === "`") {
			index = skipInlineCodeSpan(text, index);
			continue;
		}

		if (!isTagStart(text, index)) {
			index += 1;
			continue;
		}

		const tagEnd = findTagEnd(text, index + 1);
		occurrences.push({
			tag: text.slice(index, tagEnd),
			start: index,
			end: tagEnd,
		});
		index = tagEnd;
	}

	return occurrences;
}

export function collectLocalTagSummaries(text: string): LocalTagSummary[] {
	const summaries = new Map<string, LocalTagSummary>();

	for (const occurrence of collectLocalTagOccurrences(text)) {
		const existingSummary = summaries.get(occurrence.tag);
		if (existingSummary) {
			existingSummary.count += 1;
			existingSummary.occurrences.push(occurrence);
			continue;
		}

		summaries.set(occurrence.tag, {
			tag: occurrence.tag,
			count: 1,
			occurrences: [occurrence],
		});
	}

	return [...summaries.values()];
}

function isFenceStart(text: string, index: number): boolean {
	if (!isStartOfLine(text, index)) {
		return false;
	}

	let cursor = index;
	while (text.charAt(cursor) === " " || text.charAt(cursor) === "\t") {
		cursor += 1;
	}

	return text.slice(cursor, cursor + 3) === "```";
}

function isStartOfLine(text: string, index: number): boolean {
	return index === 0 || text.charAt(index - 1) === "\n";
}

function advanceToNextLine(text: string, index: number): number {
	const newlineIndex = text.indexOf("\n", index);
	return newlineIndex === -1 ? text.length : newlineIndex + 1;
}

function skipInlineCodeSpan(text: string, index: number): number {
	let tickCount = 0;
	while (text.charAt(index + tickCount) === "`") {
		tickCount += 1;
	}

	const closingFence = "`".repeat(tickCount);
	const closingIndex = text.indexOf(closingFence, index + tickCount);

	return closingIndex === -1
		? index + tickCount
		: closingIndex + tickCount;
}

function isTagStart(text: string, index: number): boolean {
	if (text.charAt(index) !== "@") {
		return false;
	}

	if (index > 0 && TAG_CHARACTER.test(text.charAt(index - 1))) {
		return false;
	}

	const nextCharacter = text.charAt(index + 1);
	return TAG_START_CHARACTER.test(nextCharacter);
}

function findTagEnd(text: string, index: number): number {
	let cursor = index;
	while (cursor < text.length && TAG_CHARACTER.test(text.charAt(cursor))) {
		cursor += 1;
	}

	return cursor;
}
