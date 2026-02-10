# Upload Media

Upload images, videos, and audio files to use in your projects.

## Overview

Upload media files to JoggAI to use as backgrounds, product images, or audio sources in your videos.

### Supported File Types

| Type | Formats | Max Size |
|------|---------|----------|
| Images | JPG, PNG, WebP | 10 MB |
| Videos | MP4, MOV, WebM | 100 MB |
| Audio | MP3, WAV, M4A | 50 MB |

## Upload Flow

The upload process uses two steps:
1. Get a signed upload URL from JoggAI
2. Upload your file directly to the signed URL

### Step 1: Get Signed URL

```bash
curl --location 'https://api.jogg.ai/v2/upload/asset' \
  --header 'x-api-key: YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "file_name": "product-image.jpg",
    "file_type": "image/jpeg"
  }'
```

### Response

```json
{
  "code": 0,
  "msg": "Success",
  "data": {
    "sign_url": "https://storage.jogg.ai/upload?token=abc123...",
    "asset_url": "https://cdn.jogg.ai/assets/user123/product-image.jpg"
  }
}
```

### Step 2: Upload File

```bash
curl --location --request PUT 'https://storage.jogg.ai/upload?token=abc123...' \
  --header 'Content-Type: image/jpeg' \
  --data-binary '@/path/to/product-image.jpg'
```

## API Endpoint

### Get Upload URL

**POST** `https://api.jogg.ai/v2/upload/asset`

### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| file_name | string | Yes | Original file name with extension |
| file_type | string | Yes | MIME type of the file |

### Supported MIME Types

| Category | MIME Types |
|----------|------------|
| Images | image/jpeg, image/png, image/webp |
| Videos | video/mp4, video/quicktime, video/webm |
| Audio | audio/mpeg, audio/wav, audio/x-m4a |

## Complete Upload Example (Node.js)

```javascript
const fs = require('fs');
const axios = require('axios');

async function uploadFile(filePath, fileName, fileType) {
  // Step 1: Get signed URL
  const signResponse = await axios.post(
    'https://api.jogg.ai/v2/upload/asset',
    {
      file_name: fileName,
      file_type: fileType
    },
    {
      headers: {
        'x-api-key': 'YOUR_API_KEY',
        'Content-Type': 'application/json'
      }
    }
  );

  const { sign_url, asset_url } = signResponse.data.data;

  // Step 2: Upload file
  const fileBuffer = fs.readFileSync(filePath);
  await axios.put(sign_url, fileBuffer, {
    headers: {
      'Content-Type': fileType
    }
  });

  console.log('File uploaded! Asset URL:', asset_url);
  return asset_url;
}

// Usage
uploadFile('./product.jpg', 'product.jpg', 'image/jpeg');
```

## Complete Upload Example (Python)

```python
import requests

def upload_file(file_path, file_name, file_type, api_key):
    # Step 1: Get signed URL
    sign_response = requests.post(
        'https://api.jogg.ai/v2/upload/asset',
        headers={
            'x-api-key': api_key,
            'Content-Type': 'application/json'
        },
        json={
            'file_name': file_name,
            'file_type': file_type
        }
    )
    
    data = sign_response.json()['data']
    sign_url = data['sign_url']
    asset_url = data['asset_url']
    
    # Step 2: Upload file
    with open(file_path, 'rb') as f:
        requests.put(
            sign_url,
            data=f,
            headers={'Content-Type': file_type}
        )
    
    print(f'File uploaded! Asset URL: {asset_url}')
    return asset_url

# Usage
upload_file('./product.jpg', 'product.jpg', 'image/jpeg', 'YOUR_API_KEY')
```

## Using Uploaded Assets

### As Video Background

```bash
curl --location 'https://api.jogg.ai/v2/avatar' \
  --header 'x-api-key: YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "avatar": {
      "avatar_id": "sarah_full_01"
    },
    "video_background": {
      "type": "image",
      "value": "https://cdn.jogg.ai/assets/user123/product-image.jpg"
    },
    "voice": {
      "type": "script",
      "input": "Check out this amazing product!",
      "voice_id": "en-US-News-N"
    }
  }'
```

### As Audio Source

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
      "audio_url": "https://cdn.jogg.ai/assets/user123/narration.mp3"
    }
  }'
```

### For Photo Avatar Creation

```bash
curl --location 'https://api.jogg.ai/v2/photo_avatar/photo/generate' \
  --header 'x-api-key: YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "photo_url": "https://cdn.jogg.ai/assets/user123/portrait.jpg",
    "name": "Custom Avatar"
  }'
```

## Best Practices

### Image Requirements

- **Resolution:** Minimum 1280x720 for backgrounds
- **Aspect Ratio:** Match your video aspect ratio (16:9, 9:16, 1:1)
- **Format:** JPG for photos, PNG for graphics with transparency

### Video Requirements

- **Resolution:** 1080p recommended
- **Frame Rate:** 24-30 fps
- **Codec:** H.264 for best compatibility
- **Duration:** Keep under 60 seconds for backgrounds

### Audio Requirements

- **Sample Rate:** 44.1kHz or 48kHz
- **Bit Rate:** 128kbps minimum
- **Channels:** Mono or Stereo
- **Quality:** Clear, noise-free recordings

## Error Codes

| Code | Message | Solution |
|------|---------|----------|
| 4001 | Invalid file type | Use supported MIME type |
| 4002 | File too large | Reduce file size |
| 4003 | Upload failed | Retry upload |
| 4004 | URL expired | Request new signed URL |

## URL Expiration

- Signed upload URLs expire after 15 minutes
- Asset URLs are permanent once uploaded
- Files are stored for the lifetime of your account

## Related Documentation

- [Create Avatar Videos](./02-create-avatar-videos.md)
- [Create Photo Avatar](./08-create-photo-avatar.md)
- [Avatar Videos with Audio](./10-avatar-videos-with-audio.md)
