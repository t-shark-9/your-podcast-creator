# URL to Product Video

Generate product videos automatically from a URL.

## Overview

Transform any product URL into a professional marketing video. JoggAI automatically extracts product information, generates a script, and creates a video with an AI avatar.

### Key Features

- **Automatic Extraction:** Pull product details from URLs
- **AI Script Generation:** Create compelling marketing scripts
- **Multiple Styles:** Various script and visual styles
- **Avatar Integration:** Professional digital presenters
- **Fast Turnaround:** Videos ready in minutes

## Quick Start

### Basic Request

```bash
curl --location 'https://api.jogg.ai/v2/product' \
  --header 'x-api-key: YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "product_url": "https://example.com/product/123",
    "avatar_id": "sarah_full_01",
    "aspect_ratio": "9:16"
  }'
```

### Response

```json
{
  "code": 0,
  "msg": "Success",
  "data": {
    "project_id": "proj_xyz789"
  }
}
```

## API Endpoint

### Create Product Video

**POST** `https://api.jogg.ai/v2/product`

## Request Parameters

### Core Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| product_url | string | Yes | URL of the product page |
| avatar_id | string | No | Avatar to use (uses default if not specified) |
| aspect_ratio | string | No | `"16:9"`, `"9:16"`, or `"1:1"` (default: "9:16") |

### Script Style Options

| Parameter | Type | Description |
|-----------|------|-------------|
| script_style | string | Style of the generated script |
| video_length_seconds | integer | Target video length (15-90 seconds) |
| language | string | Script language code |

### Available Script Styles

| Style | Description | Best For |
|-------|-------------|----------|
| Storytime | Narrative storytelling approach | Emotional connection |
| Discovery | Product discovery journey | New product launches |
| Don't Worry | Addresses concerns/objections | Trust building |
| Data | Statistics and facts focused | Technical products |
| Top 3 Reasons | Listicle format | Quick decision making |
| Light Marketing | Subtle promotional tone | Brand awareness |

### Visual Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| visual_style | string | Visual presentation style |
| screen_style | string | Avatar framing style |
| caption | boolean | Enable/disable captions |

### Available Visual Styles

| Style | Description |
|-------|-------------|
| Dynamic | Fast cuts, energetic |
| Minimal | Clean, simple |
| Product-focused | Emphasizes product imagery |
| Lifestyle | Shows product in use |

## Complete Example

```bash
curl --location 'https://api.jogg.ai/v2/product' \
  --header 'x-api-key: YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "product_url": "https://store.example.com/smartphone-pro",
    "avatar_id": "mike_full_02",
    "avatar_type": 0,
    "aspect_ratio": "9:16",
    "script_style": "Top 3 Reasons",
    "video_length_seconds": 30,
    "language": "en",
    "visual_style": "Dynamic",
    "screen_style": "waist",
    "caption": true,
    "voice_id": "en-US-News-K",
    "audio_background": {
      "type": "music",
      "music_id": "upbeat_01",
      "volume": 0.2
    }
  }'
```

## Manual Product Information

If URL extraction fails or you want more control:

```bash
curl --location 'https://api.jogg.ai/v2/product' \
  --header 'x-api-key: YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "product_info": {
      "name": "SmartPhone Pro X",
      "description": "The latest flagship smartphone with AI-powered camera",
      "price": "$999",
      "features": [
        "200MP AI Camera",
        "5000mAh Battery",
        "8K Video Recording"
      ],
      "images": [
        "https://example.com/product1.jpg",
        "https://example.com/product2.jpg"
      ]
    },
    "avatar_id": "anna_full_01",
    "aspect_ratio": "9:16",
    "script_style": "Discovery"
  }'
```

## Supported URL Types

JoggAI can extract product information from:

- E-commerce platforms (Amazon, Shopify, WooCommerce)
- Custom product pages
- Landing pages
- Direct product URLs

### URL Requirements

- Must be publicly accessible
- HTTPS recommended
- Product information should be in page content
- Images should be directly accessible

## Checking Video Status

```bash
curl --request GET \
  --url 'https://api.jogg.ai/v2/project/{project_id}' \
  --header 'x-api-key: YOUR_API_KEY'
```

### Response

```json
{
  "code": 0,
  "msg": "Success",
  "data": {
    "project_id": "proj_xyz789",
    "status": "success",
    "video_url": "https://cdn.jogg.ai/videos/proj_xyz789.mp4",
    "thumbnail_url": "https://cdn.jogg.ai/thumbnails/proj_xyz789.jpg",
    "duration": 32.5,
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

## Error Handling

| Code | Message | Solution |
|------|---------|----------|
| 2001 | Unable to extract product info | Provide manual product_info |
| 2002 | URL not accessible | Verify URL is public |
| 2003 | Invalid script_style | Use supported style name |
| 2004 | Video length out of range | Use 15-90 seconds |

## Best Practices

1. **URL Quality:** Use direct product pages, not search results
2. **Image Quality:** High-resolution product images improve results
3. **Script Style:** Match style to your brand voice
4. **Length:** 15-30 seconds for social media, 45-60 for websites
5. **Language:** Match target audience language

## Related Documentation

- [AI Script Generation](./04-ai-scripts.md)
- [Create Avatar Videos](./02-create-avatar-videos.md)
- [Check Video Result](./06-get-result.md)
