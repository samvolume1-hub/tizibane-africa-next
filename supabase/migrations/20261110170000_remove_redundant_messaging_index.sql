-- The existing (conversation_id, created_at DESC) index already covers inbox and history reads.
-- Remove the additional covering index to avoid unnecessary message-write overhead.
drop index if exists public.messages_conversation_created_sender_idx;
