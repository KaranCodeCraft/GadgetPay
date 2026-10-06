-- CreateTable
CREATE TABLE "partners" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "statusUpdatedBy" TEXT,
    "statusUpdatedAt" TEXT,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_codes" (
    "phone" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "sentAt" INTEGER NOT NULL,
    "expiresAt" INTEGER NOT NULL,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("phone")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "tokenId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("tokenId")
);

-- CreateTable
CREATE TABLE "user_sell_flows" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "flowType" TEXT NOT NULL DEFAULT 'sell-phone',
    "status" TEXT NOT NULL,
    "selectedModelJson" TEXT NOT NULL,
    "deviceDetailsJson" TEXT,
    "pickupScheduleJson" TEXT,
    "quoteJson" TEXT,
    "flowJson" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,

    CONSTRAINT "user_sell_flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "tenantType" TEXT NOT NULL,
    "tenantId" TEXT,
    "ownerRole" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "slot" TEXT,
    "originalFileName" TEXT NOT NULL,
    "storedFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "relativePath" TEXT NOT NULL,
    "storageProvider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "checksum" TEXT,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,
    "deletedAt" TEXT,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_leads" (
    "id" TEXT NOT NULL,
    "userSellFlowId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leadType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "partnerId" TEXT,
    "pincode" TEXT NOT NULL,
    "city" TEXT,
    "sellerName" TEXT,
    "sellerPhone" TEXT,
    "addressLine" TEXT,
    "landmark" TEXT,
    "selectedModelJson" TEXT NOT NULL,
    "deviceDetailsJson" TEXT,
    "quoteJson" TEXT,
    "pickupScheduleJson" TEXT,
    "flowSnapshotJson" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,
    "claimedAt" TEXT,
    "completedAt" TEXT,
    "cancelledAt" TEXT,
    "rejectionReason" TEXT,
    "pickupStartedAt" TEXT,
    "callStatus" TEXT,
    "callAttemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastCalledAt" TEXT,
    "callHistoryJson" TEXT,
    "onsiteValidationJson" TEXT,
    "onsiteValidatedAt" TEXT,
    "onsiteValidatedBy" TEXT,
    "paymentProofJson" TEXT,
    "paymentSubmittedAt" TEXT,
    "completionEventJson" TEXT,
    "completionEventAt" TEXT,

    CONSTRAINT "partner_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_lead_disposition_events" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "userSellFlowId" TEXT NOT NULL,
    "partnerId" TEXT,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "dispositionKey" TEXT NOT NULL,
    "note" TEXT,
    "actorRole" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,

    CONSTRAINT "partner_lead_disposition_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "serviceability_pincodes" (
    "pincode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT,
    "state" TEXT,
    "district" TEXT,
    "officeCount" INTEGER,
    "deliveryOfficeCount" INTEGER,
    "metadataJson" TEXT,
    "sourceUploadId" TEXT,
    "sourceFileName" TEXT,
    "updatedBy" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,

    CONSTRAINT "serviceability_pincodes_pkey" PRIMARY KEY ("pincode")
);

-- CreateTable
CREATE TABLE "serviceability_upload_history" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "mediaId" TEXT,
    "deactivatedBy" TEXT,
    "deactivatedAt" TEXT,
    "deactivatedRowCount" INTEGER NOT NULL DEFAULT 0,
    "insertedCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "totalProcessed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "serviceability_upload_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_pincode_scopes" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastAssignedAt" TEXT,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,

    CONSTRAINT "partner_pincode_scopes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_kyc_submissions" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "identityProof" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageStatus" TEXT NOT NULL,
    "storageProvider" TEXT NOT NULL,
    "storageKey" TEXT,
    "verificationStatus" TEXT NOT NULL,
    "verificationNotes" TEXT,
    "verifiedBy" TEXT,
    "verifiedAt" TEXT,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,

    CONSTRAINT "partner_kyc_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_coin_wallets" (
    "partnerId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TEXT NOT NULL,

    CONSTRAINT "partner_coin_wallets_pkey" PRIMARY KEY ("partnerId")
);

