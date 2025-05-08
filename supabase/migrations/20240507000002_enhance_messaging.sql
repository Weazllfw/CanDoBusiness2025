-- Create threads table first
CREATE TABLE IF NOT EXISTS threads (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('direct', 'rfq', 'quote')),
  rfq_id uuid REFERENCES rfqs(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Create thread participants table
CREATE TABLE IF NOT EXISTS thread_participants (
  thread_id uuid REFERENCES threads(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  last_read_at timestamp with time zone,
  PRIMARY KEY (thread_id, company_id)
);

-- Create message reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  reaction text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (message_id, company_id, reaction)
);

-- Now enhance messages table with new features
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS thread_id uuid REFERENCES threads(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS attachments text[] DEFAULT array[]::text[],
ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES messages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id ON messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_thread_participants_company_id ON thread_participants(company_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);

-- Create function to update thread updated_at
CREATE OR REPLACE FUNCTION update_thread_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE threads
  SET updated_at = NEW.created_at
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating thread timestamp
CREATE TRIGGER update_thread_timestamp
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_thread_timestamp(); 