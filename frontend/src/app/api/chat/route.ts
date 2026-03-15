// app/api/execute-transaction/route.ts
// Execute blockchain transactions (send, swap, bridge)

import { NextRequest, NextResponse } from 'next/server';
import { 
  transfer, 
  executeSwap, 
  executeBridge,
  getSwapQuote,
  getExplorerUrl,
  getBalance,
  SUPPORTED_CHAINS,
  type TransactionResult 
} from '@/lib/evm-transactions';
import { recordSendTransaction, recordSwapTransaction, updateTransactionStatus } from '@/lib/transaction-history';
import { createWalletClient, http, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

// Note: In production, you would use Privy's server-side wallet SDK
// For now, this demonstrates the flow with a server-side wallet

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      action,
      walletAddress,
      privateKey, // In production, use Privy's embedded wallet signing
      // Transaction params
      to,
      amount,
      token,
      chain = 'base',
      // Swap params
      fromToken,
      toToken,
      // Bridge params
      fromChain,
      toChain,
      // Metadata
      originalCommand,
      language,
    } = body;

    // Validate required fields
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // For demo purposes, we'll return mock data if no private key
    // In production, you'd use Privy's server SDK to sign transactions
    const useMockMode = !privateKey;

    let result: TransactionResult;
    let txRecord;

    switch (action) {
      case 'transfer':
      case 'send': {
        if (!to || !amount || !token) {
          return NextResponse.json(
            { error: 'Missing required fields: to, amount, token' },
            { status: 400 }
          );
        }

        // Record transaction as pending
        txRecord = await recordSendTransaction({
          walletAddress,
          recipientAddress: to,
          amount,
          token,
          chain,
          originalCommand,
          language,
        });

        if (useMockMode) {
          // Return simulated success for demo
          result = {
            success: true,
            txHash: `0x${Math.random().toString(16).slice(2)}mock`,
            explorerUrl: getExplorerUrl(chain, '0xmock'),
          };
          console.log('🎭 Mock transfer:', amount, token, 'to', to);
        } else {
          // Execute real transaction
          const account = privateKeyToAccount(privateKey as `0x${string}`);
          const walletClient = createWalletClient({
            account,
            chain: SUPPORTED_CHAINS[chain.toLowerCase()] || base,
            transport: http(),
          });

          result = await transfer(walletClient, to as Address, amount, token, chain);
        }

        // Update transaction status
        if (txRecord && result.txHash) {
          await updateTransactionStatus(
            txRecord.id!,
            result.success ? 'confirmed' : 'failed',
            result.txHash,
            result.error
          );
        }

        return NextResponse.json({
          success: result.success,
          txHash: result.txHash,
          explorerUrl: result.explorerUrl,
          error: result.error,
          transactionId: txRecord?.id,
          mock: useMockMode,
        });
      }

      case 'swap': {
        if (!fromToken || !toToken || !amount) {
          return NextResponse.json(
            { error: 'Missing required fields: fromToken, toToken, amount' },
            { status: 400 }
          );
        }

        // Get quote first
        const quote = await getSwapQuote(
          chain,
          chain, // Same chain for swaps
          fromToken,
          toToken,
          amount,
          walletAddress
        );

        if (!quote) {
          return NextResponse.json(
            { error: 'Failed to get swap quote' },
            { status: 400 }
          );
        }

        // Record swap as pending
        txRecord = await recordSwapTransaction({
          walletAddress,
          tokenIn: fromToken,
          tokenOut: toToken,
          amountIn: amount,
          amountOut: quote.toAmountMin,
          chain,
          originalCommand,
          language,
        });

        if (useMockMode) {
          // Return simulated success with quote
          result = {
            success: true,
            txHash: `0x${Math.random().toString(16).slice(2)}mock`,
            explorerUrl: getExplorerUrl(chain, '0xmock'),
          };
          console.log('🎭 Mock swap:', amount, fromToken, '→', toToken);
        } else {
          // Execute real swap
          const account = privateKeyToAccount(privateKey as `0x${string}`);
          const walletClient = createWalletClient({
            account,
            chain: SUPPORTED_CHAINS[chain.toLowerCase()] || base,
            transport: http(),
          });

          result = await executeSwap(
            walletClient,
            chain,
            chain,
            fromToken,
            toToken,
            amount,
            walletAddress
          );
        }

        // Update transaction status
        if (txRecord && result.txHash) {
          await updateTransactionStatus(
            txRecord.id!,
            result.success ? 'confirmed' : 'failed',
            result.txHash,
            result.error
          );
        }

        return NextResponse.json({
          success: result.success,
          txHash: result.txHash,
          explorerUrl: result.explorerUrl,
          error: result.error,
          quote,
          transactionId: txRecord?.id,
          mock: useMockMode,
        });
      }

      case 'bridge': {
        if (!fromChain || !toChain || !token || !amount) {
          return NextResponse.json(
            { error: 'Missing required fields: fromChain, toChain, token, amount' },
            { status: 400 }
          );
        }

        if (useMockMode) {
          result = {
            success: true,
            txHash: `0x${Math.random().toString(16).slice(2)}mock`,
            explorerUrl: getExplorerUrl(fromChain, '0xmock'),
          };
          console.log('🎭 Mock bridge:', amount, token, fromChain, '→', toChain);
        } else {
          const account = privateKeyToAccount(privateKey as `0x${string}`);
          const walletClient = createWalletClient({
            account,
            chain: SUPPORTED_CHAINS[fromChain.toLowerCase()] || base,
            transport: http(),
          });

          result = await executeBridge(
            walletClient,
            fromChain,
            toChain,
            token,
            amount,
            walletAddress
          );
        }

        return NextResponse.json({
          success: result.success,
          txHash: result.txHash,
          explorerUrl: result.explorerUrl,
          error: result.error,
          mock: useMockMode,
        });
      }

      case 'quote': {
        // Get swap quote without executing
        if (!fromToken || !toToken || !amount) {
          return NextResponse.json(
            { error: 'Missing required fields: fromToken, toToken, amount' },
            { status: 400 }
          );
        }

        const quote = await getSwapQuote(
          chain,
          chain,
          fromToken,
          toToken,
          amount,
          walletAddress
        );

        if (!quote) {
          return NextResponse.json(
            { error: 'Failed to get quote' },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          quote,
        });
      }

      case 'balance': {
        // Get balance
        const balance = await getBalance(walletAddress, token || 'ETH', chain);
        return NextResponse.json({
          success: true,
          balance,
          token: token || 'ETH',
          chain,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Use: transfer, swap, bridge, quote, balance` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Transaction error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Transaction failed' },
      { status: 500 }
    );
  }
}
