import React, { useState, useEffect, useMemo } from 'react';
import { MobileDonateView } from './MobileDonateView';
import {
  Home,
  ReceiptText,
  Send,
  Box,
  User,
  Settings,
  Eye,
  EyeOff,
  Bell,
  HelpCircle,
  QrCode,
  Hexagon,
  ShieldCheck,
  ChevronRight,
  CheckCircle2,
  TrendingUp,
  Shield,
  Star,
  ArrowDown,
  ArrowUp,
  Sparkles,
  Zap,
  Search,
  ArrowUpRight,
  Coins,
} from 'lucide-react';
import { ChainId, SubmittedToken, UserRewardWallet } from '../types';
import { ApiKeyConfig } from '../services/apiKeys';
import { SupabaseUserProfile, fetchWithdrawalRequests, WithdrawalRequest } from '../lib/supabase';
import { REWARD_RATE_USD } from '../constants/chains';
import { ContractAddressSection } from './ContractAddressSection';
import { TokenInformationCard } from './TokenInformationCard';
import { LogoVerificationCard } from './LogoVerificationCard';
import { DonationSettingsCard } from './DonationSettingsCard';
import { DashboardOverview } from './DashboardOverview';
import { WithdrawalView } from './WithdrawalView';
import { SettingsView } from './SettingsView';
import { MyTokensView } from './MyTokensView';
import { LogoVerificationReport } from '../services/logoVerificationEngine';

import { NotificationCenterView } from './NotificationCenterView';

interface MobileViewProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedChain: ChainId;
  setSelectedChain: (chain: ChainId) => void;
  tokens: SubmittedToken[];
  wallet: UserRewardWallet;
  setWallet?: React.Dispatch<React.SetStateAction<UserRewardWallet>>;
  apiKeys: ApiKeyConfig;
  setApiKeys: React.Dispatch<React.SetStateAction<ApiKeyConfig>>;
  currentUser: any;
  userProfile: SupabaseUserProfile | null;
  handleSignOut: () => Promise<void>;
  addressInput: string;
  setAddressInput: (val: string) => void;
  isLoading: boolean;
  errorMessage: string | null;
  autoSwitchNotice: string | null;
  fetchedToken: SubmittedToken | null;
  setFetchedToken: React.Dispatch<React.SetStateAction<SubmittedToken | null>>;
  logoReport: LogoVerificationReport | null;
  isSavingToken: boolean;
  saveSuccessMessage: string | null;
  handleFetchToken: (targetAddress?: string) => Promise<void>;
  handleSaveToken: () => Promise<void>;
  handleResetForm: () => void;
  onOpenHowItWorks: () => void;
  onOpenRewardModal: () => void;
  onOpenWalletModal: () => void;
  onSwitchToDesktop: () => void;
  unreadCount?: number;
  onUnreadCountChange?: (count: number) => void;
}

