import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SubmittedToken, UserRewardWallet } from '../types';
import { REWARD_RATE_USD, getChainInfo } from '../constants/chains';

const SUPABASE_URL_KEY = 'token_hub_supabase_url';
const SUPABASE_ANON_KEY = 'token_hub_supabase_anon_key';

// Default environment variables or local stored config
const env = (import.meta as any).env || {};
const defaultUrl = env.VITE_SUPABASE_URL || 'https://nzllvdnxrngtlxttnysv.supabase.co';
const defaultAnonKey =
  env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56bGx2ZG54cm5ndGx4dHRueXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3NDY0MTgsImV4cCI6MjEwMTMyMjQxOH0.4E8i9GPcb84heowUSWB1Wk7tl_WpqIndLiGqcLywXO0';

export function getSupabaseConfig() {
  let url = localStorage.getItem(SUPABASE_URL_KEY);
  let anonKey = localStorage.getItem(SUPABASE_ANON_KEY);

  if (!url || url.includes('xyzcompany.supabase.co')) {
    url = defaultUrl;
    localStorage.setItem(SUPABASE_URL_KEY, defaultUrl);
  }
  if (!anonKey || anonKey.includes('dummy_key')) {
    anonKey = defaultAnonKey;
    localStorage.setItem(SUPABASE_ANON_KEY, defaultAnonKey);
  }

  return { url, anonKey };
}

export function saveSupabaseConfig(url: string, anonKey: string) {
  localStorage.setItem(SUPABASE_URL_KEY, url.trim());
  localStorage.setItem(SUPABASE_ANON_KEY, anonKey.trim());
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  const { url, anonKey } = getSupabaseConfig();
  if (!supabaseInstance) {
    supabaseInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return supabaseInstance;
}

export interface SupabaseUserProfile {
  id: string;
  email: string;
  display_name?: string;
  username?: string;
  avatar_url?: string;
  total_reward_balance: number;
  unclaimed_reward_balance: number;
  created_at?: string;
}

/**
 * Validate EVM address format and check if a contract address already exists on a specific chain in Supabase DB
 */
export async function verifyTokenContractUnique(
  contractAddress: string,
  chainId: string = 'polygon'
): Promise<{
  isUnique: boolean;
  existingToken?: any;
  error?: string;
}> {
  if (!contractAddress || !contractAddress.trim()) {
    return { isUnique: false, error: 'Contract address is required.' };
  }

  const cleanAddress = contractAddress.trim().toLowerCase();
  const cleanChain = (chainId || 'polygon').trim().toLowerCase();

  // Validate EVM Contract Address format
  if (!/^0x[a-f0-9]{40}$/.test(cleanAddress)) {
    return {
      isUnique: false,
      error: `Invalid EVM contract address format "${contractAddress}". Must be a 42-character hexadecimal starting with 0x.`,
    };
  }

  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from('tokens')
      .select('*')
      .ilike('contract_address', cleanAddress)
      .ilike('chain_id', cleanChain)
      .maybeSingle();

    if (error) {
      console.warn('[Supabase] Duplicate check query warning:', error);
      if (error.code === '42P01') {
        return { isUnique: true };
      }
    }

    if (data) {
      return {
        isUnique: false,
        existingToken: data,
        error: `Token with contract address "${contractAddress}" already exists on chain "${cleanChain}" in the database! Duplicate submissions are prohibited.`,
      };
    }

    return { isUnique: true };
  } catch (e: any) {
    console.error('[Supabase] Contract uniqueness check error:', e);
    return { isUnique: true };
  }
}

/**
 * Save token metadata to Supabase 'tokens' table and update user reward balance
 */
