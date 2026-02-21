\restrict dbmate

-- Dumped from database version 15.16 (Postgres.app)
-- Dumped by pg_dump version 15.16 (Postgres.app)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: BirthdayDisplayMode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BirthdayDisplayMode" AS ENUM (
    'DAY',
    'MONTH_DAY',
    'YEAR'
);


--
-- Name: BirthdayVisibility; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BirthdayVisibility" AS ENUM (
    'PUBLIC',
    'FOLLOWERS',
    'FOLLOWING',
    'MUTUALS',
    'PRIVATE'
);


--
-- Name: Role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Role" AS ENUM (
    'BASIC',
    'ADMIN'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: BookmarkPost; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BookmarkPost" (
    id text NOT NULL,
    "userId" uuid NOT NULL,
    "postId" text NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: BroadcastComment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BroadcastComment" (
    id text NOT NULL,
    "userId" uuid NOT NULL,
    "commentId" text NOT NULL
);


--
-- Name: BroadcastPost; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BroadcastPost" (
    "userId" uuid NOT NULL,
    "postId" text NOT NULL,
    id text NOT NULL
);


--
-- Name: Comment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Comment" (
    id text NOT NULL,
    body text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "userId" uuid NOT NULL,
    "postId" text NOT NULL,
    "parentId" text,
    title text DEFAULT 'COMMENT'::text NOT NULL,
    "displayName" text
);


--
-- Name: CommentHashtag; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CommentHashtag" (
    id text NOT NULL,
    "commentId" text NOT NULL,
    "hashtagId" text NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: CommentMedia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CommentMedia" (
    id text NOT NULL,
    "commentId" text NOT NULL,
    url text NOT NULL,
    "mimeType" text NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: CommentMention; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CommentMention" (
    id text NOT NULL,
    "commentId" text NOT NULL,
    "mentionedUserId" uuid NOT NULL,
    "authorUserId" uuid NOT NULL,
    token text NOT NULL,
    "startIndex" integer NOT NULL,
    "endIndex" integer NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: FollowNotification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FollowNotification" (
    id text NOT NULL,
    "recipientUserId" uuid NOT NULL,
    "actorUserId" uuid NOT NULL,
    "isRead" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: Follows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Follows" (
    "followerId" uuid NOT NULL,
    "followingId" uuid NOT NULL,
    id text NOT NULL
);


--
-- Name: Hashtag; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Hashtag" (
    id text NOT NULL,
    name text NOT NULL,
    "nameNormalized" text NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: Like; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Like" (
    "userId" uuid NOT NULL,
    "postId" text NOT NULL,
    id text NOT NULL
);


--
-- Name: LikeComment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LikeComment" (
    "userId" uuid NOT NULL,
    "commentId" text NOT NULL,
    id text NOT NULL
);


--
-- Name: MentionNotification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MentionNotification" (
    id text NOT NULL,
    "recipientUserId" uuid NOT NULL,
    "actorUserId" uuid NOT NULL,
    "entityType" text NOT NULL,
    "entityId" text NOT NULL,
    "isRead" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT "MentionNotification_entityType_check" CHECK (("entityType" = ANY (ARRAY['post'::text, 'comment'::text])))
);


--
-- Name: Post; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Post" (
    id text NOT NULL,
    body text,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "userId" uuid NOT NULL,
    title text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "ogPostId" text,
    "displayName" text,
    "impressionCount" integer DEFAULT 0 NOT NULL
);


--
-- Name: PostHashtag; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PostHashtag" (
    id text NOT NULL,
    "postId" text NOT NULL,
    "hashtagId" text NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: PostImpression; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PostImpression" (
    id text NOT NULL,
    "postId" text NOT NULL,
    "viewerUserId" uuid NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: PostMedia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PostMedia" (
    id text NOT NULL,
    "postId" text NOT NULL,
    url text NOT NULL,
    "mimeType" text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: PostMention; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PostMention" (
    id text NOT NULL,
    "postId" text NOT NULL,
    "mentionedUserId" uuid NOT NULL,
    "authorUserId" uuid NOT NULL,
    token text NOT NULL,
    "startIndex" integer NOT NULL,
    "endIndex" integer NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: TrendJobState; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TrendJobState" (
    id text NOT NULL,
    "lastProcessedAt" timestamp without time zone NOT NULL,
    "lastSuccessfulAt" timestamp without time zone,
    "lastCleanupAt" timestamp without time zone
);


