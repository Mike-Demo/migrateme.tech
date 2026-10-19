nameWeb Awesome Design Systemcolors
surfaceneutral-lightneutral-inkneutral-mutedpalette-bluepalette-greenpalette-yellowpalette-red
#ffffff
#f1f2f3
#1b1d26
#545868
#0071ec
#00ac49
#fac22b
#dc3146
Design System: Web Awesome Design System
Project Context
This repository is both a distributable design-system library and its living showcase. It wraps Web Awesome 3.12.0 and Font Awesome Free 7.3.1 in a TanStack Start site that prerenders to static HTML. The site calls itself “Awesome DS”; the README names the project “Web Awesome Design System.”
The product's first priority is its 70 typed React wrappers and the custom elements they expose. The self-contained vendor bundle makes those elements available without runtime npm installs or JavaScript CDN requests. The searchable icon index (2,883 icons), token foundations and theme editor, and optional bundle/CDN/SSR delivery modes support that core library. Keep the showcase's navigation and content in that order of importance: components and their working examples first, then delivery and icons, then reference foundations.
Purpose, goals, and critical files


Purpose: ship a portable, token-driven Web Awesome component library alongside a practical, searchable showcase and style guide.

Distribution goal: consumers install no runtime Web Awesome or Font Awesome packages; use the local vendor bundle by default, with the pinned CDN option when desired.

Consistency goal: use --wa-* tokens throughout, allow themes to be retuned centrally, and support light and dark modes.

Delivery goal: prerender all nine public showcase routes with page-specific search metadata and preserve the required credits.

README.md is the product summary, feature inventory, and source of public terminology.

docs/architecture.md describes the library / preview boundary and the routing, styling, and delivery decisions.

src/webawesome/react/ contains the typed wrappers; src/webawesome/vendor/ contains the self-contained element bundles.

src/webawesome/setup.tsx and src/webawesome/cdn.ts implement element registration and the optional CDN loader.

src/webawesome/theme.css, src/webawesome/tokens.css, and src/webawesome/brand.css are the theme entry, token snapshot, and theme-editor-generated brand override file.

src/showcase/overview.tsx defines the showcase landing-page hierarchy; src/showcase/shell.tsx defines its navigation and page shell.

src/showcase/component-registry.ts groups the component catalog; src/showcase/icon-index.tssupplies the icon catalog.

src/showcase/showcase.css contains preview-only layout and presentation rules. Showcase pages are not part of the distributable library.
1. Visual Theme & Atmosphere
The visual language is a clear, neutral reference interface: cool gray surfaces, fine borders, restrained shadows, and a semantic accent color used for active navigation, links, and the primary action. It feels practical and documentation-first rather than editorial or decorative. Components are the main subject; the interface frames them with a persistent navigation shell, labeled examples, live states, and copyable code.
Whitespace comes from a consistent, adjustable spacing scale. Full-width sections alternate between the default and lowered surface, while the content inside them stays in a centered column. Cards and specimen panels rely on subtle borders and modest corner rounding instead of prominent elevation. Light and dark modes reuse the same semantic tokens. The shipped brand.css has no overrides, so do not imply the project has chosen a custom brand color or font.
2. Color Palette & Roles
The source defines the functional roles as semantic Web Awesome tokens. The hex values in the YAML are exact examples from the local default palette; they are palette swatches, not claims that the project assigns each swatch to a particular semantic role. The default semantic theme and the showcase use --wa-color-* references, and brand.css currently leaves them at the Web Awesome defaults.
Primary Foundation


Surface white — #ffffff (--wa-color-surface-default, --wa-color-surface-raised in light mode): the clean canvas and raised card surface.

Cool neutral light — #f1f2f3 (--wa-color-gray-95): a light palette step; semantic lowered surfaces use the neutral 95 step.

Cool neutral ink — #1b1d26 (--wa-color-gray-10): the dark end of the neutral palette, suitable as a source swatch for high-contrast text.

Cool neutral muted — #545868 (--wa-color-gray-40): a mid-dark neutral swatch; quiet text is expressed through --wa-color-text-quiet.
Accent & Interactive


