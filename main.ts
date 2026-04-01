import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { Prec, EditorState, EditorSelection, ChangeSpec, StateEffect, ChangeSet } from '@codemirror/state';
import { keymap, EditorView } from '@codemirror/view';
import { foldedRanges, foldEffect, foldable, unfoldEffect } from '@codemirror/language';

interface HeadingOutlinerSettings {
	headingIndent: boolean;
	indentSize: number;
}

const DEFAULT_SETTINGS: HeadingOutlinerSettings = {
	headingIndent: true,
	indentSize: 0.5,
};

interface SectionRange {
	startLine: number;
	endLine: number;
	level: number;
}

interface HeadingInfo {
	line: number;
	level: number;
	section: SectionRange;
}

function getHeadingLevel(line: string): number {
	const match = line.match(/^(#{1,6})\s/);
	return match ? match[1].length : 0;
}

function getSectionRangeFromDoc(state: EditorState, headingLine: number): SectionRange {
	const doc = state.doc;
	const level = getHeadingLevel(doc.line(headingLine + 1).text);
	if (level === 0) return { startLine: headingLine, endLine: headingLine, level: 0 };

	let endLine = headingLine + 1;
	while (endLine < doc.lines) {
		const l = getHeadingLevel(doc.line(endLine + 1).text);
		if (l > 0 && l <= level) break;
		endLine++;
	}
	return { startLine: headingLine, endLine: endLine - 1, level };
}

function findCurrentHeadingLine(state: EditorState, cursorLine: number): number {
	for (let i = cursorLine; i >= 0; i--) {
		if (getHeadingLevel(state.doc.line(i + 1).text) > 0) return i;
	}
	return -1;
}

function findParentHeadingLine(state: EditorState, fromLine: number, maxLevel: number): number {
	for (let i = fromLine; i >= 0; i--) {
		const l = getHeadingLevel(state.doc.line(i + 1).text);
		if (l > 0 && l <= maxLevel) return i;
	}
	return -1;
}

function findFutureParentHeading(state: EditorState, headingLine: number, newLevel: number): number {
	for (let i = headingLine - 1; i >= 0; i--) {
		const l = getHeadingLevel(state.doc.line(i + 1).text);
		if (l > 0 && l < newLevel) return i;
	}
	return -1;
}

function findSiblingSection(state: EditorState, section: SectionRange, direction: 'up' | 'down'): SectionRange | null {
	const doc = state.doc;

	if (direction === 'up') {
		let candidate = section.startLine - 1;
		if (candidate < 0) return null;

		const candidateLevel = getHeadingLevel(doc.line(candidate + 1).text);
		if (candidateLevel > 0 && candidateLevel < section.level) return null;

		if (candidateLevel > 0 && candidateLevel === section.level) {
			return getSectionRangeFromDoc(state, candidate);
		}

		if (candidateLevel > 0 && candidateLevel > section.level) {
			const parentLine = findParentHeadingLine(state, candidate, section.level);
			if (parentLine >= 0 && getHeadingLevel(doc.line(parentLine + 1).text) === section.level) {
				return getSectionRangeFromDoc(state, parentLine);
			}
			return null;
		}

		for (let i = candidate; i >= 0; i--) {
			const l = getHeadingLevel(doc.line(i + 1).text);
			if (l > 0 && l === section.level) {
				return getSectionRangeFromDoc(state, i);
			}
			if (l > 0 && l < section.level) return null;
		}
		return null;
	} else {
		const nextStart = section.endLine + 1;
		if (nextStart >= doc.lines) return null;

		for (let i = nextStart; i < doc.lines; i++) {
			const l = getHeadingLevel(doc.line(i + 1).text);
			if (l > 0 && l < section.level) return null;
			if (l > 0 && l === section.level) {
				return getSectionRangeFromDoc(state, i);
			}
		}
		return null;
	}
}

function getFoldedRanges(state: EditorState): { from: number; to: number }[] {
	const folded: { from: number; to: number }[] = [];
	const iter = foldedRanges(state).iter();
	while (iter.value) {
		folded.push({ from: iter.from, to: iter.to });
		iter.next();
	}
	return folded;
}

function getFoldsInSections(
	state: EditorState,
	folds: { from: number; to: number }[],
	sections: SectionRange[]
): { from: number; to: number }[] {
	const result: { from: number; to: number }[] = [];
	for (const fold of folds) {
		const foldLine = state.doc.lineAt(fold.from).number - 1;
		const inSection = sections.some(s => s.startLine <= foldLine && foldLine <= s.endLine);
		if (inSection) {
			result.push(fold);
		}
	}
	return result;
}


function getFoldAtLine(state: EditorState, line: number, folds: { from: number; to: number }[]): { from: number; to: number } | null {
	const docLine = state.doc.line(line + 1);
	return folds.find(fr => fr.from >= docLine.from && fr.from <= docLine.to) || null;
}

function filterRootHeadings(headings: HeadingInfo[]): HeadingInfo[] {
	if (headings.length <= 1) return headings;

	const sorted = [...headings].sort((a, b) => a.line - b.line);
	const roots: HeadingInfo[] = [];

	for (const h of sorted) {
		const isContained = roots.some(r =>
			r.section.startLine <= h.section.startLine &&
			r.section.endLine >= h.section.endLine
		);
		if (!isContained) roots.push(h);
	}

	return roots;
}

function collectHeadingsFromSelections(state: EditorState): HeadingInfo[] {
	const headings: HeadingInfo[] = [];
	const seenLines = new Set<number>();

	for (const range of state.selection.ranges) {
		const fromLine = state.doc.lineAt(range.from).number - 1;
		const toLine = state.doc.lineAt(range.to).number - 1;

		for (let line = fromLine; line <= toLine; line++) {
			const headingLine = findCurrentHeadingLine(state, line);
			if (headingLine >= 0 && !seenLines.has(headingLine)) {
				seenLines.add(headingLine);
				const level = getHeadingLevel(state.doc.line(headingLine + 1).text);
				headings.push({
					line: headingLine,
					level,
					section: getSectionRangeFromDoc(state, headingLine)
				});
			}
		}
	}

	return headings;
}

export default class HeadingOutlinerPlugin extends Plugin {
	settings: HeadingOutlinerSettings;

	async onload() {
		await this.loadSettings();
		this.applyStyle(this.settings.headingIndent, this.settings.indentSize);

		this.registerEditorExtension(
			Prec.high(keymap.of([
				{
					key: 'Tab',
					run: (cmView: EditorView): boolean => this.handleTabKey(cmView, 1),
				},
				{
					key: 'Shift-Tab',
					run: (cmView: EditorView): boolean => this.handleTabKey(cmView, -1),
				},
				{
					key: 'Ctrl-Shift-ArrowUp',
					run: (cmView: EditorView): boolean => this.handleMoveKey(cmView, 'up'),
				},
				{
					key: 'Ctrl-Shift-ArrowDown',
					run: (cmView: EditorView): boolean => this.handleMoveKey(cmView, 'down'),
				},
			]))
		);

		this.addSettingTab(new HeadingOutlinerSettingTab(this.app, this));
	}

	handleTabKey(cmView: EditorView, delta: number): boolean {
		const state = cmView.state;
		const cursorPos = state.selection.main.head;
		const cursorLine = state.doc.lineAt(cursorPos).number - 1;

		const currentLineLevel = getHeadingLevel(state.doc.line(cursorLine + 1).text);
		if (currentLineLevel === 0) return false;

		this.changeIndentCM6(cmView, delta);
		return true;
	}

	handleMoveKey(cmView: EditorView, direction: 'up' | 'down'): boolean {
		const state = cmView.state;
		const cursorLine = state.doc.lineAt(state.selection.main.head).number - 1;

		const currentLineLevel = getHeadingLevel(state.doc.line(cursorLine + 1).text);
		if (currentLineLevel === 0) return false;

		this.moveSectionCM6(cmView, direction);
		return true;
	}

	changeIndentCM6(cmView: EditorView, delta: number) {
		const state = cmView.state;

		const allHeadings = collectHeadingsFromSelections(state);
		if (allHeadings.length === 0) return;

		const rootHeadings = filterRootHeadings(allHeadings);
		if (rootHeadings.length === 0) return;

		const changes: ChangeSpec[] = [];
		const doc = state.doc;

		const affectedLines = new Set<number>();
		for (const h of rootHeadings) {
			for (let line = h.section.startLine; line <= h.section.endLine; line++) {
				affectedLines.add(line);
			}
		}

		for (const line of Array.from(affectedLines)) {
			const docLine = doc.line(line + 1);
			const level = getHeadingLevel(docLine.text);
			if (level === 0) continue;

			const newLevel = level + delta;
			if (newLevel < 1 || newLevel > 6) continue;

			const hashCount = level;
			changes.push({
				from: docLine.from,
				to: docLine.from + hashCount,
				insert: '#'.repeat(newLevel)
			});
		}

		if (changes.length === 0) return;

		const changeSet = ChangeSet.of(changes, state.doc.length);
		const foldedBefore = getFoldedRanges(state);
		const affectedSections = rootHeadings.map(h => h.section);
		const foldsToPreserve = getFoldsInSections(state, foldedBefore, affectedSections);

		const parentFoldsToUnfold: { from: number; to: number }[] = [];
		const effects: StateEffect<unknown>[] = [];

		if (delta > 0) {
			for (const h of rootHeadings) {
				const newLevel = h.level + delta;
				const parentLine = findFutureParentHeading(state, h.line, newLevel);
				if (parentLine >= 0) {
					const foldRange = getFoldAtLine(state, parentLine, foldedBefore);
					if (foldRange) {
						parentFoldsToUnfold.push(foldRange);
						effects.push(unfoldEffect.of({
							from: changeSet.mapPos(foldRange.from, 1),
							to: changeSet.mapPos(foldRange.to, -1)
						}));
					}
				}
			}
		}

		const foldsToRestore = foldsToPreserve.filter(f =>
			!parentFoldsToUnfold.some(pf => pf.from === f.from && pf.to === f.to)
		);

		cmView.dispatch({
			changes,
			effects: effects.length > 0 ? effects : undefined,
			selection: state.selection.map(changeSet.desc)
		});

		if (foldsToRestore.length > 0) {
			const newState = cmView.state;
			const currentFolds = getFoldedRanges(newState);
			const currentFoldFroms = new Set(currentFolds.map(f => f.from));

			const restoreEffects: StateEffect<unknown>[] = [];
			for (const fold of foldsToRestore) {
				const mappedFrom = changeSet.mapPos(fold.from, 1);
				if (!currentFoldFroms.has(mappedFrom)) {
					const mappedTo = changeSet.mapPos(fold.to, -1);
					restoreEffects.push(foldEffect.of({ from: mappedFrom, to: mappedTo }));
				}
			}

			if (restoreEffects.length > 0) {
				cmView.dispatch({ effects: restoreEffects });
			}
		}
	}

	moveSectionCM6(cmView: EditorView, direction: 'up' | 'down') {
		const state = cmView.state;
		const cursorLine = state.doc.lineAt(state.selection.main.head).number - 1;
		const cursorCh = state.selection.main.head - state.doc.line(cursorLine + 1).from;
		const headingLine = findCurrentHeadingLine(state, cursorLine);

		if (headingLine < 0) return;

		const section = getSectionRangeFromDoc(state, headingLine);
		const sibling = findSiblingSection(state, section, direction);
		if (!sibling) return;

		const doc = state.doc;

		const firstSectionLines: string[] = [];
		for (let i = section.startLine; i <= section.endLine; i++) {
			firstSectionLines.push(doc.line(i + 1).text);
		}
		const secondSectionLines: string[] = [];
		for (let i = sibling.startLine; i <= sibling.endLine; i++) {
			secondSectionLines.push(doc.line(i + 1).text);
		}

		const newText = direction === 'up'
			? [...firstSectionLines, ...secondSectionLines].join('\n')
			: [...secondSectionLines, ...firstSectionLines].join('\n');

		const foldedBefore = getFoldedRanges(state);
		const unfoldEffects = foldedBefore.map(fr => unfoldEffect.of(fr));

		const sectionLen = section.endLine - section.startLine + 1;
		const siblingLen = sibling.endLine - sibling.startLine + 1;

		const cursorOffsetInSection = cursorLine - section.startLine;
		let newCursorLine: number;
		if (direction === 'up') {
			newCursorLine = sibling.startLine + cursorOffsetInSection;
		} else {
			newCursorLine = section.startLine + siblingLen + cursorOffsetInSection;
		}

		const linesBeforeCursor = newText.split('\n').slice(0, newCursorLine - Math.min(section.startLine, sibling.startLine));
		const cursorOffset = linesBeforeCursor.reduce((sum, l) => sum + l.length + 1, 0);

		const targetLineText = newText.split('\n')[newCursorLine - Math.min(section.startLine, sibling.startLine)] || '';
		const newCursorCh = Math.min(cursorCh, targetLineText.length);

		const change = {
			from: doc.line(Math.min(section.startLine, sibling.startLine) + 1).from,
			to: doc.line(Math.max(section.endLine, sibling.endLine) + 1).to,
			insert: newText
		};

		cmView.dispatch({
			changes: change,
			effects: unfoldEffects,
			selection: EditorSelection.cursor(doc.line(Math.min(section.startLine, sibling.startLine) + 1).from + cursorOffset + newCursorCh)
		});

		const newState = cmView.state;
		const newFoldEffects: StateEffect<unknown>[] = [];

		for (const fr of foldedBefore) {
			const oldLine = doc.lineAt(fr.from).number - 1;
			let newLine: number;

			if (direction === 'up') {
				if (oldLine >= section.startLine && oldLine <= section.endLine) {
					newLine = oldLine - siblingLen;
				} else if (oldLine >= sibling.startLine && oldLine <= sibling.endLine) {
					newLine = oldLine + sectionLen;
				} else {
					newLine = oldLine;
				}
			} else {
				if (oldLine >= section.startLine && oldLine <= section.endLine) {
					newLine = oldLine + siblingLen;
				} else if (oldLine >= sibling.startLine && oldLine <= sibling.endLine) {
					newLine = oldLine - sectionLen;
				} else {
					newLine = oldLine;
				}
			}

			if (newLine >= 0 && newLine < newState.doc.lines) {
				const newDocLine = newState.doc.line(newLine + 1);
				const foldRange = foldable(newState, newDocLine.from, newDocLine.to);
				if (foldRange) {
					newFoldEffects.push(foldEffect.of(foldRange));
				}
			}
		}

		if (newFoldEffects.length > 0) {
			cmView.dispatch({ effects: newFoldEffects });
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	applyStyle(enabled: boolean, size: number) {
		document.body.classList.toggle('heading-outliner-indent', enabled);
		// Note for reviewers: We set this dynamic CSS variable on the body because
		// it is configured by the user in settings, which cannot be hardcoded in styles.css.
		if (enabled) {
			document.body.style.setProperty('--heading-indent-size', `${size}em`);
		} else {
			document.body.style.removeProperty('--heading-indent-size');
		}
	}

	onunload() {
		this.applyStyle(false, 0);
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
			.setName('Indent headings by level')
			.setDesc('Visually indent headings in the editor based on their level.')
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.headingIndent)
					.onChange(async (value) => {
						this.plugin.settings.headingIndent = value;
						this.plugin.applyStyle(value, this.plugin.settings.indentSize);
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Indent size (em)')
			.setDesc('How much each heading level is indented relative to the previous level.')
			.addSlider(slider =>
				slider
					.setLimits(0.1, 2, 0.1)
					.setValue(this.plugin.settings.indentSize)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.indentSize = value;
						this.plugin.applyStyle(this.plugin.settings.headingIndent, value);
						await this.plugin.saveSettings();
					})
			);
	}
}
