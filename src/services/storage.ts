import { SubmittedToken, UserRewardWallet, RewardTransaction, ChainId } from '../types';
import { REWARD_RATE_USD, REWARD_PER_SUBMISSION, REWARD_SAFETY_BONUS } from '../constants/chains';

const STORAGE_KEYS = {
  SUBMITTED_TOKENS: 'token_hub_submitted_tokens_v1',
  REWARD_WALLET: 'token_hub_reward_wallet_v1',
};

// Clean empty initial state (no hardcoded tokens or initial balances)
const SEED_TOKENS: SubmittedToken[] = [];

const INITIAL_WALLET: UserRewardWallet = {
  totalTokens: 0,
  totalUsd: 0,
  claimedTokens: 0,
  claimedUsd: 0,
  unclaimedTokens: 0,
  unclaimedUsd: 0,
  totalSubmissions: 0,
  walletAddress: '',
  isConnected: false,
  transactions: [],
};

export function getSubmittedTokens(): SubmittedToken[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SUBMITTED_TOKENS);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSubmittedTokens(tokens: SubmittedToken[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SUBMITTED_TOKENS, JSON.stringify(tokens));
  } catch (e) {
    console.error('Failed to save tokens', e);
  }
}

export function getRewardWallet(): UserRewardWallet {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.REWARD_WALLET);
    if (!data) return INITIAL_WALLET;
    return JSON.parse(data);
  } catch {
    return INITIAL_WALLET;
  }
}

export function saveRewardWallet(wallet: UserRewardWallet): void {
  try {
    localStorage.setItem(STORAGE_KEYS.REWARD_WALLET, JSON.stringify(wallet));
  } catch (e) {
    console.error('Failed to save reward wallet', e);
  }
}

/**
 * Completely clear local storage cache and tokens/wallet items
 */
export function clearAllAppStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.SUBMITTED_TOKENS);
    localStorage.removeItem(STORAGE_KEYS.REWARD_WALLET);
    // Remove profile and withdrawal caches
    Object.keys(localStorage).forEach((key) => {
      if (
        key.startsWith('tokencare_') ||
        key.startsWith('token_hub_') ||
        key.startsWith('sb-')
      ) {
        localStorage.removeItem(key);
      }
    });
    console.log('[Storage] All local storage cache items cleared successfully.');
  } catch (e) {
    console.error('[Storage] Error clearing local storage:', e);
  }
}

export function recordTokenSubmissionReward(
  token: SubmittedToken,
  wallet: UserRewardWallet
): { updatedWallet: UserRewardWallet; rewardEarnedTokens: number; rewardEarnedUsd: number } {
  // 1 Token = 0.1 cent = $0.001
  let rewardTokens = REWARD_PER_SUBMISSION; // 10 tokens ($0.01)
  if (token.safety.score >= 80) {
    rewardTokens += REWARD_SAFETY_BONUS; // +5 tokens ($0.005)
  }

  const rewardUsd = rewardTokens * REWARD_RATE_USD;

  const newTx: RewardTransaction = {
    id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    type: token.safety.score >= 80 ? 'SAFETY_BONUS' : 'SUBMISSION_BONUS',
    amountTokens: rewardTokens,
    amountUsd: rewardUsd,
    tokenAddress: token.address,
    tokenSymbol: token.metadata.symbol,
    timestamp: new Date().toISOString(),
    status: 'COMPLETED',
  };

  const updatedWallet: UserRewardWallet = {
    ...wallet,
    totalTokens: wallet.totalTokens + rewardTokens,
    totalUsd: (wallet.totalTokens + rewardTokens) * REWARD_RATE_USD,
    unclaimedTokens: wallet.unclaimedTokens + rewardTokens,
    unclaimedUsd: (wallet.unclaimedTokens + rewardTokens) * REWARD_RATE_USD,
    totalSubmissions: wallet.totalSubmissions + 1,
    transactions: [newTx, ...wallet.transactions],
  };

  saveRewardWallet(updatedWallet);
  return { updatedWallet, rewardEarnedTokens: rewardTokens, rewardEarnedUsd: rewardUsd };
}