Semantic brand: use --wa-color-brand-fill-*, --wa-color-brand-border-*, and --wa-color-brand-on-* for primary actions, links, focus, the hero band, and active navigation. The showcase uses --wa-color-brand-fill-loud for its logo, kicker, and primary CTA.

Default blue palette sample — #0071ec (--wa-color-blue-50): one source-defined palette swatch, not a project-specific brand declaration.

Interactive components use their documented variant and appearance attributes. One loud brand button per view region; supporting actions are outlined or plain.
Typography & Text Hierarchy


Normal text uses --wa-color-text-normal; secondary copy and captions use --wa-color-text-quiet; links use --wa-color-text-link.

The semantic roles have three fill and border attention levels—quiet, normal, and loud—with corresponding on-*colors. The theme provides brand, success, warning, danger, and neutral groups.
Functional States


Success — #00ac49 (--wa-color-green-60), warning — #fac22b (--wa-color-yellow-80), and danger — #dc3146 (--wa-color-red-50) are exact palette samples. Use the corresponding semantic Web Awesome tokens for component states rather than hardcoding these swatches.

Feedback, focus, and interaction colors remain token-driven. Preserve contrast through the paired fill-* / on-* semantic tokens in both themes.
3. Typography Rules
Hierarchy & Weights


Body: ui-sans-serif, system-ui, sans-serif; headings use the same stack by default. This is the shipped system font choice, not a bundled font.

Code and token labels: ui-monospace, monospace. The optional long-form token is ui-serif, serif; the showcase does not make it the primary body face.

Scale: 10, 11, 12, 14, 16, 20, 25, 32, 41, 52, and 66 px, from 3xs through 5xl; the base 16 px scale is adjustable.

Weights: 300 light, 400 normal, 500 semibold, and 600 bold. Body copy is normal; headings are bold; actions are semibold.

Leading: condensed 1.2 for headings, normal 1.6 for readable content, and expanded 2 for long-form content.

The overview uses a 52 px 4xl hero heading, a 32 px 2xl section title, and 16 px body copy. Kicker and specimen labels are small, uppercase, and letter-spaced.
Spacing Principles


Use the token rhythm: 2, 4, 8, 12, 16, 24, 32, 40, 48, 64, and 80 px (3xs through 5xl). The whole scale is adjustable.

Showcase sections use 48 px vertical padding and 32 px horizontal gutters; the centered content column is 72 rem wide.

Use wa-stack, wa-cluster, wa-grid, and the wa-gap-* utilities before introducing custom layout rules.
4. Component Stylings
Buttons


Use Web Awesome buttons and their native variant / appearance API. Variants communicate meaning (brand, success, warning, danger, neutral); appearances control emphasis (accent, filled, outlined, plain).

Reserve one loud brand action per view region. Demote secondary actions to outlined or plain; do not put an outlined button on a band of its own variant color.

Size, loading, disabled, pill, icon-slot, and caret states are part of the component patterns. Icon-only controls need an accessible label.

Prefer component attributes, documented custom properties, and documented shadow parts over styling the custom-element host.
Cards & Specimen Containers


Catalog and overview cards use a surface background, a thin --wa-color-surface-border border, and medium or large token radii.

Specimen panels are lightly framed, with generous inner spacing and live examples. Code panels use the neutral quiet fill and monospace text.

Elevation is selective: overview stats use the small shadow; hoverable page cards gain the medium shadow and brand border. Most panels remain flat.
Navigation


The shared wa-page shell places the product name, version badges, and theme toggle in the header; the page links occupy a desktop sidebar and become a drawer on smaller screens.

Group links under the exact labels Foundations and Library. Overview is first; active links use the quiet brand fill and on-color.

Keep the skip-to-content link, named navigation landmark, main landmark, and standard footer.
Inputs & Forms


Use native Web Awesome form controls with visible labels, hints, and component-provided focus states. Keep wa-* controls consistent with the shared semantic theme.

Catalog search fields are prominent and may include a leading search icon and clear affordance. Do not replace labels with placeholders.
Domain-Specific Components


