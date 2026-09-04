# GadgetPe Frontend Integration Map (Phase 1)

## Screen: /partner

- Endpoint: POST /api/v1/auth/partner/otp/send
- UI payload:
```json
{
  "phone": "9876543210"
}
```
- API response payload (shape):
```json
{
  "success": true,
  "data": {
    "phone": "9876543210",
    "otpTtlSeconds": 300,
    "resendAfterSeconds": 30,
    "devOtp": "6767"
  }
}
```

- Endpoint: POST /api/v1/auth/partner/otp/verify
- UI payload:
```json
{
  "phone": "9876543210",
  "otp": "6767",
  "name": "Partner Name"
}
```
- API response payload includes partner object and JWT tokens.

## Screen: /partner-page

- Endpoint: POST /api/v1/serviceability/scope/resolve
- Auth: Bearer access token with role=partner
- UI payload:
```json
{
  "pincode": "560001"
}
```

## Screen: /partner (signup KYC metadata)

- Endpoint: POST /api/v1/partner/kyc/metadata
- Auth: Bearer access token with role=partner
- UI payload:
```json
{
  "identityProof": "Aadhar",
  "fileName": "aadhar-front.jpg",
  "mimeType": "image/jpeg",
  "sizeBytes": 241993
}
```
- API response includes:
1. `kyc` submission row persisted in SQLite
2. `storage` placeholder strategy with provider and storageKey

- Endpoint: GET /api/v1/partner/kyc/status
- Returns latest KYC submission with verification state.
- API response payload:
```json
{
  "success": true,
  "data": {
    "partnerId": "partner-9876543210",
    "scopeType": "PINCODE",
    "selectedPincode": "560001",
    "serviceabilityStatus": "ACTIVE",
    "location": {
      "state": "KARNATAKA",
      "district": "BENGALURU",
      "officeCount": 12
    },
    "offices": []
  }
}
```

## Screen: /admin (Location Management section)

- Endpoint: GET /api/v1/admin/serviceability/pincodes
- Endpoint: POST /api/v1/admin/serviceability/pincodes
- Endpoint: PATCH /api/v1/admin/serviceability/pincodes/:pincode/toggle
- Auth: Bearer access token with role=admin

### Toggle payload
```json
{
  "enabled": true,
  "reason": "Operations approved for this zone"
}
```

## Screen: /admin (KYC Verification section)

- Endpoint: GET /api/v1/admin/kyc/submissions?status=PENDING_REVIEW
- Endpoint: PATCH /api/v1/admin/kyc/submissions/:kycId/verification

### Verify payload
```json
{
  "action": "APPROVE",
  "notes": "Document details verified"
}
```

## Screen: /Lead-bucket and /Lead-bucket/Unlock-payment

- Endpoint: GET /api/v1/partner/lead-bucket?pincodes=560001,110019
- Endpoint: POST /api/v1/partner/leads/:leadId/unlock-intent
- Endpoint: GET /api/v1/partner/lead-unlock-intents/:intentId
- Endpoint: POST /api/v1/partner/lead-unlock-intents/:intentId/screenshot-sent
- Endpoint: PATCH /api/v1/partner/lead-unlock-intents/:intentId/verify
- Auth: partner endpoints require role=partner; verify endpoint requires role=admin.

Unlock state machine:
1. Partner clicks Unlock Lead. Backend creates `PENDING_PAYMENT` with a 5-minute `expiresAt` reservation for that lead.
2. While `PENDING_PAYMENT` or `SCREENSHOT_SENT` exists for partner A, partner B receives `409 CONFLICT` with: `This lead is temporarily reserved by another partner. Please try again after a few minutes.`
3. Partner clicks Confirm Payment before `expiresAt`. Backend moves the intent to `SCREENSHOT_SENT`; the reservation remains while admin reviews proof.
4. Admin approves. Backend marks the intent `APPROVED`, assigns `partner_leads.partner_id` to the intent partner, and moves an `AVAILABLE` lead to `CLAIMED`.
5. Admin rejects. Backend marks the intent `REJECTED`; any eligible pincode partner, including the rejected partner, can unlock again.
6. If the partner does not confirm payment within 5 minutes, backend expires stale `PENDING_PAYMENT` intents as `EXPIRED`; the lead can be unlocked again.

Operational repair check:
```sh
npm --prefix backend run repair:lead-ownership
```

Apply only after reviewing dry-run output:
```sh
npm --prefix backend run repair:lead-ownership -- --apply
```

## Shared response envelope

Success:
```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Error:
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Validation failed",
    "details": {},
    "requestId": "..."
  }
}
```