--
-- Name: TrendMinuteBucket; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TrendMinuteBucket" (
    "bucketMinute" timestamp without time zone NOT NULL,
    "entityType" text NOT NULL,
    "entityKey" text NOT NULL,
    "signalWeight" double precision DEFAULT 0 NOT NULL,
    "eventCount" integer DEFAULT 0 NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT "TrendMinuteBucket_entityType_check" CHECK (("entityType" = ANY (ARRAY['hashtag'::text, 'user'::text, 'text'::text])))
);


--
-- Name: TrendSignal; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TrendSignal" (
    id text NOT NULL,
    "entityType" text NOT NULL,
    "entityKey" text NOT NULL,
    "sourceType" text NOT NULL,
    "sourceId" text NOT NULL,
    "actorUserId" text NOT NULL,
    "signalKind" text NOT NULL,
    weight double precision DEFAULT 1 NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT "TrendSignal_entityType_check" CHECK (("entityType" = ANY (ARRAY['hashtag'::text, 'user'::text, 'text'::text]))),
    CONSTRAINT "TrendSignal_signalKind_check" CHECK (("signalKind" = ANY (ARRAY['hashtag'::text, 'mention'::text, 'author'::text, 'text'::text]))),
    CONSTRAINT "TrendSignal_sourceType_check" CHECK (("sourceType" = ANY (ARRAY['post'::text, 'comment'::text])))
);


--
-- Name: TrendSnapshot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TrendSnapshot" (
    id text NOT NULL,
    "timeWindow" text NOT NULL,
    "entityType" text NOT NULL,
    rank integer NOT NULL,
    "entityKey" text NOT NULL,
    score double precision NOT NULL,
    count15m double precision DEFAULT 0 NOT NULL,
    count1h double precision DEFAULT 0 NOT NULL,
    count24h double precision DEFAULT 0 NOT NULL,
    events15m integer DEFAULT 0 NOT NULL,
    events1h integer DEFAULT 0 NOT NULL,
    events24h integer DEFAULT 0 NOT NULL,
    "uniqueUsers24h" integer DEFAULT 0 NOT NULL,
    "computedAt" timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT "TrendSnapshot_entityType_check" CHECK (("entityType" = ANY (ARRAY['hashtag'::text, 'user'::text, 'text'::text]))),
    CONSTRAINT "TrendSnapshot_timeWindow_check" CHECK (("timeWindow" = ANY (ARRAY['15m'::text, '1h'::text, '24h'::text])))
);


--
-- Name: UserSettings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserSettings" (
    id text NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "userSettingsId" text,
    "coverImageSrc" text,
    email text NOT NULL,
    phone text,
    "profileImageSrc" text,
    website text,
    gender text NOT NULL,
    "displayName" text,
    firstname text NOT NULL,
    lastname text NOT NULL,
    bio text,
    birthday text,
    region text,
    password text NOT NULL,
    "isEmailVerified" boolean DEFAULT false NOT NULL,
    "confirmationToken" text DEFAULT ''::text,
    username text NOT NULL,
    "birthdayDate" date,
    "birthdayDisplayMode" public."BirthdayDisplayMode" DEFAULT 'MONTH_DAY'::public."BirthdayDisplayMode" NOT NULL,
    "birthdayVisibility" public."BirthdayVisibility" DEFAULT 'PRIVATE'::public."BirthdayVisibility" NOT NULL,
    "birthdayMonthDayVisibility" public."BirthdayVisibility" DEFAULT 'PRIVATE'::public."BirthdayVisibility" NOT NULL,
    "birthdayDayVisibility" public."BirthdayVisibility" DEFAULT 'PRIVATE'::public."BirthdayVisibility" NOT NULL,
    "birthdayYearVisibility" public."BirthdayVisibility" DEFAULT 'PRIVATE'::public."BirthdayVisibility" NOT NULL,
    "likesVisibility" public."BirthdayVisibility" DEFAULT 'PUBLIC'::public."BirthdayVisibility" NOT NULL,
    "bookmarksVisibility" public."BirthdayVisibility" DEFAULT 'PRIVATE'::public."BirthdayVisibility" NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "verificationCodeSentAt" timestamp with time zone,
    "verificationStatus" text DEFAULT 'basic'::text NOT NULL,
    CONSTRAINT users_verification_status_check CHECK (("verificationStatus" = ANY (ARRAY['none'::text, 'basic'::text, 'standard'::text, 'premium'::text])))
);


