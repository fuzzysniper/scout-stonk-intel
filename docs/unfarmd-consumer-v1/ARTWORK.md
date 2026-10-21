# Founder-selected artwork / rights-pending handoff

The founder supplied and visually approved the attached `UNFARMD_selected_art_assets.zip`. The four selected WebP files are now integrated into the **existing** consumer app; this replaces the SVG placeholders, not the working analyzer. Visual approval does **not** establish independent commercial rights, trademark clearance, exclusivity or authenticated Midjourney export/master provenance. These remain **pending**. The visible hero caption says **“Founder-selected art · rights review pending”**; the story/footer retain the rights limitation. No licensing clearance is asserted.

## Preserved originals and provenance

The ZIP SHA-256 is recorded in [artwork/archive-sha256.txt](artwork/archive-sha256.txt). Its unmodified [asset-manifest.json](artwork/asset-manifest.json) and [INSTRUCTIONS.txt](artwork/INSTRUCTIONS.txt) retain the supplied provenance, selections, byte counts, dimensions and hashes. Both supplied JPEG originals are preserved byte-for-byte under [artwork/originals/](artwork/originals/); their status is **founder-uploaded files, not independently authenticated generator masters**. Tool/model/date and commercial rights remain unverified.

All six supplied derivatives are preserved without recompression or edits: four selected WebPs in `public/consumer/unfarmd/`; the unused square and `scout-mobile-focus-CANDIDATE.webp` under `artwork/unused-derivatives/`. The optional mobile focus candidate is **not used**. The four original SVG placeholders and their local generator also remain intact for audit and reviewed rollback. Never run the generator as a substitute for a supplied asset or as evidence of licensing.

## One explicit seam

`app/consumer/brand/art.ts` supplies local desktop/mobile/avatar/story paths, actual intrinsic dimensions, shared descriptive hero alt text, story alt text, rights-pending status and caption. `identity.tsx` uses a native `<picture>` with a high-priority hero and explicit mobile `<source>` dimensions. The avatar is selected by the existing homepage icon metadata seam, not inserted as another above-fold character. The below-fold story stays in the existing closed crew disclosure and loads lazily. No new runtime dependency, remote image host, hotlink, request to a provider or source-contract change.

| Selected asset | Actual dimensions / bytes | Role |
| --- | --- | --- |
| `scout-hero-desktop.webp` | 960×864 / 64,366 | Solo SCOUT mascot in the existing desktop hero. |
| `escape-hero-mobile.webp` | 1200×633 / 75,926 | Founder-selected wide farm-escape composition; mobile at ≤700px. |
| `scout-avatar.webp` | 384×384 / 18,792 | Existing homepage icon/mascot avatar seam. Global favicon/legacy routes unchanged. |
| `escape-story.webp` | 1456×816 / 118,474 | Lazy, below-fold farm-escape story in the existing crew disclosure. |

Hero ratios are reserved at **960/864 desktop** and **1200/633 mobile**, matching supplied dimensions. No image cropping/reconstruction, simulated final art, new features, layout redesign, metrics or evidence claims. The common hero alt describes the black sheep, amber eyes, broken tag, lime scanner and coral sky visible in both selected compositions. The story alt describes the farm escape. Images are not focusable; missing images keep descriptive alt text, reserved geometry and the independently usable form. No hidden network fallback or automatic source request is introduced.

## Verification and gates

[Artwork QA, responsive screenshots and exact results](artwork/README.md). Existing source-disabled release acceptance remains in [release/README.md](release/README.md); references there to placeholder artwork describe that **earlier** build. This owner-authorized asset integration supersedes only its pending-art-selection statement, not the independent rights or source activation gates. Prior screenshot galleries remain dated previous-build evidence.

Before a human-approved public release, the owner must independently review applicable generator/subscription and artist terms, intended commercial/public use, recognizable third-party IP, and UNFARMD name/trademark clearance. Preserve the review record; do not remove rights-pending disclosure merely because these files are in Git. Physical iPhone Safari/VoiceOver/software-keyboard and final founder visual acceptance remain pending unless actually performed. Source-derived financial publication restrictions and separately disabled backend approval are unchanged.

Rollback this integration through review by reverting its consumer/artwork commit to parent `9ec499a78991552c2b02db2d641c75487b52cf47`; that restores original placeholders and preserves the quota fix. Do not roll back backend #136, source admission/counters, data, permissions or infrastructure. No merge, manual deployment, domain change, source activation or paid service is authorized by this artwork handoff.
