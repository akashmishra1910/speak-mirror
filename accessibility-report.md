# Accessibility Audit Report (WCAG AA)

This report reviews the accessibility parameters of **SpeakMirror** to ensure conformance with **WCAG 2.1 Level AA** guidelines.

---

## 1. Accessibility Features

### Semantic HTML Layouts
- Main landmarks use `<header>`, `<main>`, `<section>`, and `<footer>` instead of unsemantic `<div>` structures.
- Heading tags follow a strict chronological hierarchy (`<h1>` -> `<h2>` -> `<h3>`) without skips.

### Keyboard Navigation & Focus
- Custom interactive elements (e.g. prompt cards, buttons) have proper `tabIndex={0}` attributes.
- Interactive elements feature clear, high-contrast `:focus-visible` outlines.
- Modals capture focus when open to prevent tab-key leakage outside the modal.

### Color Contrast & Typography
- Font colors maintain a contrast ratio of at least **4.5:1** against the background.
- Fonts use dynamic relative units (`rem`, `em`) for scaling.
- Screen readers have descriptive context using `aria-label` tags for icon-only buttons.

---

## 2. Accessibility Checklist (WCAG AA)

| Criteria | Standard | Status | Notes |
| --- | --- | --- | --- |
| **1.1.1 Non-text Content** | Alt text for icons/imgs | Passed | Icons have explicit labels/ARIA hiding. |
| **2.1.1 Keyboard** | Fully operable via keyboard | Passed | Focus loops implemented in dialogs. |
| **2.4.7 Focus Visible** | Distinct focus indicator | Passed | Tailwind `focus-visible:ring-2` applied. |
| **3.2.1 On Focus** | No unexpected context changes | Passed | Inputs do not trigger automatic page shifts. |
| **4.1.2 Name, Role, Value** | Clear element definitions | Passed | Form inputs are linked to matching `<label>` elements. |
