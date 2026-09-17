# SHIFT6 — Exercise Content Review Provenance

## Purpose

The launch exercise catalogue is safety-sensitive product content. A generated, imported, drafted, or structurally complete exercise record must not become publication-ready merely because its status field was changed.

This document defines the minimum provenance required before an exercise record can be treated as reviewed for public release.

## Publication rule

An exercise may move from `draft` to `reviewed` only after a real human technique/content review. A reviewed record must include:

- `contentStatus: 'reviewed'`;
- a non-empty `reviewedBy` reviewer identifier;
- a `reviewedAt` review timestamp;
- the structured setup, instruction, technique-cue, common-mistake, and safety fields required by the content-readiness validator.

The reviewer identifier can be an internal reviewer ID, role, or other durable identifier that lets the team trace who performed the review. It should not contain credentials, private contact information, or unnecessary personal data.

## Media is reviewed separately

Exercise-record review does not automatically approve its images or video. Each media item retains its own `reviewStatus` and must be approved independently before publication.

An exercise may remain usable without media when the product supports a media-free state. Missing media must not be replaced with unreviewed generated technique imagery simply to satisfy a launch count.

## Draft catalogue behaviour

Draft exercises can remain available for development, program composition, search, substitution testing, and local QA when their required structural fields are complete. They are not publication-ready and must not be represented as human-reviewed content.

The current foundational catalogue remains draft. This provenance rule does not mark any existing exercise as reviewed and does not reduce the launch target of 300+ high-quality reviewed records.

## Review workflow

1. Verify the exercise identity, movement classification, primary muscles, equipment requirements, and tracking type.
2. Review setup, instructions, technique cues, common mistakes, and safety notes for accuracy and clarity.
3. Confirm the record does not make medical, diagnostic, or individualized treatment claims.
4. Record the reviewer identifier in `reviewedBy` and the completed review time in `reviewedAt`.
5. Set `contentStatus` to `reviewed` only after steps 1–4 are complete.
6. Review any attached media separately and approve it only when the demonstrated technique is acceptable.
7. Run the content-readiness validation before including the exercise in a publication-ready program/catalogue build.

## Prohibited shortcuts

Do not bulk-promote records to `reviewed`, fabricate reviewer identifiers, infer review from an AI-generated draft, reuse an old review after materially changing technique/safety instructions without re-review, or treat a passing schema/TypeScript check as fitness-content review.

## Release evidence

Before public store release, the catalogue evidence should be able to show:

- the number of public exercise records;
- the number still in `draft`;
- the number in `reviewed` state;
- reviewer provenance and review timestamps for reviewed records;
- any outstanding media-review items;
- confirmation that public program versions reference publication-ready exercises only.

Human review remains the release gate. Automation can validate that provenance exists, but it cannot substitute for the review itself.
