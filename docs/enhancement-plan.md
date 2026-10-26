# CutCap — Enhancement plan (web-first)

> Scope: browser app only (`pnpm dev`). Tauri / Windows packaging (M5) stays deferred.  
> Status baseline: M0–M4 done (projects, export wasm, Groq transcribe/align, style, timeline drag).  
> Updated: 2026-10-26

## Goal

Make the web app **trustworthy for daily use**: what you see in preview should match export, saves must not lose work, and polish UX around lyrics editing.

---

## Phase A — Reliability quick wins

**Priority:** do first · **Est:** 0.5–1 day

| ID | Item | Why | Acceptance |
|---|---|---|---|
| A1 | Fix autosave race | Completing save can overwrite newer edits via `onProjectChange(saved)` | Edits during an in-flight save are kept; only merge `updatedAt` (or ignore stale saves by revision) |
| A2 | Allow empty cue text in schema | Editor allows `""` but `requireString` rejects reload | Save → reload with empty cues succeeds |
| A3 | Fail loud if lyrics not burned | drawtext fail currently still yields image+audio MP4 | Export errors (or blocks download) when lyric burn fails; message is clear |
| A4 | Space = play/pause | Timeline editing needs keyboard | Space toggles play when focus is not in an input |
| A5 | Esc closes dialogs | Export / Transcribe / Align | Esc closes when not busy; optional basic focus return |

**Exit:** no silent data loss on save/reload; no “lyric-less MP4 looks fine”.

---

## Phase B — Preview ↔ export parity

**Priority:** high · **Est:** 1–2 days

| ID | Item | Why | Acceptance |
|---|---|---|---|
| B1 | Use chosen font in wasm export | Preview fonts ignored; drawtext hardcodes Noto | Exported text uses selected `fontFamily` when a font file is available; otherwise clear fallback notice |
| B2 | Box background in export | Style `boxBgMode` preview-only today | Color box (+ opacity) appears in MP4 (ASS BorderStyle / filter equivalent) |
| B3 | Appear animation in export | fade / pop / slide-up preview-only | At least **fade** (+ ideally slide/pop) matches ASS tags already generated |
| B4 | Ornaments in export | Hearts/butterflies preview-only; ASS events exist but unused | Prefer burning ASS (libass) over drawtext when possible so ornaments/anim work |
| B5 | Update export docs | `docs/export-pipeline.md` overstates ASS burn | Doc matches real wasm path + fallbacks |

**Exit:** side-by-side preview vs exported draft looks “close enough” for style settings.

---

## Phase C — Editing & review UX

**Priority:** medium · **Est:** 1–2 days

| ID | Item | Why | Acceptance |
|---|---|---|---|
| C1 | Cue validation in UI | `validateCues` exists but unused in editor | Overlaps / invalid ranges shown on list or timeline |
| C2 | needsReview workflow | Align/transcribe flags cues | “Next review” jumps to next flagged cue; filter badge works |
| C3 | Undo (lightweight) | Dragging cues/style is irreversible | Ctrl+Z undoes last cue timing or text change (stack ≥ 20) |
| C4 | Align vs Transcribe copy | Easy to confuse | Short in-dialog tips: Transcribe invents text; Align keeps your lines |
| C5 | Volume control | `audio.volume` unused in UI | Slider affects preview + export |
| C6 | beforeunload when unsaved | Accidental tab close | Browser warns if saveStatus is unsaved/saving |

**Exit:** lyric timing edits feel safe; review after AI is fast.

---

## Phase D — Storage & backup

**Priority:** medium · **Est:** 1–2 days

| ID | Item | Why | Acceptance |
|---|---|---|---|
| D1 | QuotaExceeded handling | All projects in one localStorage key | Friendly error + tip to delete old projects / download JSON |
| D2 | Import JSON without media warning | `browser-media://` blobs missing after import | Banner: re-import image/audio |
| D3 | Same-id import overwrite confirm | Import can replace existing id silently | Confirm dialog before overwrite |
| D4 | Project package (optional) | JSON alone is incomplete backup | Zip or multi-file export: `project.json` + image + audio (stretch) |

**Exit:** users understand what is/isn’t backed up; no silent overwrite.

---

## Phase E — Polish & quality

**Priority:** lower · **Est:** ongoing

| ID | Item | Notes |
|---|---|---|
| E1 | Dialog a11y | Focus trap, `aria-modal` complete |
| E2 | Mobile / narrow layout | Stack panes; timeline usable on phone |
| E3 | UI language consistency | VI/EN — pick one default or simple toggle |
| E4 | Refresh `docs/architecture.md` | Web-first boundaries; Tauri as future |
| E5 | Integration smoke tests | Export happy path mock; autosave race unit test |
| E6 | Schema migrator | Formal migrate(vN→vN+1) instead of ad-hoc parse |
| E7 | ffmpeg listener cleanup | Avoid stacking progress handlers |
| E8 | Groq preflight | File size / duration check before upload |

---

## Deferred (out of this plan)

| Item | Status |
|---|---|
| M5 Windows / Tauri packaging | Deferred |
| OS keychain for API keys | Later (web: localStorage BYOK is enough) |
| Extra AI providers beyond Groq | When needed |

---

## Suggested order of work

```text
A1 → A2 → A3 → A4/A5
        ↓
   B4/B3 (ASS burn path) → B1 → B2 → B5
        ↓
   C1 → C2 → C4 → C3 → C5/C6
        ↓
   D1 → D2 → D3 → (D4 stretch)
        ↓
   E as capacity allows
```

## Tracking

- Mark items `[ ]` / `[x]` in PRs or copy this table into issues.
- Keep README milestone table in sync when a phase completes (e.g. “Web polish A–B done”).

## Related docs

- [`export-pipeline.md`](./export-pipeline.md)
- [`transcription.md`](./transcription.md)
- [`alignment.md`](./alignment.md)
- [`architecture.md`](./architecture.md)
- [`security-and-privacy.md`](./security-and-privacy.md)