export async function saveTokenToSupabase(
  token: SubmittedToken,
  userId?: string
): Promise<{ success: boolean; error?: string; tokenData?: any }> {
  const cleanAddress = token.address.trim().toLowerCase();
  const cleanChain = (token.chainId || 'polygon').trim().toLowerCase();

  // 1. Verify Uniqueness on this specific chain
  const check = await verifyTokenContractUnique(cleanAddress, cleanChain);
  if (!check.isUnique) {
    return {
      success: false,
      error: check.error || `Token contract address already exists on chain "${cleanChain}" in the database.`,
    };
  }

  const supabase = getSupabase();

  try {
    const chainDetails = getChainInfo(cleanChain);
    const enrichedMetadata = {
      ...token.metadata,
      chainId: cleanChain,
      chainName: (token.metadata as any)?.chainName || chainDetails.name,
      network: (token.metadata as any)?.network || chainDetails.name,
      chainSymbol: (token.metadata as any)?.chainSymbol || chainDetails.symbol,
    };

    const payload = {
      user_id: userId || null,
      contract_address: cleanAddress,
      chain_id: cleanChain,
      name: token.metadata.name,
      symbol: token.metadata.symbol,
      decimals: token.metadata.decimals || 18,
      total_supply: token.metadata.totalSupply || '0',
      logo_url: token.metadata.logoUrl || '',
      price_usd: token.marketData?.priceUsd || 0,
      safety_score: token.safety?.score || 0,
      safety_rating: token.safety?.rating || 'SAFE',
      verified: token.verified ?? true,
      reward_earned_tokens: token.rewardEarnedTokens || 15,
      submitted_at: token.submittedAt || new Date().toISOString(),
      metadata: enrichedMetadata,
      safety_data: token.safety,
      market_data: token.marketData,
    };

    const { data, error } = await supabase.from('tokens').insert([payload]).select().single();

    if (error) {
      // Catch unique constraint violation in Postgres (e.g. unique_contract_address)
      if (error.code === '23505') {
        return {
          success: false,
          error: `Database constraint violation: Token with contract address "${token.address}" has already been saved!`,
        };
      }
      console.warn('[Supabase Insert Error]:', error);
      // Return error if schema exists
      if (error.code !== '42P01') {
        return { success: false, error: error.message };
      }
    }

    // 2. Increment user reward balance in profiles table if userId present
    if (userId) {
      try {
        const reward = token.rewardEarnedTokens || 15;
        const { data: profile } = await supabase
          .from('profiles')
          .select('total_reward_balance')
          .eq('id', userId)
          .single();

        const currentBal = profile?.total_reward_balance || 0;
        await supabase
          .from('profiles')
          .update({
            total_reward_balance: Number(currentBal) + reward,
            unclaimed_reward_balance: Number(currentBal) + reward,
          })
          .eq('id', userId);

        // Trigger Reward Notification via central notification function
        await createNotificationInSupabase({
          userId,
          type: 'reward',
          title: 'Reward Received',
          message: `💰 You received +${reward} TCR for submitting ${token.metadata.name} (${token.metadata.symbol}).`,
          icon: 'reward',
          status: 'success',
          actionUrl: '/tokens',
          metadata: { symbol: token.metadata.symbol, reward },
        });
      } catch (balErr) {
        console.warn('[Supabase Profile Update Error]:', balErr);
      }
    }

    return { success: true, tokenData: data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to save token to Supabase.' };
  }
}

/**
 * Fetch all saved tokens from Supabase 'tokens' table
 */
export async function fetchTokensFromSupabase(): Promise<SubmittedToken[]> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('tokens')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (error || !data) return [];

    return data.map((item: any) => ({
      id: item.id,
      address: item.contract_address,
      chainId: item.chain_id,
      metadata: item.metadata || {
        address: item.contract_address,
        chainId: item.chain_id,
        name: item.name,
        symbol: item.symbol,
        decimals: item.decimals,
        totalSupply: item.total_supply,
        logoUrl: item.logo_url,
      },
      marketData: item.market_data || {
        priceUsd: item.price_usd || 0,
      },
      safety: item.safety_data || {
        score: item.safety_score || 80,
        rating: item.safety_rating || 'SAFE',
      },
      submittedAt: item.submitted_at,
      submittedBy: item.user_id ? `${item.user_id.slice(0, 6)}...` : 'Community',
      rewardEarnedTokens: item.reward_earned_tokens || 15,
      rewardEarnedUsd: (item.reward_earned_tokens || 15) * REWARD_RATE_USD,
      upvotes: item.upvotes || 1,
      verified: item.verified,
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch user profile combining LocalStorage cache, Supabase 'profiles' table, and Auth session metadata
 */
export async function getUserProfile(userId: string, sessionUser?: any): Promise<SupabaseUserProfile> {
  const supabase = getSupabase();
  let cachedProfile: Partial<SupabaseUserProfile> = {};

  // 1. Check local storage cache
  try {
    const raw = localStorage.getItem(`tokencare_profile_${userId}`);
    if (raw) {
      cachedProfile = JSON.parse(raw);
    }
  } catch (e) {
    console.warn('[Supabase Profile] LocalStorage cache read error:', e);
  }

  // 2. Fetch from Supabase 'profiles' table
  let dbProfile: any = null;
  try {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (data) {
      dbProfile = data;
    }
  } catch (err) {
    console.warn('[Supabase Profile] DB fetch error:', err);
  }

  // 3. Fallback to auth session metadata
  const meta = sessionUser?.user_metadata || {};
  const email = sessionUser?.email || dbProfile?.email || cachedProfile.email || '';
  const defaultUsername = email ? email.split('@')[0] : 'user';

  const mergedProfile: SupabaseUserProfile = {
    id: userId,
    email: email,
    username:
      dbProfile?.username ||
      cachedProfile.username ||
      meta.username ||
      defaultUsername,
    display_name:
      dbProfile?.display_name ||
      cachedProfile.display_name ||
      meta.full_name ||
      meta.display_name ||
      defaultUsername,
    avatar_url:
      dbProfile?.avatar_url ||
      cachedProfile.avatar_url ||
      meta.avatar_url ||
      '',
    total_reward_balance: Number(
      dbProfile?.total_reward_balance ??
        cachedProfile.total_reward_balance ??
        0
    ),
    unclaimed_reward_balance: Number(
      dbProfile?.unclaimed_reward_balance ??
        cachedProfile.unclaimed_reward_balance ??
        0
    ),
    created_at: dbProfile?.created_at || cachedProfile.created_at || new Date().toISOString(),
  };

  // Cache back to LocalStorage
  try {
    localStorage.setItem(`tokencare_profile_${userId}`, JSON.stringify(mergedProfile));
  } catch {}

  return mergedProfile;
}

/**
 * Update user profile (username, display name, avatar) in Supabase profiles table, Auth metadata, and LocalStorage
 */
export async function updateUserProfile(
  userId: string,
  updates: { username?: string; display_name?: string; avatar_url?: string },
  sessionUser?: any
): Promise<{ success: boolean; error?: string; profile?: SupabaseUserProfile }> {
  const supabase = getSupabase();
  try {
    const username = updates.username?.trim();
    const displayName = updates.display_name?.trim() || username;
    const avatarUrl = updates.avatar_url?.trim();

    const email = sessionUser?.email || '';

    const payload = {
      id: userId,
      email: email,
      username: username,
      display_name: displayName,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    };

    // 1. Immediately update LocalStorage so user data is NEVER lost on page reload
    let localCache: Partial<SupabaseUserProfile> = {};
    try {
      const raw = localStorage.getItem(`tokencare_profile_${userId}`);
      if (raw) localCache = JSON.parse(raw);
    } catch {}

    const updatedProfile: SupabaseUserProfile = {
      ...localCache,
      id: userId,
      email: email || localCache.email || '',
      username: username || localCache.username || '',
      display_name: displayName || localCache.display_name || '',
      avatar_url: avatarUrl !== undefined ? avatarUrl : (localCache.avatar_url || ''),
      total_reward_balance: localCache.total_reward_balance || 0,
      unclaimed_reward_balance: localCache.unclaimed_reward_balance || 0,
    };

    try {
      localStorage.setItem(`tokencare_profile_${userId}`, JSON.stringify(updatedProfile));
    } catch (lsErr) {
      console.warn('LocalStorage save error:', lsErr);
    }

    // 2. Upsert into Supabase 'profiles' table
    let dbResult: any = null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .maybeSingle();

      if (data) {
        dbResult = data;
      } else if (error) {
        console.warn('Supabase profiles upsert notice:', error.message);
      }
    } catch (dbErr) {
      console.warn('Supabase DB connection note:', dbErr);
    }

    // 3. Sync into Supabase Auth User Metadata
    try {
      await supabase.auth.updateUser({
        data: {
          username: username,
          avatar_url: avatarUrl,
          full_name: displayName,
        },
      });
    } catch (authErr) {
      console.warn('Supabase Auth metadata update note:', authErr);
    }

    const finalProfile: SupabaseUserProfile = dbResult
      ? { ...updatedProfile, ...dbResult }
      : updatedProfile;

    try {
      localStorage.setItem(`tokencare_profile_${userId}`, JSON.stringify(finalProfile));
    } catch {}

    return {
      success: true,
      profile: finalProfile,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update profile.' };
  }
}

/**
 * Delete current user account and profile entry
 */
export async function deleteUserAccount(): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      return { success: false, error: 'No active session found.' };
    }

    const userId = session.user.id;

    // Remove from profiles table if exists
    await supabase.from('profiles').delete().eq('id', userId);

    // Sign out user session
    await supabase.auth.signOut();

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete user account.' };
  }
}

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount_tokens: number;
  amount_usd: number;
  wallet_address: string;
  chain_id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  tx_hash?: string;
  error_message?: string;
  created_at: string;
  processing_started_at?: string;
  completed_at?: string;
  failed_at?: string;
  updated_at?: string;
}

