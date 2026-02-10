# AI Script Generation

Generate compelling marketing scripts using AI.

## Overview

Create professional scripts for your videos using JoggAI's AI-powered script generator. Perfect for product marketing, explainer videos, and promotional content.

### Key Features

- **Multiple Styles:** Various script templates and tones
- **Product-Aware:** Incorporates product details automatically
- **Length Control:** Target specific video durations
- **Multilingual:** Support for 40+ languages

## Quick Start

### Generate Scripts

```bash
curl --location 'https://api.jogg.ai/v2/ai_scripts' \
  --header 'x-api-key: YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "product_info": "SmartWatch Pro - A fitness tracking smartwatch with heart rate monitoring, GPS, and 7-day battery life. Perfect for athletes and health enthusiasts.",
    "language": "en",
    "video_length_seconds": 30,
    "script_style": "Discovery"
  }'
```

### Response

```json
{
  "code": 0,
  "msg": "Success",
  "data": {
    "task_id": "script_abc123"
  }
}
```

## API Endpoints

### Generate Scripts

**POST** `https://api.jogg.ai/v2/ai_scripts`

### Get Script Results

**GET** `https://api.jogg.ai/v2/ai_scripts/results/{task_id}`

## Request Parameters

### Generate Scripts

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| product_info | string | Yes | Product description (max 2000 chars) |
| language | string | No | Language code (default: "en") |
| video_length_seconds | integer | No | Target length 15-90 (default: 30) |
| script_style | string | No | Script style (default: "Discovery") |
| product_url | string | No | Product URL for additional context |
| tone | string | No | Additional tone guidance |
| target_audience | string | No | Target audience description |
| call_to_action | string | No | Desired CTA |

## Script Styles

| Style | Description | Best For | Typical Length |
|-------|-------------|----------|----------------|
| Storytime | Narrative, emotional | Brand stories | 45-90s |
| Discovery | Journey of finding product | New launches | 30-60s |
| Don't Worry | Addresses pain points | Trust building | 30-45s |
| Data | Facts and statistics | Tech products | 15-30s |
| Top 3 Reasons | Listicle format | Quick wins | 30-45s |
| Light Marketing | Subtle promotion | Brand awareness | 15-30s |
| Testimonial | Customer perspective | Social proof | 30-60s |
| How-To | Educational/tutorial | Complex products | 45-90s |
| Comparison | vs competitors | Differentiation | 30-45s |
| Problem-Solution | Pain → Solution | Clear value prop | 30-45s |

## Getting Script Results

Scripts are generated asynchronously. Poll for results:

```bash
curl --request GET \
  --url 'https://api.jogg.ai/v2/ai_scripts/results/script_abc123' \
  --header 'x-api-key: YOUR_API_KEY'
```

### Response (Processing)

```json
{
  "code": 0,
  "msg": "Success",
  "data": {
    "task_id": "script_abc123",
    "status": "processing"
  }
}
```

### Response (Complete)

```json
{
  "code": 0,
  "msg": "Success",
  "data": {
    "task_id": "script_abc123",
    "status": "completed",
    "scripts": [
      {
        "script_id": "s1",
        "content": "Ever wondered what it feels like to have a personal health coach on your wrist? Introducing SmartWatch Pro...",
        "word_count": 85,
        "estimated_duration": 32
      },
      {
        "script_id": "s2",
        "content": "Tired of bulky fitness trackers that die after a day? SmartWatch Pro changes everything...",
        "word_count": 78,
        "estimated_duration": 29
      },
      {
        "script_id": "s3",
        "content": "Here are the top 3 reasons athletes are switching to SmartWatch Pro...",
        "word_count": 82,
        "estimated_duration": 31
      }
    ]
  }
}
```

## Complete Example with Custom Parameters

```bash
curl --location 'https://api.jogg.ai/v2/ai_scripts' \
  --header 'x-api-key: YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "product_info": "EcoBottle - A self-cleaning water bottle using UV-C technology. Eliminates 99.99% of bacteria. Made from recycled ocean plastic. 24-hour insulation.",
    "language": "en",
    "video_length_seconds": 45,
    "script_style": "Problem-Solution",
    "tone": "friendly and conversational",
    "target_audience": "environmentally conscious millennials",
    "call_to_action": "Visit ecobottle.com and use code CLEAN20 for 20% off"
  }'
```

## Supported Languages

Scripts can be generated in 40+ languages:

| Code | Language | Code | Language |
|------|----------|------|----------|
| en | English | de | German |
| es | Spanish | fr | French |
| pt | Portuguese | it | Italian |
| zh | Chinese | ja | Japanese |
| ko | Korean | ar | Arabic |
| hi | Hindi | ru | Russian |
| nl | Dutch | pl | Polish |
| tr | Turkish | vi | Vietnamese |
| th | Thai | id | Indonesian |
| ms | Malay | sv | Swedish |

## Using Generated Scripts

Once you have scripts, use them in avatar videos:

```bash
curl --location 'https://api.jogg.ai/v2/avatar' \
  --header 'x-api-key: YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "avatar": {
      "avatar_id": "sarah_full_01",
      "avatar_type": 0
    },
    "voice": {
      "type": "script",
      "input": "Ever wondered what it feels like to have a personal health coach on your wrist? Introducing SmartWatch Pro...",
      "voice_id": "en-US-News-N"
    },
    "aspect_ratio": "9:16"
  }'
```

## Best Practices

1. **Product Info Quality:** More detailed descriptions = better scripts
2. **Target Audience:** Specify audience for better tone matching
3. **Length Guidance:** Be specific about desired duration
4. **CTA Clarity:** Provide exact call-to-action text
5. **Review Scripts:** Always review AI-generated content before use

## Error Codes

| Code | Message | Solution |
|------|---------|----------|
| 3001 | Product info too short | Provide more product details |
| 3002 | Invalid language code | Use supported language code |
| 3003 | Invalid script style | Use supported style name |
| 3004 | Task not found | Verify task_id is correct |

## Related Documentation

- [Create Avatar Videos](./02-create-avatar-videos.md)
- [URL to Product Video](./03-url-to-video.md)
- [Check Video Result](./06-get-result.md)
