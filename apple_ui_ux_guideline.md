# Apple-Inspired UI/UX Design Guideline

**Version:** 1.0  
**Prepared for:** Product, design, engineering and governance teams  
**Source basis:** Apple Developer Design, Apple Human Interface Guidelines and Apple Design Resources, reviewed June 2026

---

## 1. Purpose and Scope

This guideline defines a practical UI/UX standard for creating software experiences that feel clear, modern, platform-native and aligned with Apple’s current design direction.

It is intended for:

- Product managers defining experience requirements
- Designers building layouts, flows and components
- Engineers implementing Apple platform interfaces
- Reviewers assessing usability, accessibility and visual quality
- Governance teams maintaining a repeatable product standard

This document is not a replacement for Apple’s official documentation. It converts Apple’s current guidance into an internal working standard that can be applied consistently across product design, delivery and review.

Primary Apple sources:

- Apple Design: https://developer.apple.com/design/
- Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines/
- Apple Design Resources: https://developer.apple.com/design/resources/
- What’s New in Design: https://developer.apple.com/design/whats-new/

---

## 2. Apple Design Principles

Apple’s Human Interface Guidelines are built around creating great experiences across Apple platforms. The design standard should prioritise clarity, platform consistency, accessibility and user control.

### 2.1 Clarity

Interfaces must make the user’s next action obvious.

Guidelines:

- Present one primary task per screen where possible.
- Use plain labels and recognisable controls.
- Avoid visual clutter.
- Do not force users to interpret decorative UI as functional UI.
- Use hierarchy to guide attention.

### 2.2 Deference

The interface should support content rather than compete with it.

Guidelines:

- Keep chrome minimal.
- Use materials and visual effects to support structure, not decoration.
- Prioritise readable content over ornamental surfaces.
- Avoid unnecessary borders, panels and visual containers.

### 2.3 Depth

Use layering, motion and spatial relationships to help users understand where they are.

Guidelines:

- Use transitions to explain navigation changes.
- Use sheets, overlays and sidebars for contextual depth.
- Preserve spatial continuity between related views.
- Avoid motion that feels slow, decorative or distracting.

### 2.4 Consistency

Use Apple platform conventions unless there is a strong product reason not to.

Guidelines:

- Prefer system controls over custom controls.
- Use SF Symbols where appropriate.
- Follow platform navigation patterns.
- Respect expected interaction models for iOS, iPadOS, macOS, watchOS and visionOS.

### 2.5 Accessibility

Accessibility must be part of the default design and build process.

Guidelines:

- Support Dynamic Type.
- Support VoiceOver.
- Support Increase Contrast.
- Support Reduce Motion.
- Support Reduce Transparency.
- Avoid colour-only status communication.
- Ensure all controls have clear accessible names.

---

## 3. Visual Foundations

## 3.1 Layout

Layout should create calm, clear and predictable experiences.

### Standard

- Use consistent spacing between related interface elements.
- Keep related items visually grouped.
- Avoid dense layouts unless the platform and task require it.
- Ensure primary actions are positioned where users expect them.
- Avoid hiding essential controls behind menus.
- Make layouts responsive across compact, regular and expanded contexts.

### Platform expectations

| Platform | Layout Direction |
|---|---|
| iOS | Compact, direct, thumb-friendly, focused |
| iPadOS | Adaptive, multitasking-aware, supports sidebars and split views |
| macOS | Denser, keyboard-friendly, menu-aware, windowed |
| watchOS | Glanceable, minimal, immediate |
| visionOS | Spatial, layered, comfort-aware |

### Review questions

- Is the primary task obvious?
- Can the user scan the screen quickly?
- Are related elements grouped naturally?
- Does the layout adapt across device sizes?
- Is the content readable without visual strain?

---

## 3.2 Colour

Colour should communicate purpose, hierarchy and state.

### Standard

- Use colour intentionally.
- Use one primary accent colour for main actions.
- Avoid using colour as the only indicator of status.
- Support light and dark appearances.
- Test contrast in standard and increased contrast modes.
- Avoid excessive gradients or decorative colour treatments.

### Colour usage model

