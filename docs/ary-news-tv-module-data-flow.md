# ARY News TV Module Data Flow

```text
Authorized ARY source or sandbox/manual upload
        |
        v
Source adapter validation
        |
        v
Recorder supervisor or upload completion
        |
        v
Private object storage (raw segments)
        |
        v
Recording validator
        |
        +--> gap / corruption / silence / freeze signals
        |
        v
Timeline metadata + processing jobs
        |
        v
Ad-break detector
        |
        v
Ad candidate detector
        |
        +--> OCR / STT / logo / fingerprint evidence
        |
        v
Creative matcher
        |
        v
Occurrence record creation
        |
        v
Clip generator (5s pre + 5s post when available)
        |
        v
Derived assets (clip, proxy, thumbnails, waveform)
        |
        v
Review queue / reports / alerts / dashboards
```

## Idempotency points

- segment upload keyed by checksum plus channel
- processing jobs keyed by recording file and job type
- occurrence source joins keyed by occurrence plus recording plus sequence
- clip generation keyed by occurrence plus checksum

## Boundary-crossing handling

When the ad spans two segments, the clip generator:

1. resolves adjacent recording files
2. validates continuity
3. extracts only required source spans
4. concatenates the minimal media region
5. records every underlying source reference in `tv_ad_occurrence_sources`

## Realtime update events

- segment completed
- validation complete
- recording gap detected
- occurrence created
- occurrence clip generated
- source health changed
- review action saved
