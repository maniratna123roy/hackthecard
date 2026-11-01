<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Card artwork is hand-coded SVG per theme in src/components/card/ThemeArt.tsx with palettes in src/lib/themes.ts; card internals use inline styles from theme data so PNG export captures exact colors. Why: data-driven themes render identically on screen and in export.
- GitHub data is fetched client-side (REST API + public contributions proxy) in src/lib/github.ts; developer titles use fixed rules, never randomness. Why: no backend needed and data stays verifiable.
- Card signature marks and activity highlights use browser-safe pure helpers in src/lib/card-details.ts; marks are decorative, not verification or QR codes. Why: personal details stay deterministic and export identically without inventing achievements.