--
-- Name: BookmarkPost BookmarkPost_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BookmarkPost"
    ADD CONSTRAINT "BookmarkPost_pkey" PRIMARY KEY (id);


--
-- Name: BroadcastComment BroadcastComment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BroadcastComment"
    ADD CONSTRAINT "BroadcastComment_pkey" PRIMARY KEY (id);


--
-- Name: BroadcastPost BroadcastPost_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BroadcastPost"
    ADD CONSTRAINT "BroadcastPost_pkey" PRIMARY KEY (id);


--
-- Name: CommentHashtag CommentHashtag_commentId_hashtagId_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CommentHashtag"
    ADD CONSTRAINT "CommentHashtag_commentId_hashtagId_key" UNIQUE ("commentId", "hashtagId");


--
-- Name: CommentHashtag CommentHashtag_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CommentHashtag"
    ADD CONSTRAINT "CommentHashtag_pkey" PRIMARY KEY (id);


--
-- Name: CommentMedia CommentMedia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CommentMedia"
    ADD CONSTRAINT "CommentMedia_pkey" PRIMARY KEY (id);


--
-- Name: CommentMention CommentMention_commentId_mentionedUserId_startIndex_endInde_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CommentMention"
    ADD CONSTRAINT "CommentMention_commentId_mentionedUserId_startIndex_endInde_key" UNIQUE ("commentId", "mentionedUserId", "startIndex", "endIndex");


--
-- Name: CommentMention CommentMention_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CommentMention"
    ADD CONSTRAINT "CommentMention_pkey" PRIMARY KEY (id);


--
-- Name: Comment Comment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_pkey" PRIMARY KEY (id);


--
-- Name: FollowNotification FollowNotification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FollowNotification"
    ADD CONSTRAINT "FollowNotification_pkey" PRIMARY KEY (id);


--
-- Name: FollowNotification FollowNotification_recipientUserId_actorUserId_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FollowNotification"
    ADD CONSTRAINT "FollowNotification_recipientUserId_actorUserId_key" UNIQUE ("recipientUserId", "actorUserId");


--
-- Name: Follows Follows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Follows"
    ADD CONSTRAINT "Follows_pkey" PRIMARY KEY (id);


--
-- Name: Hashtag Hashtag_nameNormalized_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Hashtag"
    ADD CONSTRAINT "Hashtag_nameNormalized_key" UNIQUE ("nameNormalized");


--
-- Name: Hashtag Hashtag_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Hashtag"
    ADD CONSTRAINT "Hashtag_pkey" PRIMARY KEY (id);


--
-- Name: LikeComment LikeComment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LikeComment"
    ADD CONSTRAINT "LikeComment_pkey" PRIMARY KEY (id);


--
-- Name: Like Like_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Like"
    ADD CONSTRAINT "Like_pkey" PRIMARY KEY (id);


--
-- Name: MentionNotification MentionNotification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MentionNotification"
    ADD CONSTRAINT "MentionNotification_pkey" PRIMARY KEY (id);


--
-- Name: MentionNotification MentionNotification_recipientUserId_actorUserId_entityType__key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MentionNotification"
    ADD CONSTRAINT "MentionNotification_recipientUserId_actorUserId_entityType__key" UNIQUE ("recipientUserId", "actorUserId", "entityType", "entityId");


--
-- Name: PostHashtag PostHashtag_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PostHashtag"
    ADD CONSTRAINT "PostHashtag_pkey" PRIMARY KEY (id);


--
-- Name: PostHashtag PostHashtag_postId_hashtagId_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PostHashtag"
    ADD CONSTRAINT "PostHashtag_postId_hashtagId_key" UNIQUE ("postId", "hashtagId");


--
-- Name: PostImpression PostImpression_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PostImpression"
    ADD CONSTRAINT "PostImpression_pkey" PRIMARY KEY (id);


--
-- Name: PostMedia PostMedia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PostMedia"
    ADD CONSTRAINT "PostMedia_pkey" PRIMARY KEY (id);


--
-- Name: PostMention PostMention_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PostMention"
    ADD CONSTRAINT "PostMention_pkey" PRIMARY KEY (id);


--
-- Name: PostMention PostMention_postId_mentionedUserId_startIndex_endIndex_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PostMention"
    ADD CONSTRAINT "PostMention_postId_mentionedUserId_startIndex_endIndex_key" UNIQUE ("postId", "mentionedUserId", "startIndex", "endIndex");


