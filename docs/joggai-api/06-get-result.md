# Check Video Result & Status

Monitor video generation progress and retrieve completed videos.

## Overview

After submitting a video generation request, you'll receive a `project_id`. Use this to check the status and retrieve your completed video.

## Quick Start

### Check Status

```bash
curl --request GET \
  --url 'https://api.jogg.ai/v2/project/{project_id}' \
  --header 'x-api-key: YOUR_API_KEY'
```

### Response (Success)

```json
{
  "code": 0,
  "msg": "Success",
  "data": {
    "project_id": "proj_abc123",
    "status": "success",
    "video_url": "https://cdn.jogg.ai/videos/proj_abc123.mp4",
    "thumbnail_url": "https://cdn.jogg.ai/thumbnails/proj_abc123.jpg",
    "duration": 32.5,
    "resolution": "1920x1080",
    "created_at": "2024-01-15T10:30:00Z",
    "completed_at": "2024-01-15T10:33:45Z"
  }
}
```

## API Endpoint

### Get Project Status

**GET** `https://api.jogg.ai/v2/project/{project_id}`

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| project_id | string | Yes | The project ID from creation response |

## Status Values

| Status | Description | Next Action |
|--------|-------------|-------------|
| pending | Request queued, waiting to process | Wait and poll again |
| processing | Video is being generated | Wait and poll again |
| success | Video completed successfully | Download video_url |
| failed | Generation failed | Check error message |

## Status Flow

```
pending → processing → success
                   ↘ failed
```

## Polling Strategy

### Recommended Polling Intervals

1. **Initial Wait:** 30 seconds after submission
2. **Polling Interval:** Every 10-15 seconds
3. **Timeout:** Stop after 10 minutes (consider failed)

### Example Polling (JavaScript)

```javascript
async function waitForVideo(projectId, apiKey, maxAttempts = 40) {
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  // Initial wait
  await delay(30000);
  
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(
      `https://api.jogg.ai/v2/project/${projectId}`,
      {
        headers: { 'x-api-key': apiKey }
      }
    );
    
    const data = await response.json();
    const status = data.data.status;
    
    if (status === 'success') {
      console.log('Video ready:', data.data.video_url);
      return data.data;
    }
    
    if (status === 'failed') {
      throw new Error(`Video generation failed: ${data.data.error}`);
    }
    
    console.log(`Status: ${status}, attempt ${i + 1}/${maxAttempts}`);
    await delay(15000);
  }
  
  throw new Error('Timeout waiting for video');
}
```

### Example Polling (Python)

```python
import time
import requests

def wait_for_video(project_id, api_key, max_attempts=40):
    # Initial wait
    time.sleep(30)
    
    for i in range(max_attempts):
        response = requests.get(
            f'https://api.jogg.ai/v2/project/{project_id}',
            headers={'x-api-key': api_key}
        )
        
        data = response.json()['data']
        status = data['status']
        
        if status == 'success':
            print(f"Video ready: {data['video_url']}")
            return data
        
        if status == 'failed':
            raise Exception(f"Video generation failed: {data.get('error')}")
        
        print(f"Status: {status}, attempt {i + 1}/{max_attempts}")
        time.sleep(15)
    
    raise Exception("Timeout waiting for video")
```

## Response Fields

### Success Response

| Field | Type | Description |
|-------|------|-------------|
| project_id | string | Unique project identifier |
| status | string | Current status (success) |
| video_url | string | URL to download the video |
| thumbnail_url | string | URL to video thumbnail |
| duration | float | Video duration in seconds |
| resolution | string | Video resolution (e.g., "1920x1080") |
| created_at | string | ISO 8601 timestamp of creation |
| completed_at | string | ISO 8601 timestamp of completion |

### Failed Response

| Field | Type | Description |
|-------|------|-------------|
| project_id | string | Unique project identifier |
| status | string | Current status (failed) |
| error | string | Error message describing failure |
| error_code | string | Error code for programmatic handling |
| created_at | string | ISO 8601 timestamp of creation |

### Processing Response

| Field | Type | Description |
|-------|------|-------------|
| project_id | string | Unique project identifier |
| status | string | Current status (processing/pending) |
| progress | integer | Progress percentage (0-100) |
| estimated_time | integer | Estimated seconds remaining |
| created_at | string | ISO 8601 timestamp of creation |

## Webhooks (Recommended)

Instead of polling, use webhooks for real-time notifications:

```bash
curl --location 'https://api.jogg.ai/v2/avatar' \
  --header 'x-api-key: YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "avatar": {
      "avatar_id": "sarah_full_01"
    },
    "voice": {
      "type": "script",
      "input": "Hello world!",
      "voice_id": "en-US-News-N"
    },
    "webhook_url": "https://your-domain.com/webhook"
  }'
```

See [Webhook Integration](./01-webhook-integration.md) for full details.

## List All Projects

Get a list of your recent projects:

```bash
curl --request GET \
  --url 'https://api.jogg.ai/v2/projects?page=1&limit=20' \
  --header 'x-api-key: YOUR_API_KEY'
```

### Response

```json
{
  "code": 0,
  "msg": "Success",
  "data": {
    "projects": [
      {
        "project_id": "proj_abc123",
        "status": "success",
        "video_url": "https://cdn.jogg.ai/videos/proj_abc123.mp4",
        "thumbnail_url": "https://cdn.jogg.ai/thumbnails/proj_abc123.jpg",
        "duration": 32.5,
        "created_at": "2024-01-15T10:30:00Z"
      }
    ],
    "total": 156,
    "page": 1,
    "limit": 20
  }
}
```

## Error Handling

| Code | Message | Solution |
|------|---------|----------|
| 5001 | Project not found | Verify project_id is correct |
| 5002 | Project expired | Videos expire after 30 days |
| 5003 | Unauthorized | Check API key permissions |

## Video Retention

- **Completed Videos:** Available for 30 days
- **Failed Projects:** Records kept for 7 days
- **Pending Projects:** Automatically cleaned up after 24 hours

## Best Practices

1. **Use Webhooks:** More efficient than polling
2. **Handle Failures:** Always check for failed status
3. **Download Videos:** Save videos before expiration
4. **Log Project IDs:** Keep records for debugging
5. **Respect Rate Limits:** Don't poll more than once per 10 seconds

## Related Documentation

- [Webhook Integration](./01-webhook-integration.md)
- [Create Avatar Videos](./02-create-avatar-videos.md)
- [Error Codes Reference](./11-error-codes.md)
