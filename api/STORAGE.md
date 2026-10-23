# Supabase image storage

Set these variables in `api/.env` locally and in the Render environment:

```dotenv
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SECRET_KEY=YOUR_SERVER_SECRET_KEY
SUPABASE_AD_IMAGES_BUCKET=ad-images
SUPABASE_AVATARS_BUCKET=avatars
```

Use a server secret key from Supabase Project Settings > API Keys. A legacy
`SUPABASE_SERVICE_ROLE_KEY` is also supported. These are server-only credentials;
never put them in frontend environment variables or commit them.

Create the two buckets before uploading. Allow `image/jpeg`, `image/png`, and
`image/webp`, with a maximum object size of 5 MB. Buckets may be private because
the API serves the bytes. Do not grant anonymous upload or deletion policies:
the API authenticates users and validates image bytes before using its server key.

Database image references remain `ad-images/<filename>` and `pfp/<filename>`.
The API serves those same URLs from Storage, so frontend configuration does not
change. `pfp/` maps to the `avatars` bucket. Restart the API after configuration.
New uploads are never written to `api/public`.

Existing local images must be copied separately: upload files from
`api/public/ad-images` to the root of `ad-images`, and from `api/public/pfp` to
the root of `avatars`, preserving filenames. No existing files are moved or
deleted by this code change. Static default images remain in `api/public`.

Message images already live encrypted in PostgreSQL and continue to use the
participant-authorized message endpoint. They are not public-folder uploads.

Failed requests clean up their new bucket objects. Account-erasure cleanup
deletes queued bucket objects only after checking remaining database references.
Temporary Storage errors leave account-erasure work queued for retry.
