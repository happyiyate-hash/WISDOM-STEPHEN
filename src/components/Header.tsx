import React from 'react';
import { ShieldCheck, Coins, Wallet, Sparkles, ChevronDown, User, LogOut } from 'lucide-react';
import { UserRewardWallet, ChainId } from '../types';
import { SUPPORTED_CHAINS, REWARD_RATE_USD } from '../constants/chains';
import { SupabaseUserProfile } from '../lib/supabase';
import { TokenCareLogo } from './TokenCareLogo';

interface HeaderProps {
  selectedChain: ChainId;
  onSelectChain: (chain: ChainId) => void;
  wallet: UserRewardWallet;
  onOpenRewardModal: () => void;
  onOpenWalletModal: () => void;
  currentUser?: any;
  userProfile?: SupabaseUserProfile | null;
  onSignOut?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  selectedChain,
  onSelectChain,
  wallet,
  onOpenRewardModal,
  onOpenWalletModal,
  currentUser,
  userProfile,
  onSignOut,
}) => {
  const currentChain = SUPPORTED_CHAINS[selectedChain];

  return (
    <header className="sticky top-0 z-40 bg-[#09090B]/90 backdrop-blur-md border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center space-x-3">
          <TokenCareLogo size="md" showText={true} />
          <span className="hidden md:inline-block text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Secure Web3 Philanthropy
          </span>
        </div>

        {/* Center/Right Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* User Profile & Sign Out Button */}
          {currentUser && (
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1 space-x-1">
              <div className="flex items-center space-x-2 px-2 py-1 text-xs text-zinc-300 font-medium">
                {userProfile?.avatar_url || currentUser.user_metadata?.avatar_url ? (
                  <img
                    src={userProfile?.avatar_url || currentUser.user_metadata?.avatar_url}
                    alt="Avatar"
                    className="w-5 h-5 rounded-full object-cover border border-emerald-500/30 shrink-0"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                    {(userProfile?.username || currentUser.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="hidden sm:inline font-semibold text-emerald-300">
                  {userProfile?.username || userProfile?.display_name || currentUser.user_metadata?.username || currentUser.email?.split('@')[0]}
                </span>
              </div>
              <button
                onClick={onSignOut}
                className="p-1.5 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Chain Selector */}
          <div className="relative group">
            <select
              value={selectedChain}
              onChange={(e) => onSelectChain(e.target.value as ChainId)}
              className="appearance-none bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs sm:text-sm font-medium pl-8 pr-7 py-2 rounded-xl border border-zinc-800 focus:outline-none focus:border-emerald-500 cursor-pointer transition-colors"
            >
              {Object.values(SUPPORTED_CHAINS).map((chain) => (
                <option key={chain.id} value={chain.id} className="bg-zinc-900 text-zinc-200">
                  {chain.name}
                </option>
              ))}
            </select>
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none">
              {currentChain.icon}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Reward Balance Pill */}
          <button
            onClick={onOpenRewardModal}
            className="flex items-center space-x-2 bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-emerald-500/10 hover:from-amber-500/20 hover:to-emerald-500/20 border border-amber-500/30 text-amber-300 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all group shadow-sm cursor-pointer"
          >
            <Coins className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <span>
              {wallet?.unclaimedTokens ?? 0} REWARD{' '}
              <span className="text-zinc-400 text-xs font-normal">
                (${ ((wallet?.unclaimedTokens ?? 0) * REWARD_RATE_USD).toFixed(3) })
              </span>
            </span>
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse hidden sm:block" />
          </button>

          {/* Wallet Button */}
          <button
            onClick={onOpenWalletModal}
            className="flex items-center space-x-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer"
          >
            <Wallet className="w-4 h-4 text-zinc-400" />
            <span className="hidden md:inline">
              {wallet?.isConnected && wallet?.walletAddress
                ? `${wallet.walletAddress.slice(0, 6)}...${wallet.walletAddress.slice(-4)}`
                : 'Connect Wallet'}
            </span>
            <span className="md:hidden">Wallet</span>
          </button>
        </div>
      </div>
    </header>
  );
};
