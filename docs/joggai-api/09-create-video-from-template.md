# Create Video from Template

Generate videos using customizable templates with variables.

## Overview

Use pre-designed templates to quickly create videos with your own content. Templates support text, image, video, and script variables that you can customize.

### Key Features

- **Pre-designed Templates:** Professional layouts ready to use
- **Variable System:** Swap content easily
- **Batch Processing:** Generate multiple variations
- **Consistent Branding:** Maintain brand identity

## Quick Start

### List Available Templates

```bash
curl --request GET \
  --url 'https://api.jogg.ai/v2/templates/custom?page=1&limit=20' \
  --header 'x-api-key: YOUR_API_KEY'
```

### Response

```json
{
  "code": 0,
  "msg": "Success",
  "data": {
    "templates": [
      {
        "template_id": "tpl_abc123",
        "name": "Product Showcase",
        "description": "Professional product presentation template",
        "thumbnail_url": "https://cdn.jogg.ai/templates/tpl_abc123.jpg",
        "preview_url": "https://cdn.jogg.ai/templates/tpl_abc123_preview.mp4",
        "aspect_ratio": "9:16",
        "duration": 30,
        "variables": [
          {
            "name": "product_name",
            "type": "text",
            "description": "Product name displayed on screen"
          },
          {
            "name": "product_image",
            "type": "image",
            "description": "Main product image"
          },
          {
            "name": "script",
            "type": "script",
            "description": "Avatar speaking script"
          }
        ]
      }
    ],
    "total": 50
  }
}
```

### Create Video from Template

```bash
curl --location 'https://api.jogg.ai/v2/template' \
  --header 'x-api-key: YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "template_id": "tpl_abc123",
    "variables": {
      "product_name": "SmartWatch Pro",
      "product_image": "https://example.com/smartwatch.jpg",
      "script": "Introducing the SmartWatch Pro - your ultimate fitness companion!"
    }
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

## API Endpoints

### List Templates

**GET** `https://api.jogg.ai/v2/templates/custom`

### Create Template Video

**POST** `https://api.jogg.ai/v2/template`

## Variable Types

| Type | Description | Value Format |
|------|-------------|--------------|
| text | Text displayed on screen | String |
| image | Image asset | URL |
| video | Video asset | URL |
| script | Avatar speaking text | String |
| color | Color value | Hex code |
| number | Numeric value | Integer/Float |

## Request Parameters

### Create Template Video

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| template_id | string | Yes | Template identifier |
| variables | object | Yes | Key-value pairs for template variables |
| avatar_id | string | No | Override default avatar |
| voice_id | string | No | Override default voice |
| webhook_url | string | No | Custom webhook for this video |

## Complete Example

```bash
curl --location 'https://api.jogg.ai/v2/template' \
  --header 'x-api-key: YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "template_id": "tpl_product_showcase",
    "variables": {
      "headline": "New Arrival",
      "product_name": "Wireless Earbuds Pro",
      "product_description": "Premium sound quality with 24-hour battery life",
      "product_image": "https://cdn.example.com/earbuds.jpg",
      "price": "$99.99",
      "cta_text": "Shop Now",
      "script": "Check out our new Wireless Earbuds Pro! With premium sound quality and an incredible 24-hour battery life, these earbuds are perfect for your active lifestyle. Get yours today for just $99.99!"
    },
    "avatar_id": "sarah_full_01",
    "voice_id": "en-US-News-N"
  }'
```

## Batch Video Generation

Create multiple videos from one template:

```bash
curl --location 'https://api.jogg.ai/v2/template/batch' \
  --header 'x-api-key: YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "template_id": "tpl_abc123",
    "batch": [
      {
        "variables": {
          "product_name": "Product A",
          "product_image": "https://example.com/product-a.jpg",
          "script": "Introducing Product A..."
        }
      },
      {
        "variables": {
          "product_name": "Product B",
          "product_image": "https://example.com/product-b.jpg",
          "script": "Meet Product B..."
        }
      },
      {
        "variables": {
          "product_name": "Product C",
          "product_image": "https://example.com/product-c.jpg",
          "script": "Discover Product C..."
        }
      }
    ]
  }'
```

### Batch Response

```json
{
  "code": 0,
  "msg": "Success",
  "data": {
    "projects": [
      { "project_id": "proj_001", "status": "pending" },
      { "project_id": "proj_002", "status": "pending" },
      { "project_id": "proj_003", "status": "pending" }
    ]
  }
}
```

## Template Categories

| Category | Description | Use Cases |
|----------|-------------|-----------|
| Product | Product showcases | E-commerce, launches |
| Testimonial | Customer reviews | Social proof |
| Educational | How-to content | Tutorials |
| Promotional | Sales & offers | Marketing campaigns |
| Social | Social media formats | TikTok, Reels, Stories |

## Custom Templates

Request custom templates by contacting JoggAI support:

- Brand-specific designs
- Custom variable sets
- Unique animations
- Corporate templates

## Checking Video Status

```bash
curl --request GET \
  --url 'https://api.jogg.ai/v2/project/{project_id}' \
  --header 'x-api-key: YOUR_API_KEY'
```

See [Check Video Result](./06-get-result.md) for details.

## Error Codes

| Code | Message | Solution |
|------|---------|----------|
| 8001 | Template not found | Verify template_id |
| 8002 | Missing required variable | Check template variables |
| 8003 | Invalid variable type | Use correct type for variable |
| 8004 | Variable value too long | Reduce text length |
| 8005 | Invalid image/video URL | Verify media URLs |

## Best Practices

1. **Variable Naming:** Match exact variable names from template
2. **Image Quality:** Use high-resolution images
3. **Text Length:** Stay within character limits
4. **Preview First:** Test with one video before batch
5. **Consistent Branding:** Use consistent assets across videos

## Related Documentation

- [Check Video Result](./06-get-result.md)
- [Upload Media](./05-upload-media.md)
- [Create Avatar Videos](./02-create-avatar-videos.md)
