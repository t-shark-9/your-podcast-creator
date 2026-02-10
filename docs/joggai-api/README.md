# JoggAI API Documentation

Complete API reference for JoggAI - AI-powered video generation platform.

## Overview

JoggAI enables you to create professional videos with AI avatars, translate content into 40+ languages, and generate compelling scripts automatically.

### Base URL

```
https://api.jogg.ai/v2
```

### Authentication

All requests require an API key in the header:

```http
x-api-key: YOUR_API_KEY
```

## Quick Links

### Core Features

| Feature | Description | Documentation |
|---------|-------------|---------------|
| Avatar Videos | Create videos with AI avatars | [Create Avatar Videos](./02-create-avatar-videos.md) |
| Photo Avatars | Create custom avatars from photos | [Create Photo Avatar](./08-create-photo-avatar.md) |
| Product Videos | Generate videos from product URLs | [URL to Video](./03-url-to-video.md) |
| AI Scripts | Generate marketing scripts | [AI Scripts](./04-ai-scripts.md) |
| Templates | Use pre-designed video templates | [Templates](./09-create-video-from-template.md) |
| Translation | Translate videos to 40+ languages | [Video Translation](./11-video-translation.md) |

### Supporting Features

| Feature | Description | Documentation |
|---------|-------------|---------------|
| Webhooks | Real-time notifications | [Webhook Integration](./01-webhook-integration.md) |
| Upload Media | Upload images, videos, audio | [Upload Media](./05-upload-media.md) |
| Status Checking | Monitor video progress | [Get Result](./06-get-result.md) |
| Custom Audio | Use your own audio files | [Audio Source Videos](./10-avatar-videos-with-audio.md) |

## Getting Started

### 1. Get Your API Key

Sign up at [JoggAI](https://jogg.ai) and get your API key from the dashboard.

### 2. Make Your First Request

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
      "input": "Hello! Welcome to JoggAI.",
      "voice_id": "en-US-News-N"
    },
    "aspect_ratio": "16:9"
  }'
```

### 3. Check Status

```bash
curl --request GET \
  --url 'https://api.jogg.ai/v2/project/{project_id}' \
  --header 'x-api-key: YOUR_API_KEY'
```

### 4. Download Video

When status is `success`, use the `video_url` to download your video.

## Common Response Format

All API responses follow this structure:

```json
{
  "code": 0,
  "msg": "Success",
  "data": { ... }
}
```

### Response Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not found |
| 429 | Rate limited |
| 500 | Server error |

## Video Status Flow

```
pending → processing → success
                   ↘ failed
```

### Status Definitions

| Status | Meaning | Action |
|--------|---------|--------|
| pending | Queued | Wait |
| processing | Being generated | Wait |
| success | Complete | Download video |
| failed | Error | Check error message |

## Key Concepts

### Avatar Types

| Type | Value | Use Case |
|------|-------|----------|
| Public | 0 | JoggAI's pre-made avatars |
| Photo | 1 | Your custom photo avatars |

### Voice Types

| Type | Description |
|------|-------------|
| script | Text-to-speech with JoggAI voices |
| audio | Your own audio file |

### Aspect Ratios

| Ratio | Use Case |
|-------|----------|
| 16:9 | YouTube, websites |
| 9:16 | TikTok, Reels, Stories |
| 1:1 | Instagram feed, thumbnails |

## Rate Limits

Rate limits vary by plan. Contact JoggAI for details.

### Best Practices

1. Use webhooks instead of polling
2. Handle rate limit responses gracefully
3. Cache avatar and voice lists
4. Compress media before upload

## SDKs & Libraries

- **JavaScript/TypeScript:** Coming soon
- **Python:** Coming soon
- **REST API:** Available now

## Support

- **Documentation:** https://docs.jogg.ai
- **Support Email:** support@jogg.ai
- **API Status:** https://status.jogg.ai

## Documentation Index

1. [Webhook Integration](./01-webhook-integration.md)
2. [Create Avatar Videos](./02-create-avatar-videos.md)
3. [URL to Product Video](./03-url-to-video.md)
4. [AI Script Generation](./04-ai-scripts.md)
5. [Upload Media](./05-upload-media.md)
6. [Check Video Result](./06-get-result.md)
7. [Avatar Videos with Photo Avatar](./07-avatar-videos-with-photo-avatar.md)
8. [Create Photo Avatar](./08-create-photo-avatar.md)
9. [Create Video from Template](./09-create-video-from-template.md)
10. [Avatar Videos with Audio Source](./10-avatar-videos-with-audio.md)
11. [Video Translation](./11-video-translation.md)
