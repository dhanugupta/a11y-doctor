// WCAG 2.2 Level A and AA success criteria.
// `auto`: how far automated tooling (lint + axe + heuristics) can get.
//   "high"    – most failures are machine-detectable
//   "partial" – some failures detectable, human judgement still required
//   "manual"  – needs a human (or the agent reading code/UX carefully)
export const WCAG22 = {
  '1.1.1': { name: 'Non-text Content', level: 'A', auto: 'partial' },
  '1.2.1': { name: 'Audio-only and Video-only (Prerecorded)', level: 'A', auto: 'manual' },
  '1.2.2': { name: 'Captions (Prerecorded)', level: 'A', auto: 'partial' },
  '1.2.3': { name: 'Audio Description or Media Alternative (Prerecorded)', level: 'A', auto: 'manual' },
  '1.2.4': { name: 'Captions (Live)', level: 'AA', auto: 'manual' },
  '1.2.5': { name: 'Audio Description (Prerecorded)', level: 'AA', auto: 'manual' },
  '1.3.1': { name: 'Info and Relationships', level: 'A', auto: 'partial' },
  '1.3.2': { name: 'Meaningful Sequence', level: 'A', auto: 'manual' },
  '1.3.3': { name: 'Sensory Characteristics', level: 'A', auto: 'manual' },
  '1.3.4': { name: 'Orientation', level: 'AA', auto: 'partial' },
  '1.3.5': { name: 'Identify Input Purpose', level: 'AA', auto: 'partial' },
  '1.4.1': { name: 'Use of Color', level: 'A', auto: 'partial' },
  '1.4.2': { name: 'Audio Control', level: 'A', auto: 'partial' },
  '1.4.3': { name: 'Contrast (Minimum)', level: 'AA', auto: 'high' },
  '1.4.4': { name: 'Resize Text', level: 'AA', auto: 'partial' },
  '1.4.5': { name: 'Images of Text', level: 'AA', auto: 'manual' },
  '1.4.10': { name: 'Reflow', level: 'AA', auto: 'manual' },
  '1.4.11': { name: 'Non-text Contrast', level: 'AA', auto: 'manual' },
  '1.4.12': { name: 'Text Spacing', level: 'AA', auto: 'partial' },
  '1.4.13': { name: 'Content on Hover or Focus', level: 'AA', auto: 'manual' },
  '2.1.1': { name: 'Keyboard', level: 'A', auto: 'partial' },
  '2.1.2': { name: 'No Keyboard Trap', level: 'A', auto: 'partial' },
  '2.1.4': { name: 'Character Key Shortcuts', level: 'A', auto: 'manual' },
  '2.2.1': { name: 'Timing Adjustable', level: 'A', auto: 'partial' },
  '2.2.2': { name: 'Pause, Stop, Hide', level: 'A', auto: 'partial' },
  '2.3.1': { name: 'Three Flashes or Below Threshold', level: 'A', auto: 'manual' },
  '2.4.1': { name: 'Bypass Blocks', level: 'A', auto: 'partial' },
  '2.4.2': { name: 'Page Titled', level: 'A', auto: 'high' },
  '2.4.3': { name: 'Focus Order', level: 'A', auto: 'partial' },
  '2.4.4': { name: 'Link Purpose (In Context)', level: 'A', auto: 'partial' },
  '2.4.5': { name: 'Multiple Ways', level: 'AA', auto: 'manual' },
  '2.4.6': { name: 'Headings and Labels', level: 'AA', auto: 'manual' },
  '2.4.7': { name: 'Focus Visible', level: 'AA', auto: 'partial' },
  '2.4.11': { name: 'Focus Not Obscured (Minimum)', level: 'AA', auto: 'partial' },
  '2.5.1': { name: 'Pointer Gestures', level: 'A', auto: 'manual' },
  '2.5.2': { name: 'Pointer Cancellation', level: 'A', auto: 'partial' },
  '2.5.3': { name: 'Label in Name', level: 'A', auto: 'partial' },
  '2.5.4': { name: 'Motion Actuation', level: 'A', auto: 'manual' },
  '2.5.7': { name: 'Dragging Movements', level: 'AA', auto: 'manual' },
  '2.5.8': { name: 'Target Size (Minimum)', level: 'AA', auto: 'high' },
  '3.1.1': { name: 'Language of Page', level: 'A', auto: 'high' },
  '3.1.2': { name: 'Language of Parts', level: 'AA', auto: 'manual' },
  '3.2.1': { name: 'On Focus', level: 'A', auto: 'manual' },
  '3.2.2': { name: 'On Input', level: 'A', auto: 'manual' },
  '3.2.3': { name: 'Consistent Navigation', level: 'AA', auto: 'manual' },
  '3.2.4': { name: 'Consistent Identification', level: 'AA', auto: 'manual' },
  '3.2.6': { name: 'Consistent Help', level: 'A', auto: 'manual' },
  '3.3.1': { name: 'Error Identification', level: 'A', auto: 'partial' },
  '3.3.2': { name: 'Labels or Instructions', level: 'A', auto: 'partial' },
  '3.3.3': { name: 'Error Suggestion', level: 'AA', auto: 'manual' },
  '3.3.4': { name: 'Error Prevention (Legal, Financial, Data)', level: 'AA', auto: 'manual' },
  '3.3.7': { name: 'Redundant Entry', level: 'A', auto: 'manual' },
  '3.3.8': { name: 'Accessible Authentication (Minimum)', level: 'AA', auto: 'partial' },
  '4.1.2': { name: 'Name, Role, Value', level: 'A', auto: 'partial' },
  '4.1.3': { name: 'Status Messages', level: 'AA', auto: 'partial' },
};

// axe-core tags that together mean "WCAG 2.2 Level A + AA".
export const AXE_WCAG22_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// axe encodes criteria as tags like "wcag111" (1.1.1) or "wcag2411" (2.4.11).
export function scFromAxeTag(tag) {
  const m = /^wcag(\d)(\d)(\d{1,2})$/.exec(tag);
  if (!m) return null;
  const sc = `${m[1]}.${m[2]}.${m[3]}`;
  return WCAG22[sc] ? sc : null;
}

export function describeSc(sc) {
  const info = WCAG22[sc];
  return info ? `${sc} ${info.name} (${info.level})` : sc;
}

// Criteria that need human or agent review regardless of tool output.
export function manualCriteria() {
  return Object.entries(WCAG22)
    .filter(([, v]) => v.auto !== 'high')
    .map(([sc]) => sc);
}
