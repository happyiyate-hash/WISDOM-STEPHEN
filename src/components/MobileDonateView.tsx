import React from 'react';
import { Search } from 'lucide-react';
import { ChainId, SubmittedToken } from '../types';
import { LogoVerificationReport } from '../services/logoVerificationEngine';
import { ApiKeyConfig } from '../services/apiKeys';
import { ContractAddressSection } from './ContractAddressSection';
import { TokenInformationCard } from './TokenInformationCard';
import { LogoVerificationCard } from './LogoVerificationCard';
import { DonationSettingsCard } from './DonationSettingsCard';

interface MobileDonateViewProps {
  addressInput: string;
  setAddressInput: (val: string) => void;
  selectedChain: ChainId;
  setSelectedChain: (chain: ChainId) => void;
  onFetchToken: (addrToFetch?: string) => void;
  isLoading: boolean;
  errorMessage: string | null;
  apiKeys?: ApiKeyConfig;
  fetchedToken: SubmittedToken | null;
  setFetchedToken: React.Dispatch<React.SetStateAction<SubmittedToken | null>>;
  logoReport: LogoVerificationReport | null;
  tokens: SubmittedToken[];
  handleSaveToken: () => void;
  handleResetForm: () => void;
  isSavingToken: boolean;
}

export const MobileDonateView: React.FC<MobileDonateViewProps> = ({
  addressInput,
  setAddressInput,
  selectedChain,
  setSelectedChain,
  onFetchToken,
  isLoading,
  errorMessage,
  apiKeys,
  fetchedToken,
  setFetchedToken,
  logoReport,
  tokens,
  handleSaveToken,
  handleResetForm,
  isSavingToken,
}) => {
  return (
    <div className="space-y-3.5 text-white font-sans animate-in fade-in duration-200">
      {/* 1. Contract Address Section */}
      <ContractAddressSection
        addressInput={addressInput}
        setAddressInput={setAddressInput}
        selectedChain={selectedChain}
        onSelectChain={setSelectedChain}
        onFetchToken={onFetchToken}
        isLoading={isLoading}
        errorMessage={errorMessage}
        apiKeys={apiKeys}
      />

      {/* 3. Stacked Cards for Real Fetched Token or Empty Search State */}
      {fetchedToken ? (
        <div className="space-y-3.5 animate-in fade-in duration-300">
          {/* Token Information & Multi-Provider Verification Engine Card */}
          <TokenInformationCard
            metadata={fetchedToken.metadata}
            marketData={fetchedToken.marketData}
            safety={fetchedToken.safety}
            selectedChain={selectedChain}
            verificationReport={fetchedToken.verificationReport}
            onUpdateLogo={(logoUrl) => {
              setFetchedToken((prev) =>
                prev
                  ? {
                      ...prev,
                      metadata: {
                        ...prev.metadata,
                        logoUrl,
                      },
                    }
                  : null
              );
            }}
          />

          {/* Logo Processing & Optimization Engine Card */}
          <LogoVerificationCard
            report={logoReport}
            onUpdateLogo={(logoUrl) => {
              setFetchedToken((prev) =>
                prev
                  ? {
                      ...prev,
                      metadata: {
                        ...prev.metadata,
                        logoUrl,
                      },
                    }
                  : null
              );
            }}
          />

          {/* Donation Campaign Settings Card */}
          <DonationSettingsCard
            metadata={fetchedToken.metadata}
            selectedChain={selectedChain}
            logoReport={logoReport}
            trustScore={fetchedToken.verificationReport?.trustScore ?? fetchedToken.safety?.score}
            isAlreadySaved={tokens.some(
              (t) => t.address.toLowerCase().trim() === fetchedToken.address.toLowerCase().trim()
            )}
            onSaveToken={handleSaveToken}
            onCancel={handleResetForm}
            isSaving={isSavingToken}
          />
        </div>
      ) : (
        <div className="bg-[#0B0E17]/60 border border-zinc-800/60 rounded-xl p-5 text-center space-y-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
            <Search className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">EVM Token Verification Panel</h3>
          <p className="text-[10px] text-zinc-400 max-w-xs mx-auto leading-relaxed">
            Paste any ERC-20 contract address above and click <strong className="text-white">Verify</strong> to pull live price, market cap, smart contract audit rating, and donation configuration.
          </p>
        </div>
      )}
    </div>
  );
};

