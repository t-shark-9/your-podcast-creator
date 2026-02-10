# Create Avatar Videos

Create AI-powered avatar videos with 300+ avatars and 40+ languages.

## Overview

Transform your scripts into professional avatar videos featuring digital humans that speak with natural lip-sync and body language.

### Key Features

- **300+ Avatars:** Diverse selection of professional digital humans
- **40+ Languages:** Global reach with multilingual support
- **Natural Lip-Sync:** AI-powered mouth movements matching speech
- **Multiple Styles:** Various screen compositions and caption options
- **Fast Generation:** Videos typically ready in 2-5 minutes

## Quick Start

### Basic Request

```bash
curl --location 'https://api.jogg.ai/v2/avatar' \
  --header 'x-api-key: YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "avatar": {
      "avatar_id": "sarah_full_standing_01"
    },
    "video_background": {
      "type": "color",
      "value": "#FFFFFF"
    },
    "voice": {
      "type": "script",
      "input": "Welcome to JoggAI! Create amazing avatar videos in minutes.",
      "voice_id": "en-US-Standard-J"
    },
    "aspect_ratio": "16:9"
  }'
```

### Response

```json
{
  "code": 0,
  "msg": "Success",
  "data": {
    "project_id": "proj_abc123"
  }
}
```

## API Endpoint

### Create Avatar Video

**POST** `https://api.jogg.ai/v2/avatar`

### Required Headers

| Header | Value | Description |
|--------|-------|-------------|
| x-api-key | YOUR_API_KEY | Your JoggAI API key |
| Content-Type | application/json | Request content type |

## Request Parameters

### avatar (required)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| avatar_id | string | Yes | The ID of the avatar to use |
| avatar_type | integer | Yes | `0` = public avatar, `1` = photo avatar (custom) |

### voice (required)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| type | string | Yes | `"script"` for text-to-speech, `"audio"` for custom audio |
| input | string | Conditional | Text script (required when type="script") |
| voice_id | string | Conditional | Voice ID (required when type="script") |
| audio_url | string | Conditional | Audio file URL (required when type="audio") |

### video_background (optional)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| type | string | Yes | `"color"`, `"image"`, or `"video"` |
| value | string | Yes | Hex color, image URL, or video URL |

### Other Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| aspect_ratio | string | "16:9" | `"16:9"`, `"9:16"`, or `"1:1"` |
| screen_style | string | varies | Avatar composition style |
| caption | boolean | false | Enable/disable captions |
| caption_style | object | null | Custom caption styling |
| audio_background | object | null | Background music configuration |
| webhook_url | string | null | Custom webhook for this request |
| talk_speed | float | 1.0 | Speech speed (0.5-2.0) |
| script_language | string | "en" | Language code for the script |

## Screen Styles

Control how the avatar appears in the video:

| Style | Description |
|-------|-------------|
| hd | Full-body avatar (default for full-body avatars) |
| waist | Waist-up framing |
| circle | Avatar in circular frame |
| closeup | Close-up face shot |

## Example: Complete Request

```bash
curl --location 'https://api.jogg.ai/v2/avatar' \
  --header 'x-api-key: YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "avatar": {
      "avatar_id": "anna_full_01",
      "avatar_type": 0
    },
    "video_background": {
      "type": "image",
      "value": "https://example.com/background.jpg"
    },
    "voice": {
      "type": "script",
      "input": "Hello! In this video, I will explain the key features of our product. First, let me introduce myself. I am Anna, your virtual assistant.",
      "voice_id": "en-US-News-N"
    },
    "aspect_ratio": "16:9",
    "screen_style": "waist",
    "caption": true,
    "caption_style": {
      "position": "bottom",
      "font_size": 24,
      "font_color": "#FFFFFF",
      "background_color": "#000000"
    },
    "talk_speed": 1.0,
    "script_language": "en"
  }'
```

## Getting Available Avatars

### List Public Avatars

```bash
curl --request GET \
  --url 'https://api.jogg.ai/v2/avatars?page=1&limit=20' \
  --header 'x-api-key: YOUR_API_KEY'
```

### Response

```json
{
  "code": 0,
  "msg": "Success",
  "data": {
    "avatars": [
      {
        "avatar_id": "anna_full_01",
        "name": "Anna",
        "type": "full_body",
        "preview_url": "https://cdn.jogg.ai/avatars/anna_preview.mp4",
        "thumbnail_url": "https://cdn.jogg.ai/avatars/anna_thumb.jpg"
      }
    ],
    "total": 300,
    "page": 1,
    "limit": 20
  }
}
```

## Getting Available Voices

### List Voices

```bash
curl --request GET \
  --url 'https://api.jogg.ai/v2/voices?language=en' \
  --header 'x-api-key: YOUR_API_KEY'
```

### Response

```json
{
  "code": 0,
  "msg": "Success",
  "data": {
    "voices": [
      {
        "voice_id": "en-US-News-N",
        "name": "US News Female",
        "language": "en-US",
        "gender": "female",
        "preview_url": "https://cdn.jogg.ai/voices/en-US-News-N.mp3"
      }
    ]
  }
}
```

## Checking Video Status

After submitting, poll for status:

```bash
curl --request GET \
  --url 'https://api.jogg.ai/v2/project/{project_id}' \
  --header 'x-api-key: YOUR_API_KEY'
```

### Status Values

| Status | Description |
|--------|-------------|
| pending | Request queued |
| processing | Video being generated |
| success | Video complete (check `video_url`) |
| failed | Generation failed (check `error`) |

## Error Codes

| Code | Message | Solution |
|------|---------|----------|
| 1001 | Invalid avatar_id | Check avatar exists and is accessible |
| 1002 | Invalid voice_id | Verify voice ID from /v2/voices |
| 1003 | Script too long | Maximum 5000 characters |
| 1004 | Invalid aspect_ratio | Use "16:9", "9:16", or "1:1" |
| 1005 | Background image/video invalid | Verify URL is accessible |

## Best Practices

1. **Script Length:** Keep scripts under 300 words for optimal results
2. **Background:** Use high-resolution images (1920x1080 for 16:9)
3. **Voice Selection:** Match voice language to script language
4. **Polling:** Use webhooks instead of polling when possible
5. **Rate Limits:** Respect API rate limits (varies by plan)

## Related Documentation

- [Avatar Videos with Photo Avatar](./07-avatar-videos-with-photo-avatar.md)
- [Avatar Videos with Audio Source](./10-avatar-videos-with-audio.md)
- [Check Video Result](./06-get-result.md)