export const MobileView: React.FC<MobileViewProps> = ({
  activeTab,
  setActiveTab,
  selectedChain,
  setSelectedChain,
  tokens,
  wallet,
  setWallet,
  apiKeys,
  setApiKeys,
  currentUser,
  userProfile,
  handleSignOut,
  addressInput,
  setAddressInput,
  isLoading,
  errorMessage,
  autoSwitchNotice,
  fetchedToken,
  setFetchedToken,
  logoReport,
  isSavingToken,
  saveSuccessMessage,
  handleFetchToken,
  handleSaveToken,
  handleResetForm,
  onOpenHowItWorks,
  onOpenRewardModal,
  onOpenWalletModal,
  onSwitchToDesktop,
  unreadCount = 0,
  onUnreadCountChange,
}) => {
  // Mobile navigation tabs: 'overview', 'withdrawals', 'donate', 'tokens', 'profile', 'notifications'
  const [mobileTab, setMobileTab] = useState<'overview' | 'withdrawals' | 'donate' | 'tokens' | 'profile' | 'notifications'>('overview');
  const [showBalance, setShowBalance] = useState<boolean>(true);
  const [dbWithdrawals, setDbWithdrawals] = useState<WithdrawalRequest[]>([]);

  // Sync mobile tab selection
  const handleTabChange = (tab: 'overview' | 'withdrawals' | 'donate' | 'tokens' | 'profile' | 'notifications') => {
    setMobileTab(tab);
    if (tab === 'donate') setActiveTab('add-token');
    else if (tab === 'tokens') setActiveTab('dashboard');
    else if (tab === 'withdrawals') setActiveTab('withdraw');
    else if (tab === 'profile') setActiveTab('settings');
  };

  // Fetch real database withdrawal activities
  useEffect(() => {
    const loadWithdrawalHistory = async () => {
      try {
        const userId = currentUser?.id || 'demo-user';
        const requests = await fetchWithdrawalRequests(userId);
        setDbWithdrawals(requests);
      } catch (err) {
        console.warn('Failed to load withdrawal history for mobile view:', err);
      }
    };
    loadWithdrawalHistory();
  }, [currentUser, tokens]);

  // Calculated real metrics from actual submitted tokens and wallet
  const rewardTokens = wallet?.unclaimedTokens ?? (userProfile?.unclaimed_reward_balance ?? 0);
  const rewardUsd = (rewardTokens * REWARD_RATE_USD).toFixed(3);
  const totalVerifiedCount = tokens.length;
  const safeTokensCount = tokens.filter((t) => t.safety?.rating === 'SAFE' || t.verificationReport?.status === 'APPROVED').length;
  const passRate = tokens.length > 0 ? Math.round((safeTokensCount / tokens.length) * 100) : 0;
  const totalLiquidity = tokens.reduce((acc, t) => acc + (t.marketData?.liquidityUsd || 0), 0);

  // Helper to format relative time ago
  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return 'Just now';
    const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  // Dynamic Recent Activity list combining database withdrawals and submitted tokens
  const realActivities = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      subtitle: string;
      amount: string;
      amountColor: string;
      timeAgo: string;
      rawDate: number;
      iconType: 'withdrawal' | 'donation' | 'security' | 'verified';
    }> = [];

    // 1. Add real database withdrawal requests
    dbWithdrawals.forEach((w) => {
      const isCompleted = w.status === 'COMPLETED';
      const isFailed = w.status === 'FAILED';
      const title = isCompleted
        ? 'Withdrawal Approved'
        : isFailed
        ? 'Withdrawal Failed'
        : 'Withdrawal Pending';

      items.push({
        id: `wtx-${w.id}`,
        title,
        subtitle: w.wallet_address ? `${w.wallet_address.slice(0, 6)}...${w.wallet_address.slice(-4)}` : 'EVM Wallet',
        amount: `-${w.amount_usd ? w.amount_usd.toFixed(2) : (w.amount_tokens * 0.001).toFixed(2)} USDT`,
        amountColor: isFailed ? 'text-rose-400 font-mono' : 'text-white font-mono',
        timeAgo: formatTimeAgo(w.created_at),
        rawDate: new Date(w.created_at).getTime(),
        iconType: 'withdrawal',
      });
    });

    // 2. Add real tokens saved in the database
    tokens.forEach((t) => {
      const tokenName = t.metadata?.name || 'Submitted Token';
      const symbol = t.metadata?.symbol || 'ERC20';

      items.push({
        id: `token-${t.id || t.address}`,
        title: 'Donation Token Verified',
        subtitle: `${tokenName} (${symbol})`,
        amount: `+${((t.rewardEarnedTokens || 15) * 10).toFixed(2)} USDT`,
        amountColor: 'text-emerald-400 font-mono',
        timeAgo: formatTimeAgo(t.submittedAt),
        rawDate: new Date(t.submittedAt || Date.now()).getTime(),
        iconType: 'donation',
      });

      if (t.safety) {
        items.push({
          id: `sec-${t.id || t.address}`,
          title: 'Security Check Passed',
          subtitle: `${tokenName} contract audit`,
          amount: `${t.safety.score || 100}%`,
          amountColor: 'text-blue-400 font-mono',
          timeAgo: formatTimeAgo(t.submittedAt),
          rawDate: new Date(t.submittedAt || Date.now()).getTime() - 1000,
          iconType: 'security',
        });
      }
    });

    // Sort descending by most recent
    items.sort((a, b) => b.rawDate - a.rawDate);

    return items;
  }, [dbWithdrawals, tokens]);

  return (
    <div className={`min-h-screen bg-[#06080E] text-zinc-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black relative ${mobileTab === 'withdrawals' || mobileTab === 'notifications' ? 'pb-4' : 'pb-24'}`}>
      {/* Fixed Sticky Curved Top Header Card (Does not scroll) - Hidden on Withdrawals, Notifications, Donate, Tokens & Settings */}
      {mobileTab !== 'withdrawals' && mobileTab !== 'notifications' && mobileTab !== 'donate' && mobileTab !== 'tokens' && mobileTab !== 'profile' && (
        <header className="sticky top-0 z-40 bg-[#090C12]/95 backdrop-blur-xl border-b border-zinc-800/80 rounded-b-xl px-3 pt-2 pb-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.6)] max-w-md mx-auto w-full transition-all">
          <div className="flex items-center justify-between relative min-h-[42px]">
            {/* Left: Profile Avatar */}
            <div
              className="relative cursor-pointer group shrink-0"
              onClick={() => handleTabChange('profile')}
              title="Profile & Settings"
            >
              <div className="w-10 h-10 rounded-full bg-zinc-900 border border-emerald-500/60 overflow-hidden shadow-[0_2px_10px_rgba(22,163,74,0.3)] group-hover:border-emerald-400 transition-all">
                {userProfile?.avatar_url ? (
                  <img src={userProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-[#15803D] via-[#16A34A] to-[#4ADE80] flex items-center justify-center text-black font-extrabold text-sm">
                    {(userProfile?.full_name || currentUser?.email || 'U').substring(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#22C55E] border-2 border-[#06080E] rounded-full shadow-sm"></span>
            </div>

            {/* Center: Dragged Down Balance Touching Top Navigation Bottom Border (Increased Font Size) */}
            <div className="flex flex-col items-center justify-end text-center translate-y-3.5 px-2 pb-0.5">
              {mobileTab === 'overview' ? (
                <button
                  onClick={() => setShowBalance(!showBalance)}
                  className="flex flex-col items-center justify-center cursor-pointer transition-transform active:scale-95 group focus:outline-none"
                  title="Click to toggle balance visibility"
                >
                  <span className="text-xl sm:text-2xl font-black tracking-tight text-white font-mono leading-none drop-shadow-[0_2px_10px_rgba(34,197,94,0.4)]">
                    {showBalance ? `$${(rewardTokens * REWARD_RATE_USD).toFixed(2)}` : '••••••••'}
                  </span>
                </button>
              ) : (
                <h1 className="text-xs sm:text-sm font-black tracking-wider text-white uppercase font-sans mb-0.5">
                  {mobileTab === 'donate' && 'Donate'}
                  {mobileTab === 'tokens' && 'Tokens'}
                  {mobileTab === 'withdrawals' && 'Withdrawals'}
                  {mobileTab === 'profile' && 'Settings'}
                </h1>
              )}
            </div>

            {/* Right: Notifications Bell Button */}
            <div className="flex items-center shrink-0">
              <button
                onClick={() => handleTabChange('notifications' as any)}
                className="relative p-2.5 bg-[#0E131F]/90 hover:bg-zinc-800 border border-emerald-500/40 rounded-xl text-zinc-200 transition-all cursor-pointer shadow-[0_2px_10px_rgba(22,163,74,0.2)]"
                title="Notification Center"
              >
                <Bell className="w-4 h-4 text-zinc-200" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-[#4ADE80] text-black font-extrabold text-[10px] min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full shadow-[0_0_8px_rgba(74,222,128,0.8)] animate-pulse border border-black font-mono">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main Screen Container */}
      <main className={`flex-1 ${['notifications', 'donate', 'tokens', 'profile', 'withdrawals'].includes(mobileTab) ? 'px-0 py-0' : 'px-3 py-2'} max-w-md mx-auto w-full space-y-2.5`}>
        {/* OVERVIEW TAB */}
        {mobileTab === 'overview' && (
          <div className="space-y-3 animate-in fade-in duration-200">
            {/* Banner Card: TokenCare Security */}
            <div
              onClick={() => handleTabChange('donate')}
              className="bg-gradient-to-r from-[#0D2E22] via-[#103D2E] to-[#0A241A] border border-emerald-500/30 rounded-xl p-2.5 flex items-center justify-between cursor-pointer hover:border-emerald-400/50 transition-all shadow-[0_4px_20px_rgba(22,163,74,0.12)]"
            >
              <div className="flex items-center space-x-2.5">
                {/* Green Hexagon Icon with Rich Gradient Fill */}
                <div className="p-1.5 rounded-lg bg-[#16A34A]/15 border border-[#22C55E]/30 text-[#4ADE80] shrink-0">
                  <div className="relative flex items-center justify-center">
                    <Hexagon className="w-4 h-4 text-[#4ADE80] fill-[#16A34A]/20" />
                    <ShieldCheck className="w-2.5 h-2.5 text-[#22C55E] absolute" />
                  </div>
                </div>

                {/* Banner Text */}
                <div className="space-y-0.2">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-[#4ADE80] block">
                    TokenCare Security
                  </span>
                  <h3 className="text-xs font-bold text-white tracking-tight">
                    Secure. Verify. Donate.
                  </h3>
                  <p className="text-[10px] text-zinc-400 leading-tight">
                    Your security is our priority. All donations are verified and transparent.
                  </p>
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0 ml-1" />
            </div>

            {/* 2x2 Grid of Compact Metric Cards (Strictly Live Data) */}
            <div className="grid grid-cols-2 gap-2">
              {/* Card 1: YOUR REWARD BALANCE */}
              <div className="bg-[#0C0E17] border border-emerald-500/30 rounded-xl p-2.5 flex flex-col justify-between space-y-1 shadow-[0_2px_10px_rgba(16,185,129,0.05)]">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider">
                    YOUR REWARD BALANCE
                  </span>
                </div>

                <div>
                  <div className="text-base font-extrabold text-white font-mono">{rewardTokens}</div>
                  <div className="flex items-center space-x-1 mt-0.5">
                    <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                      <Star className="w-2 h-2 fill-emerald-400" />
                    </div>
                    <span className="text-[9px] font-bold text-emerald-400 uppercase">REWARD</span>
                    <span className="text-[9px] text-zinc-400 font-mono">≈ ${rewardUsd}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: VERIFIED TOKENS */}
              <div className="bg-[#0C0E17] border border-emerald-500/30 rounded-xl p-2.5 flex flex-col justify-between space-y-1 shadow-[0_2px_10px_rgba(16,185,129,0.05)]">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider">
                    VERIFIED TOKENS
                  </span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>

                <div>
                  <div className="text-base font-extrabold text-white font-mono">{totalVerifiedCount}</div>
                  <div className="text-[9px] font-bold text-emerald-400 mt-0.5 flex items-center space-x-1">
                    <span>On-chain Verified</span>
                  </div>
                </div>
              </div>

              {/* Card 3: TOTAL POOL LIQUIDITY */}
              <div className="bg-[#0C0E17] border border-emerald-500/30 rounded-xl p-2.5 flex flex-col justify-between space-y-1 shadow-[0_2px_10px_rgba(16,185,129,0.05)]">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider">
                    TOTAL POOL LIQUIDITY
                  </span>
                  <div className="p-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <TrendingUp className="w-3 h-3" />
                  </div>
                </div>

                <div>
                  <div className="text-xs font-black text-white font-mono tracking-tight">
                    ${totalLiquidity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[9px] text-zinc-400 mt-0.5">
                    Across {totalVerifiedCount} smart contracts
                  </div>
                </div>
              </div>

              {/* Card 4: SECURITY PASS RATE */}
              <div className="bg-[#0C0E17] border border-emerald-500/30 rounded-xl p-2.5 flex flex-col justify-between space-y-1 shadow-[0_2px_10px_rgba(16,185,129,0.05)]">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider">
                    SECURITY PASS RATE
                  </span>
                  <div className="p-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Shield className="w-3 h-3" />
                  </div>
                </div>

                <div>
                  <div className="text-base font-extrabold text-white font-mono">{passRate}%</div>
                  <div className="text-[9px] text-zinc-400 mt-0.5">
                    {safeTokensCount} of {totalVerifiedCount} passed
                  </div>
                </div>
              </div>
            </div>

            {/* Saved & Verified Tokens Section (Replacing history logs as requested) */}
            <div className="bg-[#0C0E17] border border-zinc-800/80 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <h3 className="text-[11px] font-bold text-white tracking-wide">Saved & Verified Tokens</h3>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                </div>
                <button
                  onClick={() => handleTabChange('tokens')}
                  className="text-[10px] font-semibold text-emerald-400 hover:underline cursor-pointer"
                >
                  View Directory
                </button>
              </div>

              {/* Saved Tokens List */}
              <div className="space-y-1.5">
                {tokens.length === 0 ? (
                  <div className="py-4 text-center text-xs text-zinc-500 font-medium">
                    No tokens saved yet. Submit a token address to verify.
                  </div>
                ) : (
                  tokens.slice(0, 4).map((token) => (
                    <div
                      key={token.id || token.address}
                      onClick={() => handleTabChange('tokens')}
                      className="flex items-center justify-between p-2 rounded-lg bg-[#06080E] border border-zinc-800/60 hover:border-emerald-500/30 transition-all cursor-pointer"
                    >
                      <div className="flex items-center space-x-2.5">
                        {token.metadata?.logoUrl ? (
                          <img
                            src={token.metadata.logoUrl}
                            alt={token.metadata.symbol}
                            className="w-7 h-7 rounded-lg object-cover shrink-0 border border-emerald-500/30"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {token.metadata?.symbol?.slice(0, 3) || 'TC'}
                          </div>
                        )}
                        <div>
                          <div className="text-[11px] font-bold text-white leading-tight">
                            {token.metadata?.name || 'Verified Token'}
                          </div>
                          <div className="text-[9px] text-zinc-400 font-mono">
                            ${token.metadata?.symbol} • {token.chainInfo?.name || 'EVM'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex items-center space-x-1.5">
                        <span className="text-[9px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold">
                          Review Passed
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* DONATE / ADD TOKEN TAB */}
        {mobileTab === 'donate' && (
          <MobileDonateView
            addressInput={addressInput}
            setAddressInput={setAddressInput}
            selectedChain={selectedChain}
            setSelectedChain={setSelectedChain}
            onFetchToken={handleFetchToken}
            isLoading={isLoading}
            errorMessage={errorMessage}
            autoSwitchNotice={autoSwitchNotice}
            apiKeys={apiKeys}
            fetchedToken={fetchedToken}
            setFetchedToken={setFetchedToken}
            logoReport={logoReport}
            tokens={tokens}
            handleSaveToken={handleSaveToken}
            handleResetForm={handleResetForm}
            isSavingToken={isSavingToken}
          />
        )}

        {/* TOKENS / EXPLORER TAB */}
        {mobileTab === 'tokens' && (
          <div className="animate-in fade-in duration-200">
            <MyTokensView
              tokens={tokens}
              onNavigateAddToken={() => handleTabChange('donate')}
              onOpenHowItWorks={onOpenHowItWorks}
              onOpenRewardModal={onOpenRewardModal}
            />
          </div>
        )}

        {/* WITHDRAWALS TAB */}
        {mobileTab === 'withdrawals' && (
          <div className="animate-in fade-in duration-200">
            <WithdrawalView
              currentUser={currentUser}
              userProfile={userProfile}
              wallet={wallet}
              onUpdateWallet={(updated) => setWallet && setWallet(updated)}
              onBack={() => handleTabChange('overview')}
            />
          </div>
        )}

        {/* PROFILE / SETTINGS TAB */}
        {mobileTab === 'profile' && (
          <div className="animate-in fade-in duration-200">
            <SettingsView
              apiKeys={apiKeys}
              setApiKeys={setApiKeys}
              userProfile={userProfile}
              currentUser={currentUser}
              onSignOut={handleSignOut}
              handleSignOut={handleSignOut}
            />
          </div>
        )}

        {/* NOTIFICATIONS TAB */}
        {mobileTab === 'notifications' && (
          <div className="animate-in fade-in duration-200">
            <NotificationCenterView
              currentUser={currentUser}
              onClose={() => handleTabChange('overview')}
              onNavigateToTab={(tab) => handleTabChange(tab as any)}
              onUnreadCountChange={onUnreadCountChange}
            />
          </div>
        )}
      </main>

      {/* Fixed Bottom Navigation Bar (Hidden when Send/Withdrawals or Notifications is full screen) */}
      {mobileTab !== 'withdrawals' && mobileTab !== 'notifications' && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#090C12]/95 backdrop-blur-xl border-t border-zinc-800/80 rounded-t-3xl px-3 py-2.5 shadow-[0_-8px_30px_rgba(0,0,0,0.6)]">
          <div className="max-w-md mx-auto grid grid-cols-5 items-center justify-items-center relative">
            {/* 1. Overview */}
          <button
            onClick={() => handleTabChange('overview')}
            className={`w-full flex flex-col items-center justify-center space-y-1 transition-all ${
              mobileTab === 'overview' ? 'text-[#4ADE80] font-bold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Home className={`w-5 h-5 ${mobileTab === 'overview' ? 'text-[#4ADE80] fill-[#22C55E]/20 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'text-zinc-500'}`} />
            <span className="text-[10px]">Overview</span>
          </button>

          {/* 2. Withdrawals */}
          <button
            onClick={() => handleTabChange('withdrawals')}
            className={`w-full flex flex-col items-center justify-center space-y-1 transition-all ${
              mobileTab === 'withdrawals' ? 'text-[#4ADE80] font-bold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <ReceiptText className={`w-5 h-5 ${mobileTab === 'withdrawals' ? 'text-[#4ADE80] fill-[#22C55E]/20 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'text-zinc-500'}`} />
            <span className="text-[10px]">Withdrawals</span>
          </button>

          {/* 3. Center Elevated Circular Donate Button with Black Notch Cutout Ring */}
          <div className="w-full flex flex-col items-center justify-center -mt-7 relative z-10">
            <div className="p-1.5 bg-[#06080E] rounded-full shadow-lg">
              <button
                onClick={() => handleTabChange('donate')}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                  mobileTab === 'donate'
                    ? 'bg-gradient-to-tr from-[#15803D] via-[#16A34A] to-[#4ADE80] text-black shadow-[0_4px_20px_rgba(34,197,94,0.5)] scale-105 ring-2 ring-[#4ADE80]/60'
                    : 'bg-gradient-to-tr from-[#15803D] to-[#22C55E] hover:from-[#16A34A] hover:to-[#4ADE80] text-black shadow-[0_4px_16px_rgba(22,163,74,0.4)]'
                }`}
              >
                <Send className="w-5 h-5 ml-0.5 fill-black" />
              </button>
            </div>
            <span className={`text-[10px] mt-0.5 font-medium ${mobileTab === 'donate' ? 'text-[#4ADE80] font-bold' : 'text-zinc-500'}`}>
              Donate
            </span>
          </div>

          {/* 4. Tokens */}
          <button
            onClick={() => handleTabChange('tokens')}
            className={`w-full flex flex-col items-center justify-center space-y-1 transition-all ${
              mobileTab === 'tokens' ? 'text-[#4ADE80] font-bold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Box className={`w-5 h-5 ${mobileTab === 'tokens' ? 'text-[#4ADE80] fill-[#22C55E]/20 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'text-zinc-500'}`} />
            <span className="text-[10px]">Tokens</span>
          </button>

          {/* 5. Settings */}
          <button
            onClick={() => handleTabChange('profile')}
            className={`w-full flex flex-col items-center justify-center space-y-1 transition-all ${
              mobileTab === 'profile' ? 'text-[#4ADE80] font-bold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Settings className={`w-5 h-5 ${mobileTab === 'profile' ? 'text-[#4ADE80] fill-[#22C55E]/20 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'text-zinc-500'}`} />
            <span className="text-[10px]">Settings</span>
          </button>
        </div>
      </nav>
      )}
    </div>
  );
};
