import { App, Editor, EditorChange, MarkdownView, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { Prec } from '@codemirror/state';
import { keymap, EditorView } from '@codemirror/view';
import { foldedRanges, foldEffect, foldable } from '@codemirror/language';

interface HeadingOutlinerSettings {
	overrideTabOnHeadings: boolean;
	enableDragHandles: boolean;
}

const DEFAULT_SETTINGS: HeadingOutlinerSettings = {
	overrideTabOnHeadings: true,
	enableDragHandles: false,
};

interface SectionRange {
	start: number;
	end: number;
	level: number;
}

function getHeadingLevel(line: string): number {
	const match = line.match(/^(#{1,6})\s/);
	return match ? match[1].length : 0;
}

function getSectionRange(lines: string[], headingLine: number): SectionRange {
	const level = getHeadingLevel(lines[headingLine]);
	if (level === 0) return { start: headingLine, end: headingLine, level: 0 };

	let end = headingLine + 1;
	while (end < lines.length) {
		const l = getHeadingLevel(lines[end]);
		if (l > 0 && l <= level) break;
		end++;
	}
	return { start: headingLine, end: end - 1, level };
}

function findCurrentHeading(lines: string[], cursorLine: number): number {
	for (let i = cursorLine; i >= 0; i--) {
		if (getHeadingLevel(lines[i]) > 0) return i;
	}
	return -1;
}

function findSiblingSection(lines: string[], section: SectionRange, direction: 'up' | 'down'): SectionRange | null {
	if (direction === 'up') {
		let candidate = section.start - 1;
		if (candidate < 0) return null;

		const candidateLevel = getHeadingLevel(lines[candidate]);
		if (candidateLevel > 0 && candidateLevel < section.level) return null;

		if (candidateLevel > 0 && candidateLevel === section.level) {
			return getSectionRange(lines, candidate);
		}

		if (candidateLevel > 0 && candidateLevel > section.level) {
			const parentHeading = findParentHeading(lines, candidate, section.level);
			if (parentHeading >= 0 && getHeadingLevel(lines[parentHeading]) === section.level) {
				return getSectionRange(lines, parentHeading);
			}
			return null;
		}

		for (let i = candidate; i >= 0; i--) {
			const l = getHeadingLevel(lines[i]);
			if (l > 0 && l === section.level) {
				return getSectionRange(lines, i);
			}
			if (l > 0 && l < section.level) return null;
		}
		return null;
	} else {
		const nextStart = section.end + 1;
		if (nextStart >= lines.length) return null;

		for (let i = nextStart; i < lines.length; i++) {
			const l = getHeadingLevel(lines[i]);
			if (l > 0 && l < section.level) return null;
			if (l > 0 && l === section.level) {
				return getSectionRange(lines, i);
			}
		}
		return null;
	}
}

function findParentHeading(lines: string[], fromLine: number, maxLevel: number): number {
	for (let i = fromLine; i >= 0; i--) {
		const l = getHeadingLevel(lines[i]);
		if (l > 0 && l <= maxLevel) return i;
	}
	return -1;
}

function getCmView(editor: Editor): EditorView | null {
	return (editor as any).cm instanceof EditorView ? (editor as any).cm : null;
}

function getFoldedLines(cmView: EditorView): number[] {
	const folded: number[] = [];
	const iter = foldedRanges(cmView.state).iter();
	while (iter.value) {
		const line = cmView.state.doc.lineAt(iter.from).number - 1;
		folded.push(line);
		iter.next();
	}
	return folded;
}

function restoreFolds(cmView: EditorView, lines: number[]): void {
	const effects: any[] = [];

	for (const line of lines) {
		if (line < 0 || line >= cmView.state.doc.lines) continue;
		const docLine = cmView.state.doc.line(line + 1);

		let alreadyFolded = false;
		const cursor = foldedRanges(cmView.state).iter();
		while (cursor.value) {
			if (cursor.from === docLine.from) {
				alreadyFolded = true;
				break;
			}
			cursor.next();
		}
		if (alreadyFolded) continue;

		const range = foldable(cmView.state, docLine.from, docLine.to);
		if (range) {
			effects.push(foldEffect.of(range));
		}
	}

	if (effects.length > 0) {
		cmView.dispatch({ effects });
	}
}

export default class HeadingOutlinerPlugin extends Plugin {
	settings: HeadingOutlinerSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'move-section-up',
			name: 'Move section up',
			editorCallback: (editor: Editor) => {
				this.moveSection(editor, 'up');
			},
		});

		this.addCommand({
			id: 'move-section-down',
			name: 'Move section down',
			editorCallback: (editor: Editor) => {
				this.moveSection(editor, 'down');
			},
		});

		this.addCommand({
			id: 'indent-section',
			name: 'Indent section',
			editorCheckCallback: (checking: boolean, editor: Editor) => {
				if (!this.settings.overrideTabOnHeadings) return false;
				const cursor = editor.getCursor();
				const line = editor.getLine(cursor.line);
				if (getHeadingLevel(line) === 0) return false;
				if (!checking) this.changeIndent(editor, 1);
				return true;
			},
		});

		this.addCommand({
			id: 'unindent-section',
			name: 'Unindent section',
			editorCheckCallback: (checking: boolean, editor: Editor) => {
				if (!this.settings.overrideTabOnHeadings) return false;
				const cursor = editor.getCursor();
				const line = editor.getLine(cursor.line);
				if (getHeadingLevel(line) === 0) return false;
				if (!checking) this.changeIndent(editor, -1);
				return true;
			},
		});

		this.registerEditorExtension(
			Prec.highest(keymap.of([
				{
					key: 'Tab',
					run: (cmView: EditorView): boolean => {
						return this.handleTabKey(cmView, 1);
					},
				},
				{
					key: 'Shift-Tab',
					run: (cmView: EditorView): boolean => {
						return this.handleTabKey(cmView, -1);
					},
				},
				{
					key: 'Ctrl-Shift-ArrowUp',
					run: (cmView: EditorView): boolean => {
						return this.handleMoveKey(cmView, 'up');
					},
				},
				{
					key: 'Ctrl-Shift-ArrowDown',
					run: (cmView: EditorView): boolean => {
						return this.handleMoveKey(cmView, 'down');
					},
				},
			]))
		);

		this.addSettingTab(new HeadingOutlinerSettingTab(this.app, this));
	}

	handleTabKey(cmView: EditorView, delta: number): boolean {
		if (!this.settings.overrideTabOnHeadings) return false;

		const state = cmView.state;
		const cursorPos = state.selection.main.head;
		const line = state.doc.lineAt(cursorPos);
		const lineText = line.text;

		if (getHeadingLevel(lineText) === 0) return false;

		const leaf = this.app.workspace.activeLeaf;
		if (!leaf) return false;
		const view = leaf.view;
		if (!(view instanceof MarkdownView)) return false;
		const editor = view.editor;

		this.changeIndent(editor, delta);
		return true;
	}

	handleMoveKey(cmView: EditorView, direction: 'up' | 'down'): boolean {
		const state = cmView.state;
		const cursorLine = state.doc.lineAt(state.selection.main.head).number - 1;
		const lines = state.doc.toString().split('\n');

		if (findCurrentHeading(lines, cursorLine) < 0) return false;

		const leaf = this.app.workspace.activeLeaf;
		if (!leaf) return false;
		const view = leaf.view;
		if (!(view instanceof MarkdownView)) return false;

		this.moveSection(view.editor, direction);
		return true;
	}

	moveSection(editor: Editor, direction: 'up' | 'down') {
		const cursor = editor.getCursor();
		const lines = editor.getValue().split('\n');
		const headingLine = findCurrentHeading(lines, cursor.line);
		if (headingLine < 0) return;

		const section = getSectionRange(lines, headingLine);
		const sibling = findSiblingSection(lines, section, direction);
		if (!sibling) return;

		const cmView = getCmView(editor);
		let foldedLinesBefore: number[] = [];
		if (cmView) {
			foldedLinesBefore = getFoldedLines(cmView);
		}

		const first = direction === 'up' ? sibling : section;
		const second = direction === 'up' ? section : sibling;

		const firstLines = lines.slice(first.start, first.end + 1);
		const secondLines = lines.slice(second.start, second.end + 1);

		const newText = [...secondLines, ...firstLines].join('\n');

		const rangeFrom = { line: first.start, ch: 0 };
		const rangeTo = { line: second.end, ch: lines[second.end].length };

		editor.replaceRange(newText, rangeFrom, rangeTo);

		const cursorOffset = cursor.line - section.start;
		let newCursorLine: number;
		if (direction === 'up') {
			newCursorLine = sibling.start + cursorOffset;
		} else {
			newCursorLine = section.start + secondLines.length + cursorOffset;
		}
		editor.setCursor({ line: newCursorLine, ch: cursor.ch });

		if (cmView && foldedLinesBefore.length > 0) {
			const sectionLen = section.end - section.start + 1;
			const siblingLen = sibling.end - sibling.start + 1;

			const newFoldedLines: number[] = [];
			for (const fLine of foldedLinesBefore) {
				if (direction === 'up') {
					if (fLine >= section.start && fLine <= section.end) {
						newFoldedLines.push(fLine - siblingLen);
					} else if (fLine >= sibling.start && fLine <= sibling.end) {
						newFoldedLines.push(fLine + sectionLen);
					} else {
						newFoldedLines.push(fLine);
					}
				} else {
					if (fLine >= section.start && fLine <= section.end) {
						newFoldedLines.push(fLine + siblingLen);
					} else if (fLine >= sibling.start && fLine <= sibling.end) {
						newFoldedLines.push(fLine - sectionLen);
					} else {
						newFoldedLines.push(fLine);
					}
				}
			}

			setTimeout(() => {
				restoreFolds(cmView, newFoldedLines);
			}, 50);
		}
	}

	changeIndent(editor: Editor, delta: number) {
		const cursor = editor.getCursor();
		const lines = editor.getValue().split('\n');
		const headingLine = findCurrentHeading(lines, cursor.line);
		if (headingLine < 0) return;

		const section = getSectionRange(lines, headingLine);

		if (delta > 0) {
			let maxLevel = 0;
			for (let i = section.start; i <= section.end; i++) {
				const l = getHeadingLevel(lines[i]);
				if (l > maxLevel) maxLevel = l;
			}
			if (maxLevel >= 6) return;
		} else {
			let minLevel = 7;
			for (let i = section.start; i <= section.end; i++) {
				const l = getHeadingLevel(lines[i]);
				if (l > 0 && l < minLevel) minLevel = l;
			}
			if (minLevel <= 1) return;
		}

		const changes: EditorChange[] = [];
		for (let i = section.start; i <= section.end; i++) {
			const level = getHeadingLevel(lines[i]);
			if (level > 0) {
				const newLevel = level + delta;
				if (newLevel < 1 || newLevel > 6) return;
				const newLine = '#'.repeat(newLevel) + lines[i].substring(level);
				changes.push({
					from: { line: i, ch: 0 },
					to: { line: i, ch: lines[i].length },
					text: newLine,
				});
			}
		}

		if (changes.length === 0) return;

		editor.transaction({
			changes,
			selection: { from: cursor },
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class HeadingOutlinerSettingTab extends PluginSettingTab {
	plugin: HeadingOutlinerPlugin;

	constructor(app: App, plugin: HeadingOutlinerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Override Tab on heading lines')
			.setDesc('When enabled, Tab and Shift+Tab indent/unindent sections when the cursor is on a heading line.')
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.overrideTabOnHeadings)
					.onChange(async (value) => {
						this.plugin.settings.overrideTabOnHeadings = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Enable drag handles')
			.setDesc('Show drag handles in the gutter next to headings (Phase 2 feature).')
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.enableDragHandles)
					.onChange(async (value) => {
						this.plugin.settings.enableDragHandles = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
