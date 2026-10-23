-- Apply only to the AutoKlik database after reviewing the API database role.
-- No policies: ordinary client roles have no row access. Owners/BYPASSRLS retain access.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE public."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."saved_searches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."search_alerts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ad_views" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ad_images" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."saved_ads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."users_ad_drafts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."user_blocks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."message_images" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."audit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."revoked_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."moderation_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."admin_actions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."safety_blocklist" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."safety_appeals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."erasure_files" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."verification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."price_drop_notifications" ENABLE ROW LEVEL SECURITY;
COMMIT;
