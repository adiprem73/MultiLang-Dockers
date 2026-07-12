/**
 * Lets the notebook's keyboard handler put the caret inside a specific cell
 * (pressing Enter in command mode) without threading refs through every layer.
 */
type FocusFn = () => void;

const editors = new Map<string, FocusFn>();

export const registerEditor = (cellId: string, focus: FocusFn) => {
  editors.set(cellId, focus);
  // Returned as a useEffect cleanup, so it must not return a value.
  return () => {
    editors.delete(cellId);
  };
};

export const focusEditor = (cellId: string) => editors.get(cellId)?.();

/**
 * Drop focus out of whatever editor currently holds it.
 *
 * Monaco keeps focus on a hidden <textarea> nested inside its container, so
 * blurring the container element it hands back does nothing — we have to blur
 * the actually-focused element. Without this, leaving edit mode leaves the caret
 * in the old cell and the command-mode shortcuts never see a keystroke.
 */
export const blurActiveEditor = () => {
  const active = document.activeElement as HTMLElement | null;
  active?.blur();
};
