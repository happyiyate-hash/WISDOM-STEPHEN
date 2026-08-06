import React, { useState } from 'react';
import { Search, X, Clipboard, Zap, ChevronDown, Layers, Sparkles } from 'lucide-react';
import { ChainId } from '../types';
import { RAW_EVM_CHAINS, getChainInfo, normalizeChainKey } from '../constants/chains';
import { ApiKeyConfig } from '../services/apiKeys';
import { ChainSelectorModal, EVM_CHAIN_LOGOS, getChainLogoUrl } from './ChainSelectorModal';

interface ContractAddressSectionProps {
  addressInput: string;
  setAddressInput: (val: string) => void;
  selectedChain: ChainId;
  onSelectChain?: (chain: ChainId) => void;
  onFetchToken: (addrToFetch?: string) => void;
  isLoading: boolean;
  errorMessage: string | null;
  apiKeys?: ApiKeyConfig;
  statusMessage?: string | null;
  isVerifying?: boolean;
}

export const ContractAddressSection: React.FC<ContractAddressSectionProps> = ({
  addressInput,
  setAddressInput,
  selectedChain,
  onSelectChain,
  onFetchToken,
  isLoading,
  errorMessage,
  apiKeys,
  statusMessage,
  isVerifying,
}) => {
  const [isChainModalOpen, setIsChainModalOpen] = useState(false);

  const [imgError, setImgError] = useState(false);

  React.useEffect(() => {
    setImgError(false);
  }, [selectedChain]);

  const currentChainInfo = getChainInfo(selectedChain);
  const normalizedKey = normalizeChainKey(selectedChain);
  const currentRawDef = RAW_EVM_CHAINS[normalizedKey] || RAW_EVM_CHAINS['137'];
  const currentLogoUrl = getChainLogoUrl(selectedChain);

  const handlePaste = async () => {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setAddressInput(text.trim());
          return;
        }
      }
    } catch (err) {
      console.warn('Clipboard read error:', err);
    }

    // Fallback if clipboard API is blocked in iframe/sandbox
    const fallbackText = window.prompt('Paste EVM contract address below:');
    if (fallbackText && fallbackText.trim()) {
      setAddressInput(fallbackText.trim());
    }
  };

  const handleClear = () => {
    setAddressInput('');
  };

  return (
    <div className="bg-[#0B0E17]/90 border border-zinc-800/90 rounded-lg p-2 shadow-md backdrop-blur-sm space-y-1.5">
      {/* Network Selector & Contract Address Input Row */}
      <div className="flex items-center space-x-1.5 w-full">
        {/* Left: Rounded Network Selector Button with Logo + Dropdown Arrow */}
        {onSelectChain && (
          <button
            type="button"
            onClick={() => setIsChainModalOpen(true)}
            className="px-2 py-1 bg-[#06080F] hover:bg-zinc-900 border border-zinc-800 rounded-lg flex items-center space-x-1 shrink-0 h-9 transition-all cursor-pointer group"
            title={`Network: ${currentChainInfo.name}`}
          >
            <div className="w-5 h-5 rounded bg-zinc-900 border border-zinc-800 p-0.5 flex items-center justify-center shrink-0">
              {currentLogoUrl && !imgError ? (
                <img
                  src={currentLogoUrl}
                  alt={currentChainInfo.name}
                  className="w-full h-full object-contain rounded-sm"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div
                  className="w-full h-full rounded-sm flex items-center justify-center font-mono text-[8px] font-bold text-white"
                  style={{ backgroundColor: currentRawDef.themeColor }}
                >
                  {currentRawDef.symbol.slice(0, 3)}
                </div>
              )}
            </div>
            <ChevronDown className="w-3 h-3 text-zinc-400 group-hover:text-white transition-colors shrink-0" />
          </button>
        )}

        {/* Right: Independent Full-Width Input Field Card with Rounded Corners */}
        <div className="flex-1 flex items-center bg-[#06080F] border border-zinc-800 rounded-lg focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20 transition-all px-2 h-9 min-w-0 space-x-1.5">
          {/* Paste Icon at the Left Side of the Card */}
          <button
            type="button"
            onClick={handlePaste}
            className="p-1 hover:bg-zinc-800 text-[#00E575] hover:text-emerald-300 rounded transition-colors cursor-pointer shrink-0"
            title="Paste contract address from clipboard"
          >
            <Clipboard className="w-3.5 h-3.5" />
          </button>

          {/* Empty place where the user can paste the contract address */}
          <input
            type="text"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            placeholder="Paste EVM contract address..."
            className="w-full bg-transparent text-white font-mono text-[11px] focus:outline-none placeholder:text-zinc-600 truncate"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onFetchToken();
              }
            }}
          />

          {/* Clear button if text exists */}
          {addressInput && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer shrink-0"
              title="Clear"
            >
              <X className="w-3 h-3" />
            </button>
          )}

          {/* Small Verify Button at the Right Side of the Card */}
          <button
            type="button"
            onClick={() => onFetchToken()}
            disabled={isLoading || isVerifying || !addressInput.trim()}
            className="px-2.5 py-1 bg-[#00E575] hover:bg-emerald-400 disabled:opacity-50 text-black font-extrabold text-[10px] rounded-md shadow transition-all cursor-pointer disabled:cursor-not-allowed flex items-center space-x-1 shrink-0 h-7"
          >
            {isLoading || isVerifying ? (
              <>
                <div className="w-2.5 h-2.5 border-2 border-black border-t-transparent rounded-full animate-spin shrink-0" />
                <span>Analyzing Contract...</span>
              </>
            ) : (
              <>
                <Zap className="w-2.5 h-2.5 fill-black stroke-black shrink-0" />
                <span>Verify</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Status Timeline Message */}
      {statusMessage && (isLoading || isVerifying) && (
        <div className="bg-[#00E575]/10 border border-[#00E575]/30 rounded-md p-1.5 text-[9.5px] text-[#00E575] font-semibold flex items-center space-x-2 animate-in fade-in transition-all">
          <div className="w-2 h-2 rounded-full bg-[#00E575] animate-ping shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-md p-1.5 text-[9px] text-red-300 flex items-center space-x-1.5 animate-in fade-in">
          <X className="w-3 h-3 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Bottom Sheet Modal Component */}
      {onSelectChain && (
        <ChainSelectorModal
          isOpen={isChainModalOpen}
          onClose={() => setIsChainModalOpen(false)}
          selectedChain={selectedChain}
          onSelectChain={onSelectChain}
          apiKeys={apiKeys || { infuraKey: '', alchemyKey: '' }}
        />
      )}
    </div>
  );
};
