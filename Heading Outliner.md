- [x] Create Obsidian Heading Outliner plugin #productivity #done

## Overview

A single Obsidian plugin that brings the **Outliner-style editing workflow** (fast block manipulation via keyboard) to **regular heading-based Markdown**, with no required configuration.

The core mental model: a **section** (heading + all its content until next equal/higher heading) behaves like a movable, indent-able block exactly like a list item in Outliner.

**v0.0.3 Status:** F1–F4 + F5 fully implemented. Phase 2 (drag-and-drop) is optional.

## Definitions

- **Section**: A heading line + all body content + all sub-headings, until the next heading of equal or higher level
- **Indent**: Increase heading level by 1 (`##` → `###`); cascades to all child headings within the section
- **Unindent**: Decrease heading level by 1 (`###` → `##`); cascades to all child headings; blocked at H1
- **Move**: Swap a section with the adjacent sibling section above or below, preserving internal structure

## Implemented Features

## F1 Move Section Up / Down — Done
- Move the section the cursor is in upward or downward past its sibling
- Children and body content travel with the section
- Works regardless of whether the section is folded or unfolded
- Fold state is preserved: all previously folded lines are remapped by line-count delta and re-folded synchronously
- **Hotkey**: `Ctrl+Shift+↑` / `Ctrl+Shift+↓`
- Uses CM6 keymap at `Prec.highest` — no conflict with Outliner
- Single undoable transaction (one Ctrl+Z to undo)

## F2 Indent Section — Done
- Increases the heading level of the current heading by 1
- All child headings within the section are also increased by 1
- Blocked silently at H6
- **Hotkey**: `Tab` (when cursor is on a heading line)
- **Multi-select**: range selection and multi-cursor (Alt+Click) — all selected sections indent together in one undoable transaction

## F3 Unindent Section — Done
- Decreases the heading level of the current heading by 1
- All child headings within the section are decreased by 1
- Blocked silently at H1
- **Hotkey**: `Shift+Tab` (when cursor is on a heading line)
- **Multi-select**: same as F2

## F4 Tab Behavior Scoping — Done
- Tab/Shift+Tab override **only activates when the cursor is on a heading line**
- On body text lines or list items: default Obsidian behavior is preserved
- **No conflict with the Outliner plugin** — both use CM6 keymaps at `Prec.highest`; each handles its own context (headings vs list items)

## F5 Visual Heading Indent — Done
- Optional per-level indentation in editor (`padding-left`) and reading view (`margin-left`)
- Controlled by CSS variable `--heading-indent-size`
- Settings: toggle on/off + size slider (0.5–4 em, default 1.5)

## F6 Drag-and-Drop — Not started (Phase 2)
- Drag handle rendered in the editor gutter next to each heading
- Dragging moves the full section to the target position
- Works on both folded and unfolded sections
- **Setting flag**: "Enable drag handles" (default: OFF)

## Behavioral Rules
- **Cascade is mandatory**: indent/unindent always affects the full section subtree, never just the heading line alone
- **Move respects section boundaries**: moving down means swapping with the next sibling at the same or higher level, not just the next line
- **Cursor stays in section**: after any operation, cursor remains within the same section it started in
- **No destructive operations**: indent at H6 or unindent at H1 does nothing silently — no error, no transform
- **Undo-compatible**: every operation is a single undoable transaction
- **Fold preservation**: fold state is saved before and restored after any text manipulation — no tearing or flash of unfolded content
- **Multi-section indent**: when multiple headings are selected, all sections indent/unindent together as one undo transaction

## Out of Scope
- List item manipulation (use Outliner plugin for that)
- Frontmatter / YAML block handling (ignore / skip)
- Multi-section move (Phase 2 consideration)
- Exporting / converting between heading and list formats

## Settings

| Setting | Default | Description |
|---|---|---|
| Override Tab on heading lines | ON | Enable F2/F3 hotkey behavior |
| Indent headings by level | ON | Visual per-level indentation |
| Indent size (em) | 1.5 | Spacing per heading level |
| Enable drag handles | OFF | Phase 2 feature flag |

## Technical Notes

### CM6 Keymap Architecture
All keyboard shortcuts use `Prec.highest` keymaps via `registerEditorExtension()`. This puts the plugin at the same priority level as Outliner. Each handler returns `false` when its context doesn't apply, allowing the next handler in the chain to try. Obsidian commands (`addCommand`) are registered without hotkeys for discoverability but are not the primary keybinding mechanism.

### Fold Preservation
Fold state is captured by iterating `foldedRanges()` from `@codemirror/language`. Before any edit, affected folds are explicitly unfolded via `unfoldEffect`. After the edit, folds are restored via `foldEffect`. For indent/unindent (no line count change), original line indices remain valid. For moves, indices are remapped by the line-count delta between the swapped sections.

### Single Transaction
All operations use `editor.transaction()` with bundled changes and selection updates, ensuring a single undo step per operation.

### Multi-Section Indent
Uses `editor.listSelections()` to detect range selections and multi-cursors. Each selection's containing heading is found, sections are deduplicated and sorted, then all changes are batched into a single transaction.

## Success Criteria
A user coming from Outliner + list workflow should be able to:
1. Install the plugin with zero configuration
2. Write a document using only headings (no lists)
3. Restructure it entirely using Tab, Shift+Tab, Ctrl+Shift+↑, Ctrl+Shift+↓
4. Have the experience feel **identical** in speed and fluidity to the list-based Outliner workflow
