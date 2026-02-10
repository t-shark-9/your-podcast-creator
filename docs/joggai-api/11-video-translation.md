# Video Translation

Translate existing videos into 40+ languages with AI dubbing.

## Overview

Transform videos into multiple languages with AI-powered translation, voice cloning, and subtitle generation. Perfect for global content distribution.

### Key Features

- **40+ Languages:** Wide language support
- **Voice Cloning:** Maintain original voice characteristics
- **Lip-Sync:** AI adjusts mouth movements
- **Subtitles:** Optional translated captions
- **Fast Processing:** 10-20 minutes typical

## Quick Start

### Translate Video

```bash
curl --location 'https://api.jogg.ai/v2/video_translate/' \
  --header 'x-api-key: YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "video_url": "https://example.com/original-video.mp4",
    "target_language": "es",
    "enable_subtitles": true
  }'
```

### Response

```json
{
  "code": 0,
  "msg": "Success",
  "data": {
    "project_id": "proj_translate_123"
  }
}
```

## API Endpoint

**POST** `https://api.jogg.ai/v2/video_translate/`

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| video_url | string | Yes | URL to source video |
| target_language | string | Yes | Target language code |
| enable_subtitles | boolean | No | Add translated subtitles (default: false) |
| subtitle_style | object | No | Subtitle styling options |
| preserve_voice | boolean | No | Clone original voice (default: true) |
| webhook_url | string | No | Notification webhook |

## Video Requirements

### Source Video Specs

| Requirement | Value |
|-------------|-------|
| Duration | 0-3 minutes |
| Format | MP4, MOV, WebM |
| Resolution | 720p - 4K |
| Audio | Clear speech, minimal background |

### Processing Time

| Video Length | Estimated Time |
|--------------|----------------|
| 0-30 seconds | 5-10 minutes |
| 30-60 seconds | 10-15 minutes |
| 1-2 minutes | 15-20 minutes |
| 2-3 minutes | 20-30 minutes |

## Supported Languages

### Major Languages

| Code | Language | Code | Language |
|------|----------|------|----------|
| en | English | es | Spanish |
| fr | French | de | German |
| it | Italian | pt | Portuguese |
| zh | Chinese (Mandarin) | ja | Japanese |
| ko | Korean | ar | Arabic |
| hi | Hindi | ru | Russian |
| nl | Dutch | pl | Polish |
| tr | Turkish | vi | Vietnamese |

### Additional Languages

| Code | Language | Code | Language |
|------|----------|------|----------|
| th | Thai | id | Indonesian |
| ms | Malay | sv | Swedish |
| da | Danish | no | Norwegian |
| fi | Finnish | cs | Czech |
| el | Greek | he | Hebrew |
| hu | Hungarian | ro | Romanian |
| uk | Ukrainian | bg | Bulgarian |

## Complete Example

```bash
curl --location 'https://api.jogg.ai/v2/video_translate/' \
  --header 'x-api-key: YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "video_url": "https://cdn.jogg.ai/assets/user123/product-demo.mp4",
    "target_language": "fr",
    "enable_subtitles": true,
    "subtitle_style": {
      "position": "bottom",
      "font_size": 24,
      "font_color": "#FFFFFF",
      "background_color": "rgba(0,0,0,0.7)",
      "font_family": "Arial"
    },
    "preserve_voice": true,
    "webhook_url": "https://your-domain.com/webhook"
  }'
```

## Subtitle Styling

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| position | string | top, middle, bottom | bottom |
| font_size | integer | Size in pixels | 24 |
| font_color | string | Hex color | #FFFFFF |
| background_color | string | Hex or rgba | transparent |
| font_family | string | Font name | Arial |

## Checking Translation Status

```bash
curl --request GET \
  --url 'https://api.jogg.ai/v2/project/{project_id}' \
  --header 'x-api-key: YOUR_API_KEY'
```

### Status Values

| Status | Description |
|--------|-------------|
| pending | Queued for processing |
| transcribing | Extracting original speech |
| translating | Translating content |
| synthesizing | Generating new audio |
| compositing | Combining video + audio |
| success | Translation complete |
| failed | Error occurred |

### Success Response

```json
{
  "code": 0,
  "msg": "Success",
  "data": {
    "project_id": "proj_translate_123",
    "status": "success",
    "video_url": "https://cdn.jogg.ai/videos/proj_translate_123.mp4",
    "source_language": "en",
    "target_language": "fr",
    "duration": 45.5,
    "created_at": "2024-01-15T10:30:00Z",
    "completed_at": "2024-01-15T10:48:30Z"
  }
}
```

## Batch Translation

Translate one video into multiple languages:

```javascript
const translateToMultipleLanguages = async (videoUrl, languages) => {
  const results = [];
  
  for (const lang of languages) {
    const response = await fetch('https://api.jogg.ai/v2/video_translate/', {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        video_url: videoUrl,
        target_language: lang,
        enable_subtitles: true
      })
    });
    
    const data = await response.json();
    results.push({ language: lang, project_id: data.data.project_id });
  }
  
  return results;
};

// Usage
translateToMultipleLanguages(
  'https://example.com/video.mp4',
  ['es', 'fr', 'de', 'ja', 'zh']
);
```

## Best Practices

### For Best Quality

1. **Source Quality:** Start with high-quality video
2. **Clear Audio:** Minimal background noise
3. **Single Speaker:** Works best with one speaker
4. **Moderate Pace:** Normal speaking speed
5. **Good Lighting:** Clear face visibility

### Content Tips

1. **Universal Content:** Avoid culture-specific references
2. **Clear Speech:** Enunciate words clearly
3. **Simple Vocabulary:** Easier translation
4. **Visual Context:** Visuals should support content
5. **Test First:** Try one language before batch

## Limitations

- Maximum video length: 3 minutes
- Single speaker recommended
- Music/background audio reduced during speech
- Some idioms may not translate perfectly
- Voice cloning works best with clear source audio

## Error Codes

| Code | Message | Solution |
|------|---------|----------|
| 10001 | Video too long | Keep under 3 minutes |
| 10002 | Invalid video URL | Verify URL is accessible |
| 10003 | Unsupported language | Check language code |
| 10004 | Audio extraction failed | Ensure video has audio |
| 10005 | Translation failed | Check source audio quality |

## Webhook Events

Configure webhooks to receive notifications:

- `generated_translate_video_success`
- `generated_translate_video_failed`

See [Webhook Integration](./01-webhook-integration.md) for details.

## Related Documentation

- [Webhook Integration](./01-webhook-integration.md)
- [Upload Media](./05-upload-media.md)
- [Check Video Result](./06-get-result.md)
