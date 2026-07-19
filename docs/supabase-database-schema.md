# FizZion Supabase Database Schema

Updated for **Sunday, July 19, 2026**.

This document is the clean functional view of the Supabase/PostgreSQL schema for the full FizZion platform.

The executable SQL lives in:

- [supabase/migrations/202607160001_initial.sql](/d:/Fizzion/supabase/migrations/202607160001_initial.sql)
- [supabase/schema.sql](/d:/Fizzion/supabase/schema.sql)
- [supabase/seed.sql](/d:/Fizzion/supabase/seed.sql)

## Core design rules

- Every business table uses `uuid` primary keys.
- All domain data is organization-aware through `organization_id`.
- User identity is anchored to `auth.users` through Supabase Auth.
- Timestamps are stored in UTC as `timestamptz`.
- Media binaries are not stored in Postgres.
- Raw third-party payloads are separated from normalized analytical tables.
- RLS is the primary tenant boundary.

## Schema modules

### 1. Identity and Access

#### `organizations`

Purpose:
- tenant root for Coca-Cola Iraq, Hizen, and future orgs

Important fields:
- `id`
- `slug`
- `name`
- `name_ar`
- `market`
- `timezone`
- `is_active`

#### `profiles`

Purpose:
- application profile for each Supabase auth user

Important fields:
- `id` references `auth.users(id)`
- `display_name`
- `preferred_locale`
- `preferred_timezone`
- `avatar_url`

#### `roles`

Purpose:
- org-scoped role definitions

Important fields:
- `organization_id`
- `slug`
- `name`
- `description`
- `is_system`

#### `permissions`

Purpose:
- reusable permission catalog

Important fields:
- `key`
- `name`
- `description`

#### `organization_members`

Purpose:
- maps users to organizations and roles

Important fields:
- `organization_id`
- `user_id`
- `role_id`
- `status`

Rules:
- unique per `organization_id + user_id`

#### `role_permissions`

Purpose:
- many-to-many mapping between roles and permissions

Important fields:
- `role_id`
- `permission_id`

#### `user_preferences`

Purpose:
- user UI preferences and personalization

Important fields:
- `user_id`
- `organization_id`
- `locale`
- `timezone`
- `dashboard_layout`

#### `saved_views`

Purpose:
- saved filters and dashboards

Important fields:
- `organization_id`
- `created_by`
- `module_key`
- `name`
- `filters`
- `is_shared`

#### `notifications`

Purpose:
- in-app user notifications

Important fields:
- `organization_id`
- `recipient_user_id`
- `title`
- `body`
- `severity`
- `status`
- `payload`

#### `audit_logs`

Purpose:
- immutable-style operational audit history

Important fields:
- `organization_id`
- `actor_user_id`
- `action`
- `entity_type`
- `entity_id`
- `payload`
- `created_at`

---

### 2. Brand, Product, Campaign, and Creative Master Data

#### `brands`

Purpose:
- master brand register for Coca-Cola and competitors

Important fields:
- `organization_id`
- `name`
- `name_ar`
- `parent_company`
- `category`
- `logo_storage_key`
- `website_domains`
- `social_handles`
- `ocr_keywords`
- `speech_keywords`
- `competitor_group`
- `is_active`

#### `brand_aliases`

Purpose:
- multilingual aliases used in OCR, transcript, and search matching

Important fields:
- `organization_id`
- `brand_id`
- `alias`
- `locale`

#### `products`

Purpose:
- products under each brand

Important fields:
- `organization_id`
- `brand_id`
- `name`
- `name_ar`
- `category`
- `is_active`

#### `campaigns`

Purpose:
- reusable marketing campaign entities

Important fields:
- `organization_id`
- `brand_id`
- `product_id`
- `name`
- `market`
- `agency`
- `start_date`
- `end_date`
- `objective`
- `media_types`
- `keywords`
- `hashtags`
- `expected_creatives`
- `status`
- `budget_amount`
- `budget_currency`
- `notes`

#### `campaign_brands`

Purpose:
- many-to-many brand associations for campaigns

Important fields:
- `organization_id`
- `campaign_id`
- `brand_id`

#### `creative_assets`

Purpose:
- master creative identity across TV, social, web, and OOH