| Colour Role | Purpose |
|---|---|
| Accent | Primary actions and selected states |
| Semantic success | Completed or healthy state |
| Semantic warning | Risk or required attention |
| Semantic destructive | Delete, remove, revoke or irreversible action |
| Neutral | Backgrounds, dividers and secondary information |

### Anti-patterns

- Red used for non-destructive actions
- Green used without supporting text
- Low contrast text on glass or blurred surfaces
- Multiple competing accent colours
- Decorative colour that weakens hierarchy

---

## 3.3 Typography

Typography should create hierarchy, readability and rhythm.

### Standard

- Use system typography where possible.
- Support Dynamic Type.
- Avoid fixed text sizes that break accessibility.
- Use weight, size and spacing consistently.
- Keep headings short.
- Avoid long all-caps labels.
- Allow for localisation and text expansion.

### Type hierarchy

| Role | Use |
|---|---|
| Large Title | High-level screen or major workflow title |
| Title | Page, panel or major section title |
| Headline | Important grouped content |
| Body | Main readable content |
| Callout | Supporting explanation |
| Caption | Metadata, hints and secondary labels |
| Footnote | Low-priority supporting information |

### Review questions

- Can users identify the most important text first?
- Is body text comfortable to read?
- Does the interface still work with larger text sizes?
- Are labels concise and useful?

---

## 3.4 Spacing and Density

Spacing should make the interface feel structured and calm.

### Standard

- Use consistent spacing tokens.
- Increase spacing around primary content.
- Keep dense layouts limited to expert or data-heavy workflows.
- Avoid placing destructive actions too close to primary actions.
- Ensure touch targets are comfortable on touch platforms.

### Suggested spacing model

| Token | Use |
|---|---|
| 4 px | Micro spacing inside compact components |
| 8 px | Related inline elements |
| 12 px | Compact grouping |
| 16 px | Standard section spacing |
| 24 px | Major content separation |
| 32 px+ | Page-level separation |

---

## 4. Liquid Glass Usage

Apple’s current design direction introduces Liquid Glass as a dynamic material across Apple platforms. It should be used carefully to create depth, continuity and a modern platform feel.

Official reference:

- Materials: https://developer.apple.com/design/human-interface-guidelines/materials
- Apple Design Resources: https://developer.apple.com/design/resources/

### 4.1 Principle

Liquid Glass should support structure and focus. It should not reduce readability or become the dominant visual feature.

### 4.2 Appropriate use

| Use Case | Guidance |
|---|---|
| Tab bars | Use system tab bars with Liquid Glass where available |
| Toolbars | Use for contextual actions and navigation surfaces |
| Sidebars | Use to reinforce layered navigation |
| Sheets | Use to separate temporary tasks from the main view |
| App icons | Use layered icon structure through Icon Composer |
| Floating controls | Use only where the control remains readable and purposeful |

### 4.3 Avoid

- Placing glass over busy content.
- Overusing transparency across the whole interface.
- Creating custom glass effects that conflict with system behaviour.
- Using glass for dense forms or long reading areas.
- Prioritising effect over clarity.

### 4.4 Review questions

- Does Liquid Glass improve structure or context?
- Is text still readable?
- Does the effect work in light and dark mode?
- Does it respect Reduce Transparency?
- Would a simpler material work better?

---

## 5. Navigation Patterns

Navigation should help users understand where they are, where they can go and what they can do next.

### 5.1 Pattern selection

| Pattern | Use When |
|---|---|
| Tab bar | The product has 3 to 5 primary destinations |
| Sidebar | There are many sections or persistent categories |
| Split view | Users browse and inspect or edit content |
| Toolbar | Actions are tied to the current view |
| Search | Search is a primary way to access content |
| Sheet | The task is temporary, focused and interruptible |
| Full-screen modal | The task requires full attention |
| Menu | Actions are secondary, advanced or contextual |

### 5.2 Tab bars

Standard:

- Use tabs for major app sections.
- Keep tab labels short.
- Use recognisable SF Symbols.
- Avoid more than five primary tabs.
- Do not use tabs for actions.
- Preserve user context when switching tabs.

### 5.3 Sidebars

Standard:

- Use sidebars for persistent navigation.
- Keep labels concise.
- Group related destinations.
- Use icons consistently.
- Avoid duplicating the same navigation model across tabs and sidebars.

