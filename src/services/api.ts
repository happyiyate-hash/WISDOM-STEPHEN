import { ChainId, MarketData } from '../types';
import { SUPPORTED_CHAINS } from '../constants/chains';

interface DexScreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd: string;
  priceChange: {
    h24?: number;
  };
  volume: {
    h24?: number;
  };
  liquidity?: {
    usd?: number;
  };
  fdv?: number;
  marketCap?: number;
}

/**
 * Fetches market data (price, liquidity, volume, market cap, DEX pairs) via DexScreener API
 */
export async function fetchDexScreenerData(
  address: string,
  chainId: ChainId
): Promise<Partial<MarketData> | null> {
  try {
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.pairs || data.pairs.length === 0) return null;

    // Filter or sort pairs by highest liquidity
    const targetChain = SUPPORTED_CHAINS[chainId]?.dexScreenerChain || chainId;
    const chainPairs = data.pairs.filter(
      (p: DexScreenerPair) => p.chainId.toLowerCase() === targetChain.toLowerCase()
    );

    const bestPair: DexScreenerPair = (chainPairs.length > 0 ? chainPairs : data.pairs).sort(
      (a: DexScreenerPair, b: DexScreenerPair) =>
        (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
    )[0];

    if (!bestPair) return null;

    const priceUsd = parseFloat(bestPair.priceUsd || '0');
    const priceNative = parseFloat(bestPair.priceNative || '0');
    const priceChange24h = bestPair.priceChange?.h24 || 0;
    const volume24h = bestPair.volume?.h24 || 0;
    const liquidityUsd = bestPair.liquidity?.usd || 0;
    const fdvUsd = bestPair.fdv || 0;
    const marketCapUsd = bestPair.marketCap || fdvUsd;

    return {
      priceUsd,
      priceNative,
      priceChange24h,
      volume24h,
      liquidityUsd,
      marketCapUsd,
      fdvUsd,
      pairAddress: bestPair.pairAddress,
      dexName: bestPair.dexId.toUpperCase(),
      pairUrl: bestPair.url,
      logoUrl: (bestPair as any).info?.imageUrl || (bestPair as any).info?.header || undefined,
    } as any;
  } catch (err) {
    console.warn('[API] DexScreener fetch error:', err);
    return null;
  }
}

export interface CoinGeckoTokenData {
  name?: string;
  symbol?: string;
  logoUrl?: string;
  priceUsd?: number;
  priceChange24h?: number;
  marketCapUsd?: number;
  circulatingSupply?: number;
  totalSupplyCG?: number;
  maxSupplyCG?: number;
}

/**
 * Fetches token supply and market details from CoinGecko public endpoints
 */
export async function fetchCoinGeckoSupplyData(
  address: string,
  chainId: ChainId
): Promise<CoinGeckoTokenData | null> {
  try {
    const platform = SUPPORTED_CHAINS[chainId]?.coingeckoPlatform || 'ethereum';
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${platform}/contract/${address.toLowerCase()}`
    );

    if (!res.ok) return null;

    const data = await res.json();
    const marketData = data.market_data;

    return {
      name: data.name || undefined,
      symbol: data.symbol ? data.symbol.toUpperCase() : undefined,
      logoUrl: data.image?.large || data.image?.small || undefined,
      priceUsd: marketData?.current_price?.usd || undefined,
      priceChange24h: marketData?.price_change_percentage_24h || undefined,
      marketCapUsd: marketData?.market_cap?.usd || undefined,
      circulatingSupply: marketData?.circulating_supply || undefined,
      totalSupplyCG: marketData?.total_supply || marketData?.max_supply || undefined,
      maxSupplyCG: marketData?.max_supply || undefined,
    };
  } catch (err) {
    console.warn('[API] CoinGecko supply fetch error:', err);
    return null;
  }
}
