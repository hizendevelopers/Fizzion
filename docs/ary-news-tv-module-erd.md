# ARY News TV Module ERD Additions

## New and extended entities

- `tv_channels`
- `tv_sources`
- `tv_source_authorizations`
- `tv_recorder_sessions`
- `tv_recording_files`
- `tv_recording_gaps`
- `tv_processing_jobs`
- `tv_ad_breaks`
- `tv_ad_occurrences`
- `tv_ad_occurrence_sources`
- `tv_ad_occurrence_clips`
- `tv_detection_evidence`
- `tv_review_actions`
- `tv_channel_detection_settings`
- `creative_assets`
- `creative_variants`
- `creative_fingerprints`

## Relationship summary

```text
organizations 1---n tv_channels
organizations 1---n tv_sources
tv_channels 1---n tv_sources
tv_sources 1---n tv_source_authorizations
tv_sources 1---n tv_recorder_sessions
tv_recorder_sessions 1---n tv_recording_files
tv_channels 1---n tv_recording_files
tv_recording_files 1---n tv_processing_jobs
tv_recording_files 1---n tv_ad_breaks
tv_ad_breaks 1---n tv_ad_occurrences
tv_ad_occurrences 1---n tv_ad_occurrence_sources
tv_ad_occurrences 1---1 tv_ad_occurrence_clips
tv_ad_occurrences 1---n tv_detection_evidence
tv_ad_occurrences 1---n tv_review_actions
creative_assets 1---n creative_variants
creative_assets 1---n creative_fingerprints
creative_assets 1---n tv_ad_occurrences
```

## Ownership rule

Every ARY TV operational table carries `organization_id` so RLS can consistently enforce tenant scope.
