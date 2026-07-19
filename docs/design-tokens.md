# FizZion Design Tokens

## Brand direction

The UI takes Coca-Cola-inspired cues without mimicking Coca-Cola brand assets.

## Core tokens

```json
{
  "color": {
    "brand": {
      "cokeRed": "#F40009",
      "deepRed": "#B00020",
      "charcoal": "#111111",
      "white": "#FFFFFF",
      "surfaceSoft": "#F7F7F5",
      "border": "#E5E5E5",
      "mutedText": "#6B6B6B"
    },
    "semantic": {
      "success": "#1F8A4C",
      "warning": "#D68613",
      "error": "#C62828",
      "info": "#1F6FEB"
    }
  },
  "radius": {
    "sm": "10px",
    "md": "16px",
    "lg": "22px",
    "pill": "999px"
  },
  "shadow": {
    "sm": "0 1px 2px rgba(17,17,17,0.06)",
    "md": "0 12px 32px rgba(17,17,17,0.08)",
    "lg": "0 18px 48px rgba(17,17,17,0.12)"
  },
  "motion": {
    "fast": "120ms",
    "normal": "180ms",
    "slow": "280ms"
  }
}
```

## Typography

- Primary UI: Geist Sans
- Metric and technical labels: Geist Mono
- Arabic fallback stack: IBM Plex Sans Arabic, Noto Sans Arabic, sans-serif

## Component rules

- Red is reserved for emphasis, active state, primary action, and Coca-Cola-related comparison data.
- Large dashboards rely on soft surfaces and charcoal text.
- Charts use differentiated palettes and never encode status with color alone.
- Motion remains restrained and disabled or simplified under reduced-motion preferences.

