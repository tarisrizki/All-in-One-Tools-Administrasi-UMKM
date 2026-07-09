// Tiny shared reactive state so any component (sidebar button, keyboard
// shortcut, future "help" menu, etc.) can open the command palette without
// prop-drilling through the layout.
export const paletteState = $state({ open: false });

export function openPalette() {
	paletteState.open = true;
}
