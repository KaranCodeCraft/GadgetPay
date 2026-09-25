# GadgetPe Backend (Node + Express)

Partner-first backend implementation with pincode-based tenant scope.

## Highlights

- Express REST API under /api/v1
- Partner OTP login and JWT access/refresh flow
- SQLite-backed persistence for auth, serviceability, and KYC workflows
- Pincode serviceability resolution using India Pincode API dataset
- Admin controller to turn service area pincode ON/OFF
- Partner KYC metadata contract with storage strategy placeholder and admin verification state

## Run

1. Copy .env.example to .env and set secrets.
2. Install dependencies:
   npm install
3. Start server:
   npm run dev

Default port is 4000.

SQLite DB file defaults to backend/data/gadgetpe.sqlite.

### OTP provider

Set `OTP_PROVIDER=FONADA` in `backend/.env` to send OTP messages through Fonada. Configure `FONADA_USERNAME`, `FONADA_PASSWORD`, `FONADA_FROM`, and these DLT content IDs:

- `FONADA_DLT_CONTENT_ID_FINAL_OFFERED_PRICE`
- `FONADA_DLT_CONTENT_ID_LOGIN_ACCOUNT`
- `FONADA_DLT_CONTENT_ID_AMOUNT_FOR_PHONE`
- `FONADA_DLT_CONTENT_ID_CREATE_PARTNER`
- `FONADA_DLT_CONTENT_ID_VERIFICATION`

`FONADA_API_URL` defaults to the Fonada send endpoint and `FONADA_UNICODE` defaults to `false`. OTP message bodies are maintained in `src/domains/auth/otp-templates.js`.

## Domain layout

- src/domains/auth: OTP and JWT
- src/domains/partner: partner profile/session context
- src/domains/partner: partner profile/session context + KYC metadata submission
- src/domains/serviceability: provider integration and tenant scope resolution
- src/domains/admin-serviceability: admin service area controls
- src/domains/admin-kyc: admin KYC review and verification actions

## Notes

- India Pincode API attribution required:
  https://github.com/aniket-thapa/india-pincode-api
- The referenced dataset is licensed under CC BY-NC 4.0.
