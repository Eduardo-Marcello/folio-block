-- NoCode Folio: rode este arquivo no SQL Editor do seu Supabase.
-- Antes, crie o bucket de Storage 'images'.

CREATE TYPE public.widget_type AS ENUM ('profile', 'social', 'showcase', 'newsletter', 'map');
CREATE TYPE public.widget_size AS ENUM ('1x1', '2x1', '2x2');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  username text NOT NULL UNIQUE,
  full_name text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  avatar_url text,
  skills text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT username_format CHECK (username = lower(username) AND username ~ '^[a-z0-9_]{3,24}$')
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are publicly readable" ON public.profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users create their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users delete their own profile" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id);

CREATE TABLE public.widgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type public.widget_type NOT NULL,
  size public.widget_size NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  position_index integer NOT NULL DEFAULT 0 CHECK (position_index >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.widgets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.widgets TO authenticated;
GRANT ALL ON public.widgets TO service_role;
ALTER TABLE public.widgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Widgets are publicly readable" ON public.widgets FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owners create widgets" ON public.widgets FOR INSERT TO authenticated WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Owners update widgets" ON public.widgets FOR UPDATE TO authenticated USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Owners delete widgets" ON public.widgets FOR DELETE TO authenticated USING (auth.uid() = profile_id);
CREATE INDEX widgets_profile_position_idx ON public.widgets(profile_id, position_index);

CREATE TABLE public.subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email text NOT NULL CHECK (char_length(email) <= 320),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, email)
);
GRANT INSERT ON public.subscribers TO anon;
GRANT SELECT, INSERT ON public.subscribers TO authenticated;
GRANT ALL ON public.subscribers TO service_role;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can subscribe" ON public.subscribers FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Owners read subscribers" ON public.subscribers FOR SELECT TO authenticated USING (auth.uid() = profile_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER widgets_set_updated_at BEFORE UPDATE ON public.widgets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.profiles (id, username, full_name, bio, avatar_url, skills)
VALUES ('11111111-1111-4111-8111-111111111111', 'maya', 'Maya Chen', 'Product designer turned no-code builder. I make thoughtful digital products and share what I learn.', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=85', ARRAY['Bubble', 'Framer', 'React']);

INSERT INTO public.widgets (profile_id, type, size, content, position_index) VALUES
('11111111-1111-4111-8111-111111111111', 'profile', '2x2', '{"eyebrow":"Independent maker","availability":"Available for select projects"}', 0),
('11111111-1111-4111-8111-111111111111', 'social', '1x1', '{"platform":"instagram","label":"Instagram","url":"https://instagram.com"}', 1),
('11111111-1111-4111-8111-111111111111', 'social', '1x1', '{"platform":"linkedin","label":"LinkedIn","url":"https://linkedin.com"}', 2),
('11111111-1111-4111-8111-111111111111', 'showcase', '2x1', '{"title":"Luma — creative workspace","subtitle":"Product design · 2026","url":"https://example.com","image_url":"https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=1200&q=85"}', 3),
('11111111-1111-4111-8111-111111111111', 'newsletter', '2x1', '{"headline":"Notes on making products people remember","description":"A short letter, twice a month."}', 4),
('11111111-1111-4111-8111-111111111111', 'map', '1x1', '{"city":"Brooklyn, NY","label":"Working from","latitude":40.6782,"longitude":-73.9442}', 5),
('11111111-1111-4111-8111-111111111111', 'social', '1x1', '{"platform":"github","label":"GitHub","url":"https://github.com"}', 6);CREATE POLICY "Public can view folio images" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'images');
CREATE POLICY "Users upload their own folio images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users update their own folio images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'images' AND (storage.foldername(name))[1] = auth.uid()::text) WITH CHECK (bucket_id = 'images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete their own folio images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'images' AND (storage.foldername(name))[1] = auth.uid()::text);