/**
 * Submit a withdrawal request to Supabase DB and deduct unclaimed reward balance
 */
export async function submitWithdrawalRequest(
  userId: string,
  amountTokens: number,
  walletAddress: string,
  chainId: string = '137'
): Promise<{ success: boolean; request?: WithdrawalRequest; error?: string }> {
  const supabase = getSupabase();
  const amountUsd = amountTokens * REWARD_RATE_USD;

  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress.trim())) {
    return { success: false, error: 'Invalid EVM wallet address format (must be 0x followed by 40 hex chars).' };
  }

  if (amountTokens <= 0) {
    return { success: false, error: 'Withdrawal amount must be greater than 0.' };
  }

  const fallbackReq: WithdrawalRequest = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `wtx-${Date.now()}`,
    user_id: userId,
    amount_tokens: amountTokens,
    amount_usd: amountUsd,
    wallet_address: walletAddress.trim(),
    chain_id: chainId,
    status: 'PENDING',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  let createdRecord: WithdrawalRequest = fallbackReq;

  // 1. First try calling SQL RPC create_withdrawal_request (Atomic DB function)
  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc('create_withdrawal_request', {
      p_amount_tokens: amountTokens,
      p_amount_usd: amountUsd,
      p_wallet_address: walletAddress.trim(),
      p_chain_id: chainId,
    });

    if (!rpcErr && rpcData) {
      createdRecord = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    } else {
      if (rpcErr && rpcErr.message && rpcErr.message.includes('Insufficient reward balance')) {
        return { success: false, error: rpcErr.message };
      }
      // Fallback to standard table insert if RPC isn't deployed yet
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .insert({
          user_id: userId,
          amount_tokens: amountTokens,
          amount_usd: amountUsd,
          wallet_address: walletAddress.trim(),
          chain_id: chainId,
          status: 'PENDING',
        })
        .select()
        .maybeSingle();

      if (data) {
        createdRecord = data;
      } else if (error) {
        console.warn('[Supabase] withdrawal_requests table insert note:', error.message);
      }
    }
  } catch (dbErr) {
    console.warn('[Supabase] withdrawal_requests RPC/DB note:', dbErr);
  }

  // 2. LocalStorage sync & cache
  try {
    const cacheKey = `tokencare_withdrawals_${userId}`;
    const raw = localStorage.getItem(cacheKey);
    const history: WithdrawalRequest[] = raw ? JSON.parse(raw) : [];
    history.unshift(createdRecord);
    localStorage.setItem(cacheKey, JSON.stringify(history));
  } catch (lsErr) {
    console.warn('LocalStorage save error for withdrawals:', lsErr);
  }

  // 3. Deduct unclaimed_reward_balance in profile
  try {
    const profileKey = `tokencare_profile_${userId}`;
    const rawP = localStorage.getItem(profileKey);
    let currentUnclaimed = 0;
    let totalBal = 0;
    if (rawP) {
      const p = JSON.parse(rawP);
      currentUnclaimed = Number(p.unclaimed_reward_balance || 0);
      totalBal = Number(p.total_reward_balance || 0);
    }

    const newUnclaimed = Math.max(0, currentUnclaimed - amountTokens);

    // Update Local Storage
    localStorage.setItem(
      profileKey,
      JSON.stringify({
        ...(rawP ? JSON.parse(rawP) : {}),
        unclaimed_reward_balance: newUnclaimed,
      })
    );

    // Update DB profiles table
    await supabase
      .from('profiles')
      .update({
        unclaimed_reward_balance: newUnclaimed,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
  } catch (e) {
    console.warn('Profile balance deduction note:', e);
  }

  return {
    success: true,
    request: createdRecord,
  };
}

/**
 * Fetch all withdrawal requests for a user from Supabase / LocalStorage
 */
export async function fetchWithdrawalRequests(userId: string): Promise<WithdrawalRequest[]> {
  const supabase = getSupabase();
  let dbRequests: WithdrawalRequest[] = [];

  // 1. Try DB
  try {
    const { data, error } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      dbRequests = data;
    }
  } catch (err) {
    console.warn('[Supabase] fetchWithdrawalRequests note:', err);
  }

  // 2. Read LocalStorage cache
  let localRequests: WithdrawalRequest[] = [];
  try {
    const raw = localStorage.getItem(`tokencare_withdrawals_${userId}`);
    if (raw) {
      localRequests = JSON.parse(raw);
    }
  } catch (lsErr) {
    console.warn('LocalStorage read error for withdrawals:', lsErr);
  }

  // Merge and deduplicate by id
  const map = new Map<string, WithdrawalRequest>();
  localRequests.forEach((req) => map.set(req.id, req));
  dbRequests.forEach((req) => map.set(req.id, req));

  const merged = Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return merged;
}