Component catalog: organize examples by the source registry groups: Actions, Form controls, Feedback & status, Display & media, Data & formatting, Navigation & structure, Overlays, and Utilities & observers. Each entry pairs the component name and tag with a live specimen, summary, and copyable markup.

Icon index: divide the searchable catalog into Solid, Regular, and Brands families. Use a compact, even grid of selectable icon cells with the exact icon name; selecting an icon copies its markup and confirms with feedback.

Theme editor: make color, font, spacing/density, radius, and shadow adjustments visible in a live component preview. The editor's saved default is a development-only operation.
5. Layout Principles
Grid & Structure


The showcase is an application shell around a sequence of full-bleed sections, not a marketing-page template. The landing page starts with the system identity, concise description, component/icon actions, and actual scale metrics; catalog links and build principles follow.

The maximum showcase content width is 72 rem. The license pattern uses 48 rem; the overview lede is capped at 40 ch, and other ledes are limited to roughly 56–70 ch.

Use token-based responsive grids with minimum card widths appropriate to content. The component page switches from a 15 rem sticky index plus content column to a single column at 60 rem.
Whitespace Strategy


Give major sections 48 px vertical padding, with 32 px page gutters.

Use the shared spacing scale for component gaps and panel padding. Fine 2–4 px steps are for close relationships; larger 24–64 px steps separate groups and sections.

Separate adjacent sections with a thin surface-border rule; use a lowered surface only where the overview groups principles as a distinct band.
Alignment & Visual Balance


Keep page content left-aligned within a centered column. Align kickers, headings, ledes, and actions as one editorial stack.

Use generous width for the primary component specimens; reserve narrow monospace labels for tag names, tokens, and code.

The landing-page visual hierarchy follows the README and live overview: library purpose and component access first; delivery and icon search next; foundations and principles after that.
Responsive Behavior & Touch


wa-page uses a 920 px mobile breakpoint for sidebar-to-drawer navigation. The component-doc layout also collapses to one column at 60 rem; its sticky index becomes static and scrollable.

Icon and page-card grids fill available width by repeating columns with a content-based minimum size. Preserve readable labels and wrapping at narrow widths.

Retain keyboard focus rings and keyboard-reachable controls. Use native interactive elements and accessible labels; no source-specific minimum touch-target dimension is declared.
6. Design System Notes for Stitch Generation
Language to Use
Describe this as a token-driven, open-source Web Awesome component library with a searchable live showcase. Use the repository's terms—“Awesome DS,” “Web Awesome Design System,” “Components,” “Iconography,” “Theme editor,” “Delivery & SSR,” “Foundations,” and “Library.” Keep it precise, calm, functional, and documentation-first. Do not invent a custom brand palette, font, product claim, or component.
Color References
Use semantic --wa-* roles as the design contract. White and cool gray swatches form the light-mode surface and neutral reference; use the same semantic theme in dark mode. Treat the blue, green, yellow, and red hexes in the YAML as samples from the default palette, not manually assigned product colors. Keep raw color values out of implementation styles.
Component Prompts


Overview: “Show the Web Awesome Design System with its component library as the lead feature. Use the real component and icon counts, concise description, ‘Browse components’ primary action, and ‘Search icons’ secondary action from the showcase. Keep foundations and principles further down the page.”

Component reference: “Present the existing component groups as a searchable, navigable reference. Give each component a live specimen, exact custom-element tag, concise source summary, and copyable code; preserve the desktop index and responsive single-column layout.”

Foundations: “Display the actual Web Awesome color roles, font and type scales, spacing, radii, and shadows as token specimens. Pair visible values with their token names and keep the light/dark theme switch.”

Iconography: “Create a searchable catalog for the existing Solid, Regular, and Brands Font Awesome Free families. Show icon names and the existing copy-markup interaction; do not add icons or labels absent from the source catalog.”
Incremental Iteration
Preserve the library/showcase boundary: src/webawesome/ is distributable; src/showcase/ and src/routes/ are preview-site code. Before changing visual treatments, check tokens.css, the theme editor's token model, and the component API. Keep each value token-based; use the theme editor and brand.css for any intentional default-theme retuning. Reuse the existing Web Awesome components and layout utilities before adding custom styling.