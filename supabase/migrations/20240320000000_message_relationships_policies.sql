-- Enable Row Level Security
ALTER TABLE message_relationships ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations from authenticated requests
CREATE POLICY "Allow all operations from authenticated requests"
ON message_relationships
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create policy to allow all operations from service role
CREATE POLICY "Allow all operations from service role"
ON message_relationships
FOR ALL
TO service_role
USING (true)
WITH CHECK (true); 