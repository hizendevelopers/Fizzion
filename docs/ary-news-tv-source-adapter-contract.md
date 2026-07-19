# ARY News TV Source Adapter Contract

## Interface

```ts
export interface TvSourceAdapter {
  validateConfiguration(): Promise<SourceValidationResult>;
  checkAuthorization(): Promise<AuthorizationResult>;
  probeSource(): Promise<SourceProbeResult>;
  startRecording(): Promise<RecorderSessionResult>;
  stopRecording(): Promise<void>;
  getHealth(): Promise<SourceHealthResult>;
  reconnect(): Promise<ReconnectResult>;
}
```

## Supported adapter keys

- `authorized_hls`
- `authorized_srt`
- `authorized_rtmp`
- `authorized_rtsp`
- `satellite_receiver`
- `licensed_iptv`
- `partner_file_upload`
- `manual_upload`
- `sandbox_fixture`

## Rules

- adapters resolve credentials only from server-side secret references
- adapters never return secret payloads to the browser
- adapters must expose probe, health, and authorization results even when recording is blocked
- `sandbox_fixture` must clearly report itself as non-production

## Initial repo implementation

This implementation introduces the adapter contract, source test API, authorization gate, and recorder start/stop refusal logic. Live media recording still requires an authorized source secret and deployed worker runtime.