--
-- Name: Post Post_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Post"
    ADD CONSTRAINT "Post_pkey" PRIMARY KEY (id);


--
-- Name: TrendJobState TrendJobState_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TrendJobState"
    ADD CONSTRAINT "TrendJobState_pkey" PRIMARY KEY (id);


--
-- Name: TrendMinuteBucket TrendMinuteBucket_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TrendMinuteBucket"
    ADD CONSTRAINT "TrendMinuteBucket_pkey" PRIMARY KEY ("bucketMinute", "entityType", "entityKey");


--
-- Name: TrendSignal TrendSignal_entityType_entityKey_sourceType_sourceId_signal_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TrendSignal"
    ADD CONSTRAINT "TrendSignal_entityType_entityKey_sourceType_sourceId_signal_key" UNIQUE ("entityType", "entityKey", "sourceType", "sourceId", "signalKind");


--
-- Name: TrendSignal TrendSignal_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TrendSignal"
    ADD CONSTRAINT "TrendSignal_pkey" PRIMARY KEY (id);


--
-- Name: TrendSnapshot TrendSnapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TrendSnapshot"
    ADD CONSTRAINT "TrendSnapshot_pkey" PRIMARY KEY (id);


--
-- Name: TrendSnapshot TrendSnapshot_timeWindow_entityType_rank_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TrendSnapshot"
    ADD CONSTRAINT "TrendSnapshot_timeWindow_entityType_rank_key" UNIQUE ("timeWindow", "entityType", rank);


--
-- Name: UserSettings UserSettings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserSettings"
    ADD CONSTRAINT "UserSettings_pkey" PRIMARY KEY (id);


--
-- Name: users User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: BookmarkPost_postId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BookmarkPost_postId_idx" ON public."BookmarkPost" USING btree ("postId");


--
-- Name: BookmarkPost_userId_createdAt_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BookmarkPost_userId_createdAt_id_idx" ON public."BookmarkPost" USING btree ("userId", "createdAt" DESC, id DESC);


--
-- Name: BookmarkPost_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BookmarkPost_userId_createdAt_idx" ON public."BookmarkPost" USING btree ("userId", "createdAt" DESC);


--
-- Name: BookmarkPost_userId_postId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "BookmarkPost_userId_postId_key" ON public."BookmarkPost" USING btree ("userId", "postId");


--
-- Name: BroadcastPost_postId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BroadcastPost_postId_idx" ON public."BroadcastPost" USING btree ("postId");


--
-- Name: BroadcastPost_userId_postId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "BroadcastPost_userId_postId_key" ON public."BroadcastPost" USING btree ("userId", "postId");


--
-- Name: CommentHashtag_hashtagId_commentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CommentHashtag_hashtagId_commentId_idx" ON public."CommentHashtag" USING btree ("hashtagId", "commentId");


--
-- Name: CommentMedia_commentId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CommentMedia_commentId_key" ON public."CommentMedia" USING btree ("commentId");


--
-- Name: CommentMention_mentionedUserId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CommentMention_mentionedUserId_createdAt_idx" ON public."CommentMention" USING btree ("mentionedUserId", "createdAt" DESC);


--
-- Name: Comment_userId_createdAt_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Comment_userId_createdAt_id_idx" ON public."Comment" USING btree ("userId", "createdAt" DESC, id DESC);


--
-- Name: FollowNotification_recipient_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FollowNotification_recipient_createdAt_idx" ON public."FollowNotification" USING btree ("recipientUserId", "createdAt" DESC);


--
-- Name: FollowNotification_recipient_unread_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FollowNotification_recipient_unread_createdAt_idx" ON public."FollowNotification" USING btree ("recipientUserId", "isRead", "createdAt" DESC);


--
-- Name: Follows_followerId_followingId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Follows_followerId_followingId_key" ON public."Follows" USING btree ("followerId", "followingId");


--
-- Name: Hashtag_nameNormalized_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Hashtag_nameNormalized_idx" ON public."Hashtag" USING btree ("nameNormalized");


--
-- Name: Like_postId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Like_postId_idx" ON public."Like" USING btree ("postId");


--
-- Name: Like_userId_postId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Like_userId_postId_idx" ON public."Like" USING btree ("userId", "postId");


--
-- Name: Like_userId_postId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Like_userId_postId_key" ON public."Like" USING btree ("userId", "postId");


