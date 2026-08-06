import React, { useState } from 'react';
import { X, Copy, Check, Database, Code, ShieldCheck, Sparkles } from 'lucide-react';

interface SupabaseSqlModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SUPABASE_SQL_SCHEMA = `-- ====================================================================
-- SUPABASE COMPLETE PRODUCTION DATABASE SCHEMA & VERIFICATION FUNCTIONS
-- Copy and run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql/new
-- ====================================================================

-- 1. CREATE USER PROFILES TABLE (Holds Total Reward Balance & Avatar)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  total_reward_balance NUMERIC DEFAULT 0,
  unclaimed_reward_balance NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to profiles"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Allow users to insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow users to update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Trigger to auto-update updated_at timestamp on profiles
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger to auto-create profile row on user sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url, total_reward_balance)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    0
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. CREATE SAVED TOKENS TABLE (With Chain-Specific Unique Constraint)
CREATE TABLE IF NOT EXISTS public.tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  contract_address TEXT NOT NULL,
  chain_id TEXT NOT NULL,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  decimals INTEGER DEFAULT 18,
  total_supply TEXT,
  logo_url TEXT,
  price_usd NUMERIC DEFAULT 0,
  safety_score INTEGER DEFAULT 0,
  safety_rating TEXT DEFAULT 'SAFE',
  verified BOOLEAN DEFAULT FALSE,
  reward_earned_tokens NUMERIC DEFAULT 15,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB,
  safety_data JSONB,
  market_data JSONB,
  CONSTRAINT unique_token_per_chain UNIQUE (contract_address, chain_id)
);

-- Enable RLS on tokens
ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read tokens"
  ON public.tokens FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert tokens"
  ON public.tokens FOR INSERT WITH CHECK (true);


-- 3. CREATE NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  icon TEXT,
  status TEXT,
  action_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to select own notifications"
  ON public.notifications FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Allow users to update own notifications"
  ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Allow users to insert notifications"
  ON public.notifications FOR INSERT WITH CHECK (true);


-- 4. GENERIC NOTIFICATION FUNCTION
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_icon TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.notifications(
    user_id,
    type,
    title,
    message,
    icon,
    status,
    action_url,
    metadata,
    expires_at
  )
  VALUES(
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_icon,
    p_status,
    p_action_url,
    p_metadata,
    p_expires_at
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;


-- 5. USER DEVICES TABLE (Multi-device Login Tracking)
CREATE TABLE IF NOT EXISTS public.user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name TEXT,
  platform TEXT,
  app_version TEXT,
  country TEXT,
  last_ip TEXT,
  first_seen TIMESTAMPTZ DEFAULT now(),
  last_seen TIMESTAMPTZ DEFAULT now(),
  trusted BOOLEAN DEFAULT true,
  CONSTRAINT unique_user_device UNIQUE (user_id, device_id)
);

-- Enable RLS on user_devices
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to select own devices"
  ON public.user_devices FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Allow users to manage own devices"
  ON public.user_devices FOR ALL USING (auth.uid() = user_id);


-- 6. TRACK USER DEVICE & TRIGGER SECURITY NOTIFICATION FUNCTION
CREATE OR REPLACE FUNCTION public.track_user_device(
  p_user_id UUID,
  p_device_id TEXT,
  p_device_name TEXT DEFAULT 'Browser',
  p_platform TEXT DEFAULT 'Web',
  p_app_version TEXT DEFAULT '1.0.0',
  p_country TEXT DEFAULT 'Unknown',
  p_last_ip TEXT DEFAULT '127.0.0.1'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing RECORD;
  v_notif_id UUID;
  v_is_new BOOLEAN := FALSE;
BEGIN
  SELECT * INTO v_existing
  FROM public.user_devices
  WHERE user_id = p_user_id AND device_id = p_device_id;

  IF v_existing IS NULL THEN
    INSERT INTO public.user_devices (
      user_id, device_id, device_name, platform, app_version, country, last_ip
    ) VALUES (
      p_user_id, p_device_id, p_device_name, p_platform, p_app_version, p_country, p_last_ip
    );
    v_is_new := TRUE;

    -- Create Security Notification for new login device
    v_notif_id := public.create_notification(
      p_user_id := p_user_id,
      p_type := 'security',
      p_title := 'New Login Detected',
      p_message := FORMAT('📢 New login detected on %s (%s)', p_device_name, p_platform),
      p_icon := 'security',
      p_status := 'warning',
      p_action_url := '/settings'
    );
  ELSE
    UPDATE public.user_devices
    SET last_seen = NOW(),
        last_ip = p_last_ip,
        app_version = p_app_version
    WHERE user_id = p_user_id AND device_id = p_device_id;
  END IF;

  RETURN jsonb_build_object(
    'is_new_device', v_is_new,
    'device_id', p_device_id
  );
END;
$$;


-- 7. SQL FUNCTION TO VALIDATE ADDRESS FORMAT & CHECK DUPLICATE TOKEN PER CHAIN
CREATE OR REPLACE FUNCTION public.validate_and_check_duplicate_token(
  p_contract_address TEXT,
  p_chain_id TEXT DEFAULT 'polygon'
)
RETURNS JSONB AS $$
DECLARE
  v_clean_address TEXT;
  v_clean_chain TEXT;
  v_existing RECORD;
BEGIN
  v_clean_address := LOWER(TRIM(p_contract_address));
  v_clean_chain := LOWER(TRIM(p_chain_id));
  
  IF v_clean_address !~ '^0x[a-f0-9]{40}$' THEN
    RAISE EXCEPTION 'Invalid Contract Address: "%" is not a valid EVM address', p_contract_address
      USING ERRCODE = '22023';
  END IF;
  
  SELECT * INTO v_existing
  FROM public.tokens
  WHERE LOWER(contract_address) = v_clean_address
    AND LOWER(chain_id) = v_clean_chain;
  
  IF FOUND THEN
    RAISE EXCEPTION 'Duplicate Token Error: Token with contract address % already exists on chain %', p_contract_address, p_chain_id
      USING ERRCODE = '23505';
  END IF;
  
  RETURN jsonb_build_object(
    'valid', true,
    'contract_address', v_clean_address,
    'chain_id', v_clean_chain,
    'message', 'Contract address format is valid and unique for this chain.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 8. ENABLE SUPABASE REALTIME REPLICATION FOR NOTIFICATIONS & TOKENS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tokens;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL; -- Ignore if table is already added to publication
END $$;
`;

export const SupabaseSqlModal: React.FC<SupabaseSqlModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0B0E17] border border-zinc-800 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Supabase SQL Setup & Duplicate Verification Script
              </h2>
              <p className="text-xs text-zinc-400">
                Run this SQL in your Supabase SQL Editor to create tables & contract address verification function
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white bg-zinc-900 rounded-xl border border-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Copy Button */}
        <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-2xl p-3 text-xs">
          <div className="text-zinc-400">
            Paste in Supabase Dashboard → <span className="text-purple-400 font-semibold">SQL Editor</span>
          </div>
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl flex items-center space-x-2 transition-all cursor-pointer shadow-md shadow-purple-600/20"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Full SQL Code</span>
              </>
            )}
          </button>
        </div>

        {/* SQL Code View */}
        <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl p-4 overflow-y-auto font-mono text-xs text-purple-300 leading-relaxed max-h-[400px]">
          <pre>{SUPABASE_SQL_SCHEMA}</pre>
        </div>

        <div className="flex items-center justify-end pt-2 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