### 5.4 Toolbars

Standard:

- Keep toolbar actions contextual.
- Prioritise common actions.
- Group related actions.
- Use labels where icons may be ambiguous.
- Avoid turning the toolbar into a dumping ground for every command.

### 5.5 Search

Standard:

- Make search visible when it is central to the workflow.
- Use tokens for scoped search and filters.
- Support recent searches where useful.
- Provide helpful empty, loading and no-result states.
- Do not make users restart search to refine results.

---

## 6. Component Library Standards

Components must be consistent, accessible and platform-aware.

## 6.1 Buttons

### Standard

- Use one primary action per view or task group.
- Use clear verb-based labels.
- Use destructive styling only for destructive actions.
- Do not use vague labels such as “Submit” where a specific action is available.
- Keep button groups small.
- Ensure touch targets are comfortable.

### Button label examples

| Weak | Better |
|---|---|
| Submit | Create Policy |
| OK | Save Changes |
| Continue | Review Deployment |
| Delete | Delete Device |
| Confirm | Approve Request |

### Button states

Every button must define:

- Default
- Hover, where applicable
- Focus
- Pressed
- Disabled
- Loading
- Error or failed action state, where applicable

---

## 6.2 Forms

### Standard

- Keep forms as short as possible.
- Group related fields.
- Use clear labels above or beside fields.
- Show validation near the field.
- Preserve user input after validation errors.
- Use sensible defaults.
- Avoid placeholder-only labels.

### Error guidance

Errors should explain:

1. What happened
2. Why it matters
3. How to fix it

Example:

> We couldn’t save the profile because the name is already in use. Enter a unique profile name and try again.

---

## 6.3 Lists and Tables

### Standard

- Use lists for scannable collections.
- Use tables for structured comparison or dense data.
- Support sorting and filtering where useful.
- Keep row actions contextual.
- Avoid placing too many controls in each row.
- Use empty states to explain what belongs in the list.

### Empty state model

An empty state should include:

- A clear title
- A short explanation
- A useful next action, where applicable

Example:

> No policies found  
> Create a policy or adjust your filters.

---

## 6.4 Cards

### Standard

- Use cards to group related content.
- Do not overuse cards for every piece of content.
- Keep card actions limited.
- Avoid nested cards.
- Ensure cards remain readable in light and dark modes.

---

## 6.5 Menus

### Standard

- Use menus for secondary or contextual actions.
- Do not hide primary actions inside menus.
- Place destructive actions at the end.
- Use separators only when groups are meaningfully different.
- Use menu icons only when they improve scanning.

---

## 6.6 Alerts and Confirmation Dialogs

### Standard

- Use alerts only when the user must stop and decide.
- Make consequences clear.
- Use specific action labels.
- Put destructive actions in destructive style.
- Avoid generic “Are you sure?” messaging.

Example:

> Delete this policy?  
> This removes the policy from all scoped devices. This action can’t be undone.

Actions:

- Cancel
- Delete Policy

---

## 6.7 Progress and Loading

### Standard

- Show progress for operations that take noticeable time.
- Use skeleton states for content loading where appropriate.
- Use progress indicators for known-duration tasks.
- Provide useful status text for long-running tasks.
- Do not block the whole interface unless required.

---

## 7. Icons, Symbols and Imagery

## 7.1 SF Symbols

Apple’s SF Symbols library includes thousands of symbols designed to integrate with the San Francisco system font and support multiple weights, scales and localisation behaviours.

Official reference:

- SF Symbols and Apple Design Resources: https://developer.apple.com/design/resources/

### Standard

- Prefer SF Symbols over custom icons.
- Match icon weight to nearby text.
- Use labels when meaning is not obvious.
- Do not mix icon families.
- Avoid decorative icons that do not add meaning.
- Confirm right-to-left and localisation behaviour where required.

---

## 7.2 App Icons

Apple’s current icon tooling supports layered icons and Liquid Glass workflows through Icon Composer.

Official reference:

- Icon Composer: https://developer.apple.com/design/resources/

### Standard

