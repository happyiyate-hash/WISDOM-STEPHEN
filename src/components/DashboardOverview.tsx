import React from 'react';
import {
  Coins,
  Heart,
  Users,
  ShieldCheck,
  TrendingUp,
  ArrowUpRight,
  Sparkles,
  ExternalLink,
  PlusCircle,
  CheckCircle2,
  Lock,
  Zap,
} from 'lucide-react';
import { SubmittedToken, UserRewardWallet } from '../types';
import { REWARD_RATE_USD } from '../constants/chains';

interface DashboardOverviewProps {
  tokens: SubmittedToken[];
  wallet?: UserRewardWallet;
  onNavigateAddToken: () => void;
  onSelectToken?: (token: SubmittedToken) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  tokens,
  wallet,
  onNavigateAddToken,
  onSelectToken,
}) => {
  const safeTokensCount = tokens.filter((t) => t.safety?.rating === 'SAFE').length;
  const totalLiquidityPool = tokens.reduce((acc, t) => acc + (t.marketData?.liquidityUsd || 0), 0);
  const passRate = tokens.length > 0 ? Math.round((safeTokensCount / tokens.length) * 100) : 100;
  const userRewardUsd = (wallet?.unclaimedTokens || 0) * REWARD_RATE_USD;

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-950/70 via-zinc-900 to-zinc-900 border border-emerald-500/30 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2 max-w-xl">
            <span className="inline-flex items-center space-x-1.5 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-3 py-0.5 rounded-full text-[11px] font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>TokenCare Security Dashboard</span>
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Discover. Verify. Donate.
            </h1>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              Secure Web3 Donations Made Simple. Verify smart contract integrity, evaluate DEX liquidity, inspect automated honeypot checks, and support transparent crypto philanthropy.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={onNavigateAddToken}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 stroke-[2.5]" />
              <span>Add Token for Verification</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Platform Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: User Reward Balance */}
        <div className="bg-[#0B0E17]/90 border border-zinc-800/90 p-4 rounded-2xl space-y-1 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Your Reward Balance</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-400 font-mono">
            {wallet?.unclaimedTokens || 0} REWARD
          </div>
          <div className="text-[10px] text-zinc-300 font-mono font-semibold">
            ≈ ${userRewardUsd.toFixed(3)} USD ({wallet?.totalTokens || 0} Lifetime)
          </div>
        </div>

        {/* Card 2: Verified Tokens */}
        <div className="bg-[#0B0E17]/90 border border-zinc-800/90 p-4 rounded-2xl space-y-1 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Verified Tokens</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {tokens.length}
          </div>
          <div className="text-[10px] text-emerald-400 font-semibold">
            {tokens.filter((t) => t.verified !== false).length} On-Chain Verified
          </div>
        </div>

        {/* Card 3: Total Directory DEX Liquidity */}
        <div className="bg-[#0B0E17]/90 border border-zinc-800/90 p-4 rounded-2xl space-y-1 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Total Pool Liquidity</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            ${totalLiquidityPool > 0 ? totalLiquidityPool.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </div>
          <div className="text-[10px] text-zinc-400 font-medium">
            Across {tokens.length} smart contracts
          </div>
        </div>

        {/* Card 4: Security Pass Rate */}
        <div className="bg-[#0B0E17]/90 border border-zinc-800/90 p-4 rounded-2xl space-y-1 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Security Pass Rate</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">{passRate}%</div>
          <div className="text-[10px] text-zinc-400 font-medium">
            {safeTokensCount} of {tokens.length} passed safety checks
          </div>
        </div>
      </div>

      {/* Verified Tokens Directory List */}
      <div className="bg-[#0B0E17]/90 border border-zinc-800/90 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Verified Donation Directory
              <span className="text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                {tokens.length} Active
              </span>
            </h2>
            <p className="text-xs text-zinc-400">Explore vetted smart contract entries eligible for crypto donations.</p>
          </div>
          <button
            onClick={onNavigateAddToken}
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 cursor-pointer transition-colors"
          >
            <span>+ Submit New Address</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tokens.map((token) => (
            <div
              key={token.id}
              onClick={() => onSelectToken(token)}
              className="bg-[#06080F] border border-zinc-800/80 hover:border-emerald-500/40 p-3.5 rounded-xl space-y-2.5 cursor-pointer transition-all hover:scale-[1.01] group shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  {token.metadata.logoUrl ? (
                    <img
                      src={token.metadata.logoUrl}
                      alt={token.metadata.symbol}
                      className="w-9 h-9 rounded-xl object-cover shrink-0 border border-emerald-500/30 shadow-sm"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center font-bold text-xs text-purple-400 shrink-0">
                      {token.metadata.symbol.slice(0, 3)}
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-white text-xs group-hover:text-emerald-400 transition-colors">
                      {token.metadata.name}
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono">${token.metadata.symbol}</div>
                  </div>
                </div>

                <span className="text-[9px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                  TokenCare Verified
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-2 border-t border-zinc-800/60 font-mono">
                <span className="text-zinc-400">Price:</span>
                <span className="text-white font-bold">
                  ${token.marketData.priceUsd < 0.0001
                    ? token.marketData.priceUsd.toExponential(2)
                    : token.marketData.priceUsd.toFixed(4)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
