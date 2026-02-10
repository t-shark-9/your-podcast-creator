# Avatar Videos with Photo Avatar

Create videos using custom photo avatars.

## Overview

Use your own photo avatars to create personalized videos. Photo avatars allow you to use custom images of real people as AI-powered digital presenters.

### Requirements

1. **Photo Avatar Created:** Must have a photo avatar ready (see [Create Photo Avatar](./08-create-photo-avatar.md))
2. **Avatar Status:** Photo avatar status must be `1` (completed)
3. **Avatar Type:** Use `avatar_type: 1` (not 0)

## Quick Start

### Check Photo Avatar Status First

```bash
curl --request GET \
  --url 'https://api.jogg.ai/v2/photo_avatar?page=1&limit=20' \
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
        "avatar_id": "pa_abc123",
        "name": "Custom Avatar 1",
        "status": 1,
        "thumbnail_url": "https://cdn.jogg.ai/avatars/pa_abc123_thumb.jpg",
        "created_at": "2024-01-15T08:00:00Z"
      }
    ]
  }
}
```

> **Important:** Only use avatars with `status: 1`. Status `0` means still processing.

### Create Video with Photo Avatar

```bash
curl --location 'https://api.jogg.ai/v2/avatar' \
  --header 'x-api-key: YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "avatar": {
      "avatar_id": "pa_abc123",
      "avatar_type": 1
    },
    "voice": {
      "type": "script",
      "input": "Hello! I am your custom avatar, created from a single photo. Pretty amazing, right?",
      "voice_id": "en-US-News-N"
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
    "project_id": "proj_xyz789"
  }
}
```

## Key Differences from Public Avatars

| Feature | Public Avatar | Photo Avatar |
|---------|--------------|--------------|
| avatar_type | 0 | 1 |
| Source | JoggAI library | Your uploaded photo |
| Customization | None | Your own likeness |
| Creation | Instant | 2-5 minutes processing |
| Status Check | Not needed | Required before use |

## Complete Example

```bash
curl --location 'https://api.jogg.ai/v2/avatar' \
  --header 'x-api-key: YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "avatar": {
      "avatar_id": "pa_abc123",
      "avatar_type": 1
    },
    "video_background": {
      "type": "image",
      "value": "https://cdn.jogg.ai/assets/office-bg.jpg"
    },
    "voice": {
      "type": "script",
      "input": "Welcome to our company! I am Sarah, and today I will walk you through our latest product features. First, let me show you the dashboard...",
      "voice_id": "en-US-News-N"
    },
    "aspect_ratio": "16:9",
    "screen_style": "waist",
    "caption": true,
    "caption_style": {
      "position": "bottom",
      "font_size": 24,
      "font_color": "#FFFFFF",
      "background_color": "rgba(0,0,0,0.5)"
    },
    "talk_speed": 1.0,
    "script_language": "en"
  }'
```

## Best Practices

### Before Creating Videos

1. **Verify Avatar Status:** Always check `status: 1` before using
2. **Wait for Processing:** Photo avatars take 2-5 minutes to create
3. **Use Webhooks:** Get notified when avatar is ready

### For Best Results

1. **Voice Matching:** Choose a voice that matches the avatar's appearance
2. **Script Tone:** Write scripts that fit the avatar's persona
3. **Background:** Use professional backgrounds
4. **Lighting Consistency:** Original photo lighting affects quality

## Workflow Example

### Complete Flow (JavaScript)

```javascript
async function createVideoWithPhotoAvatar(photoAvatarId, script, apiKey) {
  // Step 1: Verify avatar is ready
  const avatarResponse = await fetch(
    'https://api.jogg.ai/v2/photo_avatar?page=1&limit=100',
    { headers: { 'x-api-key': apiKey } }
  );
  
  const avatars = (await avatarResponse.json()).data.avatars;
  const avatar = avatars.find(a => a.avatar_id === photoAvatarId);
  
  if (!avatar || avatar.status !== 1) {
    throw new Error('Photo avatar not ready. Status: ' + avatar?.status);
  }
  
  // Step 2: Create video
  const videoResponse = await fetch('https://api.jogg.ai/v2/avatar', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      avatar: {
        avatar_id: photoAvatarId,
        avatar_type: 1  // Must be 1 for photo avatars
      },
      voice: {
        type: 'script',
        input: script,
        voice_id: 'en-US-News-N'
      },
      aspect_ratio: '16:9'
    })
  });
  
  return (await videoResponse.json()).data.project_id;
}
```

## Error Handling

| Code | Message | Solution |
|------|---------|----------|
| 6001 | Photo avatar not found | Verify avatar_id |
| 6002 | Photo avatar not ready | Wait for status: 1 |
| 6003 | Wrong avatar_type | Use avatar_type: 1 for photo avatars |
| 6004 | Avatar creation failed | Create a new photo avatar |

## Common Mistakes

### ❌ Wrong: Using avatar_type: 0

```json
{
  "avatar": {
    "avatar_id": "pa_abc123",
    "avatar_type": 0
  }
}
```

### ✅ Correct: Using avatar_type: 1

```json
{
  "avatar": {
    "avatar_id": "pa_abc123",
    "avatar_type": 1
  }
}
```

### ❌ Wrong: Using string "1"

```json
{
  "avatar": {
    "avatar_id": "pa_abc123",
    "avatar_type": "1"
  }
}
```

### ✅ Correct: Using integer 1

```json
{
  "avatar": {
    "avatar_id": "pa_abc123",
    "avatar_type": 1
  }
}
```

## Related Documentation

- [Create Photo Avatar](./08-create-photo-avatar.md)
- [Create Avatar Videos](./02-create-avatar-videos.md)
- [Check Video Result](./06-get-result.md)
