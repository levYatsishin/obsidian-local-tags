import { Extension, RangeSetBuilder } from "@codemirror/state";
import {
	Decoration,
	DecorationSet,
	EditorView,
	ViewPlugin,
	ViewUpdate,
} from "@codemirror/view";
import { editorInfoField } from "obsidian";
import { FileTagColorAssignments } from "../settings";
import {
	getFallbackPoolColor,
	getTagStyleVariables,
	sanitizeColorPool,
} from "../tags/color-palette";
import { collectLocalTagOccurrences } from "../tags/local-tags";
import { resolveTagColorsForFile } from "../tags/tag-color-assignments";

type ExtensionConfig = {
	colorPool: string[];
	fileTagColors: FileTagColorAssignments;
	assignmentSeed: string;
};

class LocalTagHighlighterViewPlugin {
	decorations: DecorationSet;

	private readonly config: ExtensionConfig;

	constructor(view: EditorView, config: ExtensionConfig) {
		this.config = config;
		this.decorations = buildDecorations(view, this.config);
	}

	update(update: ViewUpdate): void {
		if (update.docChanged) {
			this.decorations = buildDecorations(update.view, this.config);
		}
	}
}

export function createLocalTagHighlighterExtension(
	config: ExtensionConfig,
): Extension {
	const sanitizedConfig: ExtensionConfig = {
		colorPool: sanitizeColorPool(config.colorPool),
		fileTagColors: config.fileTagColors,
		assignmentSeed: config.assignmentSeed,
	};

	return ViewPlugin.fromClass(
		class extends LocalTagHighlighterViewPlugin {
			constructor(view: EditorView) {
				super(view, sanitizedConfig);
			}
		},
		{
			decorations: (plugin) => plugin.decorations,
		},
	);
}

function buildDecorations(
	view: EditorView,
	config: ExtensionConfig,
): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();
	const documentText = view.state.doc.toString();
	const editorInfo = view.state.field(editorInfoField, false);
	const filePath = editorInfo?.file?.path ?? "";
	const decorationCache = new Map<string, Decoration>();
	const occurrences = collectLocalTagOccurrences(documentText);
	const resolvedTagColors = resolveTagColorsForFile(
		config.fileTagColors,
		filePath,
		occurrences.map((occurrence) => occurrence.tag),
		config.colorPool,
		config.assignmentSeed,
	);

	for (const occurrence of occurrences) {
		const resolvedColor = resolvedTagColors[occurrence.tag]
			?? getFallbackPoolColor(
				filePath || "global",
				occurrence.tag,
				config.colorPool,
				config.assignmentSeed,
			);
		const decorationKey = `${filePath}::${occurrence.tag}::${resolvedColor}`;
		let decoration = decorationCache.get(decorationKey);

		if (!decoration) {
			decoration = Decoration.mark({
				class: "cm-local-tag-highlight",
				attributes: {
					style: getTagStyleVariables(resolvedColor),
				},
			});
			decorationCache.set(decorationKey, decoration);
		}

		builder.add(occurrence.start, occurrence.end, decoration);
	}

	return builder.finish();
}
