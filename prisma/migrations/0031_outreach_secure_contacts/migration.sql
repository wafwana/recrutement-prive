-- Prepared only; production migration is not executed automatically.
CREATE TABLE "OutreachContact" (
  "id" TEXT NOT NULL, "recipientType" TEXT NOT NULL, "recipientEmail" TEXT NOT NULL, "recipientName" TEXT,
  "companyId" TEXT, "candidateUserId" TEXT, "source" TEXT, "campaignKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING', "subject" TEXT, "bodySnapshot" TEXT, "providerMessageId" TEXT,
  "sentAt" TIMESTAMP(3), "deliveredAt" TIMESTAMP(3), "bouncedAt" TIMESTAMP(3), "complainedAt" TIMESTAMP(3),
  "repliedAt" TIMESTAMP(3), "convertedAt" TIMESTAMP(3), "optedOutAt" TIMESTAMP(3), "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OutreachContact_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ContactMeeting" (
  "id" TEXT NOT NULL, "presentationId" TEXT NOT NULL, "companyId" TEXT NOT NULL, "candidateId" TEXT NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'MESSAGING', "status" TEXT NOT NULL DEFAULT 'REQUESTED',
  "scheduledAt" TIMESTAMP(3), "startedAt" TIMESTAMP(3), "endedAt" TIMESTAMP(3), "durationMinutes" INTEGER NOT NULL DEFAULT 30,
  "priceHt" DOUBLE PRECISION NOT NULL DEFAULT 82.5, "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 20,
  "priceTtc" DOUBLE PRECISION NOT NULL DEFAULT 99, "currency" TEXT NOT NULL DEFAULT 'EUR',
  "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING', "paymentMethod" TEXT, "paymentProvider" TEXT, "paymentReference" TEXT, "checkoutUrl" TEXT, "paidAt" TIMESTAMP(3), "recordingNoticeShown" BOOLEAN NOT NULL DEFAULT false,
  "candidateConsentAt" TIMESTAMP(3), "companyConsentAt" TIMESTAMP(3), "recordingStartedAt" TIMESTAMP(3),
  "recordingEndedAt" TIMESTAMP(3), "recordingRef" TEXT, "decisionRequired" BOOLEAN NOT NULL DEFAULT false,
  "decisionStatus" TEXT NOT NULL DEFAULT 'PENDING', "decisionAt" TIMESTAMP(3), "decisionNotes" TEXT,
  "securityDetails" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContactMeeting_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ContractTemplate" (
  "id" TEXT NOT NULL, "key" TEXT NOT NULL, "title" TEXT NOT NULL, "audience" TEXT NOT NULL,
  "version" TEXT NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true, "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContractTemplate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OutreachContact_recipientEmail_campaignKey_key" ON "OutreachContact"("recipientEmail","campaignKey");
CREATE INDEX "OutreachContact_recipientType_status_createdAt_idx" ON "OutreachContact"("recipientType","status","createdAt");
CREATE INDEX "OutreachContact_companyId_createdAt_idx" ON "OutreachContact"("companyId","createdAt");
CREATE INDEX "OutreachContact_candidateUserId_createdAt_idx" ON "OutreachContact"("candidateUserId","createdAt");
CREATE INDEX "ContactMeeting_presentationId_status_scheduledAt_idx" ON "ContactMeeting"("presentationId","status","scheduledAt");
CREATE INDEX "ContactMeeting_companyId_createdAt_idx" ON "ContactMeeting"("companyId","createdAt");
CREATE INDEX "ContactMeeting_candidateId_createdAt_idx" ON "ContactMeeting"("candidateId","createdAt");
CREATE UNIQUE INDEX "ContractTemplate_key_key" ON "ContractTemplate"("key");
CREATE INDEX "ContractTemplate_audience_active_idx" ON "ContractTemplate"("audience","active");
ALTER TABLE "OutreachContact" ADD CONSTRAINT "OutreachContact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OutreachContact" ADD CONSTRAINT "OutreachContact_candidateUserId_fkey" FOREIGN KEY ("candidateUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContactMeeting" ADD CONSTRAINT "ContactMeeting_presentationId_fkey" FOREIGN KEY ("presentationId") REFERENCES "MissionPresentation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContactMeeting" ADD CONSTRAINT "ContactMeeting_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContactMeeting" ADD CONSTRAINT "ContactMeeting_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "OwnerBillingProfile" (
  "id" TEXT NOT NULL,
  "legalName" TEXT,
  "accountHolder" TEXT,
  "address" TEXT,
  "postalCode" TEXT,
  "city" TEXT,
  "country" TEXT NOT NULL DEFAULT 'FR',
  "iban" TEXT,
  "bic" TEXT,
  "bankName" TEXT,
  "invoiceEmail" TEXT,
  "paymentInstructions" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OwnerBillingProfile_pkey" PRIMARY KEY ("id")
);