- Use one clear metaphor.
- Avoid text unless essential.
- Design for recognisability at small sizes.
- Support light, dark, tinted and clear appearances where applicable.
- Avoid overly detailed illustrations.
- Use layered icon structure where appropriate.

### Review questions

- Is the icon recognisable without the app name?
- Does it work at small sizes?
- Does it work across appearance modes?
- Does it feel aligned with the platform?

---

## 8. Motion and Feedback

Motion should explain change, provide feedback and preserve orientation.

### Standard

- Use motion to show cause and effect.
- Keep transitions fast and purposeful.
- Respect Reduce Motion.
- Avoid decorative motion.
- Avoid animations that block the user.
- Preserve spatial continuity between related views.

### Good motion use cases

- Opening a sheet from a button
- Expanding a detail view
- Confirming completion
- Moving between hierarchy levels
- Showing relationship between selected item and destination

### Anti-patterns

- Slow page transitions
- Decorative bouncing
- Repeated attention-grabbing animation
- Motion that makes reading harder
- Motion that ignores accessibility settings

---

## 9. Accessibility Requirements

Accessibility is mandatory for every product feature.

Official reference:

- Accessibility in the HIG: https://developer.apple.com/design/human-interface-guidelines/accessibility

### 9.1 Minimum standard

| Area | Requirement |
|---|---|
| Text | Supports Dynamic Type |
| Colour | Meets contrast expectations |
| State | Does not rely on colour alone |
| VoiceOver | Controls have clear accessible names |
| Motion | Respects Reduce Motion |
| Transparency | Respects Reduce Transparency |
| Interaction | Touch targets are comfortable |
| Keyboard | Keyboard navigation works where relevant |
| Focus | Focus states are visible and logical |
| Errors | Errors are announced and recoverable |

### 9.2 Checklist

Before release, confirm:

- The screen can be used with VoiceOver.
- Text remains readable at larger sizes.
- Controls have accessible labels.
- Colour is not the only indicator of state.
- Motion and transparency respect user settings.
- Focus order is logical.
- Error messages are specific and actionable.

---

## 10. Writing and Microcopy

Interface writing should be clear, direct and helpful.

### 10.1 Standard

- Use plain language.
- Use verbs for actions.
- Use nouns for destinations.
- Keep labels short.
- Avoid internal system language unless the audience expects it.
- Avoid humour in errors or serious workflows.
- Write recovery-focused error messages.

### 10.2 Examples

| Weak | Better |
|---|---|
| An error occurred | We couldn’t save the profile |
| Invalid input | Enter a valid email address |
| Operation failed | The deployment couldn’t start |
| Are you sure? | Delete this policy? |
| Submit | Create request |

### 10.3 Confirmation language

A confirmation should state the outcome clearly.

Example:

> Policy created  
> The policy is ready to scope to devices.

---

## 11. Generative AI Experience Guidelines

AI features must be transparent, reviewable and user-controlled.

Official reference:

- Generative AI in the HIG: https://developer.apple.com/design/human-interface-guidelines/generative-ai

### Standard

- Make it clear when content is AI-generated.
- Let users review generated content before applying it.
- Separate suggestions from confirmed actions.
- Provide refinement controls.
- Show progress or feedback while content is generated.
- Provide user feedback options.
- Do not overstate certainty.
- Preserve user control.

### AI interaction model

| Stage | Requirement |
|---|---|
| Input | User understands what they are asking the system to do |
| Generation | System provides useful progress feedback |
| Review | User can inspect and edit generated output |
| Apply | User confirms before changes are committed |
| Feedback | User can refine, retry or reject output |

### Anti-patterns

- Automatically applying generated content without review
- Presenting generated output as guaranteed correct
- Hiding the source or context of suggestions
- Making AI the only way to complete a task
- Using AI where a simple deterministic control would be better

---

## 12. Platform-Specific Rules

## 12.1 iOS

### Standard

- Use compact, focused workflows.
- Prioritise direct manipulation.
- Keep primary actions thumb-friendly.
- Use tab bars for primary destinations.
- Avoid desktop-style density.
- Respect safe areas.

## 12.2 iPadOS

### Standard

- Do not treat iPad as a stretched iPhone.
- Support sidebars and split views where useful.
- Support multitasking and resizable windows.
- Use larger layouts to improve task flow, not to add clutter.
- Consider pointer, touch and keyboard input.

