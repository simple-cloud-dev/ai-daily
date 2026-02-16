-- CreateEnum
CREATE TYPE "public"."Frequency" AS ENUM ('DAILY', 'TWICE_DAILY', 'WEEKLY', 'WEEKDAY_ONLY');

-- CreateEnum
CREATE TYPE "public"."DigestLength" AS ENUM ('BRIEF', 'STANDARD', 'COMPREHENSIVE');

-- CreateEnum
CREATE TYPE "public"."SummaryDepth" AS ENUM ('HEADLINES', 'SHORT', 'DETAILED');

-- CreateEnum
CREATE TYPE "public"."ContentFormat" AS ENUM ('GROUPED_BY_SOURCE', 'GROUPED_BY_TOPIC', 'CHRONOLOGICAL', 'RANKED_BY_RELEVANCE');

-- CreateEnum
CREATE TYPE "public"."SourceCategory" AS ENUM ('WEB_NEWS', 'SOCIAL_MEDIA', 'RESEARCH_LABS', 'CLOUD', 'UNIVERSITIES', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."SourceType" AS ENUM ('API', 'RSS', 'SCRAPE', 'KEYWORD');

-- CreateEnum
CREATE TYPE "public"."DigestStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."CustomSourceType" AS ENUM ('RSS', 'URL', 'KEYWORD');

-- CreateEnum
CREATE TYPE "public"."EngagementAction" AS ENUM ('CLICK', 'BOOKMARK', 'SHARE', 'READ');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT,
    "avatarUrl" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "emailVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DeliveryEmail" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserPreferences" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "frequency" "public"."Frequency" NOT NULL DEFAULT 'DAILY',
    "deliveryTime" TEXT NOT NULL DEFAULT '08:00',
    "digestLength" "public"."DigestLength" NOT NULL DEFAULT 'STANDARD',
    "summaryDepth" "public"."SummaryDepth" NOT NULL DEFAULT 'SHORT',
    "contentFormat" "public"."ContentFormat" NOT NULL DEFAULT 'GROUPED_BY_TOPIC',
    "language" TEXT NOT NULL DEFAULT 'en',
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "resumeDate" TIMESTAMP(3),
    "weeklyDay" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Source" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" "public"."SourceCategory" NOT NULL,
    "type" "public"."SourceType" NOT NULL,
    "url" TEXT NOT NULL,
    "logoUrl" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserSource" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CustomSource" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."CustomSourceType" NOT NULL,
    "value" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserKeyword" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "keyword" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Digest" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "status" "public"."DigestStatus" NOT NULL DEFAULT 'PENDING',
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Digest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DigestItem" (
    "id" UUID NOT NULL,
    "digestId" UUID NOT NULL,
    "sourceId" UUID,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sourceLabel" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "relevanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "topic" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "DigestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Bookmark" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "digestItemId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EngagementLog" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "digestItemId" UUID NOT NULL,
    "action" "public"."EngagementAction" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EngagementLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmailVerificationToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PasswordResetToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryEmail_userId_email_key" ON "public"."DeliveryEmail"("userId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreferences_userId_key" ON "public"."UserPreferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Source_name_key" ON "public"."Source"("name");

-- CreateIndex
CREATE UNIQUE INDEX "UserSource_userId_sourceId_key" ON "public"."UserSource"("userId", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "UserKeyword_userId_keyword_key" ON "public"."UserKeyword"("userId", "keyword");

-- CreateIndex
CREATE UNIQUE INDEX "Bookmark_userId_digestItemId_key" ON "public"."Bookmark"("userId", "digestItemId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_token_key" ON "public"."EmailVerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "public"."PasswordResetToken"("token");

-- AddForeignKey
ALTER TABLE "public"."DeliveryEmail" ADD CONSTRAINT "DeliveryEmail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserPreferences" ADD CONSTRAINT "UserPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserSource" ADD CONSTRAINT "UserSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserSource" ADD CONSTRAINT "UserSource_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "public"."Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CustomSource" ADD CONSTRAINT "CustomSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserKeyword" ADD CONSTRAINT "UserKeyword_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Digest" ADD CONSTRAINT "Digest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DigestItem" ADD CONSTRAINT "DigestItem_digestId_fkey" FOREIGN KEY ("digestId") REFERENCES "public"."Digest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DigestItem" ADD CONSTRAINT "DigestItem_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "public"."Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Bookmark" ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Bookmark" ADD CONSTRAINT "Bookmark_digestItemId_fkey" FOREIGN KEY ("digestItemId") REFERENCES "public"."DigestItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EngagementLog" ADD CONSTRAINT "EngagementLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EngagementLog" ADD CONSTRAINT "EngagementLog_digestItemId_fkey" FOREIGN KEY ("digestItemId") REFERENCES "public"."DigestItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
