-- Enable row level security on every table with no policies.
-- The API connects with a privileged Postgres role (the table owner, which
-- bypasses RLS); Supabase's public Data API with the anon key reads nothing.
ALTER TABLE "Note" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JournalDay" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JournalEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Ticket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Draft" ENABLE ROW LEVEL SECURITY;