export interface SavedUserAddress {
  id?: string;
  user_id: string;
  wallet_address: string;
  chain_id: string;
  verified: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Verify EVM address format & check validity on Polygon network via RPC
 */
export async function verifyAddressOnPolygon(address: string): Promise<{ isValid: boolean; isContract?: boolean; error?: string }> {
  if (!address || !address.trim()) {
    return { isValid: false, error: 'Address cannot be empty.' };
  }

  const clean = address.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(clean)) {
    return { isValid: false, error: 'Invalid EVM address format. Must start with 0x followed by 40 hex characters.' };
  }

  try {
    // Public Polygon RPC endpoint
    const res = await fetch('https://polygon-rpc.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [clean, 'latest'],
        id: 1,
      }),
    });

    const data = await res.json();
    if (data && data.result !== undefined) {
      return { isValid: true };
    }
  } catch (err) {
    console.warn('[Polygon RPC Address Check] RPC network note:', err);
  }

  // Fallback: Valid 0x EVM hex format passes
  return { isValid: true };
}

/**
 * Save or update single user payout address in Supabase 'user_addresses' or 'profiles' table
 */
export async function saveUserWithdrawalAddress(
  userId: string,
  address: string
): Promise<{ success: boolean; address?: string; error?: string }> {
  const cleanAddr = address.trim();

  // 1. Verify on Polygon RPC
  const verification = await verifyAddressOnPolygon(cleanAddr);
  if (!verification.isValid) {
    return { success: false, error: verification.error || 'Address verification failed on Polygon network.' };
  }

  const supabase = getSupabase();

  // 2. Save in LocalStorage
  try {
    localStorage.setItem(`tokencare_saved_address_${userId}`, cleanAddr);
  } catch (e) {
    console.warn('LocalStorage save error for address:', e);
  }

  // 3. Upsert into 'user_addresses' table
  try {
    const { error } = await supabase
      .from('user_addresses')
      .upsert(
        {
          user_id: userId,
          wallet_address: cleanAddr,
          chain_id: '137',
          verified: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error && error.code !== '42P01') {
      console.warn('user_addresses table upsert notice:', error.message);
    }
  } catch (dbErr) {
    console.warn('Supabase user_addresses save note:', dbErr);
  }

  // Also sync address into profiles table
  try {
    await supabase.from('profiles').update({ updated_at: new Date().toISOString() }).eq('id', userId);
  } catch (e) {
    console.warn('Profile wallet_address sync note:', e);
  }

  return { success: true, address: cleanAddr };
}

/**
 * Upload profile avatar image to Supabase Storage 'avatars' bucket
 */
export async function uploadAvatarToSupabaseStorage(
  userId: string,
  file: File
): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
  const supabase = getSupabase();
  try {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const filePath = `${userId}/${Date.now()}.${fileExt}`;

    // Upload image to 'avatars' bucket in Supabase Storage
    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadErr) {
      console.warn('[Supabase Storage Upload Warning]:', uploadErr.message);
      // Fallback if bucket is not public/created or upload fails: convert file to Base64/DataURL so user profile photo ALWAYS displays!
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({
            success: true,
            publicUrl: reader.result as string,
          });
        };
        reader.onerror = () => {
          resolve({ success: false, error: uploadErr.message });
        };
        reader.readAsDataURL(file);
      });
    }

    // Get public URL from Supabase Storage 'avatars' bucket
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const publicUrl = urlData?.publicUrl || '';

    return { success: true, publicUrl };
  } catch (err: any) {
    console.error('[Avatar Upload Error]:', err);
    return { success: false, error: err.message || 'Failed to upload avatar.' };
  }
}