--
-- Name: MentionNotification_recipient_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MentionNotification_recipient_createdAt_idx" ON public."MentionNotification" USING btree ("recipientUserId", "createdAt" DESC);


--
-- Name: MentionNotification_recipient_unread_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MentionNotification_recipient_unread_createdAt_idx" ON public."MentionNotification" USING btree ("recipientUserId", "isRead", "createdAt" DESC);


--
-- Name: PostHashtag_hashtagId_postId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PostHashtag_hashtagId_postId_idx" ON public."PostHashtag" USING btree ("hashtagId", "postId");


--
-- Name: PostImpression_postId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PostImpression_postId_createdAt_idx" ON public."PostImpression" USING btree ("postId", "createdAt" DESC);


--
-- Name: PostImpression_postId_viewerUserId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PostImpression_postId_viewerUserId_key" ON public."PostImpression" USING btree ("postId", "viewerUserId");


--
-- Name: PostImpression_viewerUserId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PostImpression_viewerUserId_createdAt_idx" ON public."PostImpression" USING btree ("viewerUserId", "createdAt" DESC);


--
-- Name: PostMedia_postId_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PostMedia_postId_sortOrder_idx" ON public."PostMedia" USING btree ("postId", "sortOrder");


--
-- Name: PostMention_mentionedUserId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PostMention_mentionedUserId_createdAt_idx" ON public."PostMention" USING btree ("mentionedUserId", "createdAt" DESC);


--
-- Name: Post_userId_createdAt_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Post_userId_createdAt_id_idx" ON public."Post" USING btree ("userId", "createdAt" DESC, id DESC);


--
-- Name: Post_userId_title_createdAt_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Post_userId_title_createdAt_id_idx" ON public."Post" USING btree ("userId", title, "createdAt" DESC, id DESC);


--
-- Name: TrendMinuteBucket_entity_bucket_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TrendMinuteBucket_entity_bucket_idx" ON public."TrendMinuteBucket" USING btree ("entityType", "entityKey", "bucketMinute" DESC);


--
-- Name: TrendSignal_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TrendSignal_createdAt_idx" ON public."TrendSignal" USING btree ("createdAt" DESC);


--
-- Name: TrendSignal_entity_actor_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TrendSignal_entity_actor_createdAt_idx" ON public."TrendSignal" USING btree ("entityType", "entityKey", "actorUserId", "createdAt" DESC);


--
-- Name: TrendSignal_entity_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TrendSignal_entity_createdAt_idx" ON public."TrendSignal" USING btree ("entityType", "entityKey", "createdAt" DESC);


--
-- Name: TrendSnapshot_entity_score_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TrendSnapshot_entity_score_idx" ON public."TrendSnapshot" USING btree ("entityType", "timeWindow", score DESC);


--
-- Name: TrendSnapshot_window_entity_rank_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TrendSnapshot_window_entity_rank_idx" ON public."TrendSnapshot" USING btree ("timeWindow", "entityType", rank);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON public.users USING btree (email);


--
-- Name: User_userSettingsId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_userSettingsId_key" ON public.users USING btree ("userSettingsId");


--
-- Name: User_username_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_username_key" ON public.users USING btree (lower(username));


--
-- Name: BookmarkPost BookmarkPost_postId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BookmarkPost"
    ADD CONSTRAINT "BookmarkPost_postId_fkey" FOREIGN KEY ("postId") REFERENCES public."Post"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BookmarkPost BookmarkPost_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BookmarkPost"
    ADD CONSTRAINT "BookmarkPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BroadcastComment BroadcastComment_commentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BroadcastComment"
    ADD CONSTRAINT "BroadcastComment_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES public."Comment"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BroadcastComment BroadcastComment_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BroadcastComment"
    ADD CONSTRAINT "BroadcastComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BroadcastPost BroadcastPost_postId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BroadcastPost"
    ADD CONSTRAINT "BroadcastPost_postId_fkey" FOREIGN KEY ("postId") REFERENCES public."Post"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BroadcastPost BroadcastPost_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BroadcastPost"
    ADD CONSTRAINT "BroadcastPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CommentHashtag CommentHashtag_commentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CommentHashtag"
    ADD CONSTRAINT "CommentHashtag_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES public."Comment"(id) ON DELETE CASCADE;


--
-- Name: CommentHashtag CommentHashtag_hashtagId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CommentHashtag"
    ADD CONSTRAINT "CommentHashtag_hashtagId_fkey" FOREIGN KEY ("hashtagId") REFERENCES public."Hashtag"(id) ON DELETE CASCADE;