Important fields:
- `organization_id`
- `brand_id`
- `product_id`
- `campaign_id`
- `media_type`
- `name`
- `language`
- `duration_seconds`
- `dimensions`
- `aspect_ratio`
- `first_seen_at`
- `last_seen_at`
- `total_occurrences`
- `approval_state`
- `ai_description`
- `ocr_text`
- `transcript`
- `audio_fingerprint`
- `visual_embedding_ref`

#### `creative_variants`

Purpose:
- source-specific or format-specific variations of the master creative

Important fields:
- `organization_id`
- `creative_asset_id`
- `media_type`
- `variant_name`
- `storage_key`
- `checksum_sha256`
- `duration_seconds`
- `dimensions`
- `aspect_ratio`
- `metadata`

#### `creative_embeddings`

Purpose:
- vector search references for visual similarity

Important fields:
- `organization_id`
- `creative_asset_id`
- `provider`
- `model`
- `embedding_ref`

#### `creative_tags`

Purpose:
- analyst and workflow tagging

Important fields:
- `organization_id`
- `creative_asset_id`
- `tag`

---

### 3. TV Intelligence

#### `tv_source_partners`

Purpose:
- Iraqi recording or delivery partners

Important fields:
- `organization_id`
- `name`
- `contact_name`
- `contact_email`
- `source_contract_ref`
- `sla_notes`

#### `tv_channels`

Purpose:
- monitored TV channels

Important fields:
- `organization_id`
- `name`
- `name_ar`
- `slug`
- `logo_storage_key`
- `category`
- `source_type`
- `recording_status`
- `retention_days`
- `expected_schedule`
- `technical_metadata`
- `monitoring_health`
- `last_successful_file_at`
- `last_processed_at`

#### `tv_sources`

Purpose:
- individual feed or upload source definitions for channels

Important fields:
- `organization_id`
- `channel_id`
- `source_partner_id`
- `source_type`
- `connection_details`
- `is_active`

#### `tv_recording_files`

Purpose:
- raw TV recording metadata

Important fields:
- `organization_id`
- `channel_id`
- `tv_source_id`
- `source_partner_id`
- `storage_key`
- `proxy_storage_key`
- `filename`
- `source_timestamp`
- `source_timezone`
- `duration_seconds`
- `file_size_bytes`
- `checksum_sha256`
- `upload_mode`
- `media_metadata`
- `integrity_status`
- `processing_status`
- `duplicate_of_id`

Rules:
- unique per `channel_id + checksum_sha256`

#### `tv_recording_gaps`

Purpose:
- expected recording windows that were missed

Important fields:
- `organization_id`
- `channel_id`
- `started_at`
- `ended_at`
- `expected_source`
- `severity`
- `notes`

#### `tv_processing_jobs`

Purpose:
- per-recording pipeline stage tracking

Important fields:
- `organization_id`
- `recording_file_id`
- `job_type`
- `status`
- `attempts`
- `queue_name`
- `started_at`
- `completed_at`
- `error_message`
- `payload`

#### `tv_ad_breaks`

Purpose:
- commercial breaks detected inside recordings

Important fields:
- `organization_id`
- `recording_file_id`
- `break_start_at`
- `break_end_at`
- `confidence`

#### `tv_ad_occurrences`

Purpose:
- the core TV airing entity, one row per airing

Important fields:
- `organization_id`
- `channel_id`
- `recording_file_id`
- `ad_break_id`
- `creative_variant_id`
- `brand_id`
- `product_id`
- `campaign_id`
- `started_at`
- `ended_at`
- `duration_seconds`
- `confidence_score`
- `reviewer_status`
- `content_type`
- `detection_summary`

#### `tv_ad_occurrence_clips`

Purpose:
- exported occurrence clips with 5-second pre/post context

Important fields:
- `organization_id`
- `occurrence_id`
- `storage_key`
- `clip_started_at`
- `clip_ended_at`
- `pre_context_seconds`
- `post_context_seconds`
- `checksum_sha256`

#### `tv_detection_evidence`

Purpose:
- evidence produced by OCR, fingerprinting, STT, logo match, and other signals

Important fields:
- `organization_id`
- `occurrence_id`
- `evidence_type`
- `provider`
- `score`
- `payload`

#### `tv_review_actions`

Purpose:
- reviewer decisions and edits for TV detections

Important fields:
- `organization_id`
- `occurrence_id`
- `reviewer_user_id`
- `action_type`
- `notes`
- `payload`

---

### 4. Social Intelligence

#### `social_platforms`

Purpose:
- platform catalog such as Instagram, Facebook, TikTok, YouTube, X

