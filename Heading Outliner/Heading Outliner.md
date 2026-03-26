# Overview
Obsidian plugin that brings the **Outliner-style editing workflow** (fast block manipulation via keyboard) to **regular heading-based Markdown**, with no required configuration.
The core mental model: a **section** (heading + all its content until next equal/higher heading) behaves like a movable, indent-able block exactly like a list item in Outliner.

- Version: v0.0.4
- Status: F1–F5 fully implemented and stable. Phase 2 (drag-and-drop) is optional.

# Definitions
- **Section**: A heading line + all body content + all sub-headings, until the next heading of equal or higher level
- **Indent**: Increase heading level by 1 (`#` → `##`); cascades to all child headings within the section
- **Unindent**: Decrease heading level by 1 (`##` → `#`); cascades to all child headings; blocked at H1
- **Move**: Swap a section with the adjacent sibling section above or below, preserving internal structure

# Features
## F1 Move Section Up / Down - Done ✓
- Move the section the cursor is in upward or downward past its sibling
- Children and body content travel with the section
- Works regardless of whether the section is folded or unfolded
- Fold state is preserved: all previously folded lines are remapped by line-count delta and re-folded synchronously
- **Hotkey**: `Ctrl+Shift+↑` / `Ctrl+Shift+↓` (configurable)
- Uses CM6 keymap at `Prec.high` - no conflict with Outliner
- Single undoable transaction (one Ctrl+Z to undo)

## F2 Indent Section - Done ✓
- Increases the heading level of the current heading by 1
- All child headings within the section are also increased by 1
- Blocked silently at H6
- **Hotkey**: `Tab` (when cursor is on a heading line)
- **Multi-select**: range selection and multi-cursor (Alt+Click) - all selected sections indent together in one transaction
- **Selection preservation**: all selections/cursors remain in place after operation
- **Fold-aware**: when indenting into a folded parent, parent automatically unfolds

## F3 Unindent Section - Done ✓
- Decreases the heading level of the current heading by 1
- All child headings within the section are decreased by 1
- Blocked silently at H1
- **Hotkey**: `Shift+Tab` (when cursor is on a heading line)
- **Multi-select**: same as F2
- **Selection preservation**: all selections/cursors remain in place after operation

## F4 Tab Behavior Scoping - Done ✓
- Tab/Shift+Tab override **only activates when the cursor is on a heading line**
- On body text lines or list items: default Obsidian behavior is preserved
- **No conflict with the Outliner plugin** - both use CM6 keymaps at `Prec.highest`; each handles its own context (headings vs list items)

## F5 Visual Heading Indent - Done ✓
- Optional per-level indentation in editor (`padding-left`) and reading view (`margin-left`)
- Controlled by CSS variable `--heading-indent-size`
- Settings: toggle on/off + size slider (0.5–4 em, default 1.5)

## F6 Drag-and-Drop - Not started (Phase 2)
- Drag handle rendered in the editor gutter next to each heading
- Dragging moves the full section to the target position
- Works on both folded and unfolded sections
- **Setting flag**: "Enable drag handles" (default: OFF)

# Behavioral Rules
- **Cascade is mandatory**: indent/unindent always affects the full section subtree, never just the heading line alone
- **Move respects section boundaries**: moving down means swapping with the next sibling at the same or higher level, not just the next line
- **Cursor stays in section**: after any operation, cursor remains within the same section it started in
- **No destructive operations**: indent at H6 or unindent at H1 does nothing silently - no error, no transform
- **Undo-compatible**: every operation is a single undoable transaction
- **Fold preservation**: fold state is saved before and restored after any text manipulation - no tearing or flash of unfolded content
- **Multi-section indent**: when multiple headings are selected, only root headings are processed (nested selections are filtered out)
- **Selection preservation**: all selections and cursors are mapped through changes using CM6's native mapping

# Technical Implementation

## CM6 Native Architecture
All operations use native CodeMirror 6 API:
- `EditorView.dispatch()` for all state changes
- `ChangeSet` for building and mapping changes
- `ChangeSet.mapPos()` for position mapping through changes
- `EditorSelection.map()` for selection mapping
- `foldedRanges()` / `foldEffect` / `unfoldEffect` from `@codemirror/language` for fold management

## Selection Mapping
Positions are mapped using `ChangeSet.desc` to ensure selections remain valid after document changes:
```ts
const changeSet = ChangeSet.of(changes, state.doc.length);
cmView.dispatch({
    changes,
    selection: state.selection.map(changeSet.desc)
});
```

## Root Heading Detection
When multiple headings are selected (via range or multi-cursor), nested headings are filtered to only process root headings:
- Headings are sorted by line number and level
- Any heading whose section is fully contained within another selected section is excluded
- This prevents duplicate processing of nested content

## Fold State Management
Folds are handled with position-aware mapping:
1. Capture all fold ranges before changes using `foldedRanges()`
2. Build `ChangeSet` from document changes
3. Map fold positions through `changeSet.mapPos(pos, assoc)`
4. For unfolding parent: use post-change mapped positions in `unfoldEffect`
5. For preserving folds: re-apply with mapped positions after changes

**Key insight from Perplexity**: Effects in a transaction are evaluated against post-change positions. Pre-change fold positions must be mapped through `ChangeSet` before use in `unfoldEffect`.

## Single Transaction
All operations use CM6's native transaction system, ensuring a single undo step per operation.

# Out of Scope
- List item manipulation (use Outliner plugin for that)
- Frontmatter / YAML block handling (ignore / skip)
- Multi-cursor or multi-selection move (Phase 2 consideration)
- Exporting / converting between heading and list formats

# Settings

| Setting | Default | Description |
|---|---|---|
| Override Tab on heading lines | ON | Enable F2/F3 hotkey behavior |
| Indent headings by level | ON | Visual per-level indentation |
| Indent size (em) | 1.5 | Spacing per heading level |
| Enable drag handles | OFF | Phase 2 feature flag |

# Changelog

## 0.0.4
- Fixed multi-selection preservation after indent/unindent operations
- Fixed duplicate text changes when selecting nested headings
- Fixed fold state preservation during all operations
- Fixed smart parent unfolding when indenting into folded sections
- Refactored to use native CodeMirror 6 API throughout

## 0.0.3
- Initial release with F1-F5 features

# Success Criteria
A user coming from Outliner + list workflow should be able to:
1. Install the plugin with zero configuration
2. Write a document using only headings (no lists)
3. Restructure it entirely using Tab, Shift+Tab, Ctrl+Shift+↑, Ctrl+Shift+↓
4. Have the experience feel **identical** in speed and fluidity to the list-based Outliner workflow