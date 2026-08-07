import React, { useState } from 'react';
import {
  Bell,
  HelpCircle,
  Box,
  Search,
  SlidersHorizontal,
  CheckCircle2,
  ChevronRight,
  PlusCircle,
  Sparkles,
} from 'lucide-react';
import { SubmittedToken } from '../types';

interface MyTokensViewProps {
  tokens: SubmittedToken[];
  onNavigateAddToken: () => void;
  onSelectToken?: (token: SubmittedToken) => void;
  onOpenHowItWorks?: () => void;
  onOpenRewardModal?: () => void;
}

// Default sample tokens matching user screenshot if directory is empty or sparse
const DEFAULT_SAMPLE_TOKENS: Array<{
  id: string;
  name: string;
  symbol: string;
  chain: string;
  logoUrl: string;
  amountFormatted: string;
  usdValueFormatted: string;
  date: string;
  verified: boolean;
}> = [
  {
    id: 'sample-1',
    name: 'SuperVerse',
    symbol: 'SUPER',
    chain: 'Polygon',
    logoUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/assets/0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174/logo.png',
    amountFormatted: '2,450.75 SUPER',
    usdValueFormatted: '$4,250.25',
    date: 'May 18, 2025',
    verified: true,
  },
  {
    id: 'sample-2',
    name: 'DogeCare Token',
    symbol: 'DOGECARE',
    chain: 'Polygon',
    logoUrl: 'https://images.unsplash.com/photo-1622979135225-d2ba269bc1bd?auto=format&fit=crop&w=120&q=80',
    amountFormatted: '5,000.00 DOGECARE',
    usdValueFormatted: '$2,125.50',
    date: 'May 17, 2025',
    verified: true,
  },
  {
    id: 'sample-3',
    name: 'Wave Protocol',
    symbol: 'WAVE',
    chain: 'Polygon',
    logoUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=120&q=80',
    amountFormatted: '1,200.00 WAVE',
    usdValueFormatted: '$1,980.00',
    date: 'May 16, 2025',
    verified: true,
  },
  {
    id: 'sample-4',
    name: 'BlockTrust',
    symbol: 'BTRUST',
    chain: 'Polygon',
    logoUrl: 'https://images.unsplash.com/photo-1622979135240-caa6648190b6?auto=format&fit=crop&w=120&q=80',
    amountFormatted: '3,750.00 BTRUST',
    usdValueFormatted: '$1,875.00',
    date: 'May 15, 2025',
    verified: true,
  },
  {
    id: 'sample-5',
    name: 'Nexa Token',
    symbol: 'NEXA',
    chain: 'Polygon',
    logoUrl: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=120&q=80',
    amountFormatted: '4,100.00 NEXA',
    usdValueFormatted: '$1,640.00',
    date: 'May 14, 2025',
    verified: true,
  },
  {
    id: 'sample-6',
    name: 'LinkLayer',
    symbol: 'LAYER',
    chain: 'Polygon',
    logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&q=80',
    amountFormatted: '2,800.00 LAYER',
    usdValueFormatted: '$1,120.00',
    date: 'May 13, 2025',
    verified: true,
  },
];

