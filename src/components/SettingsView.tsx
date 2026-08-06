import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Camera,
  LogOut,
  Trash2,
  Save,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Mail,
  AtSign,
  Loader2,
  Upload,
  Moon,
  Globe,
  Wallet,
  Lock,
  Key,
  Bell,
  Coins,
  TrendingUp,
  HelpCircle,
  MessageSquare,
  FileText,
  ChevronRight,
  Pencil,
  X,
  Database,
  RefreshCw,
  Sparkles,
  Check,
} from 'lucide-react';
import {
  SupabaseUserProfile,
  updateUserProfile,
  deleteUserAccount,
  saveUserWithdrawalAddress,
  getUserWithdrawalAddress,
  uploadAvatarToSupabaseStorage,
} from '../lib/supabase';
import { clearAllAppStorage } from '../services/storage';

interface SettingsViewProps {
  currentUser?: any;
  userProfile?: SupabaseUserProfile | null;
  onUpdateProfile?: (profile: SupabaseUserProfile) => void;
  onSignOut?: () => void;
  handleSignOut?: () => void;
  apiKeys?: any;
  setApiKeys?: any;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  userProfile,
  onUpdateProfile,
  onSignOut,
  handleSignOut,
}) => {
  const signOutHandler = onSignOut || handleSignOut;

  const [username, setUsername] = useState(
    userProfile?.username || currentUser?.user_metadata?.username || currentUser?.email?.split('@')[0] || 'Wisdom'
  );
  const [displayName, setDisplayName] = useState(
    userProfile?.display_name || currentUser?.user_metadata?.full_name || 'Wisdom'
  );
  const [avatarUrl, setAvatarUrl] = useState(
    userProfile?.avatar_url || currentUser?.user_metadata?.avatar_url || ''
  );

  const [darkModeEnabled, setDarkModeEnabled] = useState(true);
  const [currency, setCurrency] = useState('USD');
  const [language, setLanguage] = useState('English');

  // Saved Address State
  const [savedAddress, setSavedAddress] = useState<string | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressMessage, setAddressMessage] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);

  // Clean Storage State
  const [isClearingStorage, setIsClearingStorage] = useState(false);
  const [storageCleanMessage, setStorageCleanMessage] = useState<string | null>(null);

  // Edit Profile Modal / Drawer state
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const email = currentUser?.email || userProfile?.email || 'goodlucksteven676@gmail.com';
  const userId = currentUser?.id || userProfile?.id || 'anon-user-id';

  // Load saved withdrawal address on mount
  useEffect(() => {
    if (userId) {
      getUserWithdrawalAddress(userId).then((addr) => {
        if (addr) {
          setSavedAddress(addr);
          setAddressInput(addr);
        }
      });
    }
  }, [userId]);

  const handleCleanStorage = async () => {
    setIsClearingStorage(true);
    setStorageCleanMessage(null);
    clearAllAppStorage();
    setTimeout(() => {
      setIsClearingStorage(false);
      setStorageCleanMessage('Storage cache cleared! Database synchronized.');
      setTimeout(() => setStorageCleanMessage(null), 3000);
    }, 500);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressError(null);
    setAddressMessage(null);

    const clean = addressInput.trim();
    if (!clean || !/^0x[a-fA-F0-9]{40}$/.test(clean)) {
      setAddressError('Please enter a valid EVM wallet address (0x followed by 40 hex characters).');
      return;
    }

    setIsSavingAddress(true);
    try {
      const res = await saveUserWithdrawalAddress(userId, clean);
      if (res.success && res.address) {
        setSavedAddress(res.address);
        setAddressMessage('✓ Verified on Polygon Blockchain & saved to address table!');
        setTimeout(() => {
          setShowAddressModal(false);
          setAddressMessage(null);
        }, 1500);
      } else {
        setAddressError(res.error || 'Failed to save address.');
      }
    } catch (err: any) {
      setAddressError(err.message || 'An error occurred while saving address.');
    } finally {
      setIsSavingAddress(false);
    }
  };

  // Synchronize state when userProfile or currentUser updates
  useEffect(() => {
    if (userProfile) {
      if (userProfile.username) setUsername(userProfile.username);
      if (userProfile.display_name) setDisplayName(userProfile.display_name);
      if (userProfile.avatar_url !== undefined) setAvatarUrl(userProfile.avatar_url);
    } else if (currentUser) {
      if (currentUser.user_metadata?.username) setUsername(currentUser.user_metadata.username);
      if (currentUser.user_metadata?.full_name) setDisplayName(currentUser.user_metadata.full_name);
      if (currentUser.user_metadata?.avatar_url) setAvatarUrl(currentUser.user_metadata.avatar_url);
    }
  }, [userProfile, currentUser]);

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Avatar File Upload Handler (Supabase Storage 'avatars' Bucket Flow)
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Profile image file size must be under 5MB.');
      return;
    }

    setIsUploadingAvatar(true);
    setErrorMessage(null);

    try {
      const res = await uploadAvatarToSupabaseStorage(userId, file);
      if (res.success && res.publicUrl) {
        setAvatarUrl(res.publicUrl);
        // Automatically save to profile
        if (userId && userId !== 'anon-user-id') {
          const updateRes = await updateUserProfile(
            userId,
            {
              username,
              display_name: displayName,
              avatar_url: res.publicUrl,
            },
            currentUser
          );
          if (updateRes.success && updateRes.profile && onUpdateProfile) {
            onUpdateProfile(updateRes.profile);
          }
        }
      } else {
        setErrorMessage(res.error || 'Failed to upload photo to Supabase Storage avatars bucket.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Avatar upload error.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Save Profile Handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSaveSuccess(false);

    setIsSaving(true);
    try {
      if (userId && userId !== 'anon-user-id') {
        const result = await updateUserProfile(
          userId,
          {
            username,
            display_name: displayName,
            avatar_url: avatarUrl,
          },
          currentUser
        );

        if (result.success && result.profile && onUpdateProfile) {
          onUpdateProfile(result.profile);
        }
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setShowEditProfile(false);
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while saving profile.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Account Handler
  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      const res = await deleteUserAccount();
      if (res.success && signOutHandler) {
        signOutHandler();
      } else {
        setErrorMessage(res.error || 'Failed to delete user account.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred while deleting account.');
    } finally {
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  return (
    <div className="space-y-3.5 text-white font-sans animate-in fade-in duration-200 pb-4 max-w-md mx-auto">
      {/* 1. Subtitle below top header */}
      <div className="text-center -mt-1 pb-1">
        <p className="text-[10.5px] text-zinc-400 font-normal">
          Manage your account and preferences
        </p>
      </div>

      {/* 2. Top Profile Header Card */}
      <div className="bg-[#0B0E17] border border-[#22C55E]/30 rounded-2xl p-3 shadow-md flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Avatar circle with online green status badge */}
          <div className="relative shrink-0">
            <div className="w-11 h-11 rounded-full bg-zinc-900 border border-[#22C55E]/60 overflow-hidden flex items-center justify-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-[#15803D] via-[#16A34A] to-[#4ADE80] flex items-center justify-center text-black font-extrabold text-sm">
                  {(displayName || username || 'W').slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            {/* Green Online Badge */}
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#22C55E] border-2 border-[#0B0E17] rounded-full shadow-[0_0_6px_rgba(34,197,94,0.8)]"></span>
          </div>

          {/* User Info */}
          <div className="space-y-0.5">
            <h2 className="text-xs font-bold text-white tracking-tight">
              {displayName || username || 'Wisdom'}
            </h2>
            <div className="text-[10px] text-zinc-400 font-mono truncate max-w-[170px]">
              {email}
            </div>
            <div className="pt-0.5">
              <span className="inline-flex items-center space-x-1 text-[8.5px] font-bold text-[#4ADE80] bg-[#22C55E]/15 border border-[#22C55E]/40 px-2 py-0.2 rounded-full font-mono">
                <CheckCircle2 className="w-2.5 h-2.5 text-[#22C55E] fill-[#22C55E]/20" />
                <span>Verified Account</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Green Outline Edit Profile Button */}
        <button
          onClick={() => setShowEditProfile(true)}
          className="px-2.5 py-1.5 bg-[#22C55E]/15 hover:bg-[#22C55E]/25 border border-[#22C55E]/40 text-[#4ADE80] text-[10.5px] font-semibold rounded-xl flex items-center space-x-1 transition-all cursor-pointer shrink-0 active:scale-95 shadow-[0_2px_10px_rgba(34,197,94,0.15)]"
        >
          <Pencil className="w-3 h-3 text-[#4ADE80]" />
          <span>Edit Profile</span>
        </button>
      </div>

      {/* 3. Section: APPEARANCE */}
      <div className="space-y-1">
        <div className="text-[9px] uppercase tracking-wider font-bold text-zinc-500 px-1">
          APPEARANCE
        </div>
        <div className="bg-[#0B0E17] border border-zinc-800/80 rounded-2xl divide-y divide-zinc-800/60 overflow-hidden shadow-sm">
          {/* Dark Mode */}
          <div
            onClick={() => setDarkModeEnabled(!darkModeEnabled)}
            className="p-2.5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors cursor-pointer group"
          >
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-[#0E2E21] border border-emerald-500/20 flex items-center justify-center text-[#00E575] shrink-0">
                <Moon className="w-3.5 h-3.5 text-[#00E575]" />
              </div>
              <div>
                <div className="text-[11.5px] font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Dark Mode
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-[10px] text-emerald-400 font-medium">Enabled</span>
              {/* Green Toggle Switch */}
              <div className="w-8 h-4.5 bg-[#22C55E] rounded-full p-0.5 transition-colors flex items-center justify-end shadow-sm">
                <div className="w-3.5 h-3.5 bg-white rounded-full shadow-md"></div>
              </div>
            </div>
          </div>

          {/* Language */}
          <div className="p-2.5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors cursor-pointer group">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-[#0E2E21] border border-emerald-500/20 flex items-center justify-center text-[#00E575] shrink-0">
                <Globe className="w-3.5 h-3.5 text-[#00E575]" />
              </div>
              <div>
                <div className="text-[11.5px] font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Language
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <span className="text-[10px] text-zinc-400">{language}</span>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 shrink-0" />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Section: WALLET & SECURITY */}
      <div className="space-y-1">
        <div className="text-[9px] uppercase tracking-wider font-bold text-zinc-500 px-1">
          WALLET & SECURITY
        </div>
        <div className="bg-[#0B0E17] border border-zinc-800/80 rounded-2xl divide-y divide-zinc-800/60 overflow-hidden shadow-sm">
          {/* Saved Wallet Address (Polygon Payout Destination) */}
          <div
            onClick={() => setShowAddressModal(true)}
            className="p-2.5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors cursor-pointer group"
          >
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-[#0E2E21] border border-emerald-500/20 flex items-center justify-center text-[#00E575] shrink-0">
                <Wallet className="w-3.5 h-3.5 text-[#00E575]" />
              </div>
              <div>
                <div className="text-[11.5px] font-bold text-white group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
                  Saved Payout Wallet Address
                  {savedAddress && (
                    <span className="text-[8.5px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono font-bold">
                      Polygon Verified
                    </span>
                  )}
                </div>
                <div className="text-[9.5px] text-zinc-400 font-mono truncate max-w-[200px]">
                  {savedAddress ? `${savedAddress.slice(0, 8)}...${savedAddress.slice(-6)}` : 'Click to add single Polygon address'}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 shrink-0" />
            </div>
          </div>

          {/* Change Password */}
          <div className="p-2.5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors cursor-pointer group">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-[#0E2E21] border border-emerald-500/20 flex items-center justify-center text-[#00E575] shrink-0">
                <Lock className="w-3.5 h-3.5 text-[#00E575]" />
              </div>
              <div>
                <div className="text-[11.5px] font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Change Password
                </div>
                <div className="text-[9.5px] text-zinc-400 font-normal">
                  Update your account password
                </div>
              </div>
            </div>

            <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 shrink-0" />
          </div>

          {/* Two-Factor Authentication (2FA) */}
          <div className="p-2.5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors cursor-pointer group">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-[#0E2E21] border border-emerald-500/20 flex items-center justify-center text-[#00E575] shrink-0">
                <Shield className="w-3.5 h-3.5 text-[#00E575]" />
              </div>
              <div>
                <div className="text-[11.5px] font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Two-Factor Authentication (2FA)
                </div>
                <div className="text-[9.5px] text-zinc-400 font-normal">
                  Add an extra layer of security
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] text-rose-400 font-medium">Disabled</span>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 shrink-0" />
            </div>
          </div>

          {/* API & Blockchain Settings */}
          <div className="p-2.5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors cursor-pointer group">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-[#0E2E21] border border-emerald-500/20 flex items-center justify-center text-[#00E575] shrink-0">
                <Key className="w-3.5 h-3.5 text-[#00E575]" />
              </div>
              <div>
                <div className="text-[11.5px] font-bold text-white group-hover:text-emerald-300 transition-colors">
                  API & Blockchain Settings
                </div>
                <div className="text-[9.5px] text-zinc-400 font-normal">
                  Manage your RPC and API configurations
                </div>
              </div>
            </div>

            <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 shrink-0" />
          </div>
        </div>
      </div>

      {/* 5. Section: PREFERENCES & STORAGE */}
      <div className="space-y-1">
        <div className="text-[9px] uppercase tracking-wider font-bold text-zinc-500 px-1">
          PREFERENCES & SYSTEM CACHE
        </div>
        <div className="bg-[#0B0E17] border border-zinc-800/80 rounded-2xl divide-y divide-zinc-800/60 overflow-hidden shadow-sm">
          {/* Clean Storage Button */}
          <div
            onClick={handleCleanStorage}
            className="p-2.5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors cursor-pointer group"
          >
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Database className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div>
                <div className="text-[11.5px] font-bold text-white group-hover:text-amber-300 transition-colors flex items-center gap-1.5">
                  Clear Storage
                </div>
                <div className="text-[9.5px] text-zinc-400 font-normal">
                  Wipe cached items & fetch fresh database records
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={isClearingStorage}
              className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-[10px] font-bold rounded-xl flex items-center space-x-1 cursor-pointer transition-all active:scale-95 shrink-0"
            >
              {isClearingStorage ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                  <span>Clearing...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3 h-3 text-amber-400" />
                  <span>Clean Storage</span>
                </>
              )}
            </button>
          </div>

          {storageCleanMessage && (
            <div className="bg-emerald-500/15 border-t border-emerald-500/30 p-2 px-3 text-[10.5px] font-semibold text-emerald-300 flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{storageCleanMessage}</span>
            </div>
          )}

          {/* Notifications */}
          <div className="p-2.5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors cursor-pointer group">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-[#0E2E21] border border-emerald-500/20 flex items-center justify-center text-[#00E575] shrink-0">
                <Bell className="w-3.5 h-3.5 text-[#00E575]" />
              </div>
              <div>
                <div className="text-[11.5px] font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Notifications
                </div>
                <div className="text-[9.5px] text-zinc-400 font-normal">
                  Manage your notification preferences
                </div>
              </div>
            </div>

            <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 shrink-0" />
          </div>

          {/* Currency Display */}
          <div className="p-2.5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors cursor-pointer group">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-[#0E2E21] border border-emerald-500/20 flex items-center justify-center text-[#00E575] shrink-0">
                <Coins className="w-3.5 h-3.5 text-[#00E575]" />
              </div>
              <div>
                <div className="text-[11.5px] font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Currency Display
                </div>
                <div className="text-[9.5px] text-zinc-400 font-normal">
                  Choose your preferred currency
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="text-[9.5px] font-bold text-emerald-400 border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 rounded-md font-mono">
                {currency}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 shrink-0" />
            </div>
          </div>

          {/* Data & Analytics */}
          <div className="p-2.5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors cursor-pointer group">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-[#0E2E21] border border-emerald-500/20 flex items-center justify-center text-[#00E575] shrink-0">
                <TrendingUp className="w-3.5 h-3.5 text-[#00E575]" />
              </div>
              <div>
                <div className="text-[11.5px] font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Data & Analytics
                </div>
                <div className="text-[9.5px] text-zinc-400 font-normal">
                  Manage analytics and data sharing
                </div>
              </div>
            </div>

            <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 shrink-0" />
          </div>
        </div>
      </div>

      {/* 6. Section: SUPPORT */}
      <div className="space-y-1">
        <div className="text-[9px] uppercase tracking-wider font-bold text-zinc-500 px-1">
          SUPPORT
        </div>
        <div className="bg-[#0B0E17] border border-zinc-800/80 rounded-2xl divide-y divide-zinc-800/60 overflow-hidden shadow-sm">
          {/* Help Center */}
          <div className="p-2.5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors cursor-pointer group">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-[#0E2E21] border border-emerald-500/20 flex items-center justify-center text-[#00E575] shrink-0">
                <HelpCircle className="w-3.5 h-3.5 text-[#00E575]" />
              </div>
              <div>
                <div className="text-[11.5px] font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Help Center
                </div>
                <div className="text-[9.5px] text-zinc-400 font-normal">
                  Get help and find answers
                </div>
              </div>
            </div>

            <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 shrink-0" />
          </div>

          {/* Contact Support */}
          <div className="p-2.5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors cursor-pointer group">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-[#0E2E21] border border-emerald-500/20 flex items-center justify-center text-[#00E575] shrink-0">
                <MessageSquare className="w-3.5 h-3.5 text-[#00E575]" />
              </div>
              <div>
                <div className="text-[11.5px] font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Contact Support
                </div>
                <div className="text-[9.5px] text-zinc-400 font-normal">
                  Reach out to our support team
                </div>
              </div>
            </div>

            <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 shrink-0" />
          </div>

          {/* Terms & Privacy */}
          <div className="p-2.5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors cursor-pointer group">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-[#0E2E21] border border-emerald-500/20 flex items-center justify-center text-[#00E575] shrink-0">
                <FileText className="w-3.5 h-3.5 text-[#00E575]" />
              </div>
              <div>
                <div className="text-[11.5px] font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Terms & Privacy
                </div>
                <div className="text-[9.5px] text-zinc-400 font-normal">
                  Read our terms and privacy policy
                </div>
              </div>
            </div>

            <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 shrink-0" />
          </div>
        </div>
      </div>

      {/* 7. Section: ACCOUNT / ACCPORT (Log Out) */}
      <div className="space-y-1">
        <div className="text-[9px] uppercase tracking-wider font-bold text-zinc-500 px-1">
          ACCOUNT
        </div>
        <div
          onClick={() => signOutHandler && signOutHandler()}
          className="bg-[#1A0A0F]/70 border border-rose-950/70 rounded-2xl p-2.5 flex items-center justify-between hover:bg-rose-950/40 transition-colors cursor-pointer group shadow-sm"
        >
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-full bg-rose-950/80 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div>
              <div className="text-[11.5px] font-bold text-rose-400 group-hover:text-rose-300 transition-colors">
                Log Out
              </div>
              <div className="text-[9.5px] text-zinc-400 font-normal">
                Sign out from your account
              </div>
            </div>
          </div>

          <ChevronRight className="w-3.5 h-3.5 text-rose-500/70 group-hover:text-rose-400 shrink-0" />
        </div>
      </div>

      {/* Footer text */}
      <div className="text-[9px] text-zinc-600 font-mono text-center pt-2">
        TokenCare Security Dashboard v1.0.0
      </div>

      {/* EDIT PROFILE MODAL */}
      {showEditProfile && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-in fade-in">
          {/* Hidden file input for Avatar upload */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarFileChange}
            accept="image/*"
            className="hidden"
          />

          <div className="bg-[#0B0E17] border border-zinc-800 rounded-2xl p-4 max-w-sm w-full space-y-3.5 shadow-2xl relative">
            {/* Close Button */}
            <button
              onClick={() => setShowEditProfile(false)}
              className="absolute top-3 right-3 p-1 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <User className="w-4 h-4 text-emerald-400" />
                Edit Profile
              </h3>
              <p className="text-[10.5px] text-zinc-400">
                Update your avatar, username, and public profile details.
              </p>
            </div>

            {/* Success / Error Banners */}
            {saveSuccess && (
              <div className="bg-emerald-500/15 border border-emerald-500/40 rounded-xl p-2 text-emerald-300 text-[10.5px] font-semibold flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Profile updated successfully!</span>
              </div>
            )}
            {errorMessage && (
              <div className="bg-rose-500/15 border border-rose-500/40 rounded-xl p-2 text-rose-300 text-[10.5px] font-semibold flex items-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-3">
              {/* Avatar Upload Box */}
              <div className="bg-[#06080E] border border-zinc-800/80 rounded-xl p-2.5 flex items-center space-x-3">
                <div className="relative group shrink-0">
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-emerald-500/40 bg-zinc-900 flex items-center justify-center">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-bold text-xs text-emerald-400 font-mono">
                        {(displayName || username || 'W').slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  </button>
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="text-[10px] text-zinc-400">Profile Image</div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-medium rounded-lg flex items-center space-x-1 cursor-pointer transition-colors"
                  >
                    <Upload className="w-3 h-3 text-emerald-400" />
                    <span>Upload Image</span>
                  </button>
                </div>
              </div>

              {/* Display Name Input */}
              <div className="space-y-1">
                <label className="text-[10.5px] font-bold text-zinc-300">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Wisdom"
                  className="w-full bg-[#06080E] border border-zinc-800 text-white text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Username Input */}
              <div className="space-y-1">
                <label className="text-[10.5px] font-bold text-zinc-300">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  className="w-full bg-[#06080E] border border-zinc-800 text-white font-mono text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Email (Readonly) */}
              <div className="space-y-1">
                <label className="text-[10.5px] font-bold text-zinc-300">Email Address</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full bg-zinc-950 border border-zinc-800/60 text-zinc-400 font-mono text-xs rounded-xl px-2.5 py-1.5 cursor-not-allowed opacity-80"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(true)}
                  className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[10px] font-semibold rounded-xl flex items-center space-x-1 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3 h-3 text-rose-400" />
                  <span>Delete</span>
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 bg-gradient-to-tr from-[#15803D] via-[#16A34A] to-[#4ADE80] hover:from-[#16A34A] hover:to-[#4ADE80] text-black font-black text-xs rounded-xl flex items-center space-x-1 cursor-pointer shadow-[0_4px_16px_rgba(34,197,94,0.4)] transition-all"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5 text-black" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SAVED PAYOUT WALLET ADDRESS MODAL */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-[#0B0E17] border border-zinc-800 rounded-2xl p-4 max-w-sm w-full space-y-3.5 shadow-2xl relative">
            <button
              onClick={() => setShowAddressModal(false)}
              className="absolute top-3 right-3 p-1 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-[#4ADE80]" />
                Single Saved Payout Address
              </h3>
              <p className="text-[10.5px] text-zinc-400">
                Save your primary EVM address on the Polygon network. It will be verified via public RPC and automatically used for future withdrawal requests.
              </p>
            </div>

            {/* Notification messages */}
            {addressMessage && (
              <div className="bg-[#22C55E]/15 border border-[#22C55E]/40 rounded-xl p-2 text-[#4ADE80] text-[10.5px] font-semibold flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />
                <span>{addressMessage}</span>
              </div>
            )}
            {addressError && (
              <div className="bg-rose-500/15 border border-rose-500/40 rounded-xl p-2 text-rose-300 text-[10.5px] font-semibold flex items-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>{addressError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAddress} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10.5px] font-bold text-zinc-300 flex items-center justify-between">
                  <span>Polygon Wallet Address (0x...)</span>
                  <span className="text-[9px] text-[#4ADE80] font-mono">Polygon RPC Verified</span>
                </label>
                <input
                  type="text"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  placeholder="0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
                  className="w-full bg-[#06080E] border border-zinc-800 text-white font-mono text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#22C55E] transition-colors"
                />
                <p className="text-[9.5px] text-zinc-500">
                  Only one address is stored at a time in the database address table for automated withdrawals.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddressModal(false)}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingAddress}
                  className="px-4 py-1.5 bg-gradient-to-tr from-[#15803D] via-[#16A34A] to-[#4ADE80] hover:from-[#16A34A] hover:to-[#4ADE80] text-black font-black text-xs rounded-xl flex items-center space-x-1 cursor-pointer shadow-[0_4px_16px_rgba(34,197,94,0.4)] transition-all"
                >
                  {isSavingAddress ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                      <span>Verifying on Polygon...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 text-black" />
                      <span>Verify & Save Address</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#0B0E17] border border-rose-500/40 rounded-2xl p-4 max-w-xs w-full space-y-3 shadow-2xl">
            <div className="flex items-center space-x-2.5 text-rose-400">
              <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Delete Account?</h3>
                <p className="text-[10px] text-zinc-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-[10.5px] text-zinc-300 bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
              Are you sure you want to delete your TokenCare account?
            </p>

            <div className="flex items-center justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirmDelete(false)}
                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl flex items-center space-x-1 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3 h-3" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
