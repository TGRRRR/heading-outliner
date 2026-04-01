declare module '@codemirror/language' {
	import { EditorState, RangeSet, StateEffect, RangeValue } from '@codemirror/state';

	export function foldedRanges(state: EditorState): RangeSet<RangeValue>;
	export function foldable(state: EditorState, from: number, to: number): { from: number; to: number } | null;

	export const foldEffect: {
		of(range: { from: number; to: number }): StateEffect<unknown>;
	};

	export const unfoldEffect: {
		of(range: { from: number; to: number }): StateEffect<unknown>;
	};
}
