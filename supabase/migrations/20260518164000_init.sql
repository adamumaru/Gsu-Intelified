-- Enable pgcrypto for password hashing in seeding and crypt function
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create a table for public profiles linked to auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  matric_number TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  score INTEGER NOT NULL DEFAULT 0,
  badges TEXT[] NOT NULL DEFAULT '{}'
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Allow users to insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow users to update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create items table
CREATE TABLE IF NOT EXISTS public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  image_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('lost', 'found', 'claimed')),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_approved BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS for items
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to items" ON public.items
  FOR SELECT USING (true);

CREATE POLICY "Allow users to insert items" ON public.items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own items" ON public.items
  FOR UPDATE USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Allow admins to delete items" ON public.items
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Create matches table
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lost_item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  found_item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  finder_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  match_score INTEGER NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  reasons TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected'))
);

-- Enable RLS for matches
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view their own matches or admins to view all" ON public.matches
  FOR SELECT USING (auth.uid() = owner_id OR auth.uid() = finder_id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Allow users to insert matches" ON public.matches
  FOR INSERT WITH CHECK (auth.uid() = owner_id OR auth.uid() = finder_id);

CREATE POLICY "Allow users to update matches" ON public.matches
  FOR UPDATE USING (auth.uid() = owner_id OR auth.uid() = finder_id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Create pickup_schedules table
CREATE TABLE IF NOT EXISTS public.pickup_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  location TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rescheduled', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for pickup_schedules
ALTER TABLE public.pickup_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view their schedules" ON public.pickup_schedules
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = receiver_id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Allow users to insert schedules" ON public.pickup_schedules
  FOR INSERT WITH CHECK (auth.uid() = requester_id OR auth.uid() = receiver_id);

CREATE POLICY "Allow users to update schedules" ON public.pickup_schedules
  FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = receiver_id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Create call_logs table
CREATE TABLE IF NOT EXISTS public.call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  caller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  call_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  call_end TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('connected', 'missed', 'ended'))
);

-- Enable RLS for call_logs
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view their call logs" ON public.call_logs
  FOR SELECT USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

CREATE POLICY "Allow users to insert call logs" ON public.call_logs
  FOR INSERT WITH CHECK (auth.uid() = caller_id OR auth.uid() = receiver_id);

CREATE POLICY "Allow users to update call logs" ON public.call_logs
  FOR UPDATE USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Trigger to automatically create a profile when a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, matric_number, role, score, badges)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'New Student'),
    COALESCE(new.raw_user_meta_data->>'matricNumber', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'student'),
    COALESCE((new.raw_user_meta_data->>'score')::integer, 0),
    ARRAY[]::TEXT[]
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Seeding seed users in auth.users
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
('00000000-0000-0000-0000-000000000000', 'd791ba81-12c8-4796-ab0e-d7f955621453', 'authenticated', 'authenticated', 'adamumaru57@gmail.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Maryam","matricNumber":"001234567","role":"student","score":150}', now(), now()),
('00000000-0000-0000-0000-000000000000', 'e6ef5810-bb2e-436d-b8d9-232185c7c251', 'authenticated', 'authenticated', 'jane@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Jane Doe","matricNumber":"001234568","role":"student","score":125}', now(), now()),
('00000000-0000-0000-0000-000000000000', 'f9bf5c11-9a7c-4731-9759-e93817a0279a', 'authenticated', 'authenticated', 'john@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"John Smith","matricNumber":"001234569","role":"student","score":90}', now(), now()),
('00000000-0000-0000-0000-000000000000', 'a0123456-789a-bcde-f012-3456789abcde', 'authenticated', 'authenticated', 'ada@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Ada Lovelace","matricNumber":"001234570","role":"student","score":75}', now(), now()),
('00000000-0000-0000-0000-000000000000', 'b0123456-789a-bcde-f012-3456789abcde', 'authenticated', 'authenticated', 'charles@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Charles Babbage","matricNumber":"001234571","role":"student","score":50}', now(), now()),
('00000000-0000-0000-0000-000000000000', 'c0123456-789a-bcde-f012-3456789abcde', 'authenticated', 'authenticated', 'admin@gsu.edu', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Admin Maryam","matricNumber":"001234572","role":"admin","score":200}', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Seed profile updates to include pre-existing badges (trigger doesn't copy badges arrays by default)
UPDATE public.profiles SET badges = ARRAY['Campus Hero', 'Good Samaritan'] WHERE id = 'd791ba81-12c8-4796-ab0e-d7f955621453';
UPDATE public.profiles SET badges = ARRAY['Top Finder'] WHERE id = 'e6ef5810-bb2e-436d-b8d9-232185c7c251';
UPDATE public.profiles SET badges = ARRAY['Good Samaritan'] WHERE id = 'f9bf5c11-9a7c-4731-9759-e93817a0279a';
UPDATE public.profiles SET badges = ARRAY['Good Samaritan'] WHERE id = 'b0123456-789a-bcde-f012-3456789abcde';

-- Seed initial items in items table
INSERT INTO public.items (id, name, category, description, location, date, image_url, status, user_id, is_approved)
VALUES
('a791ba81-12c8-4796-ab0e-d7f955621451', 'iPhone 14 Pro', 'Electronics', 'Black iPhone 14 Pro in a clear case. Has a small crack on the top left corner. The lock screen is a picture of a golden retriever.', 'GSU Library, 3rd Floor', '2023-10-26T10:00:00Z', 'https://picsum.photos/seed/iphone/400/300', 'lost', 'd791ba81-12c8-4796-ab0e-d7f955621453', true),
('b791ba81-12c8-4796-ab0e-d7f955621452', 'Blue North Face Jacket', 'Apparel', 'Men''s size large, dark blue North Face jacket. Has a GSU keychain in the right pocket.', 'Student Center East', '2023-10-25T15:30:00Z', 'https://picsum.photos/seed/jacket/400/300', 'lost', 'e6ef5810-bb2e-436d-b8d9-232185c7c251', true),
('c791ba81-12c8-4796-ab0e-d7f955621453', 'Found: Black iPhone', 'Electronics', 'Found a black iPhone near the coffee shop in the library. It has a cracked screen. The background shows a dog.', 'GSU Library, near Argo Tea', '2023-10-26T11:00:00Z', 'https://picsum.photos/seed/iphonefound/400/300', 'found', 'e6ef5810-bb2e-436d-b8d9-232185c7c251', true),
('d791ba81-12c8-4796-ab0e-d7f955621454', 'Keys with Red Lanyard', 'Keys', 'Set of two keys on a red GSU lanyard. One key looks like a car key (Toyota).', 'Classroom South', '2023-10-27T09:00:00Z', 'https://picsum.photos/seed/keys/400/300', 'found', 'f9bf5c11-9a7c-4731-9759-e93817a0279a', false)
ON CONFLICT (id) DO NOTHING;
