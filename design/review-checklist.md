# Wisp Design Review Gate

Every UI PR (web or native) must pass this gate before merge. Derived from `../apple_ui_ux_guideline.md` §14.

## Product fit
- [ ] The screen solves a clear user need; primary action is obvious.
- [ ] Empty, loading, and error states are designed.
- [ ] Users can recover from mistakes.

## Visual quality
- [ ] Hierarchy clear; spacing consistent with the token scale.
- [ ] Color is purposeful; status never relies on color alone.
- [ ] Typography readable; role scale respected.
- [ ] Light and dark appearances both checked.
- [ ] Liquid Glass used only where it improves structure (native), no low-contrast text on glass.

## Platform alignment
- [ ] Native: system controls + SF Symbols used consistently; menu-bar conventions respected.
- [ ] Web: shadcn defaults used; tokens (not hardcoded hex) consumed.

## Accessibility (mandatory, guideline §9.2)
- [ ] Dynamic Type / rem scaling supported.
- [ ] VoiceOver / screen-reader names present on all controls.
- [ ] Color is not the only state indicator.
- [ ] Reduce Motion and Reduce Transparency respected.
- [ ] Focus order is logical and focus states visible.

## Content
- [ ] Labels are specific verbs; no `Submit`/`OK`.
- [ ] Errors explain what happened, why, and how to recover.
- [ ] Confirmation messages state the outcome.

## AI-specific (guideline §11)
- [ ] Compression behavior is disclosed; recoverability (CCR) is stated.
- [ ] Certainty is not overstated ("guaranteed identical" is banned).
