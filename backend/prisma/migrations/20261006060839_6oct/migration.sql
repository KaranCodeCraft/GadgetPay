/*
  Warnings:

  - The `status` column on the `device_price_upload_history` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `deliveryStatus` column on the `lead_event_outbox` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `media_assets` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `screenshotStatus` column on the `partner_lead_payment_intents` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `screenshotStatus` column on the `partner_lead_unlocks` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `partners` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `status` on the `partner_coin_recharge_requests` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `verificationStatus` on the `partner_kyc_submissions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `status` on the `partner_lead_payment_intents` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `status` on the `partner_lead_unlocks` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `status` on the `partner_leads` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `status` on the `serviceability_pincodes` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `status` on the `serviceability_upload_history` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `status` on the `user_sell_flows` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "PartnerStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "UserSellFlowStatus" AS ENUM ('DRAFT', 'QUESTIONNAIRE_COMPLETED', 'QUOTE_READY', 'PICKUP_SCHEDULED', 'CLAIMED', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MediaAssetStatus" AS ENUM ('ACTIVE', 'DELETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PartnerLeadStatus" AS ENUM ('AVAILABLE', 'CLAIMED', 'ACCEPTED', 'IN_PROGRESS', 'PENDING_PAYMENT', 'COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED', 'UNASSIGNED');

-- CreateEnum
CREATE TYPE "ServiceabilityStatus" AS ENUM ('SERVICEABLE', 'UNSERVICEABLE');

-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('ACTIVE', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "KycVerificationStatus" AS ENUM ('PENDING_REVIEW', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LeadUnlockStatus" AS ENUM ('PENDING', 'PENDING_PAYMENT', 'SCREENSHOT_SENT', 'APPROVED', 'REJECTED', 'EXPIRED', 'CLOSED');

-- CreateEnum
CREATE TYPE "PaymentIntentStatus" AS ENUM ('PENDING', 'PENDING_PAYMENT', 'SCREENSHOT_SENT', 'APPROVED', 'REJECTED', 'EXPIRED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ScreenshotStatus" AS ENUM ('NOT_SENT', 'SENT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RechargeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EventDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "device_price_upload_history" DROP COLUMN "status",
ADD COLUMN     "status" "UploadStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "lead_event_outbox" DROP COLUMN "deliveryStatus",
ADD COLUMN     "deliveryStatus" "EventDeliveryStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "media_assets" DROP COLUMN "status",
ADD COLUMN     "status" "MediaAssetStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "otp_codes" ALTER COLUMN "sentAt" SET DATA TYPE BIGINT,
ALTER COLUMN "expiresAt" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "partner_coin_recharge_requests" DROP COLUMN "status",
ADD COLUMN     "status" "RechargeRequestStatus" NOT NULL;

-- AlterTable
ALTER TABLE "partner_kyc_submissions" DROP COLUMN "verificationStatus",
ADD COLUMN     "verificationStatus" "KycVerificationStatus" NOT NULL;

-- AlterTable
ALTER TABLE "partner_lead_payment_intents" DROP COLUMN "status",
ADD COLUMN     "status" "PaymentIntentStatus" NOT NULL,
DROP COLUMN "screenshotStatus",
ADD COLUMN     "screenshotStatus" "ScreenshotStatus" NOT NULL DEFAULT 'NOT_SENT';

-- AlterTable
ALTER TABLE "partner_lead_unlocks" DROP COLUMN "status",
ADD COLUMN     "status" "LeadUnlockStatus" NOT NULL,
DROP COLUMN "screenshotStatus",
ADD COLUMN     "screenshotStatus" "ScreenshotStatus" NOT NULL DEFAULT 'NOT_SENT';

-- AlterTable
ALTER TABLE "partner_leads" DROP COLUMN "status",
ADD COLUMN     "status" "PartnerLeadStatus" NOT NULL;

-- AlterTable
ALTER TABLE "partners" DROP COLUMN "status",
ADD COLUMN     "status" "PartnerStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "serviceability_pincodes" DROP COLUMN "status",
ADD COLUMN     "status" "ServiceabilityStatus" NOT NULL;

-- AlterTable
ALTER TABLE "serviceability_upload_history" DROP COLUMN "status",
ADD COLUMN     "status" "UploadStatus" NOT NULL;

-- AlterTable
ALTER TABLE "user_sell_flows" DROP COLUMN "status",
ADD COLUMN     "status" "UserSellFlowStatus" NOT NULL;

-- CreateIndex
CREATE INDEX "idx_lead_event_outbox_status_time" ON "lead_event_outbox"("deliveryStatus", "occurredAt");

-- CreateIndex
CREATE INDEX "idx_partner_coin_recharge_requests_status" ON "partner_coin_recharge_requests"("status", "requestedAt");

-- CreateIndex
CREATE INDEX "idx_kyc_verification_status" ON "partner_kyc_submissions"("verificationStatus");

-- CreateIndex
CREATE INDEX "idx_partner_lead_payment_intents_partner_status" ON "partner_lead_payment_intents"("partnerId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "idx_partner_lead_unlocks_partner_status" ON "partner_lead_unlocks"("partnerId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "idx_partner_leads_scope_status" ON "partner_leads"("pincode", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "idx_partner_leads_partner_status" ON "partner_leads"("partnerId", "status");

-- CreateIndex
CREATE INDEX "idx_partner_leads_type_status" ON "partner_leads"("leadType", "status");

-- CreateIndex
CREATE INDEX "idx_user_sell_flows_status" ON "user_sell_flows"("status");
