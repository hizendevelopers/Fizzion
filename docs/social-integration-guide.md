# FizZion Social Integration Guide

## Connection types

### Owned or authorized account

- Uses official OAuth
- May show private metrics only when the platform exposes them and the scope is granted

### Public monitored account

- Uses approved public-page or API access only
- Must never imply access to private metrics

## Activation checklist

1. Create provider apps and redirect URIs.
2. Request the required permissions for each platform.
3. Store secrets only in server-side environment variables.
4. Validate callback flows in staging before production.