## 12.3 macOS

### Standard

- Use menu bar conventions.
- Support keyboard shortcuts.
- Use sidebars and toolbars for structured workflows.
- Support window resizing.
- Use denser layouts only when they improve productivity.
- Respect pointer precision.

## 12.4 watchOS

### Standard

- Design for glanceability.
- Keep text extremely concise.
- Prioritise immediate value.
- Avoid complex navigation.
- Use complications and notifications carefully.

## 12.5 visionOS

### Standard

- Design for spatial comfort.
- Avoid excessive motion or depth.
- Keep interactive elements easy to target.
- Use immersion only when it improves the experience.
- Respect user focus and environment.

---

## 13. Design System Governance

A strong UI/UX guideline must be maintained as a product asset.

### 13.1 Required design system artefacts

| Artefact | Purpose |
|---|---|
| Design principles | Define the experience standard |
| Tokens | Define colour, spacing, typography and radius |
| Components | Define reusable interface parts |
| Patterns | Define common flows and behaviours |
| Accessibility rules | Define inclusive design requirements |
| Content rules | Define labels, microcopy and tone |
| Platform variants | Define iOS, iPadOS, macOS, watchOS and visionOS differences |
| Review checklist | Define quality gate before release |
| Changelog | Track design standard changes |

### 13.2 Component governance

Every component should document:

- Purpose
- Anatomy
- Behaviour
- States
- Accessibility requirements
- Content rules
- Platform differences
- Do and don’t examples
- Engineering implementation notes

### 13.3 Change process

Use this process for guideline updates:

1. Identify need or gap.
2. Validate against Apple’s current HIG.
3. Update design tokens, components or patterns.
4. Review with design and engineering.
5. Add version history.
6. Communicate change to delivery teams.

---

## 14. Design Review Checklist

Use this checklist before moving a feature into build or release.

## 14.1 Product fit

- The screen solves a clear user need.
- The primary action is obvious.
- The workflow avoids unnecessary steps.
- Users can recover from mistakes.
- Empty, loading and error states are designed.

## 14.2 Visual quality

- Hierarchy is clear.
- Spacing is consistent.
- Colour is purposeful.
- Typography is readable.
- Light and dark appearances are considered.
- Liquid Glass is used only where it improves structure.

## 14.3 Apple platform alignment

- Native controls are used where appropriate.
- Navigation follows platform conventions.
- SF Symbols are used consistently.
- Layout respects safe areas and device context.
- Platform-specific behaviours are not ignored.

## 14.4 Accessibility

- Dynamic Type is supported.
- VoiceOver works correctly.
- Controls have accessible names.
- Colour is not the only state indicator.
- Reduce Motion is respected.
- Reduce Transparency is respected.
- Focus order is logical.

## 14.5 Content

- Labels are specific.
- Actions use clear verbs.
- Errors explain how to recover.
- Technical language is limited to appropriate audiences.
- Confirmation messages state what happened.

## 14.6 AI-specific

- AI-generated content is clearly identifiable.
- Users can review output before applying it.
- Users can refine or retry.
- The system does not overstate certainty.
- AI actions are separate from confirmed actions.

---

## 15. Appendix: Apple Resources

### Core design resources

- Apple Design: https://developer.apple.com/design/
- Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines/
- Apple Design Resources: https://developer.apple.com/design/resources/
- What’s New in Design: https://developer.apple.com/design/whats-new/

### Key topic references

- Materials: https://developer.apple.com/design/human-interface-guidelines/materials
- Layout: https://developer.apple.com/design/human-interface-guidelines/layout
- Accessibility: https://developer.apple.com/design/human-interface-guidelines/accessibility
- Tab bars: https://developer.apple.com/design/human-interface-guidelines/tab-bars
- Generative AI: https://developer.apple.com/design/human-interface-guidelines/generative-ai
- Designing for iOS: https://developer.apple.com/design/human-interface-guidelines/designing-for-ios

---

## 16. Version History

| Version | Date | Notes |
|---|---|---|
| 1.0 | 10 June 2026 | Initial guideline based on Apple Design, Human Interface Guidelines and Design Resources |
