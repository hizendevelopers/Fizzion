# ARY News TV Authorization Model

## Required authorization fields

- agreement reference
- territory
- permitted monitoring
- permitted recording
- permitted clipping
- permitted internal playback
- permitted download
- valid from
- valid until
- supporting document storage key
- approved by
- approved at
- status

## Recording gate

Recording is denied unless:

- source authorization status is `approved`
- recording permission is true
- clipping permission is true for clip generation
- internal playback permission is true for internal preview

## UI messages

- awaiting approval:
  `Recording is disabled until an authorized broadcast source and monitoring approval are configured.`
- preview denied:
  `Live monitoring preview is unavailable under the current source authorization.`

## Audit requirements

Every authorization create, update, approval, rejection, expiry extension, and document change must create an audit log record.
