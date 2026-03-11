"use client";

import { useScaffoldReadContract } from "~~/hooks/scaffold-stark/useScaffoldReadContract";
import { useAccount } from "@starknet-react/core";

export const Dashboard = () => {
  const { address } = useAccount();

  // Assuming `get_sessions` or similar read function exists in the contract,
  // we are using scaffold's read hook. Adjust `functionName` based on actual ABI.
  // Note: For array of sessions, we might need a specific read method or L2 indexer,
  // but for the sake of the tutorial, we read mapping data if available.
  const { data: userDebt, isLoading: isDebtLoading } = useScaffoldReadContract({
    contractName: "MichiPayContract",
    functionName: "debts",
    args: address ? [address] : undefined,
  } as any);

  return (
    <div className="card bg-base-100 shadow-xl mt-4 border border-base-300">
      <div className="card-body">
        <h2 className="card-title text-2xl mb-4">Your Dashboard</h2>

        <div className="stats shadow bg-secondary text-secondary-content">
          <div className="stat">
            <div className="stat-title text-secondary-content/80">
              Total Outstanding Debt
            </div>
            <div className="stat-value text-3xl">
              {isDebtLoading ? (
                <span className="loading loading-dots loading-md"></span>
              ) : userDebt ? (
                // Displaying debt, assuming it returns u256 or similar BigInt structure
                `${Number(userDebt) / 1e18} STRK`
              ) : (
                "0.00 STRK"
              )}
            </div>
            <div className="stat-desc text-secondary-content/80">
              Across all active sessions
            </div>
          </div>
        </div>

        {/* Placeholder for Sessions List - Needs an ABI read method that returns arrays or indexed data to be fully populated */}
        <div className="mt-6">
          <h3 className="text-xl font-semibold mb-2">Recent Sessions</h3>
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>Session ID</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td
                    colSpan={3}
                    className="text-center italic opacity-60 py-4"
                  >
                    Fetching session data...
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
