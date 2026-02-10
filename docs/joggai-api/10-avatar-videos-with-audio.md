# Avatar Videos with Audio Source

Create avatar videos using your own audio files instead of text-to-speech.

## Overview

Use pre-recorded audio files to drive avatar lip-sync and animations. Perfect for existing voiceovers, podcasts, or when you need specific voice talent.

### Key Features

- **Custom Audio:** Use any audio file
- **Precise Lip-Sync:** AI matches mouth movements to audio
- **Any Voice:** Use voice actors, existing recordings, etc.
- **Full Control:** Exact audio timing and delivery

## Quick Start

### Basic Request

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
      "type": "audio",
      "audio_url": "https://cdn.example.com/voiceover.mp3"
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

**POST** `https://api.jogg.ai/v2/avatar`

## Voice Parameters for Audio

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| type | string | Yes | Must be `"audio"` |
| audio_url | string | Yes | URL to audio file |

## Audio Requirements

### Supported Formats

| Format | Extension | Recommended |
|--------|-----------|-------------|
| MP3 | .mp3 | ✅ Yes |
| WAV | .wav | ✅ Yes |
| M4A | .m4a | Yes |
| AAC | .aac | Yes |
| OGG | .ogg | Limited |

### Technical Specifications

| Specification | Requirement | Recommendation |
|---------------|-------------|----------------|
| Sample Rate | 16kHz - 48kHz | 44.1kHz or 48kHz |
| Bit Rate | 64kbps - 320kbps | 128kbps+ |
| Channels | Mono or Stereo | Mono preferred |
| Duration | Up to 10 minutes | Under 3 minutes |
| File Size | Under 50 MB | Under 20 MB |

### Quality Guidelines

✅ **Do:**
- Use clear, high-quality recordings
- Minimize background noise
- Use consistent audio levels
- Record in quiet environment
- Use professional equipment when possible

❌ **Don't:**
- Use heavily compressed audio
- Include long silences
- Use recordings with echo
- Mix multiple speakers without pauses
- Use music with vocals

## Complete Example

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
      "value": "https://cdn.jogg.ai/assets/studio-bg.jpg"
    },
    "voice": {
      "type": "audio",
      "audio_url": "https://cdn.jogg.ai/assets/user123/presentation.mp3"
    },
    "aspect_ratio": "16:9",
    "screen_style": "waist",
    "caption": true,
    "caption_style": {
      "position": "bottom",
      "font_size": 24,
      "font_color": "#FFFFFF"
    }
  }'
```

## Uploading Audio Files

### Step 1: Get Upload URL

```bash
curl --location 'https://api.jogg.ai/v2/upload/asset' \
  --header 'x-api-key: YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "file_name": "voiceover.mp3",
    "file_type": "audio/mpeg"
  }'
```

### Step 2: Upload File

```bash
curl --request PUT \
  --url 'SIGNED_UPLOAD_URL' \
  --header 'Content-Type: audio/mpeg' \
  --data-binary '@voiceover.mp3'
```

### Step 3: Use in Video

```bash
curl --location 'https://api.jogg.ai/v2/avatar' \
  --header 'x-api-key: YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "avatar": {
      "avatar_id": "sarah_full_01"
    },
    "voice": {
      "type": "audio",
      "audio_url": "https://cdn.jogg.ai/assets/user123/voiceover.mp3"
    }
  }'
```

## Use Cases

### 1. Professional Voice Actor

Record with professional talent, then sync to avatar:

```javascript
const createWithVoiceActor = async (audioUrl) => {
  return fetch('https://api.jogg.ai/v2/avatar', {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      avatar: { avatar_id: 'business_male_01', avatar_type: 0 },
      voice: { type: 'audio', audio_url: audioUrl },
      aspect_ratio: '16:9',
      screen_style: 'waist'
    })
  });
};
```

### 2. Podcast Clips

Convert podcast audio to avatar videos:

```javascript
const podcastToVideo = async (podcastAudioUrl, speakerAvatar) => {
  return fetch('https://api.jogg.ai/v2/avatar', {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      avatar: { avatar_id: speakerAvatar, avatar_type: 0 },
      voice: { type: 'audio', audio_url: podcastAudioUrl },
      aspect_ratio: '9:16',  // Vertical for social
      caption: true
    })
  });
};
```

### 3. Multilingual Videos

Use native speaker recordings for authentic localization:

```javascript
const localizedVideo = async (languageAudioUrl, localAvatar) => {
  return fetch('https://api.jogg.ai/v2/avatar', {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      avatar: { avatar_id: localAvatar, avatar_type: 0 },
      voice: { type: 'audio', audio_url: languageAudioUrl },
      aspect_ratio: '16:9',
      caption: true  // Captions in original language
    })
  });
};
```

## Comparing Audio vs Script

| Feature | Audio Source | Script (TTS) |
|---------|--------------|--------------|
| Voice Control | Full | Limited to TTS voices |
| Setup Time | Requires recording | Instant |
| Cost | Recording + API | API only |
| Consistency | Varies | Always consistent |
| Languages | Any | 40+ supported |
| Customization | Maximum | Limited |

## Error Codes

| Code | Message | Solution |
|------|---------|----------|
| 9001 | Invalid audio URL | Verify URL is accessible |
| 9002 | Unsupported format | Use MP3, WAV, or M4A |
| 9003 | Audio too long | Keep under 10 minutes |
| 9004 | Audio processing failed | Check audio quality |
| 9005 | Audio not found | Verify URL exists |

## Best Practices

1. **Audio Quality:** Higher quality = better lip-sync
2. **Clear Speech:** Enunciate clearly for best results
3. **Consistent Levels:** Avoid volume spikes
4. **Test First:** Try short clips before full videos
5. **Match Avatar:** Choose avatar that fits the voice

## Related Documentation

- [Upload Media](./05-upload-media.md)
- [Create Avatar Videos](./02-create-avatar-videos.md)
- [Check Video Result](./06-get-result.md)
