# Webhook Integration Guide

Receive real-time notifications when your videos are ready.

## Overview

JoggAI sends HTTP POST requests to your webhook endpoint when events occur (like video completion). This eliminates the need for polling and provides instant notifications.

**Webhook Limit:** Each user can create up to 20 webhook endpoints.

### Benefits
- **Real-Time Updates:** Get notified instantly when videos complete
- **Reduced API Calls:** No need to poll for status
- **Better UX:** Respond to events immediately
- **Scalable:** Handle high volumes efficiently

## Quick Start

### Step 1: Add Webhook Endpoint

```bash
curl --location --request POST 'https://api.jogg.ai/v2/endpoint' \
  --header 'x-api-key: YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "url": "https://example.com/webhook",
    "events": ["generated_avatar_video_success", "generated_avatar_video_failed"],
    "status": "enabled"
  }'
```

Response:
```json
{
  "code": 0,
  "msg": "Success",
  "data": {
    "endpoint_id": "wh_123456789",
    "url": "https://example.com/webhook",
    "secret": "whsec_abc123xyz",
    "status": "enabled",
    "events": ["generated_avatar_video_success", "generated_avatar_video_failed"],
    "username": "johndoe",
    "created_at": 1732806631
  }
}
```

> **Important:** Save the `secret` - you'll use it to verify webhook authenticity!

### Step 2: Verify Webhook Signature

Always verify that webhooks come from JoggAI using HMAC SHA-256.

## Webhook Events

### Available Events

| Event | Description | When Triggered |
|-------|-------------|----------------|
| generated_video_success | Video generation succeeded | Video is ready to download |
| generated_video_failed | Video generation failed | An error occurred during generation |
| generated_avatar_video_success | Avatar video generation succeeded | Video is ready to download |
| generated_avatar_video_failed | Avatar video generation failed | An error occurred during generation |
| generated_product_video_success | Product video generation succeeded | Video is ready to download |
| generated_product_video_failed | Product video generation failed | An error occurred during generation |
| generated_template_video_success | Template video generation succeeded | Video is ready to download |
| generated_template_video_failed | Template video generation failed | An error occurred during generation |
| generated_translate_video_success | Video translation succeeded | Translated video is ready |
| generated_translate_video_failed | Video translation failed | An error occurred during translation |
| create_avatar_success | Avatar creation succeeded | Avatar is ready to use |
| create_avatar_failed | Avatar creation failed | An error occurred during avatar creation |
| generated_photo_avatar_success | Photo avatar creation succeeded | Avatar is ready to use |
| generated_photo_avatar_failed | Photo avatar creation failed | An error occurred during avatar creation |
| generated_script_success | AI script generation succeeded | Scripts are ready to use |
| generated_script_failed | AI script generation failed | An error occurred during script generation |
| generated_image_success | Image generation succeeded | Generated images are ready |
| generated_image_failed | Image generation failed | An error occurred during image generation |
| generated_motion_success | Motion generation succeeded | Generated motion video is ready |
| generated_motion_failed | Motion generation failed | An error occurred during motion generation |

## Managing Webhooks

### List All Webhooks
```bash
curl --request GET \
  --url 'https://api.jogg.ai/v2/endpoints' \
  --header 'x-api-key: YOUR_API_KEY'
```

### Update Webhook
```bash
curl --request PUT \
  --url 'https://api.jogg.ai/v2/endpoint/{endpoint_id}' \
  --header 'x-api-key: YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "url": "https://new-url.com/webhook",
    "events": ["generated_avatar_video_success"],
    "status": "enabled"
  }'
```

### Delete Webhook
```bash
curl --request DELETE \
  --url 'https://api.jogg.ai/v2/endpoint/{endpoint_id}' \
  --header 'x-api-key: YOUR_API_KEY'
```

## Security Requirements

### Request Headers

```http
POST /webhook HTTP/1.1
Host: your-domain.com
Content-Type: application/json
X-Webhook-Event: generated_avatar_video_success
X-Webhook-Signature: 7256c87be255861cbbe92f4a04a4500176b045a287f258e32e5b6c6b96d7f290
User-Agent: JoggAI-Webhook/2.0
```

### Security Checklist

- ✅ All webhook URLs must use HTTPS
- ✅ Verify `X-Webhook-Signature` header on every request
- ✅ Use HMAC SHA-256 with your secret key
- ✅ Signature is computed on raw request body
- ✅ Use constant-time comparison to prevent timing attacks
- ✅ Keep webhook secret secure (environment variables)
- ✅ Rotate secrets periodically

> **Warning:** Always verify signatures before processing webhooks. Reject requests with invalid signatures and log suspicious attempts.

## Related Documentation

- [Create Avatar Videos](./02-create-avatar-videos.md)
- [Check Video Result & Status](./06-get-result.md)
