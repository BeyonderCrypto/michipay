"use client";

import { useAccount, useSendTransaction } from "@starknet-react/core";
import { useScaffoldContract } from "~~/hooks/scaffold-stark/useScaffoldContract";
import { useMemo, useState } from "react";
import { uint256 } from "starknet";

// Official STRK address on Sepolia Testnet
const STRK_TOKEN_ADDRESS = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

interface PaymentEngineProps {
  sessionId: number;
  amountOwed: bigint;
}

export const PaymentEngine = ({ sessionId, amountOwed }: PaymentEngineProps) => {
  const { address } = useAccount();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // @ts-ignore: Next.js ts engine caches strictly Strk from Scaffold defaults
  const { data: michiPayContract } = useScaffoldContract({ contractName: "MichiPayContract" });

  const calls = useMemo(() => {
    if (!michiPayContract || !amountOwed) return [];
    
    // Convert amount to u256 for Starknet contracts
    const amountU256 = uint256.bnToUint256(amountOwed);

    return [
      {
        // 1. Approve MichiPay to spend our STRK
        contractAddress: STRK_TOKEN_ADDRESS,
        entrypoint: "approve",
        calldata: [michiPayContract.address, amountU256.low, amountU256.high]
      },
      {
        // 2. Register payment in MichiPay
        contractAddress: michiPayContract.address,
        entrypoint: "pay_share",
        calldata: [sessionId] 
      }
    ];
  }, [michiPayContract, sessionId, amountOwed]);

  const { sendAsync, isPending } = useSendTransaction({ calls });

  const handlePayment = async () => {
    setErrorMsg(null);
    try {
      await sendAsync();
      console.log(`Payment successful for session ${sessionId}`);
    } catch (err: any) {
      console.error("Payment failed", err);
      // Catch common wallet rejection or network errors
      setErrorMsg(err.message || "User rejected the transaction or an error occurred.");
    }
  };

  if (!address) {
    return <p className="text-sm text-center italic mt-2 opacity-70">Connect wallet to pay</p>;
  }

  return (
    <div className="flex flex-col gap-2 mt-4">
      <button 
        className="btn btn-primary w-full shadow-lg"
        onClick={handlePayment}
        disabled={isPending || amountOwed <= 0n}
      >
        {isPending ? (
          <>
            <span className="loading loading-spinner"></span>
            Processing (Sepolia)...
          </>
        ) : (
          `Pay My Share (${(Number(amountOwed) / 1e18).toFixed(4)} STRK)`
        )}
      </button>

      {errorMsg && (
        <div className="alert alert-error shadow-lg py-2 mt-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="text-sm font-medium">{errorMsg}</span>
        </div>
      )}
    </div>
  );
};
