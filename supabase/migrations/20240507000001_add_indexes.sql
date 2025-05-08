-- Add composite indexes for common queries
CREATE INDEX messages_receiver_id_read_idx ON messages(receiver_id, read);
CREATE INDEX messages_conversation_idx ON messages(sender_id, receiver_id, created_at DESC);

-- Add partial index for unread messages
CREATE INDEX messages_unread_idx ON messages(receiver_id) WHERE read = false;

-- Add index for company lookups
CREATE INDEX companies_name_idx ON companies USING gin(name gin_trgm_ops);

-- Add function to get unread message count
CREATE OR REPLACE FUNCTION get_unread_message_count(company_id UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COUNT(*)::integer
    FROM messages
    WHERE receiver_id = company_id AND read = false;
$$;

-- Add function to get conversation participants
CREATE OR REPLACE FUNCTION get_conversation_participants(company_id UUID)
RETURNS TABLE (
    participant_id UUID,
    company_name TEXT,
    last_message_at TIMESTAMPTZ,
    unread_count INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    WITH conversation_partners AS (
        SELECT DISTINCT
            CASE 
                WHEN sender_id = company_id THEN receiver_id
                ELSE sender_id
            END as participant_id
        FROM messages
        WHERE sender_id = company_id OR receiver_id = company_id
    )
    SELECT 
        cp.participant_id,
        c.name as company_name,
        MAX(m.created_at) as last_message_at,
        COUNT(CASE WHEN m.read = false AND m.receiver_id = company_id THEN 1 END) as unread_count
    FROM conversation_partners cp
    JOIN companies c ON c.id = cp.participant_id
    LEFT JOIN messages m ON 
        (m.sender_id = cp.participant_id AND m.receiver_id = company_id) OR
        (m.sender_id = company_id AND m.receiver_id = cp.participant_id)
    GROUP BY cp.participant_id, c.name;
$$;

-- Add constraints to prevent self-messaging and ensure valid companies
ALTER TABLE messages
  ADD CONSTRAINT no_self_messages 
    CHECK (sender_id != receiver_id),
  ADD CONSTRAINT sender_must_exist 
    FOREIGN KEY (sender_id) REFERENCES companies(id) ON DELETE RESTRICT,
  ADD CONSTRAINT receiver_must_exist 
    FOREIGN KEY (receiver_id) REFERENCES companies(id) ON DELETE RESTRICT;

-- Add trigger to prevent message modifications after a time window
CREATE OR REPLACE FUNCTION prevent_late_message_modifications()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.created_at < NOW() - INTERVAL '24 hours') THEN
    RAISE EXCEPTION 'Cannot modify messages older than 24 hours';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_message_modification_window
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION prevent_late_message_modifications();

-- Add rate limiting at the database level
CREATE OR REPLACE FUNCTION check_message_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO recent_count
  FROM messages
  WHERE sender_id = NEW.sender_id
    AND created_at > NOW() - INTERVAL '1 minute';
    
  IF recent_count >= 60 THEN -- Max 60 messages per minute
    RAISE EXCEPTION 'Rate limit exceeded: Too many messages in short time';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_message_rate_limit
  BEFORE INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION check_message_rate_limit(); 