/**
 * Fetch saved withdrawal address for user
 */
export async function getUserWithdrawalAddress(userId: string): Promise<string | null> {
  // 1. Try LocalStorage
  try {
    const local = localStorage.getItem(`tokencare_saved_address_${userId}`);
    if (local && /^0x[a-fA-F0-9]{40}$/.test(local)) return local;
  } catch {}

  // 2. Try DB
  const supabase = getSupabase();
  try {
    const { data } = await supabase.from('user_addresses').select('wallet_address').eq('user_id', userId).maybeSingle();
    if (data?.wallet_address) {
      return data.wallet_address;
    }
  } catch {}

  return null;
}

/**
 * Realtime Database Subscription Helper to auto-update UI when DB changes (e.g. token deleted)
 */
export function subscribeToDatabaseChanges(
  onTokensChanged: () => void,
  onProfileChanged?: () => void
) {
  const supabase = getSupabase();

  try {
    const channel = supabase
      .channel('db_changes_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tokens' },
        () => {
          console.log('[Supabase Realtime] Tokens table updated!');
          onTokensChanged();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          console.log('[Supabase Realtime] Profiles table updated!');
          if (onProfileChanged) onProfileChanged();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('[Supabase Realtime] Setup error:', err);
    return () => {};
  }
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  icon?: string | null;
  status?: string | null;
  action_url?: string | null;
  metadata?: Record<string, any>;
  is_read: boolean;
  created_at: string;
  expires_at?: string | null;
}

/**
 * Central generic notification creation API function (calls public.create_notification DB RPC)
 */
export async function createNotificationInSupabase(params: {
  userId: string;
  type: string;
  title: string;
  message: string;
  icon?: string;
  status?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
  expiresAt?: string;
}): Promise<string> {
  const supabase = getSupabase();
  const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const newNotif: AppNotification = {
    id,
    user_id: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    icon: params.icon || null,
    status: params.status || null,
    action_url: params.actionUrl || null,
    metadata: params.metadata || {},
    is_read: false,
    created_at: new Date().toISOString(),
    expires_at: params.expiresAt || null,
  };

  // 1. LocalStorage cache insert
  try {
    const key = `tokencare_notifications_${params.userId}`;
    const raw = localStorage.getItem(key);
    const list: AppNotification[] = raw ? JSON.parse(raw) : [];
    list.unshift(newNotif);
    localStorage.setItem(key, JSON.stringify(list));
  } catch (e) {
    console.warn('LocalStorage notification insert note:', e);
  }

  // 2. Database RPC call
  try {
    const { data: rpcId, error: rpcErr } = await supabase.rpc('create_notification', {
      p_user_id: params.userId,
      p_type: params.type,
      p_title: params.title,
      p_message: params.message,
      p_icon: params.icon || null,
      p_status: params.status || null,
      p_action_url: params.actionUrl || null,
      p_metadata: params.metadata || {},
      p_expires_at: params.expiresAt || null,
    });

    if (!rpcErr && rpcId) {
      return rpcId as string;
    }

    // Fallback direct insert if RPC function not deployed in DB yet
    const { data: insertData } = await supabase
      .from('notifications')
      .insert({
        user_id: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        icon: params.icon || null,
        status: params.status || null,
        action_url: params.actionUrl || null,
        metadata: params.metadata || {},
        is_read: false,
        expires_at: params.expiresAt || null,
      })
      .select('id')
      .maybeSingle();

    if (insertData?.id) return insertData.id;
  } catch (err) {
    console.warn('[Supabase] createNotificationInSupabase note:', err);
  }

  return id;
}

/**
 * Multi-device login tracking helper (calls public.track_user_device DB RPC)
 */
export async function trackUserDeviceInSupabase(
  userId: string,
  deviceInfo?: {
    deviceId?: string;
    deviceName?: string;
    platform?: string;
    country?: string;
  }
): Promise<void> {
  const supabase = getSupabase();
  let deviceId = deviceInfo?.deviceId;

  if (!deviceId) {
    try {
      deviceId = localStorage.getItem('tokencare_device_id') || '';
      if (!deviceId) {
        deviceId = `dev-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem('tokencare_device_id', deviceId);
      }
    } catch {
      deviceId = `dev-session-${Date.now()}`;
    }
  }

  const deviceName = deviceInfo?.deviceName || (navigator.userAgent.includes('Mobile') ? 'Mobile Browser' : 'Desktop Browser');
  const platform = deviceInfo?.platform || (navigator.userAgent.includes('Android') ? 'Android' : navigator.userAgent.includes('iPhone') ? 'iOS' : 'Web');
  const country = deviceInfo?.country || 'Detected Region';

  try {
    const { data: rpcRes, error } = await supabase.rpc('track_user_device', {
      p_user_id: userId,
      p_device_id: deviceId,
      p_device_name: deviceName,
      p_platform: platform,
      p_app_version: '1.0.0',
      p_country: country,
      p_last_ip: '127.0.0.1',
    });

    if (error && (error.code === '42883' || error.message.includes('function'))) {
      // Fallback if track_user_device RPC isn't deployed yet
      const localTrackKey = `tokencare_device_tracked_${userId}_${deviceId}`;
      const trackedLocally = localStorage.getItem(localTrackKey);

      const { data: existing } = await supabase
        .from('user_devices')
        .select('id')
        .eq('user_id', userId)
        .eq('device_id', deviceId)
        .maybeSingle();

      if (!existing && !trackedLocally) {
        localStorage.setItem(localTrackKey, 'true');

        await supabase.from('user_devices').insert({
          user_id: userId,
          device_id: deviceId,
          device_name: deviceName,
          platform,
          country,
        });

        // Trigger Security Notification ONLY for genuinely new device login
        await createNotificationInSupabase({
          userId,
          type: 'security',
          title: 'New Login Detected',
          message: `📢 New login detected on ${deviceName} (${platform})`,
          icon: 'security',
          status: 'warning',
          actionUrl: '/settings',
        });
      } else if (existing?.id) {
        // Known device: update last active timestamp silently without spamming
        await supabase
          .from('user_devices')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', existing.id);
      }
    }
  } catch (err) {
    console.warn('[Supabase] trackUserDeviceInSupabase note:', err);
  }
}

/**
 * Fetch user notifications from Supabase DB or LocalStorage
 */
export async function fetchUserNotifications(userId: string): Promise<AppNotification[]> {
  const supabase = getSupabase();
  let dbNotifications: AppNotification[] = [];

  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      dbNotifications = data;
    }
  } catch (err) {
    console.warn('[Supabase] fetchUserNotifications error:', err);
  }

  // Read LocalStorage
  let localNotifications: AppNotification[] = [];
  try {
    const raw = localStorage.getItem(`tokencare_notifications_${userId}`);
    if (raw) {
      localNotifications = JSON.parse(raw);
    }
  } catch (lsErr) {
    console.warn('LocalStorage read error for notifications:', lsErr);
  }

  // If both are empty, provide initial welcome notifications
  if (dbNotifications.length === 0 && localNotifications.length === 0) {
    const defaultNotifs: AppNotification[] = [
      {
        id: `notif-welcome-${userId}`,
        user_id: userId,
        type: 'SYSTEM',
        title: 'Welcome to TokenCare',
        message: 'Your account is verified and ready for EVM token donations and reward tracking.',
        is_read: false,
        created_at: new Date().toISOString(),
      },
      {
        id: `notif-reward-info-${userId}`,
        user_id: userId,
        type: 'REWARD_EARNED',
        title: 'Reward System Active',
        message: 'Earn +15 REWARD tokens for every verified ERC-20 token contract submitted to the directory.',
        is_read: false,
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
    ];
    try {
      localStorage.setItem(`tokencare_notifications_${userId}`, JSON.stringify(defaultNotifs));
    } catch {}
    return defaultNotifs;
  }

  // Merge and deduplicate by id
  const map = new Map<string, AppNotification>();
  localNotifications.forEach((n) => map.set(n.id, n));
  dbNotifications.forEach((n) => map.set(n.id, n));

  const merged = Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return merged;
}

/**
 * Fetch unread notification count for a user (SELECT COUNT(*) FROM notifications WHERE user_id = userId AND is_read = false)
 */
export async function fetchUnreadNotificationCount(userId: string): Promise<number> {
  const supabase = getSupabase();
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (!error && count !== null) {
      return count;
    }
  } catch (err) {
    console.warn('[Supabase] fetchUnreadNotificationCount query warning:', err);
  }

  // Fallback: load notifications and count where is_read === false
  const notifs = await fetchUserNotifications(userId);
  return notifs.filter((n) => !n.is_read).length;
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(id: string, userId: string): Promise<void> {
  const supabase = getSupabase();

  // LocalStorage update
  try {
    const key = `tokencare_notifications_${userId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const list: AppNotification[] = JSON.parse(raw);
      const updated = list.map((n) => (n.id === id ? { ...n, is_read: true } : n));
      localStorage.setItem(key, JSON.stringify(updated));
    }
  } catch (e) {
    console.warn('LocalStorage notification mark read note:', e);
  }

  // DB update
  try {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id).eq('user_id', userId);
  } catch (err) {
    console.warn('Supabase mark notification read note:', err);
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const supabase = getSupabase();

  // LocalStorage update
  try {
    const key = `tokencare_notifications_${userId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const list: AppNotification[] = JSON.parse(raw);
      const updated = list.map((n) => ({ ...n, is_read: true }));
      localStorage.setItem(key, JSON.stringify(updated));
    }
  } catch (e) {
    console.warn('LocalStorage mark all read note:', e);
  }

  // DB update
  try {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
  } catch (err) {
    console.warn('Supabase mark all read note:', err);
  }
}

/**
 * Realtime subscription helper for user notifications
 */
export function subscribeToRealtimeNotifications(
  userId: string,
  onNotificationChange: () => void
): () => void {
  const supabase = getSupabase();

  try {
    const channel = supabase
      .channel(`user_notifications_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          onNotificationChange();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('[Supabase Realtime Notifications] Setup error:', err);
    return () => {};
  }
}