--
-- Name: CommentMedia CommentMedia_commentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CommentMedia"
    ADD CONSTRAINT "CommentMedia_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES public."Comment"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CommentMention CommentMention_authorUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CommentMention"
    ADD CONSTRAINT "CommentMention_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: CommentMention CommentMention_commentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CommentMention"
    ADD CONSTRAINT "CommentMention_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES public."Comment"(id) ON DELETE CASCADE;


--
-- Name: CommentMention CommentMention_mentionedUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CommentMention"
    ADD CONSTRAINT "CommentMention_mentionedUserId_fkey" FOREIGN KEY ("mentionedUserId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: Comment Comment_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public."Comment"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Comment Comment_postId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES public."Post"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Comment Comment_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FollowNotification FollowNotification_actorUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FollowNotification"
    ADD CONSTRAINT "FollowNotification_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: FollowNotification FollowNotification_recipientUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FollowNotification"
    ADD CONSTRAINT "FollowNotification_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: Follows Follows_followerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Follows"
    ADD CONSTRAINT "Follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Follows Follows_followingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Follows"
    ADD CONSTRAINT "Follows_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: LikeComment LikeComment_commentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LikeComment"
    ADD CONSTRAINT "LikeComment_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES public."Comment"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: LikeComment LikeComment_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LikeComment"
    ADD CONSTRAINT "LikeComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Like Like_postId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Like"
    ADD CONSTRAINT "Like_postId_fkey" FOREIGN KEY ("postId") REFERENCES public."Post"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Like Like_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Like"
    ADD CONSTRAINT "Like_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MentionNotification MentionNotification_actorUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MentionNotification"
    ADD CONSTRAINT "MentionNotification_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: MentionNotification MentionNotification_recipientUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MentionNotification"
    ADD CONSTRAINT "MentionNotification_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: PostHashtag PostHashtag_hashtagId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PostHashtag"
    ADD CONSTRAINT "PostHashtag_hashtagId_fkey" FOREIGN KEY ("hashtagId") REFERENCES public."Hashtag"(id) ON DELETE CASCADE;


--
-- Name: PostHashtag PostHashtag_postId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PostHashtag"
    ADD CONSTRAINT "PostHashtag_postId_fkey" FOREIGN KEY ("postId") REFERENCES public."Post"(id) ON DELETE CASCADE;


--
-- Name: PostImpression PostImpression_postId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PostImpression"
    ADD CONSTRAINT "PostImpression_postId_fkey" FOREIGN KEY ("postId") REFERENCES public."Post"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PostImpression PostImpression_viewerUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PostImpression"
    ADD CONSTRAINT "PostImpression_viewerUserId_fkey" FOREIGN KEY ("viewerUserId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PostMedia PostMedia_postId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PostMedia"
    ADD CONSTRAINT "PostMedia_postId_fkey" FOREIGN KEY ("postId") REFERENCES public."Post"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PostMention PostMention_authorUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PostMention"
    ADD CONSTRAINT "PostMention_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: PostMention PostMention_mentionedUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PostMention"
    ADD CONSTRAINT "PostMention_mentionedUserId_fkey" FOREIGN KEY ("mentionedUserId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: PostMention PostMention_postId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PostMention"
    ADD CONSTRAINT "PostMention_postId_fkey" FOREIGN KEY ("postId") REFERENCES public."Post"(id) ON DELETE CASCADE;


--
-- Name: Post Post_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Post"
    ADD CONSTRAINT "Post_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: users User_userSettingsId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "User_userSettingsId_fkey" FOREIGN KEY ("userSettingsId") REFERENCES public."UserSettings"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict dbmate


--
-- Dbmate schema migrations
--

INSERT INTO public.schema_migrations (version) VALUES
    ('20260207000000'),
    ('20260207021000'),
    ('20260207021100'),
    ('20260207032000'),
    ('20260207123000'),
    ('20260207160000'),
    ('20260208120000'),
    ('20260208143000'),
    ('20260208153000'),
    ('20260208183000'),
    ('20260208190000'),
    ('20260209110000'),
    ('20260210111500'),
    ('20260210125500'),
    ('20260210170000'),
    ('20260210183000'),
    ('20260210210000'),
    ('20260211100000'),
    ('20260211113000'),
    ('20260211121500'),
    ('20260220100000'),
    ('20260221160000');
