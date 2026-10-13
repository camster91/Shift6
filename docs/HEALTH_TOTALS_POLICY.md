# Health totals and source estimates

Implementation for issue #332. Native multisource verification remains pending.

Android steps and sleep use Health Connect cumulative aggregates. The platform
reconciles Activity/Sleep duplicates using the user's source priorities; SHIFT6
never guesses which watch/phone sample is authoritative or changes that priority.
Other raw types retain bounded pagination. Imported activity cannot change personal
measured goals or deterministic workout progression.

## Days and refresh

Days are UTC calendar days, including across daylight-saving changes. Each
aggregate request is intersected with the exact selected range. The first and last
days may be partial; the UI labels selected-range totals. This deliberately avoids
reading extra history or requesting new history/background permissions. These UTC
buckets can differ from Health Connect's local-calendar dashboard totals; compare
exact ranges and day basis during device testing.

A successful read replaces owned steps/sleep rows intersecting all touched UTC
days, including old raw source rows and stale totals. This is one exclusive SQLite
transaction with the new import. It refreshes source-priority changes rather than
adding old and new totals. Partial grants replace only granted types. Complete
empty coverage removes stale values without fabricating zero. All native reads
finish before replacement begins; a later page/aggregate failure leaves existing
records untouched. An insertion failure rolls back the deletion.

Partial first/last-day refresh replaces that day's previous full/partial result;
SHIFT6 does not combine overlapping readings or claim the omitted hours as zero.
Other owners, denied types, and nonoverlapping dates remain untouched. Legacy raw
records crossing a refreshed day's boundary are removed as whole records because
splitting their values would guess their distribution.

The installed native bridge substitutes 0 for an absent Steps/Sleep aggregate.
SHIFT6 requires nonempty dataOrigins to record a covered result. Empty origins
mean no measurement; zero with contributing origins is retained. The stored
source identifies the platform priority total, not one originating app, and does
not claim an underlying provider/sample count.

## Apple and legacy records

Apple Health steps/sleep and legacy additive summaries remain separate by source
and are explicitly labelled estimates with possible overlap. SHIFT6 does not sum
phone/watch estimates into one reconciled total. A platform-reconciled daily total
supersedes raw contributions for its type/day. Apple native reconciliation is not
claimed complete; its raw intervals may overlap even within one named source.

## Evidence and remaining gates

Tests cover aggregate mapping, no raw Steps/Sleep reads, missing versus explicit
zero, UTC/midnight/DST windows, partial grants, cross-source isolation, distinct
intervals, priority refresh/idempotence, real SQLite stale-row replacement,
owner/denied-type isolation, rollback, and no writes after incomplete reads.
These are synthetic fixtures, not clinical or physical-device validation.

Before closing #332, verify Android with real overlapping phone/watch sources,
source-priority changes, sleep spanning midnight, revoked/partial permissions,
empty ranges, and exact platform-range comparisons. iOS physical QA and a native
reconciliation implementation remain pending.

Primary reference: [Android aggregate data and user app priorities](https://developer.android.com/health-and-fitness/health-connect/aggregate-data).
Installed bridge evidence: react-native-health-connect ReactStepsRecord.kt and
ReactSleepSessionRecord.kt parseAggregationResult use COUNT_TOTAL and seconds,
respectively, and include dataOrigins.