Important fields:
- `key`
- `name`
- `oauth_supported`
- `public_monitoring_supported`

#### `social_accounts`

Purpose:
- monitored owned or public accounts

Important fields:
- `organization_id`
- `platform_id`
- `brand_id`
- `campaign_id`
- `handle`
- `normalized_url`
- `display_name`
- `bio`
- `profile_image_url`
- `website_url`
- `country`
- `is_verified`
- `connection_type`
- `last_synchronized_at`
- `connection_health`
- `metrics_availability`
- `data_source`

Rules:
- unique per `organization_id + platform_id + handle`

#### `social_connections`

Purpose:
- connection state for OAuth or public monitoring setup

Important fields:
- `organization_id`
- `social_account_id`
- `connection_type`
- `status`
- `provider_account_id`
- `granted_scopes`
- `metadata`

#### `social_oauth_tokens`

Purpose:
- encrypted OAuth token storage

Important fields:
- `organization_id`
- `connection_id`
- `access_token_encrypted`
- `refresh_token_encrypted`
- `expires_at`
- `scopes`

#### `social_account_snapshots`

Purpose:
- periodic account-level summary snapshots

Important fields:
- `organization_id`
- `social_account_id`
- `captured_at`
- `follower_count`
- `following_count`
- `content_count`
- `engagement_rate`
- `raw_summary`

#### `social_posts`

Purpose:
- normalized social content items

Important fields:
- `organization_id`
- `social_account_id`
- `creative_variant_id`
- `campaign_id`
- `provider_post_id`
- `content_type`
- `caption`
- `hashtags`
- `mentions`
- `language`
- `published_at`
- `permalink`
- `is_paid`

Rules:
- unique per `social_account_id + provider_post_id`

#### `social_post_media`

Purpose:
- media assets associated with posts

Important fields:
- `organization_id`
- `social_post_id`
- `media_type`
- `source_url`
- `storage_key`
- `thumbnail_url`
- `duration_seconds`
- `width`
- `height`
- `metadata`

#### `social_post_metrics`

Purpose:
- post-level metrics with provenance and availability awareness

Important fields:
- `organization_id`
- `social_post_id`
- `metric_name`
- `metric_value`
- `availability`
- `source_definition`
- `captured_at`

#### `social_account_metrics`

Purpose:
- account-level metric time series

Important fields:
- `organization_id`
- `social_account_id`
- `metric_name`
- `metric_value`
- `availability`
- `source_definition`
- `captured_at`

#### `social_sync_jobs`

Purpose:
- synchronization job tracking

Important fields:
- `organization_id`
- `social_account_id`
- `connection_id`
- `sync_mode`
- `status`
- `started_at`
- `completed_at`
- `error_message`
- `payload`

#### `social_raw_payloads`

Purpose:
- raw provider payload retention for auditability and reprocessing

Important fields:
- `organization_id`
- `sync_job_id`
- `payload_type`
- `provider_version`
- `payload`
- `retrieved_at`
- `expires_at`

---

### 5. Website Advertising Intelligence

#### `websites`

Purpose:
- managed list of monitored sites

Important fields:
- `organization_id`
- `name`
- `domain`
- `country`
- `priority`
- `is_active`
- `notes`

Rules:
- unique per `organization_id + domain`

#### `website_pages`

Purpose:
- pages discovered or monitored within a website

Important fields:
- `organization_id`
- `website_id`
- `url`
- `page_type`
- `title`

Rules:
- unique per `website_id + url`

#### `website_browser_profiles`

Purpose:
- crawl browser/device presets

Important fields:
- `organization_id`
- `name`
- `region_code`
- `language`
- `device_type`
- `viewport_width`
- `viewport_height`
- `user_agent`
- `consent_state`
- `is_active`

#### `website_crawl_configs`

Purpose:
- crawl schedule and strategy

Important fields:
- `organization_id`
- `website_id`
- `browser_profile_id`
- `interval_minutes`
- `crawl_depth`
- `max_pages`
- `homepage_enabled`
- `section_pages_enabled`
- `article_pages_enabled`
- `mobile_enabled`
- `desktop_enabled`
- `url_patterns`
- `is_active`

#### `website_crawl_runs`

Purpose:
- one execution of the crawler

Important fields:
- `organization_id`
- `website_id`
- `crawl_config_id`
- `browser_profile_id`
- `started_at`
- `completed_at`
- `status`
- `crawl_location`
- `proxy_region`
- `pages_crawled`
- `ads_detected`
- `metadata`