export const MyTokensView: React.FC<MyTokensViewProps> = ({
  tokens,
  onNavigateAddToken,
  onSelectToken,
  onOpenHowItWorks,
  onOpenRewardModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState(false);

  // Merge real user tokens with default screenshot tokens if list is small
  const mappedRealTokens = tokens.map((t, idx) => ({
    id: t.id,
    name: t.metadata.name,
    symbol: t.metadata.symbol,
    chain: t.metadata.chainId === '137' ? 'Polygon' : t.metadata.chainId === '1' ? 'Ethereum' : 'EVM Chain',
    logoUrl: t.metadata.logoUrl,
    amountFormatted: `1,000.00 ${t.metadata.symbol}`,
    usdValueFormatted: `$${(t.marketData?.marketCapUsd ? (t.marketData.marketCapUsd / 10000000).toFixed(2) : '1,250.00')}`,
    date: new Date(t.submittedAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    verified: t.verified !== false,
    rawToken: t,
  }));

  const displayList = mappedRealTokens.length > 0 ? mappedRealTokens : DEFAULT_SAMPLE_TOKENS;

  // Filter list by searchQuery
  const filteredTokens = displayList.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.chain.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalTokenCount = displayList.length;

  return (
    <div className="space-y-3.5 text-white font-sans animate-in fade-in duration-200 pb-2 -mt-2 min-h-screen flex flex-col">
      {/* STICKY TOP NAVIGATION HEADER FOR MY TOKENS PAGE */}
      <header className="sticky top-0 z-40 bg-[#090C12]/95 backdrop-blur-xl border-b border-[#22C55E]/30 rounded-b-2xl p-2.5 shadow-[0_4px_25px_rgba(0,0,0,0.7)] max-w-md mx-auto w-full transition-all">
        <div className="flex items-center justify-between">
          {/* Left Metric: Icon + Total Tokens Added */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-[#15803D]/20 border border-[#22C55E]/40 flex items-center justify-center text-[#4ADE80] shrink-0">
              <Box className="w-4 h-4 text-[#4ADE80]" />
            </div>

            <div>
              <div className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Total Tokens</div>
              <div className="text-xs font-black text-white tracking-tight flex items-center gap-1">
                <span>{totalTokenCount} Added</span>
                <span className="text-[8px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1 rounded font-mono">
                  Verified
                </span>
              </div>
            </div>
          </div>

          {/* Right Metric: Total Value (USD) + Quick Add Button */}
          <div className="flex items-center space-x-2.5">
            <div className="text-right">
              <div className="text-[8.5px] text-zinc-400 font-bold uppercase tracking-wider">Total Value</div>
              <div className="text-xs font-black text-white font-mono tracking-tight">
                $12,450.75
              </div>
            </div>

            <button
              type="button"
              onClick={onNavigateAddToken}
              className="p-2 bg-[#22C55E] hover:bg-[#16A34A] text-black rounded-xl font-bold transition-all shadow-[0_2px_10px_rgba(34,197,94,0.3)] cursor-pointer shrink-0 flex items-center space-x-1"
              title="Add New Token"
            >
              <PlusCircle className="w-4 h-4 fill-black/20" />
              <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">Add</span>
            </button>
          </div>
        </div>
      </header>

      {/* BODY CONTENT BELOW HEADER */}
      <div className="px-3 space-y-2.5 flex-1">
        {/* 2. Search and Filter Row (Reduced Height & Text) */}
        <div className="flex items-center space-x-1.5">
          {/* Search Field */}
          <div className="flex-1 bg-[#0B0E17] border border-zinc-800/80 rounded-xl px-2.5 py-1.5 flex items-center space-x-2 focus-within:border-[#22C55E]/50 transition-colors">
            <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search verified tokens..."
              className="w-full bg-transparent text-white text-[10.5px] placeholder:text-zinc-500 focus:outline-none"
            />
          </div>

          {/* Filter Button */}
          <button
            type="button"
            onClick={() => setFilterActive(!filterActive)}
            className={`px-2.5 py-1.5 bg-[#0B0E17] hover:bg-zinc-800/80 border rounded-xl text-[10.5px] font-semibold flex items-center space-x-1 transition-colors cursor-pointer shrink-0 ${
              filterActive ? 'border-[#22C55E]/60 text-[#4ADE80] bg-[#22C55E]/10' : 'border-zinc-800/80 text-zinc-300'
            }`}
          >
            <SlidersHorizontal className="w-3 h-3 text-zinc-400" />
            <span>Filter</span>
          </button>
        </div>

        {/* 3. Token Cards List (Compact Sizing) */}
        <div className="space-y-2">
          {filteredTokens.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                if (item.rawToken && onSelectToken) {
                  onSelectToken(item.rawToken);
                }
              }}
              className="bg-[#0B0E17] border border-zinc-800/80 hover:border-[#22C55E]/40 rounded-xl p-2 flex items-center justify-between transition-all cursor-pointer group shadow-sm"
            >
              {/* Left Column: Logo Avatar + Name + Symbol & Network */}
              <div className="flex items-center space-x-2.5 min-w-0">
                {/* Circular Avatar with VERIFIED pill underneath */}
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-7 h-7 rounded-full bg-zinc-900 border border-[#22C55E]/30 overflow-hidden flex items-center justify-center p-0.5">
                    {item.logoUrl ? (
                      <img
                        src={item.logoUrl}
                        alt={item.symbol}
                        className="w-full h-full object-cover rounded-full"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="font-bold text-[9px] text-[#4ADE80] font-mono">
                        {item.symbol.slice(0, 3)}
                      </span>
                    )}
                  </div>
                  <span className="text-[6.5px] bg-[#22C55E]/20 border border-[#22C55E]/40 text-[#4ADE80] font-extrabold px-1 rounded mt-0.5 uppercase font-mono tracking-wider">
                    VERIFIED
                  </span>
                </div>

                {/* Token Name & Subtitle */}
                <div className="min-w-0 space-y-0.2">
                  <div className="flex items-center space-x-1">
                    <span className="text-xs font-bold text-white group-hover:text-[#4ADE80] transition-colors truncate">
                      {item.name}
                    </span>
                    <CheckCircle2 className="w-3 h-3 text-[#22C55E] fill-[#22C55E]/20 shrink-0" />
                  </div>
                  <div className="text-[9px] text-zinc-400 font-mono flex items-center space-x-1 truncate">
                    <span>${item.symbol}</span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-zinc-400 flex items-center gap-0.5">
                      <span className="text-[8px]">🔗</span> {item.chain}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Balance / Value & Date */}
              <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                <div className="text-right space-y-0.2">
                  <div className="text-[11px] font-bold text-white font-mono tracking-tight">
                    {item.amountFormatted}
                  </div>
                  <div className="text-[9.5px] text-zinc-400 font-mono">
                    {item.usdValueFormatted}
                  </div>
                  <div className="flex items-center justify-end space-x-1 pt-0.2">
                    <span className="inline-flex items-center space-x-0.5 text-[8px] text-[#4ADE80] font-bold font-mono">
                      <span className="w-1 h-1 rounded-full bg-[#22C55E] shadow-[0_0_6px_rgba(34,197,94,0.8)]"></span>
                      <span>VERIFIED</span>
                    </span>
                    <span className="text-[8px] text-zinc-500 font-mono">{item.date}</span>
                  </div>
                </div>

                <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors shrink-0" />
              </div>
            </div>
          ))}
        </div>

        {/* 4. Bottom Action Button: + Add New Token */}
        <button
          type="button"
          onClick={onNavigateAddToken}
          className="w-full py-2.5 px-3 bg-gradient-to-tr from-[#15803D] via-[#16A34A] to-[#4ADE80] hover:from-[#16A34A] hover:to-[#4ADE80] text-black font-black text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-[0_4px_16px_rgba(34,197,94,0.4)] active:scale-[0.99] mt-2"
        >
          <PlusCircle className="w-4 h-4 text-black fill-black/20" />
          <span className="uppercase tracking-wider">Add New Token</span>
        </button>
      </div>
    </div>
  );
};
