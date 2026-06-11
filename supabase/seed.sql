SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict uqW8PSO3D2HAKSWzOLoAmVaNFLugb8bjim4r5M4i8AFnJqnWhIMvDj4kP87TuV7

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



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
	('00000000-0000-0000-0000-000000000000', '8b5f18db-3486-4abe-9cb2-a4a18e36986f', 'authenticated', 'authenticated', 'admin@dojo.com', '$2a$10$vMYhFtEoUGo/culqE84MG.WP2hnrfK6GgNSr3lCq8b8uqAKtF5ix2', '2026-05-19 21:08:51.272375+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-05-19 21:29:31.038153+00', '{"rol": "owner", "provider": "email", "providers": ["email"], "academia_id": "22222222-2222-2222-2222-222222222222", "claims_version": 1}', '{"email_verified": true}', NULL, '2026-05-19 21:08:51.268899+00', '2026-05-19 21:29:31.052967+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'e2f97370-829e-40cb-ae05-060013dd0096', 'authenticated', 'authenticated', 'staff@ritmo.com', '$2a$10$HtPrUuehNkf.7k0qfvZ9Yu1gSIKi4OhtjXveEsINsz73D8SDWz6L.', '2026-05-19 21:08:50.971371+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"rol": "staff", "provider": "email", "providers": ["email"], "academia_id": "11111111-1111-1111-1111-111111111111", "claims_version": 1}', '{"email_verified": true}', NULL, '2026-05-19 21:08:50.968522+00', '2026-05-19 21:12:58.701375+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'e911b22b-4eea-4936-a9a2-afc2870f9675', 'authenticated', 'authenticated', 'staff@dojo.com', '$2a$10$v5qSIFjEUWucoguZtFsQe.mBWBf07QvXs8SH71bKvGQJEKtjUxtku', '2026-05-19 21:08:51.568424+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"rol": "staff", "provider": "email", "providers": ["email"], "academia_id": "22222222-2222-2222-2222-222222222222", "claims_version": 1}', '{"email_verified": true}', NULL, '2026-05-19 21:08:51.563041+00', '2026-05-19 21:12:58.942657+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '103c8fd2-f789-4ceb-aa19-e1b7c1726c4a', 'authenticated', 'authenticated', 'admin@ritmo.com', '$2a$10$zOEVrFVS5ioS4ZAGTcJ9euBDw7oFzE2ucVmXa44miqx/NuZ9kC656', '2026-05-19 21:08:50.66439+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-05-19 22:27:01.531131+00', '{"rol": "owner", "provider": "email", "providers": ["email"], "academia_id": "11111111-1111-1111-1111-111111111111", "claims_version": 1}', '{"email_verified": true}', NULL, '2026-05-19 21:08:50.654252+00', '2026-05-29 19:11:28.359922+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'a1111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'owner1@sipra.dev', '$2a$06$hvrpFlKCVQBkabj/1QO4wuhD/aUDcjYHvWivWJk9dHr94CToD.q62', '2026-01-29 19:28:05.865618+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-06-09 16:59:09.73915+00', '{"rol": "owner", "provider": "email", "providers": ["email"], "academia_id": "11111111-1111-4111-8111-111111111111", "claims_version": 1}', '{"nombre": "Carlos Owner"}', NULL, '2026-01-29 19:28:05.865618+00', '2026-06-11 04:42:01.999337+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'a2222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'owner2@sipra.dev', '$2a$06$MuFZRzR6OXGivc6ojltURecxktiSLhSg42Nhpw.c5F1bmGTdp7sXa', '2026-01-29 19:28:05.865618+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-06-09 17:01:42.048175+00', '{"rol": "owner", "provider": "email", "providers": ["email"], "academia_id": "22222222-2222-4222-8222-222222222222", "claims_version": 1}', '{"nombre": "Ana Owner"}', NULL, '2026-01-29 19:28:05.865618+00', '2026-06-11 04:42:04.551782+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '20421b00-d592-4045-aaa5-80ad074aa8a8', 'authenticated', 'authenticated', 'juan@miacademia.com', '$2a$10$jBRSYKcwR5OinZzqfyLDy.rUk3RhEtrBxgCxwxfrTcQ1VcQ3DF.gy', '2026-05-29 20:12:13.4523+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-06-04 06:51:21.285011+00', '{"rol": "owner", "provider": "email", "providers": ["email"], "academia_id": "977d8675-63c0-405d-a0a6-feba625c4e23", "claims_version": 1}', '{"sub": "20421b00-d592-4045-aaa5-80ad074aa8a8", "email": "juan@miacademia.com", "email_verified": true, "phone_verified": false}', NULL, '2026-05-29 20:12:13.425935+00', '2026-06-04 06:51:21.309891+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") VALUES
	('103c8fd2-f789-4ceb-aa19-e1b7c1726c4a', '103c8fd2-f789-4ceb-aa19-e1b7c1726c4a', '{"sub": "103c8fd2-f789-4ceb-aa19-e1b7c1726c4a", "email": "admin@ritmo.com", "email_verified": false, "phone_verified": false}', 'email', '2026-05-19 21:08:50.662055+00', '2026-05-19 21:08:50.662111+00', '2026-05-19 21:08:50.662111+00', '3896bdf4-acb6-4a82-82d8-e90b81d4ebd7'),
	('e2f97370-829e-40cb-ae05-060013dd0096', 'e2f97370-829e-40cb-ae05-060013dd0096', '{"sub": "e2f97370-829e-40cb-ae05-060013dd0096", "email": "staff@ritmo.com", "email_verified": false, "phone_verified": false}', 'email', '2026-05-19 21:08:50.969683+00', '2026-05-19 21:08:50.969729+00', '2026-05-19 21:08:50.969729+00', 'f39e38e9-53dc-40d0-a200-772efaebf66f'),
	('8b5f18db-3486-4abe-9cb2-a4a18e36986f', '8b5f18db-3486-4abe-9cb2-a4a18e36986f', '{"sub": "8b5f18db-3486-4abe-9cb2-a4a18e36986f", "email": "admin@dojo.com", "email_verified": false, "phone_verified": false}', 'email', '2026-05-19 21:08:51.27008+00', '2026-05-19 21:08:51.270129+00', '2026-05-19 21:08:51.270129+00', '8d963e25-a557-4c44-8952-76c8c42c21b9'),
	('e911b22b-4eea-4936-a9a2-afc2870f9675', 'e911b22b-4eea-4936-a9a2-afc2870f9675', '{"sub": "e911b22b-4eea-4936-a9a2-afc2870f9675", "email": "staff@dojo.com", "email_verified": false, "phone_verified": false}', 'email', '2026-05-19 21:08:51.564158+00', '2026-05-19 21:08:51.564205+00', '2026-05-19 21:08:51.564205+00', 'ee3be613-f8ed-427c-a54c-b4a1050fd286'),
	('a1111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111', '{"sub": "a1111111-1111-4111-8111-111111111111", "email": "owner1@sipra.dev", "email_verified": true, "phone_verified": false}', 'email', '2026-05-24 19:28:05.865618+00', '2026-01-29 19:28:05.865618+00', '2026-01-29 19:28:05.865618+00', '49bfb906-fc73-4f0c-b5f4-bbc49ecf8bf9'),
	('a2222222-2222-4222-8222-222222222222', 'a2222222-2222-4222-8222-222222222222', '{"sub": "a2222222-2222-4222-8222-222222222222", "email": "owner2@sipra.dev", "email_verified": true, "phone_verified": false}', 'email', '2026-05-24 19:28:05.865618+00', '2026-01-29 19:28:05.865618+00', '2026-01-29 19:28:05.865618+00', 'daa4eb4e-c7fe-495a-9ecc-ef2237fe3959'),
	('20421b00-d592-4045-aaa5-80ad074aa8a8', '20421b00-d592-4045-aaa5-80ad074aa8a8', '{"sub": "20421b00-d592-4045-aaa5-80ad074aa8a8", "email": "juan@miacademia.com", "email_verified": false, "phone_verified": false}', 'email', '2026-05-29 20:12:13.448236+00', '2026-05-29 20:12:13.448292+00', '2026-05-29 20:12:13.448292+00', 'c49c5b30-51f3-4356-8560-fbec4da0be41');


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
	('f160ee64-a30f-4ba2-b4b6-620cf153d423', 'a1111111-1111-4111-8111-111111111111', '2026-06-09 16:59:09.743232+00', '2026-06-11 04:42:02.01086+00', NULL, 'aal1', NULL, '2026-06-11 04:42:02.010745', 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36', '177.230.52.107', NULL, NULL, NULL, NULL, NULL),
	('675fbcae-aaae-4f9e-95c1-81b5b4a30b9f', 'a2222222-2222-4222-8222-222222222222', '2026-06-09 17:01:42.049283+00', '2026-06-11 04:42:04.55392+00', NULL, 'aal1', NULL, '2026-06-11 04:42:04.553787', 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36', '177.230.52.107', NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") VALUES
	('f160ee64-a30f-4ba2-b4b6-620cf153d423', '2026-06-09 16:59:09.777148+00', '2026-06-09 16:59:09.777148+00', 'password', '292c83c8-88bc-4b6e-a476-023c1e4b0874'),
	('675fbcae-aaae-4f9e-95c1-81b5b4a30b9f', '2026-06-09 17:01:42.06556+00', '2026-06-09 17:01:42.06556+00', 'password', '25301324-3347-4147-8afc-e9191d9a7fdf');


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
	('00000000-0000-0000-0000-000000000000', 150, '75hxtsj3gh4n', 'a1111111-1111-4111-8111-111111111111', true, '2026-06-09 16:59:09.761017+00', '2026-06-09 18:08:12.857934+00', NULL, 'f160ee64-a30f-4ba2-b4b6-620cf153d423'),
	('00000000-0000-0000-0000-000000000000', 151, 'zqvhkjecyose', 'a2222222-2222-4222-8222-222222222222', true, '2026-06-09 17:01:42.061216+00', '2026-06-09 18:14:45.36093+00', NULL, '675fbcae-aaae-4f9e-95c1-81b5b4a30b9f'),
	('00000000-0000-0000-0000-000000000000', 152, 'ayemasict6lp', 'a1111111-1111-4111-8111-111111111111', true, '2026-06-09 18:08:12.87143+00', '2026-06-09 19:08:51.487865+00', '75hxtsj3gh4n', 'f160ee64-a30f-4ba2-b4b6-620cf153d423'),
	('00000000-0000-0000-0000-000000000000', 153, 'ghq5y2vktzin', 'a2222222-2222-4222-8222-222222222222', true, '2026-06-09 18:14:45.36741+00', '2026-06-09 19:24:19.244113+00', 'zqvhkjecyose', '675fbcae-aaae-4f9e-95c1-81b5b4a30b9f'),
	('00000000-0000-0000-0000-000000000000', 155, 'r4qz62qevv36', 'a2222222-2222-4222-8222-222222222222', true, '2026-06-09 19:24:19.253915+00', '2026-06-09 20:58:07.626531+00', 'ghq5y2vktzin', '675fbcae-aaae-4f9e-95c1-81b5b4a30b9f'),
	('00000000-0000-0000-0000-000000000000', 154, 's4vqjfbb7ywp', 'a1111111-1111-4111-8111-111111111111', true, '2026-06-09 19:08:51.507952+00', '2026-06-09 20:58:13.203495+00', 'ayemasict6lp', 'f160ee64-a30f-4ba2-b4b6-620cf153d423'),
	('00000000-0000-0000-0000-000000000000', 156, 'ahtzg2tf53vo', 'a2222222-2222-4222-8222-222222222222', true, '2026-06-09 20:58:07.643035+00', '2026-06-09 21:56:35.47737+00', 'r4qz62qevv36', '675fbcae-aaae-4f9e-95c1-81b5b4a30b9f'),
	('00000000-0000-0000-0000-000000000000', 157, 'mnb4yi3opvdb', 'a1111111-1111-4111-8111-111111111111', true, '2026-06-09 20:58:13.204902+00', '2026-06-09 22:05:15.414444+00', 's4vqjfbb7ywp', 'f160ee64-a30f-4ba2-b4b6-620cf153d423'),
	('00000000-0000-0000-0000-000000000000', 158, '5qxddbw4o2a6', 'a2222222-2222-4222-8222-222222222222', true, '2026-06-09 21:56:35.496174+00', '2026-06-09 22:59:46.010712+00', 'ahtzg2tf53vo', '675fbcae-aaae-4f9e-95c1-81b5b4a30b9f'),
	('00000000-0000-0000-0000-000000000000', 159, 'ygykuau2ujse', 'a1111111-1111-4111-8111-111111111111', true, '2026-06-09 22:05:15.422679+00', '2026-06-09 23:03:48.135385+00', 'mnb4yi3opvdb', 'f160ee64-a30f-4ba2-b4b6-620cf153d423'),
	('00000000-0000-0000-0000-000000000000', 160, 'er5wmzbexewg', 'a2222222-2222-4222-8222-222222222222', true, '2026-06-09 22:59:46.03457+00', '2026-06-10 00:01:34.329681+00', '5qxddbw4o2a6', '675fbcae-aaae-4f9e-95c1-81b5b4a30b9f'),
	('00000000-0000-0000-0000-000000000000', 161, 'tqqaxgzogtc7', 'a1111111-1111-4111-8111-111111111111', true, '2026-06-09 23:03:48.141611+00', '2026-06-10 00:06:50.036929+00', 'ygykuau2ujse', 'f160ee64-a30f-4ba2-b4b6-620cf153d423'),
	('00000000-0000-0000-0000-000000000000', 163, 'g6hgh7fve2cs', 'a1111111-1111-4111-8111-111111111111', true, '2026-06-10 00:06:50.047902+00', '2026-06-10 04:06:05.4531+00', 'tqqaxgzogtc7', 'f160ee64-a30f-4ba2-b4b6-620cf153d423'),
	('00000000-0000-0000-0000-000000000000', 162, 'gswyp5fizk42', 'a2222222-2222-4222-8222-222222222222', true, '2026-06-10 00:01:34.355618+00', '2026-06-10 04:21:19.641799+00', 'er5wmzbexewg', '675fbcae-aaae-4f9e-95c1-81b5b4a30b9f'),
	('00000000-0000-0000-0000-000000000000', 164, 'giwp5fzilpoa', 'a1111111-1111-4111-8111-111111111111', true, '2026-06-10 04:06:05.477861+00', '2026-06-10 05:04:43.212452+00', 'g6hgh7fve2cs', 'f160ee64-a30f-4ba2-b4b6-620cf153d423'),
	('00000000-0000-0000-0000-000000000000', 165, 'retsqgckiqgl', 'a2222222-2222-4222-8222-222222222222', true, '2026-06-10 04:21:19.649811+00', '2026-06-10 05:25:19.620894+00', 'gswyp5fizk42', '675fbcae-aaae-4f9e-95c1-81b5b4a30b9f'),
	('00000000-0000-0000-0000-000000000000', 166, 'u2g4kxwcz3nv', 'a1111111-1111-4111-8111-111111111111', true, '2026-06-10 05:04:43.22839+00', '2026-06-10 06:03:26.613932+00', 'giwp5fzilpoa', 'f160ee64-a30f-4ba2-b4b6-620cf153d423'),
	('00000000-0000-0000-0000-000000000000', 167, '2r4dozt3uyq2', 'a2222222-2222-4222-8222-222222222222', true, '2026-06-10 05:25:19.637794+00', '2026-06-10 18:36:32.69411+00', 'retsqgckiqgl', '675fbcae-aaae-4f9e-95c1-81b5b4a30b9f'),
	('00000000-0000-0000-0000-000000000000', 168, 'znauz5m7mgw7', 'a1111111-1111-4111-8111-111111111111', true, '2026-06-10 06:03:26.627368+00', '2026-06-10 18:36:33.173012+00', 'u2g4kxwcz3nv', 'f160ee64-a30f-4ba2-b4b6-620cf153d423'),
	('00000000-0000-0000-0000-000000000000', 169, 'vnzlvqecfd4u', 'a2222222-2222-4222-8222-222222222222', true, '2026-06-10 18:36:32.719357+00', '2026-06-10 19:34:44.406684+00', '2r4dozt3uyq2', '675fbcae-aaae-4f9e-95c1-81b5b4a30b9f'),
	('00000000-0000-0000-0000-000000000000', 170, '7swhuytgxjs5', 'a1111111-1111-4111-8111-111111111111', true, '2026-06-10 18:36:33.173449+00', '2026-06-10 19:35:20.082521+00', 'znauz5m7mgw7', 'f160ee64-a30f-4ba2-b4b6-620cf153d423'),
	('00000000-0000-0000-0000-000000000000', 172, 'zt5vpume3zz7', 'a1111111-1111-4111-8111-111111111111', true, '2026-06-10 19:35:20.084137+00', '2026-06-10 21:11:03.487026+00', '7swhuytgxjs5', 'f160ee64-a30f-4ba2-b4b6-620cf153d423'),
	('00000000-0000-0000-0000-000000000000', 171, 'm44i3qzlfslr', 'a2222222-2222-4222-8222-222222222222', true, '2026-06-10 19:34:44.427795+00', '2026-06-10 21:13:02.94745+00', 'vnzlvqecfd4u', '675fbcae-aaae-4f9e-95c1-81b5b4a30b9f'),
	('00000000-0000-0000-0000-000000000000', 174, 'wtxbgmic7j2x', 'a2222222-2222-4222-8222-222222222222', true, '2026-06-10 21:13:02.954321+00', '2026-06-10 22:11:37.468409+00', 'm44i3qzlfslr', '675fbcae-aaae-4f9e-95c1-81b5b4a30b9f'),
	('00000000-0000-0000-0000-000000000000', 173, 'usetnlwwyv5f', 'a1111111-1111-4111-8111-111111111111', true, '2026-06-10 21:11:03.504364+00', '2026-06-10 22:15:23.798201+00', 'zt5vpume3zz7', 'f160ee64-a30f-4ba2-b4b6-620cf153d423'),
	('00000000-0000-0000-0000-000000000000', 175, 'thqr5lux7fjm', 'a2222222-2222-4222-8222-222222222222', true, '2026-06-10 22:11:37.489161+00', '2026-06-10 23:09:50.197459+00', 'wtxbgmic7j2x', '675fbcae-aaae-4f9e-95c1-81b5b4a30b9f'),
	('00000000-0000-0000-0000-000000000000', 176, 'xyhegpajrtyk', 'a1111111-1111-4111-8111-111111111111', true, '2026-06-10 22:15:23.804172+00', '2026-06-10 23:19:55.111753+00', 'usetnlwwyv5f', 'f160ee64-a30f-4ba2-b4b6-620cf153d423'),
	('00000000-0000-0000-0000-000000000000', 177, 'wa7huejoofvn', 'a2222222-2222-4222-8222-222222222222', true, '2026-06-10 23:09:50.214038+00', '2026-06-11 00:16:52.87172+00', 'thqr5lux7fjm', '675fbcae-aaae-4f9e-95c1-81b5b4a30b9f'),
	('00000000-0000-0000-0000-000000000000', 178, 'l4eomzxgmyfo', 'a1111111-1111-4111-8111-111111111111', true, '2026-06-10 23:19:55.123533+00', '2026-06-11 00:19:28.36251+00', 'xyhegpajrtyk', 'f160ee64-a30f-4ba2-b4b6-620cf153d423'),
	('00000000-0000-0000-0000-000000000000', 179, 'swqfomvzsrcr', 'a2222222-2222-4222-8222-222222222222', true, '2026-06-11 00:16:52.893501+00', '2026-06-11 02:34:16.607526+00', 'wa7huejoofvn', '675fbcae-aaae-4f9e-95c1-81b5b4a30b9f'),
	('00000000-0000-0000-0000-000000000000', 180, 'nnvaaddfcxqu', 'a1111111-1111-4111-8111-111111111111', true, '2026-06-11 00:19:28.370426+00', '2026-06-11 02:34:32.294727+00', 'l4eomzxgmyfo', 'f160ee64-a30f-4ba2-b4b6-620cf153d423'),
	('00000000-0000-0000-0000-000000000000', 181, 'tcsw4r6lgilt', 'a2222222-2222-4222-8222-222222222222', true, '2026-06-11 02:34:16.625539+00', '2026-06-11 03:38:05.873177+00', 'swqfomvzsrcr', '675fbcae-aaae-4f9e-95c1-81b5b4a30b9f'),
	('00000000-0000-0000-0000-000000000000', 182, 'bi3ho24c3zsj', 'a1111111-1111-4111-8111-111111111111', true, '2026-06-11 02:34:32.295136+00', '2026-06-11 03:38:11.312824+00', 'nnvaaddfcxqu', 'f160ee64-a30f-4ba2-b4b6-620cf153d423'),
	('00000000-0000-0000-0000-000000000000', 184, 'p2revymjsbge', 'a1111111-1111-4111-8111-111111111111', true, '2026-06-11 03:38:11.313174+00', '2026-06-11 04:42:01.971362+00', 'bi3ho24c3zsj', 'f160ee64-a30f-4ba2-b4b6-620cf153d423'),
	('00000000-0000-0000-0000-000000000000', 185, 'oavrlubayrm5', 'a1111111-1111-4111-8111-111111111111', false, '2026-06-11 04:42:01.99136+00', '2026-06-11 04:42:01.99136+00', 'p2revymjsbge', 'f160ee64-a30f-4ba2-b4b6-620cf153d423'),
	('00000000-0000-0000-0000-000000000000', 183, '36g6kolu55dp', 'a2222222-2222-4222-8222-222222222222', true, '2026-06-11 03:38:05.879343+00', '2026-06-11 04:42:04.550259+00', 'tcsw4r6lgilt', '675fbcae-aaae-4f9e-95c1-81b5b4a30b9f'),
	('00000000-0000-0000-0000-000000000000', 186, 'arnlnpjtq2oo', 'a2222222-2222-4222-8222-222222222222', false, '2026-06-11 04:42:04.5507+00', '2026-06-11 04:42:04.5507+00', '36g6kolu55dp', '675fbcae-aaae-4f9e-95c1-81b5b4a30b9f');


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
-- Data for Name: academia; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."academia" ("id", "nombre", "estado_tenant", "timezone", "config_cobro", "metadata", "next_run_utc", "created_at", "updated_at", "config_recargos", "multi_plan_enabled", "allow_partial_payments", "cobrar_inscripcion_default", "monto_inscripcion_default", "automatizacion_recurrente") VALUES
	('977d8675-63c0-405d-a0a6-feba625c4e23', 'YOGA flame', 'activa', 'America/Mexico_City', '{"reglas_dias": [{"accion": "completo", "dia_fin": 5, "dia_inicio": 1}, {"accion": "proporcional", "dia_fin": "fin_mes", "dia_inicio": 6}], "regimen_alta": "reglas_dias", "modo_prorrateo": "proporcional", "dias_generacion": [1], "proporcional_redondeo": "ninguno", "horas_minimas_recordatorio": 48}', '{"logo_url": "https://gbimkrnsmeqsitbaxnrk.supabase.co/storage/v1/object/public/logos/977d8675-63c0-405d-a0a6-feba625c4e23/logo.webp?v=1780085534888", "telefono": "6691000000"}', NULL, '2026-05-29 20:12:13.924302+00', '2026-05-29 20:12:13.924302+00', '{"activo": false, "escalones": []}', true, true, false, 0.00, true),
	('22222222-2222-4222-8222-222222222222', 'Studio UpDance 🩰', 'activa', 'America/Mexico_City', '{"regimen_alta": "proporcional", "modo_prorrateo": "proporcional", "cobra_inscripcion": false, "proporcional_redondeo": "10"}', '{"logo_url": "https://gbimkrnsmeqsitbaxnrk.supabase.co/storage/v1/object/public/logos/22222222-2222-4222-8222-222222222222/logo.webp?v=1780085124515"}', NULL, '2026-01-29 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00', '{"activo": false, "escalones": []}', true, true, false, 0.00, true),
	('11111111-1111-4111-8111-111111111111', 'Club Mazatlán💣', 'activa', 'America/Mazatlan', '{"regimen_alta": "completo", "modo_prorrateo": "completo", "cobra_inscripcion": false}', '{"logo_url": "https://gbimkrnsmeqsitbaxnrk.supabase.co/storage/v1/object/public/logos/11111111-1111-4111-8111-111111111111/logo.webp?v=1780962311619"}', NULL, '2026-01-29 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00', '{"activo": false, "escalones": []}', true, false, false, 0.00, true);


--
-- Data for Name: usuario; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."usuario" ("id", "academia_id", "nombre", "apellido", "email_snapshot", "telefono", "rol", "estado", "metadata", "ultimo_acceso_at", "invitado_por", "created_at", "updated_at") VALUES
	('a1111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'Carlos', 'Núñez', 'owner1@sipra.dev', NULL, 'owner', 'activo', '{}', NULL, NULL, '2026-01-29 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00'),
	('a2222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', 'Ana', 'Reyes', 'owner2@sipra.dev', NULL, 'owner', 'activo', '{}', NULL, NULL, '2026-01-29 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00'),
	('20421b00-d592-4045-aaa5-80ad074aa8a8', '977d8675-63c0-405d-a0a6-feba625c4e23', 'Juan', 'Perez', 'juan@miacademia.com', NULL, 'owner', 'activo', '{}', NULL, NULL, '2026-05-29 20:12:13.924302+00', '2026-05-29 20:12:13.924302+00');


--
-- Data for Name: persona; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."persona" ("id", "academia_id", "nombre", "apellido", "nombre_referencia", "telefono_whatsapp", "email", "etiqueta", "estado_global", "estado_registro", "notas_internas", "metadata", "search_text", "ultima_interaccion_at", "fecha_baja", "created_by", "created_at", "updated_at", "saldo_acumulado") VALUES
	('d0000009-0000-4000-8000-000000000009', '22222222-2222-4222-8222-222222222222', 'Camila', 'SinAsignar', NULL, '5551000009', NULL, 'alumno', 'al_corriente', 'activo', NULL, '{}', NULL, NULL, NULL, NULL, '2026-04-19 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00', 0.00),
	('d0000001-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Diego', 'Fútbol', NULL, '6691000001', NULL, 'alumno', 'al_corriente', 'activo', NULL, '{}', NULL, NULL, NULL, NULL, '2026-02-28 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00', 0.00),
	('d0000002-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'Mateo', 'Deuda', NULL, '6691000002', NULL, 'alumno', 'vencido', 'activo', NULL, '{}', NULL, NULL, NULL, NULL, '2026-03-02 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00', 1600.00),
	('d0000003-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'Bruno', 'Anulado', NULL, '6691000003', NULL, 'alumno', 'al_corriente', 'activo', NULL, '{}', NULL, NULL, NULL, NULL, '2026-03-05 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00', 0.00),
	('d0000007-0000-4000-8000-000000000007', '22222222-2222-4222-8222-222222222222', 'Emma', 'Fitness', NULL, '5551000007', NULL, 'alumno', 'pendiente', 'activo', NULL, '{}', NULL, NULL, NULL, NULL, '2026-03-20 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00', 90.00),
	('d0000008-0000-4000-8000-000000000008', '22222222-2222-4222-8222-222222222222', 'Regina', 'Huérfana', NULL, '5551000008', NULL, 'alumno', 'al_corriente', 'activo', NULL, '{}', NULL, NULL, NULL, NULL, '2026-02-23 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00', 0.00),
	('44d28eb0-a68d-4c67-b95f-101e3487a9dd', '11111111-1111-4111-8111-111111111111', 'Juanito', 'Sanchez Villapudua', NULL, '6691005972', NULL, 'alumno', 'al_corriente', 'activo', NULL, '{}', NULL, NULL, NULL, NULL, '2026-06-04 22:50:36.696152+00', '2026-06-04 23:57:21.78407+00', 2250.00),
	('d0000004-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', 'Iker', 'Suspendido', NULL, '6691101010', NULL, 'alumno', 'vencido', 'inactivo', NULL, '{}', NULL, NULL, NULL, NULL, '2026-03-10 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00', 800.00),
	('d0000006-0000-4000-8000-000000000006', '22222222-2222-4222-8222-222222222222', 'Sofía', 'Morosa', NULL, '6691801010', NULL, 'alumno', 'vencido', 'activo', NULL, '{}', NULL, NULL, NULL, NULL, '2026-03-14 19:28:05.865618+00', '2026-06-09 01:38:51.63089+00', 200.00),
	('51c7f911-9f11-4e69-a63f-1fa59b35e8bf', '22222222-2222-4222-8222-222222222222', 'Ana', 'Perez', NULL, '6691666666', NULL, 'alumno', 'al_corriente', 'activo', NULL, '{}', NULL, NULL, NULL, NULL, '2026-06-09 23:00:19.286257+00', '2026-06-09 23:00:19.286257+00', 0.00),
	('d0000005-0000-4000-8000-000000000005', '22222222-2222-4222-8222-222222222222', 'Valentina Victoria', 'Hernandez Gutierrez', NULL, NULL, NULL, 'alumno', 'al_corriente', 'activo', NULL, '{}', NULL, NULL, NULL, NULL, '2026-03-12 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00', 0.00),
	('d000000a-0000-4000-8000-00000000000a', '22222222-2222-4222-8222-222222222222', 'Lucía', 'Sabatina', NULL, '5551000010', NULL, 'alumno', 'vencido', 'activo', NULL, '{}', NULL, NULL, NULL, NULL, '2026-03-30 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00', 300.00);


--
-- Data for Name: planes_cobro; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."planes_cobro" ("id", "academia_id", "nombre", "monto", "frecuencia", "created_at", "activo", "requiere_inscripcion") VALUES
	('b0000001-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Mensualidad General', 800.00, 'mensual', '2026-02-03 19:28:05.865618+00', true, true),
	('b0000002-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', 'Plan 2 días', 750.00, 'mensual', '2026-02-03 19:28:05.865618+00', true, true),
	('b0000003-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222', 'Plan 5 días - Completo', 1200.00, 'mensual', '2026-02-03 19:28:05.865618+00', true, true),
	('b0000004-0000-4000-8000-000000000004', '22222222-2222-4222-8222-222222222222', 'Mensualidad Sabatina', 500.00, 'mensual', '2026-02-03 19:28:05.865618+00', true, true),
	('b0000005-0000-4000-8000-000000000005', '22222222-2222-4222-8222-222222222222', 'Clase Fitness Adultos', 90.00, 'por_visita', '2026-02-03 19:28:05.865618+00', true, true),
	('b0000006-0000-4000-8000-000000000006', '22222222-2222-4222-8222-222222222222', 'Workshop Intensivo Verano', 600.00, 'pago_unico', '2026-02-08 19:28:05.865618+00', false, true);


--
-- Data for Name: alumno_planes; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."alumno_planes" ("academia_id", "alumno_id", "plan_cobro_id", "created_at") VALUES
	('11111111-1111-4111-8111-111111111111', 'd0000001-0000-4000-8000-000000000001', 'b0000001-0000-4000-8000-000000000001', '2026-02-28 19:28:05.865618+00'),
	('11111111-1111-4111-8111-111111111111', 'd0000002-0000-4000-8000-000000000002', 'b0000001-0000-4000-8000-000000000001', '2026-03-02 19:28:05.865618+00'),
	('11111111-1111-4111-8111-111111111111', 'd0000003-0000-4000-8000-000000000003', 'b0000001-0000-4000-8000-000000000001', '2026-03-05 19:28:05.865618+00'),
	('11111111-1111-4111-8111-111111111111', 'd0000004-0000-4000-8000-000000000004', 'b0000001-0000-4000-8000-000000000001', '2026-03-10 19:28:05.865618+00'),
	('22222222-2222-4222-8222-222222222222', 'd0000005-0000-4000-8000-000000000005', 'b0000002-0000-4000-8000-000000000002', '2026-03-12 19:28:05.865618+00'),
	('22222222-2222-4222-8222-222222222222', 'd0000005-0000-4000-8000-000000000005', 'b0000004-0000-4000-8000-000000000004', '2026-03-12 19:28:05.865618+00'),
	('22222222-2222-4222-8222-222222222222', 'd0000006-0000-4000-8000-000000000006', 'b0000003-0000-4000-8000-000000000003', '2026-03-14 19:28:05.865618+00'),
	('22222222-2222-4222-8222-222222222222', 'd0000007-0000-4000-8000-000000000007', 'b0000005-0000-4000-8000-000000000005', '2026-03-20 19:28:05.865618+00'),
	('22222222-2222-4222-8222-222222222222', 'd0000008-0000-4000-8000-000000000008', 'b0000006-0000-4000-8000-000000000006', '2026-02-23 19:28:05.865618+00'),
	('22222222-2222-4222-8222-222222222222', 'd000000a-0000-4000-8000-00000000000a', 'b0000004-0000-4000-8000-000000000004', '2026-03-30 19:28:05.865618+00'),
	('11111111-1111-4111-8111-111111111111', '44d28eb0-a68d-4c67-b95f-101e3487a9dd', 'b0000001-0000-4000-8000-000000000001', '2026-06-04 22:50:37.261039+00');


--
-- Data for Name: grupo; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."grupo" ("id", "academia_id", "nombre", "descripcion", "color", "estado", "orden_visual", "created_by", "created_at", "updated_at", "emoji", "plan_sugerido_id", "es_temporal", "fecha_inicio", "fecha_fin", "costo_actividad", "dias_semana", "hora_inicio", "hora_fin", "cupo_maximo") VALUES
	('c0000005-0000-4000-8000-000000000005', '22222222-2222-4222-8222-222222222222', 'Sabatino Intensivo', 'Solo sábados', 'naranja', 'activo', 3, NULL, '2026-02-08 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00', '📅', 'b0000004-0000-4000-8000-000000000004', false, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
	('c0000006-0000-4000-8000-000000000006', '22222222-2222-4222-8222-222222222222', 'Zumba Histórico', 'Grupo descontinuado', 'gris', 'archivado', 4, NULL, '2026-02-18 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00', '🎶', NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
	('c0000004-0000-4000-8000-000000000004', '22222222-2222-4222-8222-222222222222', 'Jazz Avanzado', 'Nivel alto', 'rosa-pastel', 'activo', 2, NULL, '2026-02-08 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00', '🎯', NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
	('c0000001-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Sub 9', 'Categoría infantil', 'azul-indigo-claro', 'activo', 1, NULL, '2026-02-08 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00', '🐣', 'b0000001-0000-4000-8000-000000000001', false, NULL, NULL, NULL, '{1,2,4,5,0}', '18:00:00', '19:00:00', NULL),
	('c0000002-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'Sub 13', 'Categoría juvenil', 'cafe-arena', 'activo', 2, NULL, '2026-02-08 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00', '🏆', 'b0000001-0000-4000-8000-000000000001', false, NULL, NULL, NULL, '{2,3,4,5}', '18:00:00', NULL, 2),
	('63ddcc47-c7f7-4cdd-a427-527b94044d30', '11111111-1111-4111-8111-111111111111', 'Taller de Invierno', NULL, NULL, 'activo', 0, NULL, '2026-06-03 23:38:12.779493+00', '2026-06-03 23:38:12.779493+00', '❄️', NULL, true, '2026-06-04', '2026-06-06', 500.00, '{1,2,5}', NULL, NULL, NULL),
	('fd9310f7-2f9d-429e-ab08-2e67c050ae8f', '11111111-1111-4111-8111-111111111111', 'Taller de verano', NULL, NULL, 'activo', 0, NULL, '2026-06-03 23:01:52.516676+00', '2026-06-03 23:01:52.516676+00', '☀️', NULL, true, '2026-06-01', '2026-06-09', 900.00, '{6}', NULL, NULL, NULL),
	('c0000003-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222', 'Grupo Rosa (4-6 años)', 'Iniciación', 'lila-claro', 'activo', 1, NULL, '2026-02-08 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00', '👧', NULL, false, NULL, NULL, NULL, '{1,2,3,4,5}', NULL, NULL, NULL),
	('224f1754-c76c-4215-90f9-128b6da20711', '11111111-1111-4111-8111-111111111111', 'Campamento loco', NULL, NULL, 'activo', 0, NULL, '2026-06-10 22:44:06.064698+00', '2026-06-10 22:44:06.064698+00', '⛺', NULL, true, '2026-06-13', '2026-06-19', 600.00, NULL, NULL, NULL, 10),
	('d31f4db1-7e80-422f-ba43-06a6047eceb8', '22222222-2222-4222-8222-222222222222', 'Taller de costura intensivo sabatino', NULL, NULL, 'activo', 0, NULL, '2026-06-03 23:46:48.281323+00', '2026-06-03 23:46:48.281323+00', '🎨', NULL, true, '2026-06-13', '2026-06-30', 450.00, '{6}', NULL, NULL, NULL);


--
-- Data for Name: cargo; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."cargo" ("id", "academia_id", "persona_id", "grupo_id_origen", "concepto", "descripcion", "monto_original", "saldo_pendiente", "fecha_creacion", "fecha_vencimiento", "fecha_promesa", "estado_financiero", "origen", "metadata", "created_by", "created_at", "updated_at", "nota_modificacion") VALUES
	('e0000001-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'd0000001-0000-4000-8000-000000000001', 'c0000001-0000-4000-8000-000000000001', 'Mensualidad Marzo 2026', NULL, 800.00, 0.00, '2026-03-30 19:28:05.865618+00', '2026-04-14', NULL, 'liquidado', 'recurrente', '{"plan_id": "b0000001-0000-4000-8000-000000000001"}', 'a1111111-1111-4111-8111-111111111111', '2026-05-29 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00', NULL),
	('e0000002-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'd0000002-0000-4000-8000-000000000002', 'c0000002-0000-4000-8000-000000000002', 'Mensualidad Marzo 2026', NULL, 800.00, 800.00, '2026-03-28 19:28:05.865618+00', '2026-04-12', NULL, 'vencido', 'recurrente', '{"plan_id": "b0000001-0000-4000-8000-000000000001"}', 'a1111111-1111-4111-8111-111111111111', '2026-05-29 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00', NULL),
	('e0000003-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'd0000002-0000-4000-8000-000000000002', 'c0000002-0000-4000-8000-000000000002', 'Mensualidad Abril 2026', NULL, 800.00, 800.00, '2026-04-28 19:28:05.865618+00', '2026-05-13', NULL, 'vencido', 'recurrente', '{"plan_id": "b0000001-0000-4000-8000-000000000001"}', 'a1111111-1111-4111-8111-111111111111', '2026-05-29 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00', NULL),
	('e0000004-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', 'd0000003-0000-4000-8000-000000000003', 'c0000001-0000-4000-8000-000000000001', 'Mensualidad Abril 2026', NULL, 800.00, 0.00, '2026-04-09 19:28:05.865618+00', '2026-04-24', NULL, 'liquidado', 'recurrente', '{"plan_id": "b0000001-0000-4000-8000-000000000001"}', 'a1111111-1111-4111-8111-111111111111', '2026-05-29 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00', NULL),
	('e0000005-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', 'd0000003-0000-4000-8000-000000000003', NULL, 'Cargo por error (uniforme duplicado)', NULL, 1000.00, 0.00, '2026-05-09 19:28:05.865618+00', '2026-05-24', NULL, 'anulado', 'manual', '{"anulado": true}', 'a1111111-1111-4111-8111-111111111111', '2026-05-29 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00', NULL),
	('e0000006-0000-4000-8000-000000000006', '11111111-1111-4111-8111-111111111111', 'd0000004-0000-4000-8000-000000000004', 'c0000002-0000-4000-8000-000000000002', 'Mensualidad Marzo 2026', NULL, 800.00, 800.00, '2026-04-19 19:28:05.865618+00', '2026-05-04', NULL, 'vencido', 'recurrente', '{"plan_id": "b0000001-0000-4000-8000-000000000001"}', 'a1111111-1111-4111-8111-111111111111', '2026-05-29 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00', NULL),
	('e0000007-0000-4000-8000-000000000007', '22222222-2222-4222-8222-222222222222', 'd0000005-0000-4000-8000-000000000005', 'c0000003-0000-4000-8000-000000000003', 'Plan 2 días - Abril', NULL, 750.00, 0.00, '2026-04-24 19:28:05.865618+00', '2026-05-09', NULL, 'liquidado', 'recurrente', '{"plan_id": "b0000002-0000-4000-8000-000000000002"}', 'a2222222-2222-4222-8222-222222222222', '2026-05-29 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00', NULL),
	('e0000008-0000-4000-8000-000000000008', '22222222-2222-4222-8222-222222222222', 'd0000005-0000-4000-8000-000000000005', 'c0000005-0000-4000-8000-000000000005', 'Mensualidad Sabatina - Abril', NULL, 500.00, 0.00, '2026-04-24 19:28:05.865618+00', '2026-05-09', NULL, 'liquidado', 'recurrente', '{"plan_id": "b0000004-0000-4000-8000-000000000004"}', 'a2222222-2222-4222-8222-222222222222', '2026-05-29 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00', NULL),
	('e000000a-0000-4000-8000-00000000000a', '22222222-2222-4222-8222-222222222222', 'd0000006-0000-4000-8000-000000000006', NULL, 'Taller extra de contemporáneo', NULL, 150.00, 150.00, '2026-05-04 19:28:05.865618+00', '2026-05-19', NULL, 'pendiente', 'manual', '{"manual": true}', 'a2222222-2222-4222-8222-222222222222', '2026-05-29 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00', NULL),
	('e000000b-0000-4000-8000-00000000000b', '22222222-2222-4222-8222-222222222222', 'd0000007-0000-4000-8000-000000000007', 'c0000004-0000-4000-8000-000000000004', 'Clase Fitness Adultos', NULL, 90.00, 0.00, '2026-05-09 19:28:05.865618+00', '2026-05-09', NULL, 'liquidado', 'manual', '{"plan_id": "b0000005-0000-4000-8000-000000000005"}', 'a2222222-2222-4222-8222-222222222222', '2026-05-29 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00', NULL),
	('e000000c-0000-4000-8000-00000000000c', '22222222-2222-4222-8222-222222222222', 'd0000007-0000-4000-8000-000000000007', 'c0000004-0000-4000-8000-000000000004', 'Clase Fitness Adultos', NULL, 90.00, 90.00, '2026-05-24 19:28:05.865618+00', '2026-05-24', NULL, 'pendiente', 'manual', '{"plan_id": "b0000005-0000-4000-8000-000000000005"}', 'a2222222-2222-4222-8222-222222222222', '2026-05-29 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00', NULL),
	('e000000d-0000-4000-8000-00000000000d', '22222222-2222-4222-8222-222222222222', 'd0000008-0000-4000-8000-000000000008', 'c0000004-0000-4000-8000-000000000004', 'Workshop Intensivo Verano', NULL, 600.00, 0.00, '2026-03-15 19:28:05.865618+00', '2026-03-30', NULL, 'liquidado', 'inscripcion', '{"plan_id": "b0000006-0000-4000-8000-000000000006"}', 'a2222222-2222-4222-8222-222222222222', '2026-05-29 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00', NULL),
	('e000000e-0000-4000-8000-00000000000e', '22222222-2222-4222-8222-222222222222', 'd000000a-0000-4000-8000-00000000000a', 'c0000005-0000-4000-8000-000000000005', 'Mensualidad Sabatina - Abril', NULL, 500.00, 300.00, '2026-04-29 19:28:05.865618+00', '2026-05-14', NULL, 'parcial', 'recurrente', '{"plan_id": "b0000004-0000-4000-8000-000000000004"}', 'a2222222-2222-4222-8222-222222222222', '2026-05-29 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00', NULL),
	('a35f6641-a9f7-4ebe-95b7-e787119223a1', '11111111-1111-4111-8111-111111111111', '44d28eb0-a68d-4c67-b95f-101e3487a9dd', NULL, 'Mensualidad General', NULL, 800.00, 800.00, '2026-06-04 22:50:37.261039+00', '2026-06-30', NULL, 'pendiente', 'inscripcion', '{"plan_id": "b0000001-0000-4000-8000-000000000001", "grupo_id": "c0000002-0000-4000-8000-000000000002", "inscripcion_inicial": true}', NULL, '2026-06-04 22:50:37.261039+00', '2026-06-04 22:50:37.261039+00', NULL),
	('8670b3ef-8ad5-471c-a59a-e40bc2a4a707', '11111111-1111-4111-8111-111111111111', '44d28eb0-a68d-4c67-b95f-101e3487a9dd', NULL, 'Inscripción (Nota: tarde)', NULL, 50.00, 50.00, '2026-06-04 22:50:40.968976+00', '2026-06-04', NULL, 'pendiente', 'inscripcion', '{"manual": true, "cargo_unico": true, "nota_modificacion": "tarde", "precio_modificado": true}', 'a1111111-1111-4111-8111-111111111111', '2026-06-04 22:50:40.968976+00', '2026-06-04 22:50:40.968976+00', NULL),
	('2f968e6d-e35e-4511-8332-5b7d08a7704b', '11111111-1111-4111-8111-111111111111', '44d28eb0-a68d-4c67-b95f-101e3487a9dd', NULL, 'Inscripción', NULL, 900.00, 900.00, '2026-06-04 23:13:22.270703+00', '2026-06-04', NULL, 'pendiente', 'manual', '{"manual": true, "cargo_unico": true}', 'a1111111-1111-4111-8111-111111111111', '2026-06-04 23:13:22.270703+00', '2026-06-04 23:13:22.270703+00', NULL),
	('3bb9e89b-098e-4a36-bfec-fb300c04f735', '11111111-1111-4111-8111-111111111111', '44d28eb0-a68d-4c67-b95f-101e3487a9dd', NULL, 'Inscripción', NULL, 500.00, 500.00, '2026-06-04 23:57:21.78407+00', '2026-06-04', NULL, 'pendiente', 'manual', '{"manual": true, "cargo_unico": true}', 'a1111111-1111-4111-8111-111111111111', '2026-06-04 23:57:21.78407+00', '2026-06-04 23:57:21.78407+00', NULL),
	('e0000009-0000-4000-8000-000000000009', '22222222-2222-4222-8222-222222222222', 'd0000006-0000-4000-8000-000000000006', 'c0000004-0000-4000-8000-000000000004', 'Plan 5 días - Abril', NULL, 1200.00, 50.00, '2026-04-17 19:28:05.865618+00', '2026-05-02', NULL, 'parcial', 'recurrente', '{"plan_id": "b0000003-0000-4000-8000-000000000003"}', 'a2222222-2222-4222-8222-222222222222', '2026-05-29 19:28:05.865618+00', '2026-06-09 01:38:51.63089+00', NULL);


--
-- Data for Name: movimiento; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."movimiento" ("id", "academia_id", "persona_id", "monto_total", "monto_disponible", "fecha_pago", "metodo_pago", "referencia", "estado", "idempotency_key", "created_by", "anulado_by", "anulado_motivo", "created_at", "updated_at") VALUES
	('f0000001-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'd0000001-0000-4000-8000-000000000001', 800.00, 0.00, '2026-04-01 19:28:05.865618+00', 'efectivo', NULL, 'registrado', 'seed-mv-diego', 'a1111111-1111-4111-8111-111111111111', NULL, NULL, '2026-04-01 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00'),
	('f0000002-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'd0000003-0000-4000-8000-000000000003', 800.00, 0.00, '2026-04-11 19:28:05.865618+00', 'transferencia', NULL, 'registrado', 'seed-mv-bruno', 'a1111111-1111-4111-8111-111111111111', NULL, NULL, '2026-04-11 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00'),
	('f0000003-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222', 'd0000005-0000-4000-8000-000000000005', 750.00, 0.00, '2026-04-25 19:28:05.865618+00', 'tarjeta', NULL, 'registrado', 'seed-mv-vale-2d', 'a2222222-2222-4222-8222-222222222222', NULL, NULL, '2026-04-25 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00'),
	('f0000004-0000-4000-8000-000000000004', '22222222-2222-4222-8222-222222222222', 'd0000005-0000-4000-8000-000000000005', 500.00, 0.00, '2026-04-25 19:28:05.865618+00', 'tarjeta', NULL, 'registrado', 'seed-mv-vale-sab', 'a2222222-2222-4222-8222-222222222222', NULL, NULL, '2026-04-25 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00'),
	('f0000005-0000-4000-8000-000000000005', '22222222-2222-4222-8222-222222222222', 'd0000006-0000-4000-8000-000000000006', 500.00, 0.00, '2026-04-29 19:28:05.865618+00', 'efectivo', NULL, 'registrado', 'seed-mv-sofia-1', 'a2222222-2222-4222-8222-222222222222', NULL, NULL, '2026-04-29 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00'),
	('f0000006-0000-4000-8000-000000000006', '22222222-2222-4222-8222-222222222222', 'd0000006-0000-4000-8000-000000000006', 300.00, 0.00, '2026-05-14 19:28:05.865618+00', 'efectivo', NULL, 'registrado', 'seed-mv-sofia-2', 'a2222222-2222-4222-8222-222222222222', NULL, NULL, '2026-05-14 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00'),
	('f0000007-0000-4000-8000-000000000007', '22222222-2222-4222-8222-222222222222', 'd0000007-0000-4000-8000-000000000007', 90.00, 0.00, '2026-05-10 19:28:05.865618+00', 'efectivo', NULL, 'registrado', 'seed-mv-emma', 'a2222222-2222-4222-8222-222222222222', NULL, NULL, '2026-05-10 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00'),
	('f0000008-0000-4000-8000-000000000008', '22222222-2222-4222-8222-222222222222', 'd0000008-0000-4000-8000-000000000008', 600.00, 0.00, '2026-03-17 19:28:05.865618+00', 'transferencia', NULL, 'registrado', 'seed-mv-regina', 'a2222222-2222-4222-8222-222222222222', NULL, NULL, '2026-03-17 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00'),
	('f0000009-0000-4000-8000-000000000009', '22222222-2222-4222-8222-222222222222', 'd000000a-0000-4000-8000-00000000000a', 200.00, 0.00, '2026-05-09 19:28:05.865618+00', 'efectivo', NULL, 'registrado', 'seed-mv-lucia', 'a2222222-2222-4222-8222-222222222222', NULL, NULL, '2026-05-09 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00'),
	('b6303b32-3f97-491b-b31c-7073198f9c9f', '22222222-2222-4222-8222-222222222222', 'd0000006-0000-4000-8000-000000000006', 100.00, 0.00, '2026-06-09 01:38:22.591504+00', 'efectivo', 'abono', 'registrado', '2ea21c2a-c718-4c79-86c1-41e38c1eb3fb', 'a2222222-2222-4222-8222-222222222222', NULL, NULL, '2026-06-09 01:38:22.591504+00', '2026-06-09 01:38:22.591504+00'),
	('e06a2451-96b1-43b7-8611-ad64d33304e9', '22222222-2222-4222-8222-222222222222', 'd0000006-0000-4000-8000-000000000006', 250.00, 0.00, '2026-06-09 01:38:51.63089+00', 'efectivo', NULL, 'registrado', '31a7c23f-fbe4-42c6-9746-3dc58a9cfa40', 'a2222222-2222-4222-8222-222222222222', NULL, NULL, '2026-06-09 01:38:51.63089+00', '2026-06-09 01:38:51.63089+00');


--
-- Data for Name: aplicacion_movimiento; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."aplicacion_movimiento" ("id", "academia_id", "movimiento_id", "cargo_id", "monto_aplicado", "estado", "created_at") VALUES
	('4de8adb6-71be-4040-8b6b-5a5b776169fd', '11111111-1111-4111-8111-111111111111', 'f0000001-0000-4000-8000-000000000001', 'e0000001-0000-4000-8000-000000000001', 800.00, 'activa', '2026-04-01 19:28:05.865618+00'),
	('ecb3e09d-7336-42e6-96d3-96a99697539e', '11111111-1111-4111-8111-111111111111', 'f0000002-0000-4000-8000-000000000002', 'e0000004-0000-4000-8000-000000000004', 800.00, 'activa', '2026-04-11 19:28:05.865618+00'),
	('1e4b75c8-fdc3-4faa-8ccb-1b056e0686dd', '22222222-2222-4222-8222-222222222222', 'f0000003-0000-4000-8000-000000000003', 'e0000007-0000-4000-8000-000000000007', 750.00, 'activa', '2026-04-25 19:28:05.865618+00'),
	('31bbe72c-6b16-475b-925c-46e01baf3679', '22222222-2222-4222-8222-222222222222', 'f0000004-0000-4000-8000-000000000004', 'e0000008-0000-4000-8000-000000000008', 500.00, 'activa', '2026-04-25 19:28:05.865618+00'),
	('2649b20f-b69e-43de-8eee-c1ac8c0c4259', '22222222-2222-4222-8222-222222222222', 'f0000005-0000-4000-8000-000000000005', 'e0000009-0000-4000-8000-000000000009', 500.00, 'activa', '2026-04-29 19:28:05.865618+00'),
	('a0dcc8da-6ce3-40a4-8782-38fbbea7ce7c', '22222222-2222-4222-8222-222222222222', 'f0000006-0000-4000-8000-000000000006', 'e0000009-0000-4000-8000-000000000009', 300.00, 'activa', '2026-05-14 19:28:05.865618+00'),
	('9abf790f-73f4-4d31-920f-07073178f384', '22222222-2222-4222-8222-222222222222', 'f0000007-0000-4000-8000-000000000007', 'e000000b-0000-4000-8000-00000000000b', 90.00, 'activa', '2026-05-10 19:28:05.865618+00'),
	('532255b2-7998-4c9b-992e-9fb360eb9c43', '22222222-2222-4222-8222-222222222222', 'f0000008-0000-4000-8000-000000000008', 'e000000d-0000-4000-8000-00000000000d', 600.00, 'activa', '2026-03-17 19:28:05.865618+00'),
	('92d8199e-0650-41ab-8042-2750cca976de', '22222222-2222-4222-8222-222222222222', 'f0000009-0000-4000-8000-000000000009', 'e000000e-0000-4000-8000-00000000000e', 200.00, 'activa', '2026-05-09 19:28:05.865618+00'),
	('bc03bf87-dbff-430a-83ed-db87a5a73231', '22222222-2222-4222-8222-222222222222', 'b6303b32-3f97-491b-b31c-7073198f9c9f', 'e0000009-0000-4000-8000-000000000009', 100.00, 'activa', '2026-06-09 01:38:22.591504+00'),
	('129b6697-5959-4087-96e8-e6f910c45f22', '22222222-2222-4222-8222-222222222222', 'e06a2451-96b1-43b7-8611-ad64d33304e9', 'e0000009-0000-4000-8000-000000000009', 250.00, 'activa', '2026-06-09 01:38:51.63089+00');


--
-- Data for Name: envio_sugerido; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: evento_timeline; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."evento_timeline" ("id", "academia_id", "persona_id", "categoria", "tipo", "titulo", "descripcion", "fecha_evento", "actor_id", "actor_nombre", "metadata", "monto") VALUES
	('ffcc5db1-7122-4c7d-a058-af79edb118e7', '22222222-2222-4222-8222-222222222222', 'd000000a-0000-4000-8000-00000000000a', 'OPERATIVO', 'GRUPO_MUTACION', 'Grupo removido', 'Sabatino Intensivo', '2026-06-11 04:12:37.38777+00', 'a2222222-2222-4222-8222-222222222222', 'Ana Reyes', '{"grupo_id": "c0000005-0000-4000-8000-000000000005"}', NULL),
	('afdcedd0-bb26-4203-95e5-fb5253c1300f', '22222222-2222-4222-8222-222222222222', 'd0000005-0000-4000-8000-000000000005', 'OPERATIVO', 'GRUPO_MUTACION', 'Grupo removido', 'Jazz Avanzado', '2026-06-10 21:51:37.596274+00', 'a2222222-2222-4222-8222-222222222222', 'Ana Reyes', '{"grupo_id": "c0000004-0000-4000-8000-000000000004"}', NULL),
	('70274c20-f112-486f-bf7d-2eff9e98ac50', '22222222-2222-4222-8222-222222222222', 'd0000005-0000-4000-8000-000000000005', 'OPERATIVO', 'GRUPO_MUTACION', 'Grupo asignado', 'Jazz Avanzado', '2026-06-10 21:59:23.518588+00', 'a2222222-2222-4222-8222-222222222222', 'Ana Reyes', '{"grupo_id": "c0000004-0000-4000-8000-000000000004"}', NULL),
	('5214a3c6-bcea-4957-befa-68a32ed5cf87', '22222222-2222-4222-8222-222222222222', 'd0000007-0000-4000-8000-000000000007', 'FINANZAS', 'CARGO_UNICO', 'Clase Fitness Adultos', 'Cargo por visita $90', '2026-05-24 19:28:05.865618+00', 'a2222222-2222-4222-8222-222222222222', 'Ana Reyes', '{"monto": 90}', 90.00),
	('a336a763-2875-4c7d-8021-c83fd71a5450', '11111111-1111-4111-8111-111111111111', '44d28eb0-a68d-4c67-b95f-101e3487a9dd', 'FINANZAS', 'INSCRIPCION', 'Cargo: Inscripción', 'Cargo manual único por $500', '2026-06-04 23:57:21.78407+00', 'a1111111-1111-4111-8111-111111111111', NULL, '{"monto": 500, "cargo_id": "3bb9e89b-098e-4a36-bfec-fb300c04f735"}', 500.00),
	('9d555b94-e418-4a9f-a803-58083e116e4d', '11111111-1111-4111-8111-111111111111', '44d28eb0-a68d-4c67-b95f-101e3487a9dd', 'FINANZAS', 'INSCRIPCION', 'Cargo: Inscripción', 'Cargo manual único por $900', '2026-06-04 23:13:22.270703+00', 'a1111111-1111-4111-8111-111111111111', NULL, '{"monto": 900, "cargo_id": "2f968e6d-e35e-4511-8332-5b7d08a7704b"}', 900.00),
	('f0d48d7d-4c4d-4a43-802f-fe73a8bfe0bc', '11111111-1111-4111-8111-111111111111', '44d28eb0-a68d-4c67-b95f-101e3487a9dd', 'FINANZAS', 'INSCRIPCION', 'Cargo: Inscripción (Nota: tarde)', 'Cargo manual por $50 — tarde', '2026-06-04 22:50:40.968976+00', 'a1111111-1111-4111-8111-111111111111', NULL, '{"monto": 50, "origen": "inscripcion", "cargo_id": "8670b3ef-8ad5-471c-a59a-e40bc2a4a707", "nota_modificacion": "tarde"}', 50.00),
	('6b0e865a-369d-47ab-be35-683425475dd3', '11111111-1111-4111-8111-111111111111', '44d28eb0-a68d-4c67-b95f-101e3487a9dd', 'FINANZAS', 'INSCRIPCION', 'Cargo inicial: Mensualidad General', 'Se generó cargo por $800 al inscribir al grupo', '2026-06-04 22:50:37.261039+00', 'a1111111-1111-4111-8111-111111111111', NULL, '{"monto": 800, "plan_id": "b0000001-0000-4000-8000-000000000001", "cargo_id": "a35f6641-a9f7-4ebe-95b7-e787119223a1", "grupo_id": "c0000002-0000-4000-8000-000000000002"}', 800.00),
	('d0816b92-95fc-42b0-808c-722b757de872', '11111111-1111-4111-8111-111111111111', 'd0000003-0000-4000-8000-000000000003', 'FINANZAS', 'ANULACION_CARGO', 'Cargo anulado', 'Se anuló el cargo erróneo de $1000', '2026-05-09 20:28:05.865618+00', 'a1111111-1111-4111-8111-111111111111', 'Carlos Núñez', '{"monto": 1000, "motivo": "Cargo duplicado por error"}', 1000.00),
	('dd866ebb-f131-4a32-a22f-e7263c10f078', '11111111-1111-4111-8111-111111111111', 'd0000003-0000-4000-8000-000000000003', 'FINANZAS', 'CARGO_UNICO', 'Cargo por error (uniforme duplicado)', 'Cargo manual por $1000', '2026-05-09 19:28:05.865618+00', 'a1111111-1111-4111-8111-111111111111', 'Carlos Núñez', '{"monto": 1000}', 1000.00),
	('90454fab-e675-4fcf-b807-26dc1b89a08a', '11111111-1111-4111-8111-111111111111', 'd0000002-0000-4000-8000-000000000002', 'FINANZAS', 'CARGO_RECURRENTE', 'Mensualidad Abril 2026', 'Cargo recurrente por $800', '2026-04-28 19:28:05.865618+00', NULL, 'Sistema (cron)', '{"monto": 800}', 800.00),
	('c6e25de1-7ba6-4a51-8786-9323b557ba52', '11111111-1111-4111-8111-111111111111', 'd0000004-0000-4000-8000-000000000004', 'FINANZAS', 'CARGO_RECURRENTE', 'Mensualidad Marzo 2026', 'Cargo recurrente por $800', '2026-04-19 19:28:05.865618+00', NULL, 'Sistema (cron)', '{"monto": 800}', 800.00),
	('84b3d70f-46c2-4ac6-88bd-02f6d8d19288', '11111111-1111-4111-8111-111111111111', 'd0000003-0000-4000-8000-000000000003', 'FINANZAS', 'PAGO_ABONO', 'Pago registrado', 'Pago por $800 transferencia', '2026-04-11 19:28:05.865618+00', 'a1111111-1111-4111-8111-111111111111', 'Carlos Núñez', '{"monto": 800, "metodo": "transferencia", "movimiento_id": "f0000002-0000-4000-8000-000000000002"}', 800.00),
	('8bdc87a8-767a-40d3-83e4-f3d67099ebf7', '11111111-1111-4111-8111-111111111111', 'd0000003-0000-4000-8000-000000000003', 'FINANZAS', 'CARGO_RECURRENTE', 'Mensualidad Abril 2026', 'Cargo recurrente por $800', '2026-04-09 19:28:05.865618+00', NULL, 'Sistema (cron)', '{"monto": 800}', 800.00),
	('3165ca68-af88-4a91-b714-78b72c5e2b03', '11111111-1111-4111-8111-111111111111', 'd0000001-0000-4000-8000-000000000001', 'FINANZAS', 'PAGO_ABONO', 'Pago registrado', 'Pago por $800 efectivo', '2026-04-01 19:28:05.865618+00', 'a1111111-1111-4111-8111-111111111111', 'Carlos Núñez', '{"monto": 800, "metodo": "efectivo", "movimiento_id": "f0000001-0000-4000-8000-000000000001"}', 800.00),
	('5a0f350b-d9be-4c65-8fe8-95d97755cbed', '11111111-1111-4111-8111-111111111111', 'd0000001-0000-4000-8000-000000000001', 'FINANZAS', 'CARGO_RECURRENTE', 'Mensualidad Marzo 2026', 'Cargo recurrente por $800', '2026-03-30 19:28:05.865618+00', NULL, 'Sistema (cron)', '{"monto": 800, "plan_id": "b0000001-0000-4000-8000-000000000001"}', 800.00),
	('eddee61d-1ee3-4786-a978-b672fb99d677', '11111111-1111-4111-8111-111111111111', 'd0000002-0000-4000-8000-000000000002', 'FINANZAS', 'CARGO_RECURRENTE', 'Mensualidad Marzo 2026', 'Cargo recurrente por $800', '2026-03-28 19:28:05.865618+00', NULL, 'Sistema (cron)', '{"monto": 800}', 800.00),
	('4cec4933-6178-4257-bc3d-85aa2b80efc3', '22222222-2222-4222-8222-222222222222', 'd0000006-0000-4000-8000-000000000006', 'FINANZAS', 'PAGO_ABONO', 'Pago registrado', 'Se registró un pago por 250 efectivo', '2026-06-09 01:38:51.63089+00', 'a2222222-2222-4222-8222-222222222222', 'Sofía Morosa', '{"monto": 250, "metodo": "efectivo", "movimiento_id": "e06a2451-96b1-43b7-8611-ad64d33304e9"}', 250.00),
	('ff2f622f-cc22-48ee-a8f0-4e17c88b38c0', '22222222-2222-4222-8222-222222222222', 'd0000006-0000-4000-8000-000000000006', 'FINANZAS', 'PAGO_ABONO', 'Pago registrado', 'Se registró un pago por 100 efectivo', '2026-06-09 01:38:22.591504+00', 'a2222222-2222-4222-8222-222222222222', 'Sofía Morosa', '{"monto": 100, "metodo": "efectivo", "movimiento_id": "b6303b32-3f97-491b-b31c-7073198f9c9f"}', 100.00),
	('c1c4ced6-abb4-41b0-9bf1-f179a685d82a', '22222222-2222-4222-8222-222222222222', 'd0000006-0000-4000-8000-000000000006', 'FINANZAS', 'PAGO_ABONO', 'Pago registrado', 'Abono parcial por $300', '2026-05-14 19:28:05.865618+00', 'a2222222-2222-4222-8222-222222222222', 'Ana Reyes', '{"monto": 300, "metodo": "efectivo", "movimiento_id": "f0000006-0000-4000-8000-000000000006"}', 300.00),
	('12e86149-0f39-4140-9c1a-6924c6295769', '22222222-2222-4222-8222-222222222222', 'd0000007-0000-4000-8000-000000000007', 'FINANZAS', 'PAGO_ABONO', 'Pago registrado', 'Pago por $90 efectivo', '2026-05-10 19:28:05.865618+00', 'a2222222-2222-4222-8222-222222222222', 'Ana Reyes', '{"monto": 90, "metodo": "efectivo", "movimiento_id": "f0000007-0000-4000-8000-000000000007"}', 90.00),
	('f9805c5f-e170-4364-9d18-0e2d9002359f', '22222222-2222-4222-8222-222222222222', 'd0000007-0000-4000-8000-000000000007', 'FINANZAS', 'CARGO_UNICO', 'Clase Fitness Adultos', 'Cargo por visita $90', '2026-05-09 19:28:05.865618+00', 'a2222222-2222-4222-8222-222222222222', 'Ana Reyes', '{"monto": 90}', 90.00),
	('f8b7ba90-5dd7-48b3-9d6e-b63aadcb2eda', '22222222-2222-4222-8222-222222222222', 'd000000a-0000-4000-8000-00000000000a', 'FINANZAS', 'PAGO_ABONO', 'Pago registrado', 'Abono parcial por $200', '2026-05-09 19:28:05.865618+00', 'a2222222-2222-4222-8222-222222222222', 'Ana Reyes', '{"monto": 200, "metodo": "efectivo", "movimiento_id": "f0000009-0000-4000-8000-000000000009"}', 200.00),
	('5230c4ff-301f-4a7d-af8f-0b27ba76fe8c', '22222222-2222-4222-8222-222222222222', 'd0000006-0000-4000-8000-000000000006', 'FINANZAS', 'CARGO_UNICO', 'Taller extra de contemporáneo', 'Cargo manual por $150', '2026-05-04 19:28:05.865618+00', 'a2222222-2222-4222-8222-222222222222', 'Ana Reyes', '{"monto": 150}', 150.00),
	('4915f8c8-0e7b-4772-82d7-754157f98bec', '22222222-2222-4222-8222-222222222222', 'd000000a-0000-4000-8000-00000000000a', 'FINANZAS', 'CARGO_RECURRENTE', 'Mensualidad Sabatina - Abril', 'Cargo recurrente por $500', '2026-04-29 19:28:05.865618+00', NULL, 'Sistema (cron)', '{"monto": 500}', 500.00),
	('7c8c26ab-5b68-4136-ac61-0242cc46df11', '22222222-2222-4222-8222-222222222222', 'd0000006-0000-4000-8000-000000000006', 'FINANZAS', 'PAGO_ABONO', 'Pago registrado', 'Abono parcial por $500', '2026-04-29 19:28:05.865618+00', 'a2222222-2222-4222-8222-222222222222', 'Ana Reyes', '{"monto": 500, "metodo": "efectivo", "movimiento_id": "f0000005-0000-4000-8000-000000000005"}', 500.00),
	('5527cba0-61e3-4e68-80b0-82257036ad15', '22222222-2222-4222-8222-222222222222', 'd0000005-0000-4000-8000-000000000005', 'FINANZAS', 'PAGO_ABONO', 'Pago registrado', 'Pago por $500 tarjeta', '2026-04-25 19:33:05.865618+00', 'a2222222-2222-4222-8222-222222222222', 'Ana Reyes', '{"monto": 500, "metodo": "tarjeta", "movimiento_id": "f0000004-0000-4000-8000-000000000004"}', 500.00),
	('c7db67f9-d4f9-467d-b817-292c79c02c9e', '22222222-2222-4222-8222-222222222222', 'd0000005-0000-4000-8000-000000000005', 'FINANZAS', 'PAGO_ABONO', 'Pago registrado', 'Pago por $750 tarjeta', '2026-04-25 19:28:05.865618+00', 'a2222222-2222-4222-8222-222222222222', 'Ana Reyes', '{"monto": 750, "metodo": "tarjeta", "movimiento_id": "f0000003-0000-4000-8000-000000000003"}', 750.00),
	('5568590c-27c9-4e72-b15b-3f4b34c5964e', '22222222-2222-4222-8222-222222222222', 'd0000005-0000-4000-8000-000000000005', 'FINANZAS', 'CARGO_RECURRENTE', 'Plan 2 días - Abril', 'Cargo recurrente por $750', '2026-04-24 19:28:05.865618+00', NULL, 'Sistema (cron)', '{"monto": 750}', 750.00),
	('95be88fe-f131-4857-a9c9-2e815a167c81', '22222222-2222-4222-8222-222222222222', 'd0000005-0000-4000-8000-000000000005', 'FINANZAS', 'CARGO_RECURRENTE', 'Mensualidad Sabatina - Abril', 'Cargo recurrente por $500', '2026-04-24 19:28:05.865618+00', NULL, 'Sistema (cron)', '{"monto": 500}', 500.00),
	('6ca69649-fda1-4fb5-8c54-11a1d679dff0', '22222222-2222-4222-8222-222222222222', 'd0000006-0000-4000-8000-000000000006', 'FINANZAS', 'CARGO_RECURRENTE', 'Plan 5 días - Abril', 'Cargo recurrente por $1200', '2026-04-17 19:28:05.865618+00', NULL, 'Sistema (cron)', '{"monto": 1200}', 1200.00),
	('a21824b2-f55e-49c0-8341-7e95c2fc3485', '22222222-2222-4222-8222-222222222222', 'd0000008-0000-4000-8000-000000000008', 'FINANZAS', 'PAGO_ABONO', 'Pago registrado', 'Pago por $600 transferencia', '2026-03-17 19:28:05.865618+00', 'a2222222-2222-4222-8222-222222222222', 'Ana Reyes', '{"monto": 600, "metodo": "transferencia", "movimiento_id": "f0000008-0000-4000-8000-000000000008"}', 600.00),
	('170a7895-b2a8-4ce2-bebe-6c0fdcb43556', '22222222-2222-4222-8222-222222222222', 'd0000008-0000-4000-8000-000000000008', 'FINANZAS', 'CARGO_UNICO', 'Workshop Intensivo Verano', 'Cargo único por $600', '2026-03-15 19:28:05.865618+00', 'a2222222-2222-4222-8222-222222222222', 'Ana Reyes', '{"monto": 600}', 600.00),
	('a7b61101-10cd-444c-86d0-720876fd7f08', '22222222-2222-4222-8222-222222222222', 'd000000a-0000-4000-8000-00000000000a', 'OPERATIVO', 'INSCRIPCION_ACTIVIDAD', 'Actividad asignada', 'Taller de costura intensivo sabatino', '2026-06-11 04:12:37.38777+00', 'a2222222-2222-4222-8222-222222222222', 'Ana Reyes', '{"grupo_id": "d31f4db1-7e80-422f-ba43-06a6047eceb8"}', NULL);


--
-- Data for Name: job_execution; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: persona_grupo; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."persona_grupo" ("id", "academia_id", "persona_id", "grupo_id", "estado", "fecha_inscripcion", "fecha_remocion", "created_by", "created_at", "updated_at") VALUES
	('cdf91f0e-5a6c-4052-baf7-7d1000e05f36', '11111111-1111-4111-8111-111111111111', 'd0000001-0000-4000-8000-000000000001', 'c0000001-0000-4000-8000-000000000001', 'activo', '2026-02-28 19:28:05.865618+00', NULL, NULL, '2026-05-29 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00'),
	('56695fae-5652-418e-a3cd-5adc204bb36f', '11111111-1111-4111-8111-111111111111', 'd0000002-0000-4000-8000-000000000002', 'c0000002-0000-4000-8000-000000000002', 'activo', '2026-03-02 19:28:05.865618+00', NULL, NULL, '2026-05-29 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00'),
	('57a4a68a-3713-422a-8df0-0bd8a7f80402', '11111111-1111-4111-8111-111111111111', 'd0000003-0000-4000-8000-000000000003', 'c0000001-0000-4000-8000-000000000001', 'activo', '2026-03-05 19:28:05.865618+00', NULL, NULL, '2026-05-29 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00'),
	('8c624131-a66f-4c12-9ff3-71ab472cfa54', '11111111-1111-4111-8111-111111111111', 'd0000004-0000-4000-8000-000000000004', 'c0000002-0000-4000-8000-000000000002', 'activo', '2026-03-10 19:28:05.865618+00', NULL, NULL, '2026-05-29 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00'),
	('afd95fd3-cf15-450b-b046-5bf2eb6dcd96', '22222222-2222-4222-8222-222222222222', 'd0000005-0000-4000-8000-000000000005', 'c0000003-0000-4000-8000-000000000003', 'activo', '2026-03-12 19:28:05.865618+00', NULL, NULL, '2026-05-29 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00'),
	('dd1a6a8c-a846-462b-91f6-200fc5d2df84', '22222222-2222-4222-8222-222222222222', 'd0000006-0000-4000-8000-000000000006', 'c0000004-0000-4000-8000-000000000004', 'activo', '2026-03-14 19:28:05.865618+00', NULL, NULL, '2026-05-29 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00'),
	('f5e5c558-07d0-4a33-a1bc-b22d3b913aa8', '22222222-2222-4222-8222-222222222222', 'd0000007-0000-4000-8000-000000000007', 'c0000004-0000-4000-8000-000000000004', 'activo', '2026-03-20 19:28:05.865618+00', NULL, NULL, '2026-05-29 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00'),
	('7264da7e-06c2-4985-835c-b125cb054c66', '22222222-2222-4222-8222-222222222222', 'd0000008-0000-4000-8000-000000000008', 'c0000004-0000-4000-8000-000000000004', 'activo', '2026-02-23 19:28:05.865618+00', NULL, NULL, '2026-05-29 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00'),
	('28061587-d6bd-4bb0-ab24-18800f706df9', '22222222-2222-4222-8222-222222222222', 'd0000005-0000-4000-8000-000000000005', 'c0000005-0000-4000-8000-000000000005', 'removido', '2026-03-12 19:28:05.865618+00', '2026-06-03 05:50:41.121+00', NULL, '2026-05-29 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00'),
	('57bc40b3-a788-43db-b30c-de3ad4f39545', '11111111-1111-4111-8111-111111111111', '44d28eb0-a68d-4c67-b95f-101e3487a9dd', 'c0000002-0000-4000-8000-000000000002', 'activo', '2026-06-04 00:00:00+00', NULL, 'a1111111-1111-4111-8111-111111111111', '2026-06-04 22:50:37.126596+00', '2026-06-04 22:50:37.261039+00'),
	('2777ade5-d49f-461c-b90c-52d272c09a75', '11111111-1111-4111-8111-111111111111', '44d28eb0-a68d-4c67-b95f-101e3487a9dd', '63ddcc47-c7f7-4cdd-a427-527b94044d30', 'removido', '2026-06-04 00:00:00+00', '2026-06-05 21:00:36.021+00', 'a1111111-1111-4111-8111-111111111111', '2026-06-04 23:57:21.391437+00', '2026-06-04 23:57:21.391437+00'),
	('434910c3-2401-427d-bd89-fe3753ec2ee2', '11111111-1111-4111-8111-111111111111', '44d28eb0-a68d-4c67-b95f-101e3487a9dd', 'fd9310f7-2f9d-429e-ab08-2e67c050ae8f', 'removido', '2026-06-04 00:00:00+00', '2026-06-05 21:00:36.021+00', 'a1111111-1111-4111-8111-111111111111', '2026-06-04 23:13:21.908609+00', '2026-06-04 23:13:21.908609+00'),
	('8211f905-a77f-4aed-bfd9-5d5398092693', '22222222-2222-4222-8222-222222222222', '51c7f911-9f11-4e69-a63f-1fa59b35e8bf', 'c0000004-0000-4000-8000-000000000004', 'activo', '2026-06-09 00:00:00+00', NULL, 'a2222222-2222-4222-8222-222222222222', '2026-06-09 23:00:19.611823+00', '2026-06-09 23:00:19.611823+00'),
	('6eec0b41-34bd-425e-bdba-979858f8c330', '22222222-2222-4222-8222-222222222222', 'd0000005-0000-4000-8000-000000000005', 'c0000004-0000-4000-8000-000000000004', 'activo', '2026-06-10 00:00:00+00', '2026-06-10 21:51:37.432+00', NULL, '2026-06-09 21:55:54.669662+00', '2026-06-09 21:55:54.669662+00'),
	('9854fa52-8c75-4e3b-b373-d5a1dc04f137', '22222222-2222-4222-8222-222222222222', 'd000000a-0000-4000-8000-00000000000a', 'c0000005-0000-4000-8000-000000000005', 'removido', '2026-03-30 19:28:05.865618+00', '2026-06-11 04:12:37.318+00', NULL, '2026-05-29 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00'),
	('78394c1a-8e57-4c2e-9c25-334399293353', '22222222-2222-4222-8222-222222222222', 'd000000a-0000-4000-8000-00000000000a', 'd31f4db1-7e80-422f-ba43-06a6047eceb8', 'activo', '2026-06-11 00:00:00+00', NULL, NULL, '2026-06-11 04:12:36.833187+00', '2026-06-11 04:12:36.833187+00');


--
-- Data for Name: suscripcion_academia; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."suscripcion_academia" ("id", "academia_id", "plan_codigo", "estado", "is_current", "max_personas", "max_usuarios", "max_grupos", "precio_mensual", "moneda", "external_id", "fecha_inicio", "fecha_fin", "fecha_corte", "trial_ends_at", "grace_ends_at", "cancelado_at", "motivo_cancelacion", "metadata", "created_by", "created_at", "updated_at") VALUES
	('91d92029-b3a6-4c87-84e0-27ca7ebf9ac1', '11111111-1111-4111-8111-111111111111', 'pro', 'activa', true, 200, 5, NULL, 499.00, 'MXN', NULL, '2026-01-29 19:28:05.865618+00', NULL, NULL, NULL, NULL, NULL, NULL, '{}', 'a1111111-1111-4111-8111-111111111111', '2026-01-29 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00'),
	('35108edd-9197-49e3-a165-30722a9f2527', '22222222-2222-4222-8222-222222222222', 'basico', 'activa', true, 100, 3, NULL, 299.00, 'MXN', NULL, '2026-01-29 19:28:05.865618+00', NULL, NULL, NULL, NULL, NULL, NULL, '{}', 'a2222222-2222-4222-8222-222222222222', '2026-01-29 19:28:05.865618+00', '2026-05-29 19:28:05.865618+00'),
	('8d56e31b-2bc3-485d-8a12-ac627d271093', '977d8675-63c0-405d-a0a6-feba625c4e23', 'trial', 'trial', true, 30, 2, NULL, 0.00, 'MXN', NULL, '2026-05-29 20:12:13.924302+00', '2026-06-12 20:12:13.924302+00', NULL, '2026-06-12 20:12:13.924302+00', NULL, NULL, NULL, '{}', NULL, '2026-05-29 20:12:13.924302+00', '2026-05-29 20:12:13.924302+00');


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

-- INSERT INTO "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id", "type") VALUES
-- 	('logos', 'logos', NULL, '2026-05-23 22:25:53.789756+00', '2026-05-23 22:25:53.789756+00', true, false, 2097152, '{image/jpeg,image/png,image/webp}', NULL, 'STANDARD');


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
	('3d2e8f6c-876f-4a01-a003-1dc7545310c6', 'logos', '11111111-1111-1111-1111-111111111111/logo.webp', '103c8fd2-f789-4ceb-aa19-e1b7c1726c4a', '2026-05-23 22:28:22.814068+00', '2026-05-23 22:28:22.814068+00', '2026-05-23 22:28:22.814068+00', '{"eTag": "\"fd2894565020ef59eb0f5282e3f0d134\"", "size": 2094, "mimetype": "image/webp", "cacheControl": "max-age=3600", "lastModified": "2026-05-23T22:28:23.000Z", "contentLength": 2094, "httpStatusCode": 200}', 'd695e390-4112-45bb-891b-408957095d11', '103c8fd2-f789-4ceb-aa19-e1b7c1726c4a', '{}'),
	('2401d014-5165-4768-bc85-e3dd9f5a0aa0', 'logos', '22222222-2222-4222-8222-222222222222/logo.webp', 'a2222222-2222-4222-8222-222222222222', '2026-05-29 20:05:24.205645+00', '2026-05-29 20:05:24.205645+00', '2026-05-29 20:05:24.205645+00', '{"eTag": "\"47d77d06a57280d0ff269f544c69de28\"", "size": 2972, "mimetype": "image/webp", "cacheControl": "max-age=3600", "lastModified": "2026-05-29T20:05:25.000Z", "contentLength": 2972, "httpStatusCode": 200}', '3984a04c-79c6-4ffd-bf1e-ff447ee5cfa0', 'a2222222-2222-4222-8222-222222222222', '{}'),
	('52669aa2-b68b-4b22-9fc0-3825cfa105d8', 'logos', '977d8675-63c0-405d-a0a6-feba625c4e23/logo.webp', '20421b00-d592-4045-aaa5-80ad074aa8a8', '2026-05-29 20:12:14.563448+00', '2026-05-29 20:12:14.563448+00', '2026-05-29 20:12:14.563448+00', '{"eTag": "\"6c257fe4bdbfa319f2e4d887b37953a6\"", "size": 3180, "mimetype": "image/webp", "cacheControl": "max-age=3600", "lastModified": "2026-05-29T20:12:15.000Z", "contentLength": 3180, "httpStatusCode": 200}', '0f0bc816-f3f4-4791-9406-739b88e1c90b', '20421b00-d592-4045-aaa5-80ad074aa8a8', '{}'),
	('9af4ba8e-4591-47f9-9bec-1130645be70c', 'logos', '11111111-1111-4111-8111-111111111111/logo.webp', 'a1111111-1111-4111-8111-111111111111', '2026-06-08 23:45:12.874355+00', '2026-06-08 23:45:12.874355+00', '2026-06-08 23:45:12.874355+00', '{"eTag": "\"a00a2160a15f97433774d5b2fc833e77\"", "size": 4058, "mimetype": "image/webp", "cacheControl": "max-age=3600", "lastModified": "2026-06-08T23:45:13.000Z", "contentLength": 4058, "httpStatusCode": 200}', '84d2d292-a2e1-4c30-a1a8-b8248735b57f', 'a1111111-1111-4111-8111-111111111111', '{}');


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

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 186, true);


--
-- PostgreSQL database dump complete
--

-- \unrestrict uqW8PSO3D2HAKSWzOLoAmVaNFLugb8bjim4r5M4i8AFnJqnWhIMvDj4kP87TuV7

RESET ALL;