#### `website_crawl_errors`

Purpose:
- crawl failures and evidence screenshots

Important fields:
- `organization_id`
- `crawl_run_id`
- `page_url`
- `error_type`
- `message`
- `screenshot_storage_key`

#### `website_ad_creatives`

Purpose:
- deduplicated website ad creative identity

Important fields:
- `organization_id`
- `brand_id`
- `product_id`
- `campaign_id`
- `creative_variant_id`
- `creative_hash`
- `ocr_text`
- `landing_domain`
- `dimensions`
- `metadata`
- `first_seen_at`
- `last_seen_at`
- `occurrence_count`

#### `website_ad_occurrences`

Purpose:
- occurrence-level ad detection on a page during a crawl

Important fields:
- `organization_id`
- `website_id`
- `page_id`
- `crawl_run_id`
- `website_ad_creative_id`
- `brand_id`
- `product_id`
- `campaign_id`
- `captured_at`
- `page_url`
- `page_title`
- `viewport`
- `page_position`
- `ad_format`
- `landing_domain`
- `destination_url`
- `confidence`
- `detection_method`
- `first_seen_at`
- `last_seen_at`
- `occurrence_count`

#### `website_ad_screenshots`

Purpose:
- contextual and cropped screenshots for ad proof

Important fields:
- `organization_id`
- `occurrence_id`
- `screenshot_type`
- `storage_key`
- `width`
- `height`

---

### 6. OOH Intelligence

#### `ooh_vendors`

Purpose:
- vendors/media owners

Important fields:
- `organization_id`
- `name`
- `contact_name`
- `contact_email`
- `contact_phone`

Rules:
- unique per `organization_id + name`

#### `ooh_locations`

Purpose:
- physical OOH locations

Important fields:
- `organization_id`
- `location_name`
- `location_name_ar`
- `latitude`
- `longitude`
- `city`
- `district`
- `address`
- `landmark`
- `estimated_visibility`
- `status`
- `availability`
- `notes`

#### `ooh_media_units`

Purpose:
- individual units at a location such as billboard, unipole, bridge banner

Important fields:
- `organization_id`
- `location_id`
- `vendor_id`
- `media_owner`
- `media_type`
- `dimensions`
- `orientation`
- `illumination`
- `traffic_direction`
- `contract_reference`
- `installation_date`
- `removal_date`

#### `ooh_creatives`

Purpose:
- OOH-specific creative artifacts

Important fields:
- `organization_id`
- `creative_asset_id`
- `storage_key`
- `proof_storage_key`

#### `ooh_campaign_assignments`

Purpose:
- booking and occupancy of media units

Important fields:
- `organization_id`
- `media_unit_id`
- `brand_id`
- `product_id`
- `campaign_id`
- `ooh_creative_id`
- `vendor_id`
- `booking_status`
- `start_date`
- `end_date`
- `cost_amount`
- `cost_currency`
- `internal_comments`

#### `ooh_photos`

Purpose:
- installation, proof, and history photos

Important fields:
- `organization_id`
- `assignment_id`
- `photo_type`
- `storage_key`
- `captured_at`
- `metadata`

#### `ooh_verification_visits`

Purpose:
- field verification records

Important fields:
- `organization_id`
- `assignment_id`
- `visited_at`
- `visitor_user_id`
- `latitude`
- `longitude`
- `notes`

---

### 7. Reports, Alerts, and Operations

#### `reports`

Purpose:
- reusable saved report definitions

Important fields:
- `organization_id`
- `name`
- `report_type`
- `config`
- `schedule_expression`
- `is_active`

#### `report_runs`

Purpose:
- execution history of reports

Important fields:
- `organization_id`
- `report_id`
- `requested_by`
- `status`
- `format`
- `progress`
- `started_at`
- `completed_at`
- `error_message`

#### `exports`

Purpose:
- exported files produced by report runs

Important fields:
- `organization_id`
- `report_run_id`
- `storage_key`
- `format`
- `expires_at`
- `downloaded_by`
- `downloaded_at`

#### `alert_rules`

Purpose:
- configurable detection and operational alert logic

Important fields:
- `organization_id`
- `name`
- `alert_type`
- `severity`
- `channel_config`
- `conditions`
- `is_active`

#### `alerts`

Purpose:
- raised alerts and acknowledgement workflow

