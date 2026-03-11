import { useState, useEffect } from "react";
import { uint256 } from "starknet";

/**
 * Hook to convert Fiat to STRK in u256 format
 */
export const useFiatToStrk = () => {
  const [exchangeRateUsd, setExchangeRateUsd] = useState<number | null>(null);
  const [exchangeRateMxn, setExchangeRateMxn] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        setIsLoading(true);
        // Using CoinGecko API for Starknet price
        const response = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=starknet&vs_currencies=usd,mxn",
        );
        if (!response.ok) {
          throw new Error("Failed to fetch exchange rates");
        }
        const data = await response.json();
        setExchangeRateUsd(data.starknet.usd);
        setExchangeRateMxn(data.starknet.mxn);
      } catch (err: any) {
        setError(err.message || "Unknown error fetching exchange rates");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRates();
  }, []);

  /**
   * Convert Fiat to STRK and return in Starknet u256 (BigInt scaled to 18 decimals)
   */
  const convertFiatToStrkU256 = (amount: number, currency: "USD" | "MXN") => {
    const rate = currency === "USD" ? exchangeRateUsd : exchangeRateMxn;

    if (!rate || amount <= 0) return null;

    // Amount in STRK (e.g., 10 USD / 0.5 USD/STRK = 20 STRK)
    const strkAmount = amount / rate;

    // Scale to 18 decimals and convert to BigInt
    // Using string manipulation to avoid precision issues with large numbers in JS
    const scaledAmountStr = (strkAmount * 1e18).toLocaleString("fullwide", {
      useGrouping: false,
    });
    const amountBn = BigInt(scaledAmountStr.split(".")[0]); // Take integer part

    // Convert to uint256 for Starknet contracts
    return uint256.bnToUint256(amountBn);
  };

  /**
   * Convert Fiat to STRK and return as displayable number
   */
  const convertFiatToStrkDisplay = (
    amount: number,
    currency: "USD" | "MXN",
  ) => {
    const rate = currency === "USD" ? exchangeRateUsd : exchangeRateMxn;
    if (!rate || amount <= 0) return null;
    return amount / rate;
  };

  return {
    exchangeRateUsd,
    exchangeRateMxn,
    isLoading,
    error,
    convertFiatToStrkU256,
    convertFiatToStrkDisplay,
  };
};
