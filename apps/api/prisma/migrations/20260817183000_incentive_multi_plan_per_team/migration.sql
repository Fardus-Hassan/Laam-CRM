-- Multiple KPI plans per Users-page team (one active plan per metric in app code).
-- The old unique (organizationId, orgTeamId) blocked Add metric (CS/US, return ratio).
DROP INDEX IF EXISTS "IncentivePlans_organizationId_orgTeamId_key";
