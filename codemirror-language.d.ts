declare module '@codemirror/language' {
	import { EditorState, RangeSet } from '@codemirror/state';

	export function foldedRanges(state: EditorState): RangeSet<any>;
	export function foldable(state: EditorState, from: number, to: number): { from: number; to: number } | null;

	export const foldEffect: {
		of(range: { from: number; to: number }): any;
	};

	export const unfoldEffect: {
		of(range: { from: number; to: number }): any;
	};
}
