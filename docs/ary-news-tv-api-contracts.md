# ARY News TV API Contracts

## Read APIs

- `GET /api/tv/channels/:channelSlug`
- `GET /api/tv/channels/:channelSlug/health`
- `GET /api/tv/channels/:channelSlug/timeline`
- `GET /api/tv/channels/:channelSlug/live-session`
- `GET /api/tv/occurrences`
- `GET /api/tv/occurrences/:id`
- `GET /api/tv/occurrences/:id/evidence`
- `GET /api/tv/occurrences/:id/clip-url`

## Write APIs

- `POST /api/tv/sources/:id/test`
- `POST /api/tv/sources/:id/start`
- `POST /api/tv/sources/:id/stop`
- `POST /api/tv/occurrences/:id/review`
- `POST /api/tv/occurrences/:id/regenerate-clip`
- `POST /api/tv/uploads/initiate`
- `POST /api/tv/uploads/complete`

## Error contract

```json
{
  "error": {
    "code": "SOURCE_NOT_AUTHORIZED",
    "message": "Recording cannot start until the source authorization is approved.",
    "requestId": "uuid"
  }
}
```

## Initial repo behavior

- source test is functional against stored metadata and authorization state
- source start/stop is functional for operational state changes and audit logs
- upload initiate/complete validates manifest payloads and creates processing metadata
- live session routes return policy-aware preview availability
