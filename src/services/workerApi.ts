export interface WorkerTokenPayload {
  name: string;
  symbol: string;
  contractAddress: string;
  logoUrl?: string;
  verified?: boolean;
}

/**
 * Uploads token metadata array to Cloudflare Worker endpoint
 * Primary path: Uses backend Express proxy route (/api/upload-tokens) to avoid browser CORS restrictions
 * Fallback path: Direct fetch to Worker endpoint
 */
export async function uploadTokensToWorker(
  tokens: WorkerTokenPayload[],
  blockchain: string = 'polygon'
): Promise<{ success: boolean; result?: any; error?: string }> {
  if (!tokens || tokens.length === 0) {
    return { success: false, error: 'No tokens provided for upload.' };
  }

  const payload = {
    action: 'uploadTokens',
    blockchain: blockchain.toLowerCase(),
    tokens: tokens.map((t) => ({
      name: t.name || 'Unknown Token',
      symbol: t.symbol || 'TOK',
      contractAddress: t.contractAddress || '0x0000000000000000000000000000000000000000',
      logoUrl: t.logoUrl || '',
      verified: t.verified ?? true,
    })),
  };

  // 1. Try server-side proxy route first (bypasses browser CORS)
  try {
    const proxyResponse = await fetch('/api/upload-tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (proxyResponse.ok) {
      const data = await proxyResponse.json();
      console.log('[Worker API via Proxy] Success:', data);
      return { success: true, result: data.result };
    }
  } catch (proxyError) {
    console.warn('[Worker API Proxy] Proxy request failed, attempting direct fetch...', proxyError);
  }

  // 2. Direct client-side fetch fallback
  try {
    const response = await fetch('https://rough-meadow-6435.happyiyate.workers.dev/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    let result: any = null;
    try {
      result = await response.json();
    } catch {
      result = await response.text();
    }

    console.log('[Worker API Direct] Response:', result);
    return { success: response.ok, result };
  } catch (error: any) {
    console.error('[Worker API Direct] Failed to upload tokens:', error);
    return {
      success: false,
      error: error.message || 'Failed to connect to Cloudflare Worker endpoint.',
    };
  }
}
