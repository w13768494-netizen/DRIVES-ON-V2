SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict rcWyM9f6TScoTfO5pdZFcwN0WbTCUGfX3Cw59AzHqR0o5XQLbQuinZvhzBd31ox

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."flow_state" ("id", "user_id", "auth_code", "code_challenge_method", "code_challenge", "provider_type", "provider_access_token", "provider_refresh_token", "created_at", "updated_at", "authentication_method", "auth_code_issued_at", "invite_token", "referrer", "oauth_client_state_id", "linking_target_id", "email_optional") VALUES
	('14a2b37a-a628-476e-af90-a55ae18ed3e9', '1eca8d91-046d-4fd2-8e63-6e62a87c83fa', '7cd12dbe-3fd3-4f7c-b2a4-dd9e8d46cf22', 's256', 'HWxsFX-SUlkD4DotYLEJJ1a5NU7vmdGBm-KJJ15bUnc', 'email', '', '', '2026-05-06 20:49:45.631712+00', '2026-05-06 20:49:45.631712+00', 'email/signup', NULL, NULL, NULL, NULL, NULL, false);


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
	('00000000-0000-0000-0000-000000000000', 'e02f3821-b00e-4834-a7ea-4cbfd9bbf9f6', 'authenticated', 'authenticated', 'vroom.rentacar33@gmail.com', '$2a$10$Ep1EYCGvU8p4qnQmLSBwjeLjj90q2ohtutlqjZxqxenP7NCFDV38S', '2026-05-19 12:17:33.372337+00', '2026-05-19 12:14:56.183565+00', '', NULL, '', NULL, '', '', NULL, '2026-05-21 11:06:33.830268+00', '{"provider": "email", "providers": ["email"]}', '{"role": "loueur", "full_name": "Louis Druet", "company_name": "LIBERTY RENT", "email_verified": true}', NULL, '2026-05-19 12:14:56.187859+00', '2026-05-21 16:27:52.142315+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '08e1e117-5061-444c-bce7-769cb86cb21a', 'authenticated', 'authenticated', 'serdine33@hotmail.fr', '$2a$10$/CrHP2gRlE04JkcmDZDKIet3hVa6IJ62zTMRyKkFNf9Klux3JDKGW', '2026-05-19 12:22:54.571751+00', '2026-05-19 12:12:10.369733+00', '', NULL, '', NULL, '', '', NULL, '2026-05-22 09:09:43.685142+00', '{"provider": "email", "providers": ["email"]}', '{"role": "loueur", "full_name": "wilfried druet", "account_type": null, "company_name": "Cityrent", "email_verified": true}', NULL, '2026-05-19 12:12:10.373959+00', '2026-05-23 09:58:34.033074+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'd72b1c63-e07a-42c2-8f84-d4a09146e89a', 'authenticated', 'authenticated', 'support@drives-on.fr', '$2a$10$//5cHHb0mE0T.kpVeNg7KOVc6dCvRDBpjXmm4t/B6WsgkxBCaR9U6', '2026-05-07 13:16:58.510836+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-06-18 11:30:47.5805+00', '{"provider": "email", "providers": ["email"]}', '{"company_name": "DRIVES ON", "email_verified": true}', NULL, '2026-05-07 13:16:58.49495+00', '2026-06-18 11:30:47.583298+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'da5fc9d3-0e61-427a-9c0b-837c55b8bede', 'authenticated', 'authenticated', 'contact@drives-on.fr', '$2a$10$BDkcYKAf9KuZwDSHBYVka.t6doTBjCtNA8w6CDMwIaLJKYfm9.CGO', '2026-05-19 11:37:24.939184+00', '2026-05-19 11:36:09.593187+00', '', NULL, '', NULL, '', '', NULL, '2026-06-18 11:35:05.013976+00', '{"provider": "email", "providers": ["email"]}', '{"role": "loueur", "full_name": "taib El azizi", "account_type": null, "company_name": "Drivzon", "email_verified": true}', NULL, '2026-05-19 11:36:09.600326+00', '2026-06-18 13:08:25.359537+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '9140f497-bfc4-4f7c-864a-961e3aa98262', 'authenticated', 'authenticated', 'elaz.taib@hotmail.fr', '$2a$10$KZDov.fdbL69ahyDhb6Za.bsgVTRTj0/h6wLkDSaSFSbC..DDBUb6', '2026-05-19 11:59:04.781106+00', '2026-05-19 11:58:42.335595+00', '', NULL, '', NULL, '', '', NULL, '2026-06-18 11:26:01.011725+00', '{"provider": "email", "providers": ["email"]}', '{"role": "assisteur", "full_name": "Taib El azizi", "account_type": "assistance", "company_name": "Drivz assistance", "email_verified": true}', NULL, '2026-05-19 11:58:42.335955+00', '2026-06-18 13:10:34.559276+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'd36ff139-e623-4e75-b934-6c4c1626634b', 'authenticated', 'authenticated', 'w13768494@gmail.com', '$2a$10$bIaj9hT9t81EfCRcXFrxkOV6Nki5iVJTeG03eCeMry.p0Rvv.qYCO', '2026-05-21 13:03:43.093147+00', '2026-05-21 13:00:51.617275+00', '', NULL, '', NULL, '', '', NULL, '2026-05-23 12:42:17.294739+00', '{"provider": "email", "providers": ["email"]}', '{"role": "assisteur", "full_name": "assu gir", "account_type": "insurance_agent", "company_name": "Assugir", "email_verified": true}', NULL, '2026-05-21 13:00:51.62217+00', '2026-06-18 11:13:43.82219+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") VALUES
	('9140f497-bfc4-4f7c-864a-961e3aa98262', '9140f497-bfc4-4f7c-864a-961e3aa98262', '{"sub": "9140f497-bfc4-4f7c-864a-961e3aa98262", "email": "elaz.taib@hotmail.fr", "email_verified": true, "phone_verified": false}', 'email', '2026-05-19 11:58:42.3468+00', '2026-05-19 11:58:42.346861+00', '2026-05-19 11:58:42.346861+00', '0f3e47cc-9125-4e32-964f-430e4d25a488'),
	('d72b1c63-e07a-42c2-8f84-d4a09146e89a', 'd72b1c63-e07a-42c2-8f84-d4a09146e89a', '{"sub": "d72b1c63-e07a-42c2-8f84-d4a09146e89a", "email": "support@drives-on.fr", "email_verified": false, "phone_verified": false}', 'email', '2026-05-07 13:16:58.505674+00', '2026-05-07 13:16:58.505735+00', '2026-05-07 13:16:58.505735+00', '747094d1-da05-4f7f-be38-db5cfb417f21'),
	('da5fc9d3-0e61-427a-9c0b-837c55b8bede', 'da5fc9d3-0e61-427a-9c0b-837c55b8bede', '{"sub": "da5fc9d3-0e61-427a-9c0b-837c55b8bede", "email": "contact@drives-on.fr", "email_verified": true, "phone_verified": false}', 'email', '2026-05-19 11:36:09.633561+00', '2026-05-19 11:36:09.633612+00', '2026-05-19 11:36:09.633612+00', '94bd9663-df63-4a92-ad24-d41020676329'),
	('e02f3821-b00e-4834-a7ea-4cbfd9bbf9f6', 'e02f3821-b00e-4834-a7ea-4cbfd9bbf9f6', '{"sub": "e02f3821-b00e-4834-a7ea-4cbfd9bbf9f6", "email": "vroom.rentacar33@gmail.com", "email_verified": true, "phone_verified": false}', 'email', '2026-05-19 12:14:56.214273+00', '2026-05-19 12:14:56.21433+00', '2026-05-19 12:14:56.21433+00', 'f8427f07-10f1-4a91-9b63-c8e8a273fbc6'),
	('08e1e117-5061-444c-bce7-769cb86cb21a', '08e1e117-5061-444c-bce7-769cb86cb21a', '{"sub": "08e1e117-5061-444c-bce7-769cb86cb21a", "email": "serdine33@hotmail.fr", "email_verified": true, "phone_verified": false}', 'email', '2026-05-19 12:12:10.396126+00', '2026-05-19 12:12:10.396185+00', '2026-05-19 12:12:10.396185+00', '6575e7de-cb43-40a8-bfbd-0a5a21676745'),
	('d36ff139-e623-4e75-b934-6c4c1626634b', 'd36ff139-e623-4e75-b934-6c4c1626634b', '{"sub": "d36ff139-e623-4e75-b934-6c4c1626634b", "email": "w13768494@gmail.com", "email_verified": true, "phone_verified": false}', 'email', '2026-05-21 13:00:51.644216+00', '2026-05-21 13:00:51.644864+00', '2026-05-21 13:00:51.644864+00', '8cb2db79-2a53-4147-a221-25fc609c8e56');


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag", "oauth_client_id", "refresh_token_hmac_key", "refresh_token_counter", "scopes") VALUES
	('9fad1cf7-e7c5-414f-9b86-8477feaeacf9', 'd36ff139-e623-4e75-b934-6c4c1626634b', '2026-05-23 12:42:17.297031+00', '2026-06-18 11:13:45.267399+00', NULL, 'aal1', NULL, '2026-06-18 11:13:45.267291', 'Vercel Edge Functions', '15.224.106.214', NULL, NULL, NULL, NULL, NULL),
	('73691edb-c874-47e2-9f24-cb8e297af4c2', 'da5fc9d3-0e61-427a-9c0b-837c55b8bede', '2026-06-18 11:35:05.014129+00', '2026-06-18 13:08:27.113926+00', NULL, 'aal1', NULL, '2026-06-18 13:08:27.113836', 'Vercel Edge Functions', '13.38.53.32', NULL, NULL, NULL, NULL, NULL),
	('5151ee6c-61cf-43c0-80b7-a94edd97d730', '9140f497-bfc4-4f7c-864a-961e3aa98262', '2026-06-18 11:26:01.011828+00', '2026-06-18 13:10:34.561246+00', NULL, 'aal1', NULL, '2026-06-18 13:10:34.561116', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15', '82.210.42.78', NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") VALUES
	('9fad1cf7-e7c5-414f-9b86-8477feaeacf9', '2026-05-23 12:42:17.306634+00', '2026-05-23 12:42:17.306634+00', 'password', '5769eae7-dad2-4590-86dc-67e24a13ce04'),
	('5151ee6c-61cf-43c0-80b7-a94edd97d730', '2026-06-18 11:26:01.01434+00', '2026-06-18 11:26:01.01434+00', 'password', 'ff0baf8d-6f5e-4163-828d-10b6eacd796c'),
	('73691edb-c874-47e2-9f24-cb8e297af4c2', '2026-06-18 11:35:05.018975+00', '2026-06-18 11:35:05.018975+00', 'password', '18aa5cda-2968-4ca3-af1c-5f9df757bd3f');


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") VALUES
	('00000000-0000-0000-0000-000000000000', 223, 'gwu36f3o5dpw', 'd36ff139-e623-4e75-b934-6c4c1626634b', true, '2026-05-26 13:46:55.207854+00', '2026-05-26 14:45:31.058085+00', 'lk4rmw6bfrq2', '9fad1cf7-e7c5-414f-9b86-8477feaeacf9'),
	('00000000-0000-0000-0000-000000000000', 224, 'ihmnmpqty4h6', 'd36ff139-e623-4e75-b934-6c4c1626634b', true, '2026-05-26 14:45:31.068061+00', '2026-05-27 18:47:11.489439+00', 'gwu36f3o5dpw', '9fad1cf7-e7c5-414f-9b86-8477feaeacf9'),
	('00000000-0000-0000-0000-000000000000', 225, '6ftsk2ko4rqf', 'd36ff139-e623-4e75-b934-6c4c1626634b', true, '2026-05-27 18:47:11.509469+00', '2026-06-18 11:13:43.818801+00', 'ihmnmpqty4h6', '9fad1cf7-e7c5-414f-9b86-8477feaeacf9'),
	('00000000-0000-0000-0000-000000000000', 227, 'hgfoghs7putm', 'd36ff139-e623-4e75-b934-6c4c1626634b', false, '2026-06-18 11:13:43.820881+00', '2026-06-18 11:13:43.820881+00', '6ftsk2ko4rqf', '9fad1cf7-e7c5-414f-9b86-8477feaeacf9'),
	('00000000-0000-0000-0000-000000000000', 232, 'a5mcz5kqognv', 'da5fc9d3-0e61-427a-9c0b-837c55b8bede', true, '2026-06-18 11:35:05.016484+00', '2026-06-18 13:08:25.356637+00', NULL, '73691edb-c874-47e2-9f24-cb8e297af4c2'),
	('00000000-0000-0000-0000-000000000000', 233, 'skrujglx3wqf', 'da5fc9d3-0e61-427a-9c0b-837c55b8bede', false, '2026-06-18 13:08:25.358251+00', '2026-06-18 13:08:25.358251+00', 'a5mcz5kqognv', '73691edb-c874-47e2-9f24-cb8e297af4c2'),
	('00000000-0000-0000-0000-000000000000', 230, 'hlm4fusrnqmb', '9140f497-bfc4-4f7c-864a-961e3aa98262', true, '2026-06-18 11:26:01.012909+00', '2026-06-18 13:10:34.556333+00', NULL, '5151ee6c-61cf-43c0-80b7-a94edd97d730'),
	('00000000-0000-0000-0000-000000000000', 234, '7jcrjslb3gc5', '9140f497-bfc4-4f7c-864a-961e3aa98262', false, '2026-06-18 13:10:34.557272+00', '2026-06-18 13:10:34.557272+00', 'hlm4fusrnqmb', '5151ee6c-61cf-43c0-80b7-a94edd97d730'),
	('00000000-0000-0000-0000-000000000000', 219, 'khc32pcqwoib', 'd36ff139-e623-4e75-b934-6c4c1626634b', true, '2026-05-23 12:42:17.303+00', '2026-05-26 09:38:15.742397+00', NULL, '9fad1cf7-e7c5-414f-9b86-8477feaeacf9'),
	('00000000-0000-0000-0000-000000000000', 220, 'fl64m7t7l2jl', 'd36ff139-e623-4e75-b934-6c4c1626634b', true, '2026-05-26 09:38:15.754553+00', '2026-05-26 10:50:38.828672+00', 'khc32pcqwoib', '9fad1cf7-e7c5-414f-9b86-8477feaeacf9'),
	('00000000-0000-0000-0000-000000000000', 221, 'o3kuep2apmdl', 'd36ff139-e623-4e75-b934-6c4c1626634b', true, '2026-05-26 10:50:38.834302+00', '2026-05-26 12:38:24.24947+00', 'fl64m7t7l2jl', '9fad1cf7-e7c5-414f-9b86-8477feaeacf9'),
	('00000000-0000-0000-0000-000000000000', 222, 'lk4rmw6bfrq2', 'd36ff139-e623-4e75-b934-6c4c1626634b', true, '2026-05-26 12:38:24.263552+00', '2026-05-26 13:46:55.199421+00', 'o3kuep2apmdl', '9fad1cf7-e7c5-414f-9b86-8477feaeacf9');


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: webauthn_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."profiles" ("id", "role", "full_name", "company_name", "phone", "created_at", "updated_at", "is_active", "account_type") VALUES
	('da5fc9d3-0e61-427a-9c0b-837c55b8bede', 'loueur', 'taib El azizi', 'Drivzon', NULL, '2026-05-19 11:36:09.597111+00', '2026-05-19 11:36:09.597111+00', true, NULL),
	('9140f497-bfc4-4f7c-864a-961e3aa98262', 'assisteur', 'Taib El azizi', 'Drivz assistance', NULL, '2026-05-19 11:58:42.33568+00', '2026-05-19 11:58:42.33568+00', true, 'assistance'),
	('08e1e117-5061-444c-bce7-769cb86cb21a', 'loueur', 'wilfried druet', 'Cityrent', NULL, '2026-05-19 12:12:10.3729+00', '2026-05-19 12:12:10.3729+00', true, NULL),
	('e02f3821-b00e-4834-a7ea-4cbfd9bbf9f6', 'loueur', 'Louis Druet', 'LIBERTY RENT', NULL, '2026-05-19 12:14:56.187555+00', '2026-05-19 12:14:56.187555+00', true, NULL),
	('d72b1c63-e07a-42c2-8f84-d4a09146e89a', 'admin', 'support@drives-on.fr', 'DRIVES ON', '0612345678', '2026-05-07 13:16:58.494572+00', '2026-05-19 12:19:02.841371+00', true, NULL),
	('d36ff139-e623-4e75-b934-6c4c1626634b', 'assisteur', 'assu gir', 'Assugir', NULL, '2026-05-21 13:00:51.619922+00', '2026-05-21 13:00:51.619922+00', true, 'insurance_agent');


--
-- Data for Name: access_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."access_requests" ("id", "email", "full_name", "company_name", "role", "phone", "message", "status", "created_at", "reviewed_by", "reviewed_at", "account_type", "contact_function", "siret", "address", "city", "postal_code", "intervention_zone", "monthly_requests_estimate", "extra_fields") VALUES
	('c043d611-2deb-4ca5-9963-61e182215f01', 'contact@drives-on.fr', 'taib El azizi', 'Drivzon', 'loueur', '0612345678', NULL, 'approved', '2026-05-19 11:35:24.823561+00', NULL, '2026-05-19 11:36:09.795+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
	('ab37f5ba-070b-4696-9bed-3eb9a5882b7e', 'wilfried.druet@outlook.fr', 'Wilfried Druet', 'CITY RENT', 'loueur', '0650209686', NULL, 'approved', '2026-05-19 11:46:47.482724+00', NULL, '2026-05-19 11:47:34.819+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
	('9c45a881-1fc7-46c8-993e-56ccbcf84bbe', 'elaz.taib@hotmail.fr', 'Taib El azizi', 'Drivz assistance', 'assisteur', '0612345678', NULL, 'approved', '2026-05-19 11:57:27.946212+00', NULL, '2026-05-19 11:58:42.49+00', 'assistance', 'Directeur', NULL, '20 Rue de la Commanderie des Templiers', 'Ambarès-et-Lagrave', '33440', 'bordeaux', 30, '{"platform": "Plateforme assistance", "dossier_types": "sinistre auto"}'),
	('99ae55a1-2933-4876-b353-f7d63245cdc9', 'wilfried.druet@outlook.fr', 'Wilfried Druet', 'LIBERTY RENT', 'loueur', '0650209686', NULL, 'approved', '2026-05-19 12:06:20.992374+00', NULL, '2026-05-19 12:07:15.651+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
	('a73f0e21-b15b-420d-8849-c231ce15c651', 'serdine33@hotmail.fr', 'wilfried druet', 'Cityrent', 'loueur', '0612345678', NULL, 'approved', '2026-05-19 12:10:51.141561+00', NULL, '2026-05-19 12:12:10.572+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
	('af26ac6f-df06-49e3-86c1-2c3e4ad5c3d6', 'w13768494@gmail.com', 'assu gir', 'Assugir', 'assisteur', '0612345678', NULL, 'approved', '2026-05-21 12:53:37.107415+00', NULL, '2026-05-21 13:00:52.062+00', 'insurance_agent', 'directeur', NULL, 'rue emond faulat', 'Ambarès-et-Lagrave', '33440', 'Bordeaux', 20, '{"orias": null, "network": "Assugir", "clientele": ""}');


--
-- Data for Name: admin_audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."admin_audit_logs" ("id", "created_at", "admin_id", "action", "target_type", "target_id", "before_json", "after_json", "metadata") VALUES
	('afd842da-efc5-4d15-a6b7-ddf38b8389d6', '2026-05-21 10:51:02.22919+00', 'd72b1c63-e07a-42c2-8f84-d4a09146e89a', 'finance_recalculated', 'request', 'req-1779200438844-yb58o', '{"payment_status": "non_applicable"}', '{"payment_status": "en_attente", "total_amount_ht": 90}', '{"reason": null, "finance_action": "recalculate"}'),
	('cdf69fda-7038-4a47-bfd7-d77b39626cc0', '2026-05-21 15:08:42.795423+00', '00000000-0000-0000-0000-000000000001', 'status_changed', 'request', 'req-1779199627515-1zgeq', '{"status": "confirmee"}', '{"status": "overdue", "overdue_at": "2026-05-21T15:08:42.750Z"}', '{"source": "cron/check-overdue"}'),
	('e3bac632-57b0-426b-9927-e09efa08bb1d', '2026-05-21 18:47:01.428776+00', 'd72b1c63-e07a-42c2-8f84-d4a09146e89a', 'payment_status_changed', 'request', 'req-1779200438844-yb58o', '{"payment_status": "en_attente"}', '{"payment_status": "pret_a_payer", "total_amount_ht": 90}', '{"reason": null, "finance_action": "mark_ready"}'),
	('b2e61734-e5b9-4f46-9f8e-635d01fcedd8', '2026-05-21 18:47:24.560899+00', 'd72b1c63-e07a-42c2-8f84-d4a09146e89a', 'payment_status_changed', 'request', 'req-1779200438844-yb58o', '{"payment_status": "pret_a_payer"}', '{"payment_status": "paye", "total_amount_ht": 90}', '{"reason": null, "finance_action": "mark_paid"}');


--
-- Data for Name: rental_agencies; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."rental_agencies" ("id", "owner_id", "company_name", "agency_name", "email", "phone", "address", "city", "postal_code", "lat", "lng", "service_radius_km", "active", "created_at", "contact_name", "is_available", "opening_hours_weekdays", "opening_hours_saturday", "opening_hours_sunday", "external_id", "score_total", "score_reactivity", "score_response_rate", "score_reliability", "total_received", "total_confirmed", "avg_response_min", "score_updated_at") VALUES
	('773679e7-034d-479b-a622-e769183f2a4e', 'da5fc9d3-0e61-427a-9c0b-837c55b8bede', 'Drivzon', 'Drivzon Bordeaux', 'contact@drives-on.fr', '0612345678', '9 Rue André Darbon', 'Bordeaux', '33300', 44.8548964, -0.5678671, 30, true, '2026-05-19 11:40:14.213306+00', 'Taib el azizi', true, '8h-18h', '9h-17h', '9h-12h', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
	('8a2dd9a2-37ae-4224-9617-72ffffbb64b1', 'e02f3821-b00e-4834-a7ea-4cbfd9bbf9f6', 'LIBERTY RENT', 'LIBERTY RENT LE BARP', 'vroom.rentacar33@gmail.com', '0532260006', '3 rue andré Brun', 'Le barp', '33114', 44.622216, -0.787866, 30, true, '2026-05-19 12:14:56.540179+00', 'Louis Druet', true, '8h - 18h', '9h - 12h', 'Fermé', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
	('6f5ad8ac-b5b8-4fac-addb-fbf7fddc9cff', '08e1e117-5061-444c-bce7-769cb86cb21a', 'Cityrent', 'Cityrent Bordeaux', 'serdine33@hotmail.fr', '0612345678', '15 rue de la paix', 'Bordeaux', '33200', 44.842683, -0.6122949, 25, true, '2026-05-19 12:26:56.109918+00', 'Wilfried Druet', true, '8h-18h', '9h-12h', 'Fermé', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
	('7e4fdd31-bed5-462e-a472-3df64084947e', 'e02f3821-b00e-4834-a7ea-4cbfd9bbf9f6', 'LIBERTY RENT ', 'LIBERTY RENT CENON', 'vroom.rentacar33@gmail.com', '0532260006', '125 avenue rené cassagne', 'Cenon', '33150', 44.8631627, -0.5140867, 20, true, '2026-05-19 13:58:05.305315+00', 'Louis Druet', true, '8h - 18h', '9h - 12h', '8h - 18h', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: agency_services; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: agency_vehicle_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."agency_vehicle_categories" ("id", "agency_id", "category", "group_type", "available", "stock_estimate", "daily_rate", "deposit", "included_km_per_day", "extra_km_price", "packages", "created_at", "modele_equivalent", "tarif_1_4", "tarif_5_7", "tarif_8_14", "tarif_15_21", "tarif_22_29", "forfait_30_jours", "actif", "fuel_type", "transmission", "stock_live") VALUES
	('7f8a1f58-aab2-428c-9b2d-13fccdcf6e3d', '773679e7-034d-479b-a622-e769183f2a4e', 'citadine', 'tourisme', true, 0, 36.75, 0.00, 150, 0.24, '[]', '2026-05-19 11:43:37.037488+00', 'Peugeot 208', 36.75, 30.32, 27.29, 25.92, 25.27, 739.28, true, 'essence', 'manuelle', 10),
	('a1240a9f-8044-4c4c-b5cc-2c10e0d1f72d', '773679e7-034d-479b-a622-e769183f2a4e', 'compacte', 'tourisme', true, 0, 43.75, 0.00, 150, 0.33, '[]', '2026-05-19 11:47:57.140305+00', 'Peugeot 308', 43.75, 35.55, 31.99, 30.39, 29.63, 866.76, true, 'essence', 'manuelle', 10),
	('10305ddf-a4fd-46f4-8853-8c8ae31810a1', '8a2dd9a2-37ae-4224-9617-72ffffbb64b1', 'citadine', 'tourisme', true, 0, 36.75, 0.00, 150, 0.23, '[]', '2026-05-19 12:25:43.462627+00', 'Citroen C3', 36.75, 30.32, 27.29, 25.92, 25.27, 739.28, true, 'essence', 'manuelle', 20),
	('963b9513-533b-4435-9b68-c47e6d505ff1', '6f5ad8ac-b5b8-4fac-addb-fbf7fddc9cff', '7_places', 'tourisme', true, 0, 136.88, 0.00, 150, 0.24, '[]', '2026-05-19 12:30:35.301611+00', 'Mercedes classe V', 136.88, 112.92, 101.63, 96.55, 94.13, 2753.43, true, 'diesel', 'automatique', 10),
	('ce2ebd23-80a3-4cdb-9903-246fb9371881', '6f5ad8ac-b5b8-4fac-addb-fbf7fddc9cff', 'premium', 'tourisme', true, 0, 49.58, 0.00, 150, 0.33, '[]', '2026-05-19 12:32:33.913164+00', 'Mercedes classe A', 49.58, 40.91, 36.82, 34.97, 34.1, 997.44, true, 'essence', 'automatique', 150),
	('da4501ad-efd8-4ad2-8aaa-8851c5bbf1c7', '7e4fdd31-bed5-462e-a472-3df64084947e', 'citadine', 'tourisme', true, 0, 41.25, 0.00, 150, 0.24, '[]', '2026-05-19 13:59:39.701489+00', 'Renault Clio', 41.25, 34.03, 30.63, 29.1, 28.37, 829.8, true, 'essence', 'automatique', 25);


--
-- Data for Name: deployment_cities; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."deployment_cities" ("id", "name", "slug", "department", "department_code", "region", "status", "latitude", "longitude", "cover_radius_km", "vehicle_types", "loueur_count", "activated_at", "notes", "created_at", "updated_at") VALUES
	('city-paris', 'Paris', 'paris', 'Paris', '75', 'Île-de-France', 'active', 48.8566, 2.3522, 40, '{tourisme,utilitaire}', 1, '2026-05-05 23:52:44.381521+00', NULL, '2026-05-05 23:52:44.381521+00', '2026-05-05 23:52:44.381521+00'),
	('city-creteil', 'Créteil', 'creteil', 'Val-de-Marne', '94', 'Île-de-France', 'active', 48.7848, 2.4554, 30, '{tourisme}', 1, '2026-05-05 23:52:44.381521+00', NULL, '2026-05-05 23:52:44.381521+00', '2026-05-05 23:52:44.381521+00'),
	('city-versailles', 'Versailles', 'versailles', 'Yvelines', '78', 'Île-de-France', 'planned', 48.8014, 2.1301, 25, '{}', 0, NULL, NULL, '2026-05-05 23:52:44.381521+00', '2026-05-05 23:52:44.381521+00'),
	('city-grenoble', 'Grenoble', 'grenoble', 'Isère', '38', 'Auvergne-Rhône-Alpes', 'planned', 45.1885, 5.7245, 30, '{}', 0, NULL, NULL, '2026-05-05 23:52:44.381521+00', '2026-05-05 23:52:44.381521+00'),
	('city-marseille', 'Marseille', 'marseille', 'Bouches-du-Rhône', '13', 'Provence-Alpes-Côte d''Azur', 'deploying', 43.2965, 5.3698, 40, '{tourisme}', 0, NULL, NULL, '2026-05-05 23:52:44.381521+00', '2026-05-05 23:52:44.381521+00'),
	('city-nice', 'Nice', 'nice', 'Alpes-Maritimes', '06', 'Provence-Alpes-Côte d''Azur', 'planned', 43.7102, 7.262, 30, '{}', 0, NULL, NULL, '2026-05-05 23:52:44.381521+00', '2026-05-05 23:52:44.381521+00'),
	('city-toulouse', 'Toulouse', 'toulouse', 'Haute-Garonne', '31', 'Occitanie', 'planned', 43.6047, 1.4442, 35, '{}', 0, NULL, NULL, '2026-05-05 23:52:44.381521+00', '2026-05-05 23:52:44.381521+00'),
	('city-rennes', 'Rennes', 'rennes', 'Ille-et-Vilaine', '35', 'Bretagne', 'planned', 48.1173, -1.6778, 30, '{}', 0, NULL, NULL, '2026-05-05 23:52:44.381521+00', '2026-05-05 23:52:44.381521+00'),
	('city-lille', 'Lille', 'lille', 'Nord', '59', 'Hauts-de-France', 'planned', 50.6292, 3.0573, 35, '{}', 0, NULL, NULL, '2026-05-05 23:52:44.381521+00', '2026-05-05 23:52:44.381521+00'),
	('city-strasbourg', 'Strasbourg', 'strasbourg', 'Bas-Rhin', '67', 'Grand Est', 'planned', 48.5734, 7.7521, 30, '{}', 0, NULL, NULL, '2026-05-05 23:52:44.381521+00', '2026-05-05 23:52:44.381521+00'),
	('city-nantes', 'Nantes', 'nantes', 'Loire-Atlantique', '44', 'Pays de la Loire', 'planned', 47.2184, -1.5536, 35, '{}', 0, NULL, NULL, '2026-05-05 23:52:44.381521+00', '2026-05-05 23:52:44.381521+00'),
	('city-lyon', 'Lyon', 'lyon', 'Métropole de Lyon', '69', 'Auvergne-Rhône-Alpes', 'inactive', 45.764, 4.8357, 50, '{tourisme,utilitaire}', 1, '2026-05-19 12:01:12.381+00', NULL, '2026-05-05 23:52:44.381521+00', '2026-05-19 12:01:14.388403+00'),
	('city-rouen', 'Rouen', 'rouen', 'Seine-Maritime', '76', 'Normandie', 'planned', 49.4432, 1.0993, 35, '{}', 0, NULL, NULL, '2026-05-06 00:31:10.603844+00', '2026-05-06 00:31:10.603844+00'),
	('city-caen', 'Caen', 'caen', 'Calvados', '14', 'Normandie', 'planned', 49.1829, -0.3707, 30, '{}', 0, NULL, NULL, '2026-05-06 00:31:10.603844+00', '2026-05-06 00:31:10.603844+00'),
	('city-le-havre', 'Le Havre', 'le-havre', 'Seine-Maritime', '76', 'Normandie', 'planned', 49.4939, 0.1077, 35, '{}', 0, NULL, NULL, '2026-05-06 00:31:10.603844+00', '2026-05-06 00:31:10.603844+00'),
	('city-dijon', 'Dijon', 'dijon', 'Côte-d''Or', '21', 'Bourgogne-Franche-Comté', 'planned', 47.322, 5.0415, 35, '{}', 0, NULL, NULL, '2026-05-06 00:31:10.603844+00', '2026-05-06 00:31:10.603844+00'),
	('city-besancon', 'Besançon', 'besancon', 'Doubs', '25', 'Bourgogne-Franche-Comté', 'planned', 47.2378, 6.0241, 30, '{}', 0, NULL, NULL, '2026-05-06 00:31:10.603844+00', '2026-05-06 00:31:10.603844+00'),
	('city-tours', 'Tours', 'tours', 'Indre-et-Loire', '37', 'Centre-Val de Loire', 'planned', 47.3941, 0.6848, 35, '{}', 0, NULL, NULL, '2026-05-06 00:31:10.603844+00', '2026-05-06 00:31:10.603844+00'),
	('city-orleans', 'Orléans', 'orleans', 'Loiret', '45', 'Centre-Val de Loire', 'planned', 47.9029, 1.9039, 30, '{}', 0, NULL, NULL, '2026-05-06 00:31:10.603844+00', '2026-05-06 00:31:10.603844+00'),
	('city-clermont-ferrand', 'Clermont-Ferrand', 'clermont-ferrand', 'Puy-de-Dôme', '63', 'Auvergne-Rhône-Alpes', 'planned', 45.7772, 3.087, 35, '{}', 0, NULL, NULL, '2026-05-06 00:31:10.603844+00', '2026-05-06 00:31:10.603844+00'),
	('city-saint-etienne', 'Saint-Étienne', 'saint-etienne', 'Loire', '42', 'Auvergne-Rhône-Alpes', 'planned', 45.4397, 4.3872, 30, '{}', 0, NULL, NULL, '2026-05-06 00:31:10.603844+00', '2026-05-06 00:31:10.603844+00'),
	('city-annecy', 'Annecy', 'annecy', 'Haute-Savoie', '74', 'Auvergne-Rhône-Alpes', 'planned', 45.8992, 6.1294, 30, '{}', 0, NULL, NULL, '2026-05-06 00:31:10.603844+00', '2026-05-06 00:31:10.603844+00'),
	('city-valence', 'Valence', 'valence', 'Drôme', '26', 'Auvergne-Rhône-Alpes', 'planned', 44.9334, 4.8924, 30, '{}', 0, NULL, NULL, '2026-05-06 00:31:10.603844+00', '2026-05-06 00:31:10.603844+00'),
	('city-toulon', 'Toulon', 'toulon', 'Var', '83', 'Provence-Alpes-Côte d''Azur', 'planned', 43.1242, 5.928, 35, '{}', 0, NULL, NULL, '2026-05-06 00:31:10.603844+00', '2026-05-06 00:31:10.603844+00'),
	('city-aix-en-provence', 'Aix-en-Provence', 'aix-en-provence', 'Bouches-du-Rhône', '13', 'Provence-Alpes-Côte d''Azur', 'planned', 43.5297, 5.4474, 30, '{}', 0, NULL, NULL, '2026-05-06 00:31:10.603844+00', '2026-05-06 00:31:10.603844+00'),
	('city-avignon', 'Avignon', 'avignon', 'Vaucluse', '84', 'Provence-Alpes-Côte d''Azur', 'planned', 43.9493, 4.8055, 30, '{}', 0, NULL, NULL, '2026-05-06 00:31:10.603844+00', '2026-05-06 00:31:10.603844+00'),
	('city-montpellier', 'Montpellier', 'montpellier', 'Hérault', '34', 'Occitanie', 'planned', 43.6108, 3.8767, 35, '{}', 0, NULL, NULL, '2026-05-06 00:31:10.603844+00', '2026-05-06 00:31:10.603844+00'),
	('city-nimes', 'Nîmes', 'nimes', 'Gard', '30', 'Occitanie', 'planned', 43.8367, 4.3601, 30, '{}', 0, NULL, NULL, '2026-05-06 00:31:10.603844+00', '2026-05-06 00:31:10.603844+00'),
	('city-perpignan', 'Perpignan', 'perpignan', 'Pyrénées-Orientales', '66', 'Occitanie', 'planned', 42.6988, 2.8954, 30, '{}', 0, NULL, NULL, '2026-05-06 00:31:10.603844+00', '2026-05-06 00:31:10.603844+00'),
	('city-limoges', 'Limoges', 'limoges', 'Haute-Vienne', '87', 'Nouvelle-Aquitaine', 'planned', 45.8336, 1.2611, 30, '{}', 0, NULL, NULL, '2026-05-06 00:31:10.603844+00', '2026-05-06 00:31:10.603844+00'),
	('city-pau', 'Pau', 'pau', 'Pyrénées-Atlantiques', '64', 'Nouvelle-Aquitaine', 'planned', 43.2951, -0.3708, 25, '{}', 0, NULL, NULL, '2026-05-06 00:31:10.603844+00', '2026-05-06 00:31:10.603844+00'),
	('city-bayonne', 'Bayonne', 'bayonne', 'Pyrénées-Atlantiques', '64', 'Nouvelle-Aquitaine', 'planned', 43.4933, -1.475, 30, '{}', 0, NULL, NULL, '2026-05-06 00:31:10.603844+00', '2026-05-06 00:31:10.603844+00'),
	('city-la-rochelle', 'La Rochelle', 'la-rochelle', 'Charente-Maritime', '17', 'Nouvelle-Aquitaine', 'planned', 46.1603, -1.1511, 30, '{}', 0, NULL, NULL, '2026-05-06 00:31:10.603844+00', '2026-05-06 00:31:10.603844+00'),
	('city-poitiers', 'Poitiers', 'poitiers', 'Vienne', '86', 'Nouvelle-Aquitaine', 'planned', 46.5802, 0.3404, 30, '{}', 0, NULL, NULL, '2026-05-06 00:31:10.603844+00', '2026-05-06 00:31:10.603844+00'),
	('city-brest', 'Brest', 'brest', 'Finistère', '29', 'Bretagne', 'planned', 48.3904, -4.4861, 35, '{}', 0, NULL, NULL, '2026-05-06 00:31:10.603844+00', '2026-05-06 00:31:10.603844+00'),
	('city-quimper', 'Quimper', 'quimper', 'Finistère', '29', 'Bretagne', 'planned', 47.9975, -4.1006, 25, '{}', 0, NULL, NULL, '2026-05-06 00:31:10.603844+00', '2026-05-06 00:31:10.603844+00'),
	('city-lorient', 'Lorient', 'lorient', 'Morbihan', '56', 'Bretagne', 'planned', 47.7482, -3.3702, 25, '{}', 0, NULL, NULL, '2026-05-06 00:31:10.603844+00', '2026-05-06 00:31:10.603844+00'),
	('city-vannes', 'Vannes', 'vannes', 'Morbihan', '56', 'Bretagne', 'planned', 47.6587, -2.7603, 25, '{}', 0, NULL, NULL, '2026-05-06 00:31:10.603844+00', '2026-05-06 00:31:10.603844+00'),
	('city-saint-malo', 'Saint-Malo', 'saint-malo', 'Ille-et-Vilaine', '35', 'Bretagne', 'planned', 48.6492, -2.025, 25, '{}', 0, NULL, NULL, '2026-05-06 00:31:10.603844+00', '2026-05-06 00:31:10.603844+00'),
	('city-le-mans', 'Le Mans', 'le-mans', 'Sarthe', '72', 'Pays de la Loire', 'planned', 47.996, 0.1966, 30, '{}', 0, NULL, NULL, '2026-05-06 00:31:10.603844+00', '2026-05-06 00:31:10.603844+00'),
	('city-angers', 'Angers', 'angers', 'Maine-et-Loire', '49', 'Pays de la Loire', 'planned', 47.4784, -0.5632, 30, '{}', 0, NULL, NULL, '2026-05-06 00:31:10.603844+00', '2026-05-06 00:31:10.603844+00'),
	('city-amiens', 'Amiens', 'amiens', 'Somme', '80', 'Hauts-de-France', 'planned', 49.8941, 2.2957, 30, '{}', 0, NULL, NULL, '2026-05-06 00:31:10.603844+00', '2026-05-06 00:31:10.603844+00'),
	('city-calais', 'Calais', 'calais', 'Pas-de-Calais', '62', 'Hauts-de-France', 'planned', 50.9513, 1.8587, 30, '{}', 0, NULL, NULL, '2026-05-06 00:31:10.603844+00', '2026-05-06 00:31:10.603844+00'),
	('city-valenciennes', 'Valenciennes', 'valenciennes', 'Nord', '59', 'Hauts-de-France', 'planned', 50.3584, 3.5236, 25, '{}', 0, NULL, NULL, '2026-05-06 00:31:10.603844+00', '2026-05-06 00:31:10.603844+00'),
	('city-reims', 'Reims', 'reims', 'Marne', '51', 'Grand Est', 'planned', 49.2583, 4.0317, 35, '{}', 0, NULL, NULL, '2026-05-06 00:31:10.603844+00', '2026-05-06 00:31:10.603844+00'),
	('city-metz', 'Metz', 'metz', 'Moselle', '57', 'Grand Est', 'planned', 49.1193, 6.1757, 30, '{}', 0, NULL, NULL, '2026-05-06 00:31:10.603844+00', '2026-05-06 00:31:10.603844+00'),
	('city-bordeaux', 'Bordeaux', 'bordeaux', 'Gironde', '33', 'Nouvelle-Aquitaine', 'active', 44.8378, -0.5792, 35, '{}', 0, NULL, NULL, '2026-05-05 23:52:44.381521+00', '2026-05-07 14:16:57.747604+00'),
	('city-nancy', 'Nancy', 'nancy', 'Meurthe-et-Moselle', '54', 'Grand Est', 'planned', 48.6921, 6.1844, 30, '{}', 0, NULL, NULL, '2026-05-06 00:31:10.603844+00', '2026-05-06 00:31:10.603844+00'),
	('city-mulhouse', 'Mulhouse', 'mulhouse', 'Haut-Rhin', '68', 'Grand Est', 'planned', 47.7508, 7.3359, 25, '{}', 0, NULL, NULL, '2026-05-06 00:31:10.603844+00', '2026-05-06 00:31:10.603844+00'),
	('city-colmar', 'Colmar', 'colmar', 'Haut-Rhin', '68', 'Grand Est', 'planned', 48.0793, 7.3585, 25, '{}', 0, NULL, NULL, '2026-05-06 00:31:10.603844+00', '2026-05-06 00:31:10.603844+00'),
	('city-ajaccio', 'Ajaccio', 'ajaccio', 'Corse-du-Sud', '2A', 'Corse', 'planned', 41.9268, 8.7368, 30, '{}', 0, NULL, NULL, '2026-05-06 00:31:10.603844+00', '2026-05-06 00:31:10.603844+00'),
	('city-bastia', 'Bastia', 'bastia', 'Haute-Corse', '2B', 'Corse', 'planned', 42.7032, 9.4499, 25, '{}', 0, NULL, NULL, '2026-05-06 00:31:10.603844+00', '2026-05-06 00:31:10.603844+00');


--
-- Data for Name: assistance_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."assistance_requests" ("id", "status", "request_type", "dossier_number", "reference_number", "sinistre", "location", "coverage", "loueur_response", "transfers", "timeline", "extensions", "vehicle_group", "vehicle_category", "duration_days", "max_extension_days", "date_needed", "target_price_per_day", "notes", "requested_services", "assigned_agency_id", "assigned_agency_ids", "confirmed_agency_id", "confirmed_agency_name", "counter_offer_price", "counter_offer_message", "created_at", "confirmed_at", "returned_at", "created_by_user_id", "created_by_name", "coverage_type", "requester_account_type", "admin_notes", "admin_flags", "admin_updated_at", "admin_updated_by", "confirmed_price_per_day", "confirmed_duration_days", "commission_rate", "commission_amount", "total_amount_ht", "amount_due_to_loueur", "payment_status", "payment_validated_at", "payment_validated_by", "city_id", "has_damage_claim", "overdue_at", "damage_description") VALUES
	('req-1779437197838-eshek', 'confirmee', 'immediate', 'DOS-852-896', 'F4565666952', '{"email": "wilfried.druet@outlook.fr", "phone": "0650209686", "lastName": "Druet", "firstName": "Wilfried"}', '{"address": "3 avenue de Saige", "latitude": 44.7869894, "longitude": -0.6365101}', '{"creditType": "full"}', '{"agencyId": "6f5ad8ac-b5b8-4fac-addb-fbf7fddc9cff", "agencyName": "Cityrent Bordeaux", "pricePerDay": 136.88, "respondedAt": "2026-05-22T08:59:36.527Z"}', '[]', '[{"at": "2026-05-22T08:06:37.626Z", "id": "evt-1779437197838-454", "type": "creation", "byRole": "assisteur"}, {"at": "2026-05-22T08:06:38.626Z", "id": "evt-1779437197838-zjo", "type": "envoi", "byRole": "assisteur", "agencyId": "6f5ad8ac-b5b8-4fac-addb-fbf7fddc9cff"}, {"at": "2026-05-22T08:59:36.583Z", "id": "evt-1779440376583-f73", "type": "confirmation", "byRole": "loueur", "message": "136.88", "agencyId": "6f5ad8ac-b5b8-4fac-addb-fbf7fddc9cff"}, {"at": "2026-05-22T08:59:36.749Z", "id": "evt-1779440376749-w71", "type": "attribution", "byRole": "assisteur", "message": "Cityrent Bordeaux"}]', NULL, 'tourisme', '7_places', 5, NULL, '2026-05-26 08:04:00+00', NULL, NULL, '{}', '6f5ad8ac-b5b8-4fac-addb-fbf7fddc9cff', NULL, '6f5ad8ac-b5b8-4fac-addb-fbf7fddc9cff', 'Cityrent Bordeaux', NULL, NULL, '2026-05-22 08:06:37.626+00', '2026-05-22 08:59:36.583+00', NULL, 'd36ff139-e623-4e75-b934-6c4c1626634b', 'assu gir', 'full', 'insurance_agent', NULL, '{}', NULL, NULL, NULL, NULL, 0.1500, NULL, NULL, NULL, 'non_applicable', NULL, NULL, 'city-bordeaux', false, NULL, NULL),
	('req-1779194611144-4u506', 'cloturee', 'immediate', 'SIN-2024-123', 'REF-456', '{"email": "jean.dupont@hotmail.fr", "phone": "0612345678", "lastName": "DUPONT ", "firstName": "Jean"}', '{"address": "21 cours du medoc 33000 BORDEAUX", "latitude": 44.8570093, "longitude": -0.5651813}', '{"creditType": "full"}', '{"message": "Vehicule disponible", "agencyId": "8a2dd9a2-37ae-4224-9617-72ffffbb64b1", "agencyName": "LIBERTY RENT LE BARP", "pricePerDay": 33, "respondedAt": "2026-05-19T12:47:50.271Z", "vehicleModel": "Peugeot 208"}', '[]', '[{"at": "2026-05-19T12:43:30.908Z", "id": "evt-1779194611145-kg0", "type": "creation", "byRole": "assisteur"}, {"at": "2026-05-19T12:43:31.908Z", "id": "evt-1779194611145-5pp", "type": "envoi", "byRole": "assisteur", "agencyId": "773679e7-034d-479b-a622-e769183f2a4e"}, {"at": "2026-05-19T12:43:32.008Z", "id": "evt-1779194611145-zok", "type": "envoi", "byRole": "assisteur", "agencyId": "8a2dd9a2-37ae-4224-9617-72ffffbb64b1"}, {"at": "2026-05-19T12:47:50.356Z", "id": "evt-1779194870356-ymv", "type": "negociation", "byRole": "loueur", "message": "33", "agencyId": "8a2dd9a2-37ae-4224-9617-72ffffbb64b1"}, {"at": "2026-05-19T12:47:50.406Z", "id": "evt-1779194870356-6yo", "type": "attribution_fermee", "byRole": "system"}, {"at": "2026-05-19T12:50:06.816Z", "id": "evt-1779195006816-bv4", "type": "attribution", "byRole": "assisteur", "message": "LIBERTY RENT LE BARP"}, {"at": "2026-05-19T13:30:26.824Z", "id": "evt-1779197426824-11w", "type": "cloture", "byRole": "assisteur"}]', NULL, 'tourisme', 'citadine', 3, 10, '2026-05-20 12:42:00+00', 30, NULL, '{}', '773679e7-034d-479b-a622-e769183f2a4e', '{773679e7-034d-479b-a622-e769183f2a4e,8a2dd9a2-37ae-4224-9617-72ffffbb64b1}', '8a2dd9a2-37ae-4224-9617-72ffffbb64b1', 'LIBERTY RENT LE BARP', NULL, NULL, '2026-05-19 12:43:30.908+00', '2026-05-19 12:47:50.356+00', NULL, '9140f497-bfc4-4f7c-864a-961e3aa98262', 'Taib El azizi', 'full', 'assistance', NULL, '{}', NULL, NULL, NULL, NULL, 0.1500, NULL, NULL, NULL, 'non_applicable', NULL, NULL, 'city-bordeaux', false, NULL, NULL),
	('req-1779531205962-y4b69', 'confirmee', 'planifiee', 'DOS-852-896', 'F4565666952', '{"email": "wilfried.druet@outlook.fr", "phone": "0650209686", "lastName": "Druet", "firstName": "Wilfried"}', '{"address": "3 avenue de Saige", "latitude": 44.7869894, "longitude": -0.6365101}', '{"creditType": "partial"}', '{"agencyId": "773679e7-034d-479b-a622-e769183f2a4e", "agencyName": "Drivzon Bordeaux", "pricePerDay": 36.75, "respondedAt": "2026-05-23T10:23:44.484Z"}', '[]', '[{"at": "2026-05-23T10:13:24.815Z", "id": "evt-1779531205962-ctg", "type": "creation", "byRole": "assisteur"}, {"at": "2026-05-23T10:13:25.815Z", "id": "evt-1779531205962-kiu", "type": "envoi", "byRole": "assisteur", "agencyId": "773679e7-034d-479b-a622-e769183f2a4e"}, {"at": "2026-05-23T10:13:25.915Z", "id": "evt-1779531205962-r10", "type": "envoi", "byRole": "assisteur", "agencyId": "7e4fdd31-bed5-462e-a472-3df64084947e"}, {"at": "2026-05-23T10:23:44.573Z", "id": "evt-1779531824573-bdw", "type": "confirmation", "byRole": "loueur", "message": "36.75", "agencyId": "773679e7-034d-479b-a622-e769183f2a4e"}, {"at": "2026-05-23T10:23:44.623Z", "id": "evt-1779531824573-bu3", "type": "attribution_fermee", "byRole": "system"}, {"at": "2026-05-23T10:23:45.099Z", "id": "evt-1779531825099-b8v", "type": "attribution", "byRole": "assisteur", "message": "Drivzon Bordeaux"}]', NULL, 'tourisme', 'citadine', 3, 4, '2026-05-25 10:11:00+00', NULL, NULL, '{}', '773679e7-034d-479b-a622-e769183f2a4e', '{773679e7-034d-479b-a622-e769183f2a4e,7e4fdd31-bed5-462e-a472-3df64084947e}', '773679e7-034d-479b-a622-e769183f2a4e', 'Drivzon Bordeaux', NULL, NULL, '2026-05-23 10:13:24.815+00', '2026-05-23 10:23:44.573+00', NULL, 'd36ff139-e623-4e75-b934-6c4c1626634b', 'assu gir', 'partial', 'insurance_agent', NULL, '{}', NULL, NULL, NULL, NULL, 0.1500, NULL, NULL, NULL, 'non_applicable', NULL, NULL, 'city-bordeaux', false, NULL, NULL),
	('req-1779197106707-x9ac5', 'cloturee', 'immediate', 'SIN-2024-001234', 'REF-457', '{"email": "jean.dupont@hotmail.fr", "phone": "0612345678", "lastName": "DUPONT", "firstName": "Jean"}', '{"address": "34 cours du medoc 33000 BORDEAUX", "latitude": 44.8572306, "longitude": -0.5657698}', '{"creditType": "full"}', '{"message": "véhicule dispo", "agencyId": "773679e7-034d-479b-a622-e769183f2a4e", "agencyName": "Drivzon Bordeaux", "pricePerDay": 30, "respondedAt": "2026-05-19T13:26:44.743Z", "vehicleModel": "Peugeot 208"}', '[]', '[{"at": "2026-05-19T13:25:06.534Z", "id": "evt-1779197106707-8yu", "type": "creation", "byRole": "assisteur"}, {"at": "2026-05-19T13:25:07.534Z", "id": "evt-1779197106707-l3a", "type": "envoi", "byRole": "assisteur", "agencyId": "773679e7-034d-479b-a622-e769183f2a4e"}, {"at": "2026-05-19T13:25:07.634Z", "id": "evt-1779197106707-lt2", "type": "envoi", "byRole": "assisteur", "agencyId": "8a2dd9a2-37ae-4224-9617-72ffffbb64b1"}, {"at": "2026-05-19T13:26:44.806Z", "id": "evt-1779197204806-ew5", "type": "confirmation", "byRole": "loueur", "message": "30", "agencyId": "773679e7-034d-479b-a622-e769183f2a4e"}, {"at": "2026-05-19T13:26:44.856Z", "id": "evt-1779197204806-lq4", "type": "attribution_fermee", "byRole": "system"}, {"at": "2026-05-19T13:26:45.000Z", "id": "evt-1779197205000-p3k", "type": "attribution", "byRole": "assisteur", "message": "Drivzon Bordeaux"}, {"at": "2026-05-19T13:28:32.825Z", "id": "evt-1779197312825-vv8", "type": "cloture", "byRole": "assisteur"}]', NULL, 'tourisme', 'citadine', 3, 10, '2026-05-20 13:24:00+00', 30, NULL, '{}', '773679e7-034d-479b-a622-e769183f2a4e', '{773679e7-034d-479b-a622-e769183f2a4e,8a2dd9a2-37ae-4224-9617-72ffffbb64b1}', '773679e7-034d-479b-a622-e769183f2a4e', 'Drivzon Bordeaux', NULL, NULL, '2026-05-19 13:25:06.534+00', '2026-05-19 13:26:44.806+00', NULL, '9140f497-bfc4-4f7c-864a-961e3aa98262', 'Taib El azizi', 'full', 'assistance', NULL, '{}', NULL, NULL, NULL, NULL, 0.1500, NULL, NULL, NULL, 'non_applicable', NULL, NULL, 'city-bordeaux', false, NULL, NULL),
	('req-1779368844218-kkywd', 'confirmee', 'immediate', 'SIN-2024-00356', 'REF-459', '{"phone": "0612345678", "lastName": "DUPONT", "firstName": "Jean"}', '{"address": "54 cours aristide briand 33000 BORDEAUX", "latitude": 44.8318542, "longitude": -0.5768691}', '{"creditType": "partial"}', '{"message": "vehicule dispo", "agencyId": "773679e7-034d-479b-a622-e769183f2a4e", "agencyName": "Drivzon Bordeaux", "pricePerDay": 30, "respondedAt": "2026-05-21T13:09:27.394Z", "vehicleModel": "Peugeot 208"}', '[]', '[{"at": "2026-05-21T13:07:24.033Z", "id": "evt-1779368844219-w9w", "type": "creation", "byRole": "assisteur"}, {"at": "2026-05-21T13:07:25.033Z", "id": "evt-1779368844219-of4", "type": "envoi", "byRole": "assisteur", "agencyId": "773679e7-034d-479b-a622-e769183f2a4e"}, {"at": "2026-05-21T13:07:25.133Z", "id": "evt-1779368844219-5r5", "type": "envoi", "byRole": "assisteur", "agencyId": "7e4fdd31-bed5-462e-a472-3df64084947e"}, {"at": "2026-05-21T13:07:25.233Z", "id": "evt-1779368844219-yr3", "type": "envoi", "byRole": "assisteur", "agencyId": "8a2dd9a2-37ae-4224-9617-72ffffbb64b1"}, {"at": "2026-05-21T13:09:27.473Z", "id": "evt-1779368967473-ypq", "type": "confirmation", "byRole": "loueur", "message": "30", "agencyId": "773679e7-034d-479b-a622-e769183f2a4e"}, {"at": "2026-05-21T13:09:27.523Z", "id": "evt-1779368967473-azp", "type": "attribution_fermee", "byRole": "system"}, {"at": "2026-05-21T13:09:27.671Z", "id": "evt-1779368967671-ds3", "type": "attribution", "byRole": "assisteur", "message": "Drivzon Bordeaux"}, {"at": "2026-05-21T19:55:15.772Z", "id": "evt-1779393315772-e36", "type": "prolongation_demandee", "byRole": "assisteur", "message": "7"}, {"at": "2026-05-21T20:37:44.750Z", "id": "evt-1779395864750-ktj", "type": "prolongation_reponse", "byRole": "loueur", "message": "Prolongation acceptée"}, {"at": "2026-05-23T10:20:07.106Z", "id": "evt-1779531607106-qg0", "type": "prolongation_demandee", "byRole": "assisteur", "message": "5"}, {"at": "2026-05-23T10:24:37.828Z", "id": "evt-1779531877828-esy", "type": "prolongation_reponse", "byRole": "loueur", "message": "Prolongation acceptée"}]', '[{"id": "ext-1779393315772", "status": "acceptee", "isForfait": false, "requestedAt": "2026-05-21T19:55:15.772Z", "respondedAt": "2026-05-21T20:37:44.750Z", "extensionCost": 210, "newTotalPrice": 300, "requestedDays": 7, "appliedPricePerDay": 30}, {"id": "ext-1779531607106", "status": "acceptee", "isForfait": false, "requestedAt": "2026-05-23T10:20:07.106Z", "respondedAt": "2026-05-23T10:24:37.828Z", "extensionCost": 150, "newTotalPrice": 450, "requestedDays": 5, "appliedPricePerDay": 30}]', 'tourisme', 'citadine', 3, 10, '2026-05-21 15:06:00+00', 30, NULL, '{}', '773679e7-034d-479b-a622-e769183f2a4e', '{773679e7-034d-479b-a622-e769183f2a4e,7e4fdd31-bed5-462e-a472-3df64084947e,8a2dd9a2-37ae-4224-9617-72ffffbb64b1}', '773679e7-034d-479b-a622-e769183f2a4e', 'Drivzon Bordeaux', NULL, NULL, '2026-05-21 13:07:24.033+00', '2026-05-21 13:09:27.473+00', NULL, 'd36ff139-e623-4e75-b934-6c4c1626634b', 'assu gir', 'partial', 'insurance_agent', NULL, '{}', NULL, NULL, NULL, NULL, 0.1500, NULL, NULL, NULL, 'non_applicable', NULL, NULL, 'city-bordeaux', false, NULL, NULL),
	('req-1779200438844-yb58o', 'confirmee', 'immediate', 'SIN-2024-00345', 'REF-458', '{"email": "jean.dupont@hotmail.fr", "phone": "0612345678", "lastName": "DUPONT", "firstName": "Jean"}', '{"address": "45 cours alsace lorraine 33000 BORDEAUX", "latitude": 44.8379054, "longitude": -0.5709044}', '{"creditType": "full"}', '{"agencyId": "8a2dd9a2-37ae-4224-9617-72ffffbb64b1", "agencyName": "LIBERTY RENT LE BARP", "pricePerDay": 30, "respondedAt": "2026-05-19T14:24:20.788Z"}', '[]', '[{"at": "2026-05-19T14:20:38.623Z", "id": "evt-1779200438844-i9b", "type": "creation", "byRole": "assisteur"}, {"at": "2026-05-19T14:20:39.623Z", "id": "evt-1779200438844-f9v", "type": "envoi", "byRole": "assisteur", "agencyId": "773679e7-034d-479b-a622-e769183f2a4e"}, {"at": "2026-05-19T14:20:39.723Z", "id": "evt-1779200438844-0tk", "type": "envoi", "byRole": "assisteur", "agencyId": "7e4fdd31-bed5-462e-a472-3df64084947e"}, {"at": "2026-05-19T14:20:39.823Z", "id": "evt-1779200438844-elg", "type": "envoi", "byRole": "assisteur", "agencyId": "8a2dd9a2-37ae-4224-9617-72ffffbb64b1"}, {"at": "2026-05-19T14:24:20.848Z", "id": "evt-1779200660848-bt6", "type": "confirmation", "byRole": "loueur", "message": "30", "agencyId": "8a2dd9a2-37ae-4224-9617-72ffffbb64b1"}, {"at": "2026-05-19T14:24:20.898Z", "id": "evt-1779200660848-8xg", "type": "attribution_fermee", "byRole": "system"}, {"at": "2026-05-19T14:24:21.028Z", "id": "evt-1779200661028-sky", "type": "attribution", "byRole": "assisteur", "message": "LIBERTY RENT LE BARP"}, {"at": "2026-05-21T10:51:02.041Z", "id": "5c0f0cee-dcfa-4ffc-8586-6846c3cd8ba7", "type": "admin_finance", "byRole": "admin", "message": "Montants recalculés"}, {"at": "2026-05-21T18:47:01.218Z", "id": "64f2cba4-3a85-41be-b2dd-ac46b6954140", "type": "admin_finance", "byRole": "admin", "message": "Dossier marqué prêt à payer"}, {"at": "2026-05-21T18:47:24.023Z", "id": "138e4714-4332-4d35-afc2-02ad30069acc", "type": "admin_finance", "byRole": "admin", "message": "Paiement confirmé"}]', NULL, 'tourisme', 'citadine', 3, 10, '2026-05-20 14:20:00+00', 30, NULL, '{}', '773679e7-034d-479b-a622-e769183f2a4e', '{773679e7-034d-479b-a622-e769183f2a4e,7e4fdd31-bed5-462e-a472-3df64084947e,8a2dd9a2-37ae-4224-9617-72ffffbb64b1}', '8a2dd9a2-37ae-4224-9617-72ffffbb64b1', 'LIBERTY RENT LE BARP', NULL, NULL, '2026-05-19 14:20:38.623+00', '2026-05-19 14:24:20.848+00', NULL, '9140f497-bfc4-4f7c-864a-961e3aa98262', 'Taib El azizi', 'full', 'assistance', NULL, '{}', '2026-05-21 18:47:24.023+00', 'd72b1c63-e07a-42c2-8f84-d4a09146e89a', 30.00, 3, 0.1500, 13.50, 90.00, 76.50, 'paye', '2026-05-21 18:47:24.023+00', 'd72b1c63-e07a-42c2-8f84-d4a09146e89a', 'city-bordeaux', false, NULL, NULL),
	('req-1779199627515-1zgeq', 'litige_degat', 'immediate', 'SIN-2024-001234', 'REF-458', '{"email": "jena.dupont@hotmail.fr", "phone": "0612345678", "lastName": "DUPONT", "firstName": "Jean"}', '{"address": "20 cours victor hugo 33000 BORDEAUX", "latitude": 44.8357842, "longitude": -0.5671829}', '{"creditType": "full"}', '{"agencyId": "8a2dd9a2-37ae-4224-9617-72ffffbb64b1", "agencyName": "LIBERTY RENT LE BARP", "pricePerDay": 36.75, "respondedAt": "2026-05-19T14:13:08.341Z"}', '[]', '[{"at": "2026-05-19T14:07:07.216Z", "id": "evt-1779199627516-xgb", "type": "creation", "byRole": "assisteur"}, {"at": "2026-05-19T14:07:08.216Z", "id": "evt-1779199627516-bkx", "type": "envoi", "byRole": "assisteur", "agencyId": "773679e7-034d-479b-a622-e769183f2a4e"}, {"at": "2026-05-19T14:07:08.316Z", "id": "evt-1779199627516-895", "type": "envoi", "byRole": "assisteur", "agencyId": "7e4fdd31-bed5-462e-a472-3df64084947e"}, {"at": "2026-05-19T14:07:08.416Z", "id": "evt-1779199627516-xvl", "type": "envoi", "byRole": "assisteur", "agencyId": "8a2dd9a2-37ae-4224-9617-72ffffbb64b1"}, {"at": "2026-05-19T14:13:08.408Z", "id": "evt-1779199988409-1hr", "type": "confirmation", "byRole": "loueur", "message": "36.75", "agencyId": "8a2dd9a2-37ae-4224-9617-72ffffbb64b1"}, {"at": "2026-05-19T14:13:08.458Z", "id": "evt-1779199988409-0rq", "type": "attribution_fermee", "byRole": "system"}, {"at": "2026-05-19T14:13:08.647Z", "id": "evt-1779199988647-baq", "type": "attribution", "byRole": "assisteur", "message": "LIBERTY RENT LE BARP"}, {"at": "2026-05-21T15:05:34.046Z", "id": "evt-cron-req-1779199627515-1zgeq-1779375934906", "type": "overdue_detecte", "byRole": "system", "message": "Détection automatique — date de retour dépassée"}, {"at": "2026-05-21T15:08:42.750Z", "id": "evt-cron-req-1779199627515-1zgeq-1779376123098", "type": "overdue_detecte", "byRole": "system", "message": "Détection automatique — date de retour dépassée"}, {"at": "2026-05-23T10:26:04.145Z", "id": "evt-1779531964145-gor", "type": "retour_confirme", "byRole": "loueur", "message": "2026-05-21T10:25:00.000Z"}, {"at": "2026-05-23T10:26:43.894Z", "id": "evt-1779532003894-1f9", "type": "sinistre_declare", "byRole": "loueur", "message": "fkfhhfkf"}]', NULL, 'tourisme', 'citadine', 1, 3, '2026-05-20 14:00:00+00', NULL, NULL, '{}', '773679e7-034d-479b-a622-e769183f2a4e', '{773679e7-034d-479b-a622-e769183f2a4e,7e4fdd31-bed5-462e-a472-3df64084947e,8a2dd9a2-37ae-4224-9617-72ffffbb64b1}', '8a2dd9a2-37ae-4224-9617-72ffffbb64b1', 'LIBERTY RENT LE BARP', NULL, NULL, '2026-05-19 14:07:07.216+00', '2026-05-19 14:13:08.408+00', '2026-05-21 10:25:00+00', '9140f497-bfc4-4f7c-864a-961e3aa98262', 'Taib El azizi', 'full', 'assistance', NULL, '{}', NULL, NULL, NULL, NULL, 0.1500, NULL, NULL, NULL, 'non_applicable', NULL, NULL, 'city-bordeaux', true, '2026-05-21 15:08:42.75+00', 'fkfhhfkf'),
	('req-1779806420239-ybr0j', 'envoyee', 'immediate', 'DOS-852-896', 'F4565666952', '{"email": "wilfried.druet@outlook.fr", "phone": "0650209686", "lastName": "Druet", "firstName": "Wilfried"}', '{"address": "3 avenue de Saige", "latitude": 44.7908179, "longitude": -0.633734}', '{"creditType": "full"}', NULL, '[]', '[{"at": "2026-05-26T14:40:18.139Z", "id": "evt-1779806420239-6nc", "type": "creation", "byRole": "assisteur"}, {"at": "2026-05-26T14:40:19.139Z", "id": "evt-1779806420239-tno", "type": "envoi", "byRole": "assisteur", "agencyId": "773679e7-034d-479b-a622-e769183f2a4e"}, {"at": "2026-05-26T14:40:19.239Z", "id": "evt-1779806420239-6si", "type": "envoi", "byRole": "assisteur", "agencyId": "7e4fdd31-bed5-462e-a472-3df64084947e"}]', NULL, 'tourisme', 'citadine', 3, 4, '2026-05-27 14:39:00+00', NULL, NULL, '{}', '773679e7-034d-479b-a622-e769183f2a4e', '{773679e7-034d-479b-a622-e769183f2a4e,7e4fdd31-bed5-462e-a472-3df64084947e}', NULL, NULL, NULL, NULL, '2026-05-26 14:40:18.139+00', NULL, NULL, 'd36ff139-e623-4e75-b934-6c4c1626634b', 'assu gir', 'full', 'insurance_agent', NULL, '{}', NULL, NULL, NULL, NULL, 0.1500, NULL, NULL, NULL, 'non_applicable', NULL, NULL, 'city-bordeaux', false, NULL, NULL);


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."notifications" ("id", "agency_id", "type", "title", "body", "request_id", "read_at", "created_at", "user_id", "read") VALUES
	('9d633ec9-1aaa-49f6-a808-96e3c083944d', '773679e7-034d-479b-a622-e769183f2a4e', 'new_request', 'Nouvelle demande — 34 cours du medoc 33000 BORDEAUX', 'Citadine · 3j', 'req-1779197106707-x9ac5', NULL, '2026-05-19 13:25:08.38487+00', 'da5fc9d3-0e61-427a-9c0b-837c55b8bede', true),
	('4dfd7a4d-c9c1-4063-ad7f-fa33ba800210', '773679e7-034d-479b-a622-e769183f2a4e', 'loueur_accepte', 'Réponse reçue', 'Drivzon Bordeaux confirme à 30 €/j', 'req-1779197106707-x9ac5', NULL, '2026-05-19 13:26:46.372032+00', '9140f497-bfc4-4f7c-864a-961e3aa98262', true),
	('c5df08e7-7066-48ca-927e-b183ea08b3b1', '773679e7-034d-479b-a622-e769183f2a4e', 'new_request', 'Nouvelle demande — 20 cours victor hugo 33000 BORDEAUX', 'Citadine · 1j', 'req-1779199627515-1zgeq', NULL, '2026-05-19 14:07:10.42154+00', 'da5fc9d3-0e61-427a-9c0b-837c55b8bede', true),
	('5684491f-2930-4191-b9a3-37f99c8454bb', '7e4fdd31-bed5-462e-a472-3df64084947e', 'new_request', 'Nouvelle demande — 20 cours victor hugo 33000 BORDEAUX', 'Citadine · 1j', 'req-1779199627515-1zgeq', NULL, '2026-05-19 14:07:11.243834+00', 'e02f3821-b00e-4834-a7ea-4cbfd9bbf9f6', true),
	('18ec48e0-4a0a-465f-8814-b16759b78d2c', '8a2dd9a2-37ae-4224-9617-72ffffbb64b1', 'new_request', 'Nouvelle demande — 20 cours victor hugo 33000 BORDEAUX', 'Citadine · 1j', 'req-1779199627515-1zgeq', NULL, '2026-05-19 14:07:12.003474+00', 'e02f3821-b00e-4834-a7ea-4cbfd9bbf9f6', true),
	('7adaa690-8050-4b17-9ed2-abf00860a1b2', '8a2dd9a2-37ae-4224-9617-72ffffbb64b1', 'loueur_accepte', 'Réponse reçue', 'LIBERTY RENT LE BARP confirme à 36.75 €/j', 'req-1779199627515-1zgeq', NULL, '2026-05-19 14:13:09.594259+00', '9140f497-bfc4-4f7c-864a-961e3aa98262', true),
	('9a2a570c-23e9-41ec-b4ab-290bbb94d35c', '8a2dd9a2-37ae-4224-9617-72ffffbb64b1', 'new_request', 'Nouvelle demande — 21 cours du medoc 33000 BORDEAUX', 'Citadine · 3j', 'req-1779194611144-4u506', NULL, '2026-05-19 12:43:33.355828+00', 'e02f3821-b00e-4834-a7ea-4cbfd9bbf9f6', true),
	('6305b2c4-90a6-43b7-adb9-9a8d269136b4', '773679e7-034d-479b-a622-e769183f2a4e', 'new_request', 'Nouvelle demande — 21 cours du medoc 33000 BORDEAUX', 'Citadine · 3j', 'req-1779194611144-4u506', NULL, '2026-05-19 12:43:32.654877+00', 'da5fc9d3-0e61-427a-9c0b-837c55b8bede', true),
	('96394697-c3c0-4827-b67e-3bc01f159cca', '8a2dd9a2-37ae-4224-9617-72ffffbb64b1', 'loueur_contre_propose', 'Contre-proposition', 'LIBERTY RENT LE BARP propose 33 €/j — à valider', 'req-1779194611144-4u506', NULL, '2026-05-19 12:47:51.554373+00', '9140f497-bfc4-4f7c-864a-961e3aa98262', true),
	('5810ae9f-5167-4f32-8133-fa179f9f04f9', '773679e7-034d-479b-a622-e769183f2a4e', 'loueur_contre_propose', 'Contre-proposition', 'Drivzon Bordeaux propose 33 €/j — à valider', 'req-1779194611144-4u506', NULL, '2026-05-19 12:47:52.365746+00', '9140f497-bfc4-4f7c-864a-961e3aa98262', true),
	('aae1b7f8-0119-4275-bd97-31b5e55ecb24', '8a2dd9a2-37ae-4224-9617-72ffffbb64b1', 'new_request', 'Nouvelle demande — 34 cours du medoc 33000 BORDEAUX', 'Citadine · 3j', 'req-1779197106707-x9ac5', NULL, '2026-05-19 13:25:08.946109+00', 'e02f3821-b00e-4834-a7ea-4cbfd9bbf9f6', true),
	('a380e437-46d5-40c1-8c8a-90d9f25ef6e7', '8a2dd9a2-37ae-4224-9617-72ffffbb64b1', 'new_request', 'Nouvelle demande — 45 cours alsace lorraine 33000 BORDEAUX', 'Citadine · 3j', 'req-1779200438844-yb58o', NULL, '2026-05-19 14:20:40.565846+00', 'e02f3821-b00e-4834-a7ea-4cbfd9bbf9f6', true),
	('dc9a6f49-677e-49e8-9a4f-bc3401276e9b', '7e4fdd31-bed5-462e-a472-3df64084947e', 'new_request', 'Nouvelle demande — 45 cours alsace lorraine 33000 BORDEAUX', 'Citadine · 3j', 'req-1779200438844-yb58o', NULL, '2026-05-19 14:20:40.280456+00', 'e02f3821-b00e-4834-a7ea-4cbfd9bbf9f6', true),
	('ccd244a7-e704-45fa-9b6e-aaf954472b23', '8a2dd9a2-37ae-4224-9617-72ffffbb64b1', 'loueur_accepte', 'Réponse reçue', 'LIBERTY RENT LE BARP confirme à 30 €/j', 'req-1779200438844-yb58o', NULL, '2026-05-19 14:24:21.207706+00', '9140f497-bfc4-4f7c-864a-961e3aa98262', false),
	('dba56dbc-4a8b-4ae3-941a-aded30781f92', '773679e7-034d-479b-a622-e769183f2a4e', 'new_request', 'Nouvelle demande — 45 cours alsace lorraine 33000 BORDEAUX', 'Citadine · 3j', 'req-1779200438844-yb58o', NULL, '2026-05-19 14:20:39.916333+00', 'da5fc9d3-0e61-427a-9c0b-837c55b8bede', true),
	('ec3b12df-0ac3-4d8b-ab91-da152a1ac765', '7e4fdd31-bed5-462e-a472-3df64084947e', 'new_request', 'Nouvelle demande — 54 cours aristide briand 33000 BORDEAUX', 'Citadine · 3j', 'req-1779368844218-kkywd', NULL, '2026-05-21 13:07:25.781285+00', 'e02f3821-b00e-4834-a7ea-4cbfd9bbf9f6', false),
	('1e292419-9aba-4cd6-bd2d-387000a34973', '8a2dd9a2-37ae-4224-9617-72ffffbb64b1', 'new_request', 'Nouvelle demande — 54 cours aristide briand 33000 BORDEAUX', 'Citadine · 3j', 'req-1779368844218-kkywd', NULL, '2026-05-21 13:07:26.063062+00', 'e02f3821-b00e-4834-a7ea-4cbfd9bbf9f6', false),
	('52b64527-49e7-43a4-9d94-1e2bfcdf713b', '773679e7-034d-479b-a622-e769183f2a4e', 'new_request', 'Nouvelle demande — 54 cours aristide briand 33000 BORDEAUX', 'Citadine · 3j', 'req-1779368844218-kkywd', NULL, '2026-05-21 13:07:25.265555+00', 'da5fc9d3-0e61-427a-9c0b-837c55b8bede', true),
	('6ce6388e-63c5-4127-9dd9-a2d2511de8b7', '773679e7-034d-479b-a622-e769183f2a4e', 'loueur_accepte', 'Réponse reçue', 'Drivzon Bordeaux confirme à 30 €/j', 'req-1779368844218-kkywd', NULL, '2026-05-21 13:09:28.955531+00', 'd36ff139-e623-4e75-b934-6c4c1626634b', true),
	('86077017-fe34-4a0c-9829-939bd58fe0b2', NULL, 'overdue', 'Dossier #SIN-2024-001234 — OVERDUE', 'Le véhicule devait être retourné. Traitez ce dossier en urgence.', 'req-1779199627515-1zgeq', NULL, '2026-05-21 15:08:42.726349+00', '9140f497-bfc4-4f7c-864a-961e3aa98262', false),
	('a3b68eb3-d2ab-408c-a5cb-42d16189b22d', '8a2dd9a2-37ae-4224-9617-72ffffbb64b1', 'overdue', 'Dossier #SIN-2024-001234 — OVERDUE', 'Le véhicule devait être retourné. Traitez ce dossier en urgence. (LIBERTY RENT LE BARP)', 'req-1779199627515-1zgeq', NULL, '2026-05-21 15:08:42.726349+00', 'e02f3821-b00e-4834-a7ea-4cbfd9bbf9f6', true),
	('d7324eae-69d8-429d-9e35-d03e9b8d668a', '6f5ad8ac-b5b8-4fac-addb-fbf7fddc9cff', 'new_request', 'Nouvelle demande pour Cityrent Bordeaux', '3 avenue de Saige · 7 places · 5j', 'req-1779437197838-eshek', NULL, '2026-05-22 08:06:40.555073+00', '08e1e117-5061-444c-bce7-769cb86cb21a', true),
	('c5056b0f-c4ff-42a9-a326-107c41159b00', '6f5ad8ac-b5b8-4fac-addb-fbf7fddc9cff', 'loueur_accepte', 'Réponse reçue', 'Cityrent Bordeaux confirme à 136.88 €/j', 'req-1779437197838-eshek', NULL, '2026-05-22 08:59:37.16573+00', 'd36ff139-e623-4e75-b934-6c4c1626634b', true),
	('472b4d82-b352-441e-95f2-e45bda924923', '7e4fdd31-bed5-462e-a472-3df64084947e', 'new_request', 'Nouvelle demande pour LIBERTY RENT CENON', '3 avenue de Saige · Citadine · 3j', 'req-1779531205962-y4b69', NULL, '2026-05-23 10:13:27.610036+00', 'e02f3821-b00e-4834-a7ea-4cbfd9bbf9f6', false),
	('b4e88c4f-0344-4dcd-874e-b8b3f6da83b2', '773679e7-034d-479b-a622-e769183f2a4e', 'new_request', 'Nouvelle demande pour Drivzon Bordeaux', '3 avenue de Saige · Citadine · 3j', 'req-1779531205962-y4b69', NULL, '2026-05-23 10:13:27.171345+00', 'da5fc9d3-0e61-427a-9c0b-837c55b8bede', true),
	('2706bc51-443a-4142-b83b-fd0b5c0dddbe', '773679e7-034d-479b-a622-e769183f2a4e', 'retour_confirme', 'Retour confirmé', 'Drivzon Bordeaux — véhicule rendu, paiement à valider', 'req-1779199627515-1zgeq', NULL, '2026-05-23 10:26:04.950826+00', '9140f497-bfc4-4f7c-864a-961e3aa98262', false),
	('676adaf8-89c4-4acd-b34e-2d8ef475b0f0', NULL, 'loueur_document_ajoute', 'Document déposé', 'Loueur a ajouté un document sur ce dossier', 'req-1779199627515-1zgeq', NULL, '2026-05-23 10:26:40.804954+00', '9140f497-bfc4-4f7c-864a-961e3aa98262', false),
	('884017df-d349-4ed2-9d0a-e2d33a57bef8', NULL, 'damage_claim', 'Sinistre déclaré — dossier #SIN-2024-001234', 'Le loueur a déclaré un dégât : fkfhhfkf', 'req-1779199627515-1zgeq', NULL, '2026-05-23 10:26:44.263933+00', '9140f497-bfc4-4f7c-864a-961e3aa98262', false),
	('fb9a781f-c33a-46b1-b737-05c647257fc5', NULL, 'damage_claim', 'Sinistre déclaré — dossier #SIN-2024-001234', 'Un loueur a déclaré un dégât. Le dossier est passé en litige_degat et nécessite une action admin.', 'req-1779199627515-1zgeq', NULL, '2026-05-23 10:26:44.263933+00', 'd72b1c63-e07a-42c2-8f84-d4a09146e89a', false),
	('5f16733e-f496-4730-8a0d-1882344b0a12', '773679e7-034d-479b-a622-e769183f2a4e', 'loueur_accepte', 'Réponse reçue', 'Drivzon Bordeaux confirme à 36.75 €/j', 'req-1779531205962-y4b69', NULL, '2026-05-23 10:23:45.570856+00', 'd36ff139-e623-4e75-b934-6c4c1626634b', true),
	('253ca7f8-43ac-4535-85bc-644c21c4c840', '7e4fdd31-bed5-462e-a472-3df64084947e', 'new_request', 'Nouvelle demande pour LIBERTY RENT CENON', '3 avenue de Saige · Citadine · 3j', 'req-1779806420239-ybr0j', NULL, '2026-05-26 14:40:23.640181+00', 'e02f3821-b00e-4834-a7ea-4cbfd9bbf9f6', false),
	('222cbfc9-f151-408e-a6f6-9c94ea592d2b', '773679e7-034d-479b-a622-e769183f2a4e', 'new_request', 'Nouvelle demande pour Drivzon Bordeaux', '3 avenue de Saige · Citadine · 3j', 'req-1779806420239-ybr0j', NULL, '2026-05-26 14:40:23.158376+00', 'da5fc9d3-0e61-427a-9c0b-837c55b8bede', true);


--
-- Data for Name: rental_responses; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: request_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."request_documents" ("id", "request_id", "type", "owner", "file_name", "url", "data_url", "comment", "size_kb", "created_at", "storage_path", "mime_type", "size_bytes", "uploaded_by_user_id") VALUES
	('d5667c39-082a-4dc7-bce0-e46e9dfadb29', 'req-1779368844218-kkywd', 'prise_en_charge', 'assisteur', 'andrej-lisakov-n93g6wY5ZpM-unsplash.jpg', NULL, NULL, NULL, NULL, '2026-05-22 08:54:15.967189+00', 'req-1779368844218-kkywd/1779440055212-andrej-lisakov-n93g6wY5ZpM-unsplash.jpg', 'image/jpeg', 363045, 'd36ff139-e623-4e75-b934-6c4c1626634b'),
	('029e8e4a-fdab-4756-a855-d69501ff45fd', 'req-1779368844218-kkywd', 'prise_en_charge', 'assisteur', '1771581317169.jpg', NULL, NULL, NULL, NULL, '2026-05-22 08:54:31.632774+00', 'req-1779368844218-kkywd/1779440070942-1771581317169.jpg', 'image/jpeg', 79502, 'd36ff139-e623-4e75-b934-6c4c1626634b'),
	('3d3c9892-234f-4db1-9787-198097a0f7aa', 'req-1779437197838-eshek', 'prise_en_charge', 'assisteur', 'ChatGPT Image 20 avr. 2026, 00_43_31.png', NULL, NULL, NULL, NULL, '2026-05-22 09:09:10.825055+00', 'req-1779437197838-eshek/1779440949883-ChatGPT_Image_20_avr._2026__00_43_31.png', 'image/png', 2349909, 'd36ff139-e623-4e75-b934-6c4c1626634b'),
	('b288fa4f-bc78-4e1c-b0c8-e2b4e7e28395', 'req-1779199627515-1zgeq', 'photo_degat', 'loueur', 'BTS NDRC.JPG', NULL, NULL, NULL, NULL, '2026-05-23 10:26:39.859931+00', 'req-1779199627515-1zgeq/1779531999317-BTS_NDRC.JPG', 'image/jpeg', 255564, 'da5fc9d3-0e61-427a-9c0b-837c55b8bede');


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

INSERT INTO "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id", "type") VALUES
	('request-documents', 'request-documents', NULL, '2026-05-11 20:26:24.439065+00', '2026-05-11 20:26:24.439065+00', false, false, NULL, NULL, NULL, 'STANDARD');


--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

INSERT INTO "storage"."objects" ("id", "bucket_id", "name", "owner", "created_at", "updated_at", "last_accessed_at", "metadata", "version", "owner_id", "user_metadata") VALUES
	('5408a9c3-06df-4482-b795-543900f1e065', 'request-documents', 'req-1778166223629-n20m5/1778532259130-BTS_NDRC.JPG', NULL, '2026-05-11 20:44:18.409044+00', '2026-05-11 20:44:18.409044+00', '2026-05-11 20:44:18.409044+00', '{"eTag": "\"1d1bded1a016ebe9c29ea90809c0d6f6\"", "size": 255564, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-11T20:44:19.000Z", "contentLength": 255564, "httpStatusCode": 200}', 'f5a85459-e819-4aa2-abe0-14f8e07007e6', NULL, '{}'),
	('1283c434-885d-462b-b88e-2a5bc856174e', 'request-documents', 'req-1778535932984-0oqou/1778535935136-creer_votre_site_.png', NULL, '2026-05-11 21:45:53.486255+00', '2026-05-11 21:45:53.486255+00', '2026-05-11 21:45:53.486255+00', '{"eTag": "\"1fc36594d0f05c07c8f58e13f7738bc9\"", "size": 1648669, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-05-11T21:45:54.000Z", "contentLength": 1648669, "httpStatusCode": 200}', 'f4892efa-1af9-4d24-a355-d4273d7f5857', NULL, '{}'),
	('08e70416-a518-411a-a5d3-9a52de2c2de8', 'request-documents', 'req-1778535932984-0oqou/1778536041162-certificat_cession.jpg', NULL, '2026-05-11 21:47:20.886851+00', '2026-05-11 21:47:20.886851+00', '2026-05-11 21:47:20.886851+00', '{"eTag": "\"b67c17cb81a2b3906fb7fee149055fae\"", "size": 156582, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-11T21:47:21.000Z", "contentLength": 156582, "httpStatusCode": 200}', '9be54f08-8ac7-4be7-a01e-739a8df374c3', NULL, '{}'),
	('aba924c9-f29b-44d1-9ac0-aed24eb17dd1', 'request-documents', 'req-1778535932984-0oqou/1778536058877-ChatGPT_Image_20_avr._2026__00_43_31.png', NULL, '2026-05-11 21:47:47.443696+00', '2026-05-11 21:47:47.443696+00', '2026-05-11 21:47:47.443696+00', '{"eTag": "\"ce65108a1e8a679afd382991d4eb1e32\"", "size": 2349909, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-05-11T21:47:48.000Z", "contentLength": 2349909, "httpStatusCode": 200}', '91335538-1bd8-455a-b21a-4ce948952ee2', NULL, '{}'),
	('08f7377d-c4f9-41fa-9cfa-0596c8ab55c5', 'request-documents', 'req-1778600021975-l7970/1778600022501-carte_des_prix_3.JPG', NULL, '2026-05-12 15:33:42.027501+00', '2026-05-12 15:33:42.027501+00', '2026-05-12 15:33:42.027501+00', '{"eTag": "\"50a439996cba6024269509a226ac2665\"", "size": 206589, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-12T15:33:42.000Z", "contentLength": 206589, "httpStatusCode": 200}', '57e820f5-0d84-4590-af79-35fd7029468a', NULL, '{}'),
	('207379a4-12ce-4341-949a-357414c95442', 'request-documents', 'req-1778166223629-n20m5/1778661330881-carte_des_prix_2.JPG', NULL, '2026-05-13 08:35:31.272282+00', '2026-05-13 08:35:31.272282+00', '2026-05-13 08:35:31.272282+00', '{"eTag": "\"bdc70480f4e5137dd5cea8aed39b73cb\"", "size": 366511, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-13T08:35:32.000Z", "contentLength": 366511, "httpStatusCode": 200}', '617cb6d9-a2ae-4732-845f-d43620105847', NULL, '{}'),
	('37d4aac7-d410-4efa-9048-82297d22415e', 'request-documents', 'req-1779368844218-kkywd/1779440055212-andrej-lisakov-n93g6wY5ZpM-unsplash.jpg', NULL, '2026-05-22 08:54:15.65047+00', '2026-05-22 08:54:15.65047+00', '2026-05-22 08:54:15.65047+00', '{"eTag": "\"fb357876bec001ecfa2e51a82ac5d9a9\"", "size": 363045, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-22T08:54:16.000Z", "contentLength": 363045, "httpStatusCode": 200}', '673046ac-9387-451a-a7a9-7af10241ee8a', NULL, '{}'),
	('492b918b-e706-4837-a775-c82dc2c3e00a', 'request-documents', 'req-1779368844218-kkywd/1779440070942-1771581317169.jpg', NULL, '2026-05-22 08:54:31.34045+00', '2026-05-22 08:54:31.34045+00', '2026-05-22 08:54:31.34045+00', '{"eTag": "\"2e8419bf776a42e4e38621895a6b270e\"", "size": 79502, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-22T08:54:32.000Z", "contentLength": 79502, "httpStatusCode": 200}', '739f8651-78db-40c3-a01c-120da44a0d3e', NULL, '{}'),
	('6806f045-0071-4062-85d4-e8307c784aaa', 'request-documents', 'req-1779437197838-eshek/1779440949883-ChatGPT_Image_20_avr._2026__00_43_31.png', NULL, '2026-05-22 09:09:10.493248+00', '2026-05-22 09:09:10.493248+00', '2026-05-22 09:09:10.493248+00', '{"eTag": "\"ce65108a1e8a679afd382991d4eb1e32\"", "size": 2349909, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-05-22T09:09:11.000Z", "contentLength": 2349909, "httpStatusCode": 200}', '2355a254-390a-4db2-9f68-f7599b8c40f9', NULL, '{}'),
	('619c5928-49c2-4de1-a4d2-51e7e7cd5948', 'request-documents', 'req-1779199627515-1zgeq/1779531999317-BTS_NDRC.JPG', NULL, '2026-05-23 10:26:39.526312+00', '2026-05-23 10:26:39.526312+00', '2026-05-23 10:26:39.526312+00', '{"eTag": "\"1d1bded1a016ebe9c29ea90809c0d6f6\"", "size": 255564, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-05-23T10:26:40.000Z", "contentLength": 255564, "httpStatusCode": 200}', 'a79e0f35-de12-4e43-aa28-7367026e5843', NULL, '{}');


--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 234, true);


--
-- PostgreSQL database dump complete
--

-- \unrestrict rcWyM9f6TScoTfO5pdZFcwN0WbTCUGfX3Cw59AzHqR0o5XQLbQuinZvhzBd31ox

RESET ALL;

-- ── Backfill organisations (dev local) ────────────────────────────────────────
-- Le seed tourne après les migrations : on (re)crée les orgs pour les profils
-- assisteur du seed qui n'en ont pas encore.
DO $$
DECLARE p RECORD; new_org uuid;
BEGIN
  FOR p IN SELECT id, company_name, full_name, account_type FROM public.profiles WHERE role='assisteur' AND org_id IS NULL LOOP
    INSERT INTO public.organizations (name, account_type)
      VALUES (COALESCE(NULLIF(p.company_name,''), p.full_name, 'Organisation'), p.account_type)
      RETURNING id INTO new_org;
    UPDATE public.profiles SET org_id=new_org, team_role='admin' WHERE id=p.id;
  END LOOP;
END $$;
UPDATE public.assistance_requests ar SET org_id=pr.org_id FROM public.profiles pr
  WHERE ar.org_id IS NULL
    AND ar.created_by_user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND pr.id = ar.created_by_user_id::uuid;
