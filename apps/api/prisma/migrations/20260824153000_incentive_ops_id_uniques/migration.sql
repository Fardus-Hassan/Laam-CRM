-- Prefer assignmentId / userId uniqueness so same display names do not collide.

-- Surveys
DROP INDEX IF EXISTS "IncentiveSurveyLogs_organizationId_agentName_yearMonth_key";
CREATE UNIQUE INDEX "IncentiveSurveyLogs_organizationId_yearMonth_assignmentId_key"
  ON "IncentiveSurveyLogs" ("organizationId", "yearMonth", "assignmentId")
  WHERE "assignmentId" IS NOT NULL;
CREATE UNIQUE INDEX "IncentiveSurveyLogs_organizationId_agentName_yearMonth_legacy_key"
  ON "IncentiveSurveyLogs" ("organizationId", "agentName", "yearMonth")
  WHERE "assignmentId" IS NULL;

-- Channels
DROP INDEX IF EXISTS "IncentiveChannelLogs_organizationId_agentName_yearMonth_channel_key";
CREATE UNIQUE INDEX "IncentiveChannelLogs_organizationId_yearMonth_assignmentId_channel_key"
  ON "IncentiveChannelLogs" ("organizationId", "yearMonth", "assignmentId", "channel")
  WHERE "assignmentId" IS NOT NULL;
CREATE UNIQUE INDEX "IncentiveChannelLogs_organizationId_agentName_yearMonth_channel_legacy_key"
  ON "IncentiveChannelLogs" ("organizationId", "agentName", "yearMonth", "channel")
  WHERE "assignmentId" IS NULL;

-- Attendance
DROP INDEX IF EXISTS "IncentiveAttendances_organizationId_agentName_yearMonth_key";
CREATE UNIQUE INDEX "IncentiveAttendances_organizationId_yearMonth_userId_key"
  ON "IncentiveAttendances" ("organizationId", "yearMonth", "userId")
  WHERE "userId" IS NOT NULL;
CREATE UNIQUE INDEX "IncentiveAttendances_organizationId_agentName_yearMonth_legacy_key"
  ON "IncentiveAttendances" ("organizationId", "agentName", "yearMonth")
  WHERE "userId" IS NULL;