Important fields:
- `organization_id`
- `alert_rule_id`
- `assigned_to`
- `title`
- `body`
- `severity`
- `status`
- `resolution_notes`
- `payload`
- `acknowledged_at`
- `resolved_at`

#### `processing_jobs`

Purpose:
- domain-level background job tracking across TV, social, web, report, ops

Important fields:
- `organization_id`
- `job_type`
- `domain`
- `status`
- `queue_name`
- `external_job_id`
- `attempts`
- `payload`
- `started_at`
- `completed_at`
- `error_message`

#### `integration_health`

Purpose:
- health snapshots for integrations and external dependencies

Important fields:
- `organization_id`
- `integration_key`
- `status`
- `last_checked_at`
- `details`

Rules:
- unique per `organization_id + integration_key`

#### `data_retention_policies`

Purpose:
- data-retention and legal-hold controls

Important fields:
- `organization_id`
- `data_domain`
- `retention_days`
- `legal_hold`
- `notes`

Rules:
- unique per `organization_id + data_domain`

---

## Relationship summary

### Tenant backbone

- `organizations` -> many `organization_members`
- `organizations` -> many domain records
- `profiles.id` -> `auth.users.id`

### Brand hierarchy

- `brands` -> many `products`
- `brands` -> many `campaigns`
- `campaigns` -> many `creative_assets`
- `creative_assets` -> many `creative_variants`

### TV

- `tv_channels` -> many `tv_recording_files`
- `tv_recording_files` -> many `tv_ad_breaks`
- `tv_ad_breaks` -> many `tv_ad_occurrences`
- `tv_ad_occurrences` -> many `tv_ad_occurrence_clips`
- `tv_ad_occurrences` -> many `tv_detection_evidence`
- `tv_ad_occurrences` -> many `tv_review_actions`

### Social

- `social_accounts` -> many `social_posts`
- `social_posts` -> many `social_post_media`
- `social_posts` -> many `social_post_metrics`
- `social_accounts` -> many `social_account_metrics`
- `social_accounts` -> many `social_sync_jobs`
- `social_sync_jobs` -> many `social_raw_payloads`

### Web

- `websites` -> many `website_pages`
- `websites` -> many `website_crawl_runs`
- `website_crawl_runs` -> many `website_crawl_errors`
- `website_crawl_runs` -> many `website_ad_occurrences`
- `website_ad_occurrences` -> many `website_ad_screenshots`
- `website_ad_creatives` -> many `website_ad_occurrences`

### OOH

- `ooh_locations` -> many `ooh_media_units`
- `ooh_media_units` -> many `ooh_campaign_assignments`
- `ooh_campaign_assignments` -> many `ooh_photos`
- `ooh_campaign_assignments` -> many `ooh_verification_visits`

---

## RLS strategy

The SQL migration enables RLS on all tenant-bearing tables.

### Main helper functions

- `public.is_org_member(target_org_id uuid)`
- `public.is_hizen_super_admin()`

### Access pattern

- normal users: only rows where they are active org members
- Hizen super admin: cross-org access
- profile/preferences: user can access their own rows, super admin can inspect
- `social_platforms`: readable to authenticated users, writable by Hizen super admin

---

## Index strategy

Important indexes already defined:

- org/name indexes for brands and campaigns
- time-series indexes for TV recordings and occurrences
- time-series indexes for social posts and metrics
- time-series indexes for website occurrences
- org/status indexes for alerts and processing jobs
- trigram search indexes for aliases, transcripts, captions, and URLs

---

## Seeded data

The seed file inserts:

- `Coca-Cola Iraq`
- `Hizen`
- base permissions
- system roles
- social platform catalog
- default retention policies

---

## Recommended next migrations

The current schema is a strong production foundation. For the next iteration, I recommend adding:

1. database enums for repeated status fields
2. `source_provenance` standard columns on more tables if you want stricter lineage
3. materialized views for executive reporting
4. pgvector-backed embedding columns if vector search will run directly inside Supabase
5. dedicated junction tables for user-to-dashboard sharing if collaboration grows

---

## Most important tables by business value

If you want to understand the platform quickly, start here:

1. `organizations`
2. `organization_members`
3. `brands`
4. `campaigns`
5. `creative_assets`
6. `tv_recording_files`
7. `tv_ad_occurrences`
8. `social_accounts`
9. `social_posts`
10. `website_ad_occurrences`
11. `ooh_campaign_assignments`
12. `reports`
13. `alerts`