-- CreateTable
CREATE TABLE "partner_coin_ledger" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "txnType" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "note" TEXT,
    "metadataJson" TEXT,
    "createdAt" TEXT NOT NULL,

    CONSTRAINT "partner_coin_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_lead_unlocks" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "userSellFlowId" TEXT NOT NULL,
    "unlockPrice" INTEGER NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'UPI_QR',
    "status" TEXT NOT NULL,
    "screenshotStatus" TEXT NOT NULL DEFAULT 'NOT_SENT',
    "adminNote" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TEXT,
    "rejectedAt" TEXT,
    "metadataJson" TEXT,
    "createdAt" TEXT NOT NULL,
    "expiresAt" TEXT NOT NULL,
    "closedAt" TEXT,

    CONSTRAINT "partner_lead_unlocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_lead_payment_intents" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "userSellFlowId" TEXT NOT NULL,
    "unlockPrice" INTEGER NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'UPI_QR',
    "status" TEXT NOT NULL,
    "screenshotStatus" TEXT NOT NULL DEFAULT 'NOT_SENT',
    "adminNote" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TEXT,
    "rejectedAt" TEXT,
    "metadataJson" TEXT,
    "createdAt" TEXT NOT NULL,
    "expiresAt" TEXT NOT NULL,
    "closedAt" TEXT,

    CONSTRAINT "partner_lead_payment_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_coin_recharge_requests" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "upiTxnRef" TEXT NOT NULL,
    "upiApp" TEXT,
    "status" TEXT NOT NULL,
    "requestedAt" TEXT NOT NULL,
    "verifiedAt" TEXT,
    "verifiedBy" TEXT,
    "adminNote" TEXT,
    "ledgerEntryId" TEXT,
    "metadataJson" TEXT,

    CONSTRAINT "partner_coin_recharge_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_event_outbox" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "occurredAt" TEXT NOT NULL,
    "deliveryStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "nextRetryAt" TEXT,
    "lastError" TEXT,

    CONSTRAINT "lead_event_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_metrics_snapshot" (
    "id" TEXT NOT NULL,
    "bucketDate" TEXT NOT NULL,
    "scopePincode" TEXT,
    "scopePartnerId" TEXT,
    "metricKey" TEXT NOT NULL,
    "metricValue" DOUBLE PRECISION NOT NULL,
    "updatedAt" TEXT NOT NULL,

    CONSTRAINT "admin_metrics_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_lead_assignments" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "assignedPartnerId" TEXT NOT NULL,
    "assignedByAdminId" TEXT NOT NULL,
    "assignmentMode" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,

    CONSTRAINT "admin_lead_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_price_catalog" (
    "id" SERIAL NOT NULL,
    "deviceType" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "series" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "storage" TEXT NOT NULL,
    "launchYear" INTEGER NOT NULL,
    "cashifyPrice" DOUBLE PRECISION NOT NULL,
    "rowJson" TEXT NOT NULL,
    "sourceUploadId" TEXT,
    "sourceFileName" TEXT,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,

    CONSTRAINT "device_price_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_deduction_rules" (
    "id" TEXT NOT NULL,
    "answerGroup" TEXT NOT NULL,
    "answerKey" TEXT NOT NULL,
    "answerValue" TEXT,
    "label" TEXT NOT NULL,
    "deductionType" TEXT NOT NULL,
    "deductionValue" DOUBLE PRECISION NOT NULL,
    "maxDeductionAmount" DOUBLE PRECISION,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "appliesToBrand" TEXT,
    "appliesToModelId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,

    CONSTRAINT "quote_deduction_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_price_upload_history" (
    "id" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "deactivatedBy" TEXT,
    "deactivatedAt" TEXT,
    "deactivatedRowCount" INTEGER NOT NULL DEFAULT 0,
    "insertedCount" INTEGER NOT NULL,
    "updatedCount" INTEGER NOT NULL,
    "totalProcessed" INTEGER NOT NULL,

    CONSTRAINT "device_price_upload_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_price_upload_rows" (
    "id" SERIAL NOT NULL,
    "uploadId" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "series" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "storage" TEXT NOT NULL,
    "launchYear" INTEGER NOT NULL,
    "cashifyPrice" DOUBLE PRECISION NOT NULL,
    "rowJson" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,

    CONSTRAINT "device_price_upload_rows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "partners_phone_key" ON "partners"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "idx_user_sell_flows_user_updated" ON "user_sell_flows"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "idx_user_sell_flows_status" ON "user_sell_flows"("status");

-- CreateIndex
CREATE INDEX "idx_media_tenant" ON "media_assets"("tenantType", "tenantId");

-- CreateIndex
CREATE INDEX "idx_media_entity" ON "media_assets"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "idx_media_owner" ON "media_assets"("ownerRole", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "partner_leads_userSellFlowId_key" ON "partner_leads"("userSellFlowId");

-- CreateIndex
CREATE INDEX "idx_partner_leads_scope_status" ON "partner_leads"("pincode", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "idx_partner_leads_partner_status" ON "partner_leads"("partnerId", "status");

-- CreateIndex
CREATE INDEX "idx_partner_leads_type_status" ON "partner_leads"("leadType", "status");

-- CreateIndex
CREATE INDEX "idx_partner_lead_disp_events_lead_time" ON "partner_lead_disposition_events"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_partner_lead_disp_events_status_time" ON "partner_lead_disposition_events"("toStatus", "createdAt");

-- CreateIndex
CREATE INDEX "idx_partner_lead_disp_events_key_time" ON "partner_lead_disposition_events"("dispositionKey", "createdAt");

-- CreateIndex
CREATE INDEX "idx_partner_pincode_scopes_pincode_active" ON "partner_pincode_scopes"("pincode", "isActive", "lastAssignedAt");

-- CreateIndex
CREATE UNIQUE INDEX "partner_pincode_scopes_partnerId_pincode_key" ON "partner_pincode_scopes"("partnerId", "pincode");

-- CreateIndex
CREATE INDEX "idx_kyc_partner_id" ON "partner_kyc_submissions"("partnerId");

-- CreateIndex
CREATE INDEX "idx_kyc_verification_status" ON "partner_kyc_submissions"("verificationStatus");

-- CreateIndex
CREATE INDEX "idx_partner_coin_ledger_partner" ON "partner_coin_ledger"("partnerId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_partner_lead_unlocks_partner_status" ON "partner_lead_unlocks"("partnerId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "partner_lead_unlocks_leadId_key" ON "partner_lead_unlocks"("leadId");

-- CreateIndex
CREATE INDEX "idx_partner_lead_payment_intents_partner_status" ON "partner_lead_payment_intents"("partnerId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "partner_lead_payment_intents_leadId_key" ON "partner_lead_payment_intents"("leadId");

-- CreateIndex
CREATE INDEX "idx_partner_coin_recharge_requests_partner" ON "partner_coin_recharge_requests"("partnerId", "requestedAt");

-- CreateIndex
CREATE INDEX "idx_partner_coin_recharge_requests_status" ON "partner_coin_recharge_requests"("status", "requestedAt");

-- CreateIndex
CREATE INDEX "idx_lead_event_outbox_status_time" ON "lead_event_outbox"("deliveryStatus", "occurredAt");

-- CreateIndex
CREATE INDEX "idx_admin_metrics_snapshot_scope" ON "admin_metrics_snapshot"("bucketDate", "scopePincode", "scopePartnerId", "metricKey");

-- CreateIndex
CREATE INDEX "idx_admin_lead_assignments_lead_time" ON "admin_lead_assignments"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_admin_lead_assignments_partner_time" ON "admin_lead_assignments"("assignedPartnerId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_price_catalog_lookup" ON "device_price_catalog"("deviceType", "brand", "series", "model", "storage", "launchYear");

-- CreateIndex
CREATE UNIQUE INDEX "device_price_catalog_deviceType_brand_series_model_storage__key" ON "device_price_catalog"("deviceType", "brand", "series", "model", "storage", "launchYear");

-- CreateIndex
CREATE INDEX "idx_price_upload_rows_upload" ON "device_price_upload_rows"("uploadId");

-- CreateIndex
CREATE UNIQUE INDEX "device_price_upload_rows_uploadId_deviceType_brand_series_m_key" ON "device_price_upload_rows"("uploadId", "deviceType", "brand", "series", "model", "storage", "launchYear");

-- AddForeignKey
ALTER TABLE "user_sell_flows" ADD CONSTRAINT "user_sell_flows_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_leads" ADD CONSTRAINT "partner_leads_userSellFlowId_fkey" FOREIGN KEY ("userSellFlowId") REFERENCES "user_sell_flows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_leads" ADD CONSTRAINT "partner_leads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_leads" ADD CONSTRAINT "partner_leads_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_lead_disposition_events" ADD CONSTRAINT "partner_lead_disposition_events_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "partner_leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_lead_disposition_events" ADD CONSTRAINT "partner_lead_disposition_events_userSellFlowId_fkey" FOREIGN KEY ("userSellFlowId") REFERENCES "user_sell_flows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_lead_disposition_events" ADD CONSTRAINT "partner_lead_disposition_events_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_pincode_scopes" ADD CONSTRAINT "partner_pincode_scopes_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_pincode_scopes" ADD CONSTRAINT "partner_pincode_scopes_pincode_fkey" FOREIGN KEY ("pincode") REFERENCES "serviceability_pincodes"("pincode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_kyc_submissions" ADD CONSTRAINT "partner_kyc_submissions_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_coin_wallets" ADD CONSTRAINT "partner_coin_wallets_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_coin_ledger" ADD CONSTRAINT "partner_coin_ledger_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_lead_unlocks" ADD CONSTRAINT "partner_lead_unlocks_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "partner_leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_lead_unlocks" ADD CONSTRAINT "partner_lead_unlocks_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_lead_unlocks" ADD CONSTRAINT "partner_lead_unlocks_userSellFlowId_fkey" FOREIGN KEY ("userSellFlowId") REFERENCES "user_sell_flows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_lead_payment_intents" ADD CONSTRAINT "partner_lead_payment_intents_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "partner_leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_lead_payment_intents" ADD CONSTRAINT "partner_lead_payment_intents_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_lead_payment_intents" ADD CONSTRAINT "partner_lead_payment_intents_userSellFlowId_fkey" FOREIGN KEY ("userSellFlowId") REFERENCES "user_sell_flows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_coin_recharge_requests" ADD CONSTRAINT "partner_coin_recharge_requests_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_lead_assignments" ADD CONSTRAINT "admin_lead_assignments_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "partner_leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_lead_assignments" ADD CONSTRAINT "admin_lead_assignments_assignedPartnerId_fkey" FOREIGN KEY ("assignedPartnerId") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
