# FizZion Partner Upload Guide

## Supported delivery modes

- Pre-signed multipart upload to private storage
- SFTP ingestion
- Future SRT live contribution with Iraq-side rolling backup

## Required upload manifest fields

- Channel slug
- Source timestamp
- Source timezone
- Duration
- Checksum SHA-256
- Source partner reference

## Naming convention

`channel_slug__YYYY-MM-DD__HH-mm-ss__Asia-Baghdad.mp4`

## Operational requirements

- Maintain at least 72 hours of Iraq-side rolling backup
- Confirm upload completion for every segment
- Escalate missing files according to the agreed SLA

