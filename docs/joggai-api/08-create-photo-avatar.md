# Create Photo Avatar

Create custom avatars from portrait photos.

## Overview

Transform a single portrait photo into an AI-powered digital avatar that can speak any script with natural lip-sync and expressions.

### Key Features

- **Single Photo:** Create avatar from one high-quality portrait
- **Natural Animation:** AI-powered lip-sync and expressions
- **Motion Enhancement:** Optional body motion for full-body avatars
- **Persistent:** Use your avatar across unlimited videos

## Quick Start

### Create Photo Avatar

```bash
curl --location 'https://api.jogg.ai/v2/photo_avatar/photo/generate' \
  --header 'x-api-key: YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "photo_url": "https://cdn.jogg.ai/assets/portrait.jpg",
    "name": "My Custom Avatar"
  }'
```

### Response

```json
{
  "code": 0,
  "msg": "Success",
  "data": {
    "avatar_id": "pa_abc123",
    "status": 0
  }
}
```

> **Note:** Status `0` = processing, `1` = completed. Wait for status `1` before using.

## API Endpoints

### Create Photo Avatar

**POST** `https://api.jogg.ai/v2/photo_avatar/photo/generate`

### Add Motion (Optional)

**POST** `https://api.jogg.ai/v2/photo_avatar/add_motion`

### List Photo Avatars

**GET** `https://api.jogg.ai/v2/photo_avatar`

## Request Parameters

### Create Photo Avatar

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| photo_url | string | Yes | URL to portrait photo |
| name | string | No | Display name for avatar |
| description | string | No | Description/notes |

### Add Motion

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| avatar_id | string | Yes | Photo avatar ID |
| motion_type | string | No | Type of motion to add |

## Photo Requirements

### Technical Specifications

| Requirement | Value |
|-------------|-------|
| Minimum Resolution | 512x512 pixels |
| Recommended Resolution | 1024x1024 or higher |
| File Format | JPG, PNG |
| File Size | Under 10 MB |
| Aspect Ratio | Square or portrait preferred |

### Quality Guidelines

✅ **Do:**
- Use high-quality, well-lit photos
- Face should be clearly visible
- Neutral or slight smile expression
- Front-facing or slight angle
- Plain or simple backgrounds
- Professional headshot style

❌ **Don't:**
- Blurry or low-resolution images
- Face obscured by accessories
- Extreme expressions
- Heavy filters or editing
- Multiple people in frame
- Complex busy backgrounds

## Complete Workflow

### Step 1: Upload Photo

First, upload your portrait photo:

```bash
# Get upload URL
curl --location 'https://api.jogg.ai/v2/upload/asset' \
  --header 'x-api-key: YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "file_name": "portrait.jpg",
    "file_type": "image/jpeg"
  }'

# Upload to signed URL (response.data.sign_url)
curl --request PUT \
  --url 'SIGNED_URL' \
  --header 'Content-Type: image/jpeg' \
  --data-binary '@portrait.jpg'
```

### Step 2: Create Avatar

```bash
curl --location 'https://api.jogg.ai/v2/photo_avatar/photo/generate' \
  --header 'x-api-key: YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "photo_url": "https://cdn.jogg.ai/assets/user123/portrait.jpg",
    "name": "Sarah Avatar"
  }'
```

### Step 3: Check Status

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
        "name": "Sarah Avatar",
        "status": 1,
        "thumbnail_url": "https://cdn.jogg.ai/avatars/pa_abc123_thumb.jpg",
        "has_motion": false,
        "created_at": "2024-01-15T08:00:00Z"
      }
    ]
  }
}
```

### Step 4: Use in Video

Once `status: 1`, create a video:

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
      "input": "Hello! This is my custom avatar speaking.",
      "voice_id": "en-US-News-N"
    }
  }'
```

## Adding Motion

Enhance your photo avatar with body motion:

```bash
curl --location 'https://api.jogg.ai/v2/photo_avatar/add_motion' \
  --header 'x-api-key: YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "avatar_id": "pa_abc123",
    "motion_type": "natural"
  }'
```

### Motion Types

| Type | Description |
|------|-------------|
| natural | Subtle natural movements |
| presenter | Professional presenter gestures |
| energetic | More animated movements |

### Motion Response

```json
{
  "code": 0,
  "msg": "Success",
  "data": {
    "avatar_id": "pa_abc123",
    "motion_status": 0
  }
}
```

> Motion processing takes 5-10 minutes. Check status with list endpoint.

## Status Values

| Status | Meaning | Next Action |
|--------|---------|-------------|
| 0 | Processing | Wait and check again |
| 1 | Completed | Ready to use |
| -1 | Failed | Check error, retry |

## Polling for Status

```javascript
async function waitForAvatar(avatarId, apiKey, maxAttempts = 30) {
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(
      'https://api.jogg.ai/v2/photo_avatar?page=1&limit=100',
      { headers: { 'x-api-key': apiKey } }
    );
    
    const avatars = (await response.json()).data.avatars;
    const avatar = avatars.find(a => a.avatar_id === avatarId);
    
    if (avatar?.status === 1) {
      console.log('Avatar ready!', avatar);
      return avatar;
    }
    
    if (avatar?.status === -1) {
      throw new Error('Avatar creation failed');
    }
    
    console.log(`Status: ${avatar?.status}, attempt ${i + 1}/${maxAttempts}`);
    await delay(10000); // 10 seconds
  }
  
  throw new Error('Timeout waiting for avatar');
}
```

## Delete Photo Avatar

```bash
curl --request DELETE \
  --url 'https://api.jogg.ai/v2/photo_avatar/{avatar_id}' \
  --header 'x-api-key: YOUR_API_KEY'
```

## Error Codes

| Code | Message | Solution |
|------|---------|----------|
| 7001 | Invalid photo URL | Verify URL is accessible |
| 7002 | Photo too small | Use minimum 512x512 |
| 7003 | Face not detected | Use clear front-facing photo |
| 7004 | Multiple faces | Use single-person photo |
| 7005 | Avatar limit reached | Delete unused avatars |

## Limits

- **Maximum Avatars:** Varies by plan (typically 10-50)
- **Processing Time:** 2-5 minutes per avatar
- **Motion Processing:** 5-10 minutes additional

## Related Documentation

- [Avatar Videos with Photo Avatar](./07-avatar-videos-with-photo-avatar.md)
- [Upload Media](./05-upload-media.md)
- [Create Avatar Videos](./02-create-avatar-videos.md)
