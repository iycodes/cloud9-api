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
-- Name: Role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Role" AS ENUM (
    'BASIC',
    'ADMIN'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: BroadcastComment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BroadcastComment" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "commentId" text NOT NULL
);


--
-- Name: BroadcastPost; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BroadcastPost" (
    "userId" text NOT NULL,
    "postId" text NOT NULL,
    id text NOT NULL
);


--
-- Name: Comment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Comment" (
    id text NOT NULL,
    body text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "userId" text NOT NULL,
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
-- Name: CommentMention; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CommentMention" (
    id text NOT NULL,
    "commentId" text NOT NULL,
    "mentionedUserId" text NOT NULL,
    "authorUserId" text NOT NULL,
    token text NOT NULL,
    "startIndex" integer NOT NULL,
    "endIndex" integer NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: Follows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Follows" (
    "followerId" text NOT NULL,
    "followingId" text NOT NULL,
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
    "userId" text NOT NULL,
    "postId" text NOT NULL,
    id text NOT NULL
);


--
-- Name: LikeComment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LikeComment" (
    "userId" text NOT NULL,
    "commentId" text NOT NULL,
    id text NOT NULL
);


--
-- Name: MentionNotification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MentionNotification" (
    id text NOT NULL,
    "recipientUserId" text NOT NULL,
    "actorUserId" text NOT NULL,
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
    "userId" text NOT NULL,
    title text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "ogPostId" text,
    "displayName" text
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
-- Name: PostMention; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PostMention" (
    id text NOT NULL,
    "postId" text NOT NULL,
    "mentionedUserId" text NOT NULL,
    "authorUserId" text NOT NULL,
    token text NOT NULL,
    "startIndex" integer NOT NULL,
    "endIndex" integer NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id text NOT NULL,
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
    "confirmationToken" text DEFAULT ''::text
);


--
-- Name: UserSettings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserSettings" (
    id text NOT NULL
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying NOT NULL
);


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
-- Name: UserSettings UserSettings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserSettings"
    ADD CONSTRAINT "UserSettings_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: CommentHashtag_hashtagId_commentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CommentHashtag_hashtagId_commentId_idx" ON public."CommentHashtag" USING btree ("hashtagId", "commentId");


--
-- Name: CommentMention_mentionedUserId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CommentMention_mentionedUserId_createdAt_idx" ON public."CommentMention" USING btree ("mentionedUserId", "createdAt" DESC);


--
-- Name: Follows_followerId_followingId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Follows_followerId_followingId_key" ON public."Follows" USING btree ("followerId", "followingId");


--
-- Name: Hashtag_nameNormalized_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Hashtag_nameNormalized_idx" ON public."Hashtag" USING btree ("nameNormalized");


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
-- Name: PostMention_mentionedUserId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PostMention_mentionedUserId_createdAt_idx" ON public."PostMention" USING btree ("mentionedUserId", "createdAt" DESC);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_userSettingsId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_userSettingsId_key" ON public."User" USING btree ("userSettingsId");


--
-- Name: BroadcastComment BroadcastComment_commentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BroadcastComment"
    ADD CONSTRAINT "BroadcastComment_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES public."Comment"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BroadcastComment BroadcastComment_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BroadcastComment"
    ADD CONSTRAINT "BroadcastComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BroadcastPost BroadcastPost_postId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BroadcastPost"
    ADD CONSTRAINT "BroadcastPost_postId_fkey" FOREIGN KEY ("postId") REFERENCES public."Post"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BroadcastPost BroadcastPost_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BroadcastPost"
    ADD CONSTRAINT "BroadcastPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


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
-- Name: CommentMention CommentMention_authorUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CommentMention"
    ADD CONSTRAINT "CommentMention_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES public."User"(id) ON DELETE CASCADE;


--
-- Name: CommentMention CommentMention_commentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CommentMention"
    ADD CONSTRAINT "CommentMention_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES public."Comment"(id) ON DELETE CASCADE;


--
-- Name: CommentMention CommentMention_mentionedUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CommentMention"
    ADD CONSTRAINT "CommentMention_mentionedUserId_fkey" FOREIGN KEY ("mentionedUserId") REFERENCES public."User"(id) ON DELETE CASCADE;


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
    ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Follows Follows_followerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Follows"
    ADD CONSTRAINT "Follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Follows Follows_followingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Follows"
    ADD CONSTRAINT "Follows_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: LikeComment LikeComment_commentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LikeComment"
    ADD CONSTRAINT "LikeComment_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES public."Comment"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: LikeComment LikeComment_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LikeComment"
    ADD CONSTRAINT "LikeComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Like Like_postId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Like"
    ADD CONSTRAINT "Like_postId_fkey" FOREIGN KEY ("postId") REFERENCES public."Post"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Like Like_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Like"
    ADD CONSTRAINT "Like_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MentionNotification MentionNotification_actorUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MentionNotification"
    ADD CONSTRAINT "MentionNotification_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES public."User"(id) ON DELETE CASCADE;


--
-- Name: MentionNotification MentionNotification_recipientUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MentionNotification"
    ADD CONSTRAINT "MentionNotification_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES public."User"(id) ON DELETE CASCADE;


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
-- Name: PostMention PostMention_authorUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PostMention"
    ADD CONSTRAINT "PostMention_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES public."User"(id) ON DELETE CASCADE;


--
-- Name: PostMention PostMention_mentionedUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PostMention"
    ADD CONSTRAINT "PostMention_mentionedUserId_fkey" FOREIGN KEY ("mentionedUserId") REFERENCES public."User"(id) ON DELETE CASCADE;


--
-- Name: PostMention PostMention_postId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PostMention"
    ADD CONSTRAINT "PostMention_postId_fkey" FOREIGN KEY ("postId") REFERENCES public."Post"(id) ON DELETE CASCADE;


--
-- Name: Post Post_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Post"
    ADD CONSTRAINT "Post_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: User User_userSettingsId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_userSettingsId_fkey" FOREIGN KEY ("userSettingsId") REFERENCES public."UserSettings"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--


--
-- Dbmate schema migrations
--

INSERT INTO public.schema_migrations (version) VALUES
    ('20260207021000'),
    ('20260207021100'),
    ('20260207032000');
