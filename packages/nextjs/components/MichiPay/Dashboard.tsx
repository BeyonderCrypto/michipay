"use client";

import { useScaffoldReadContract } from "~~/hooks/scaffold-stark/useScaffoldReadContract";
import { useAccount } from "@starknet-react/core";
import { useState } from "react";
import { SessionDetailsModal } from "./SessionDetailsModal";

// Sub-componente para leer y renderizar una sesión específica
const SessionRow = ({ sessionId, onClick }: { sessionId: bigint, onClick: () => void }) => {
  const { data: sessionData, isLoading } = useScaffoldReadContract({
    contractName: "MichiPayContract",
    functionName: "get_session",
    // Passed as a single element array parameter according to Cairo arg mapping
    // @ts-ignore: TS struggles with mapping the strict ABI type parsing for u32 here
    args: [sessionId],
  } as any);

  if (isLoading) {
    return (
      <tr>
        <td>{sessionId.toString()}</td>
        <td colSpan={3} className="text-center italic opacity-60">
          <span className="loading loading-spinner loading-xs"></span> Cargando...
        </td>
      </tr>
    );
  }

  if (!sessionData) {
    return (
      <tr>
        <td>{sessionId.toString()}</td>
        <td colSpan={3} className="text-center text-error italic">
          No se encontró la sesión
        </td>
      </tr>
    );
  }

  // Parse Cairo Struct
  const session = sessionData as any;
  const isActive = Boolean(session.is_active);

  // Parse u256
  const totalAmountRaw = session.total_amount;
  const totalAmountBn =
    typeof totalAmountRaw === "object" && totalAmountRaw !== null && "low" in totalAmountRaw
      ? BigInt(totalAmountRaw.low)
      : BigInt(totalAmountRaw || 0);

  const formattedAmount = (Number(totalAmountBn) / 1e18).toFixed(4);

  return (
    <tr className="hover:bg-base-200 transition-colors cursor-pointer group" onClick={onClick}>
      <td className="font-semibold text-base-content group-hover:text-secondary transition-colors">{sessionId.toString()}</td>
      <td className="font-medium text-base-content/90">{formattedAmount} STRK</td>
      <td>
        <span
          className={`badge badge-sm rounded-md font-medium border-0 ${
            isActive ? "bg-success/20 text-success" : "bg-base-300 text-base-content/60"
          }`}
        >
          {isActive ? "Activa" : "Cerrada"}
        </span>
      </td>
      <td>
        <button 
          className="btn btn-ghost btn-xs btn-square group-hover:bg-secondary/20 group-hover:text-secondary transition-colors tooltip tooltip-left text-base-content/50" 
          data-tip="Ver Detalle"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </td>
    </tr>
  );
};

export const Dashboard = ({ onGoToCreate }: { onGoToCreate?: () => void }) => {
  const { address } = useAccount();

  const [selectedSession, setSelectedSession] = useState<bigint | null>(null);

  // Load User Debt
  const { data: userDebtData, isLoading: isDebtLoading } = useScaffoldReadContract({
    contractName: "MichiPayContract",
    functionName: "get_user_debt",
    args: address ? [address] : undefined,
  } as any);

  // Load Total Session Counter
  const { data: sessionCounterData, isLoading: isCounterLoading } = useScaffoldReadContract({
    contractName: "MichiPayContract",
    functionName: "get_session_counter",
  });

  // Parse Debt u256 securely
  let formattedDebt = "0.0000";
  if (userDebtData !== undefined && userDebtData !== null) {
    const rawDebt = (Array.isArray(userDebtData) ? userDebtData[0] : userDebtData) as any;
    const debtValue =
      typeof rawDebt === "object" && rawDebt !== null && "low" in rawDebt
        ? BigInt(rawDebt.low)
        : BigInt(rawDebt || 0);
    formattedDebt = (Number(debtValue) / 1e18).toFixed(4);
  }

  // Parse Counter
  const sessionCounter = Array.isArray(sessionCounterData as any)
    ? BigInt((sessionCounterData as any)[0] || 0)
    : BigInt((sessionCounterData as any)?.toString() || "0");

  // Generar array de las últimas 5 sesiones para iterar
  const recentSessions: bigint[] = [];

  if (!address) {
    return (
      <div className="card bg-base-100/70 shadow-xl mt-4 border border-base-200 backdrop-blur-md transition-all">
        <div className="card-body items-center justify-center text-center py-20">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-24 w-24 text-base-content/20 mb-6 drop-shadow-sm" 
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h2 className="card-title text-4xl font-extrabold text-base-content tracking-tight mb-2">Bienvenido a MichiPay</h2>
          <p className="text-base-content/70 text-lg max-w-md">
            Conecta tu wallet en la esquina superior derecha para visualizar tu saldo y participar en tus sesiones pendientes. 💸
          </p>
        </div>
      </div>
    );
  }

  if (sessionCounter > 0n) {
    const maxEntries = 5n;
    const start = sessionCounter > maxEntries ? sessionCounter - maxEntries + 1n : 1n;

    // Iterar en reversa (más nuevas primero)
    for (let i = sessionCounter; i >= start; i--) {
      recentSessions.push(i);
    }
  }

  return (
    <>
      <div className="card bg-base-100/80 shadow-xl mt-4 border border-base-200 backdrop-blur-md">
        <div className="card-body p-6 md:p-8">
          <h2 className="card-title text-2xl mb-5 text-base-content font-bold">Tu Panel</h2>

          <div className="stats shadow-lg bg-secondary text-white border border-secondary/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <div className="stat relative z-10 p-6">
              <div className="stat-title text-white/80 font-medium tracking-wide">Deuda Total Pendiente</div>
              <div className="stat-value text-4xl font-extrabold mt-2 mb-1 drop-shadow-sm">
                {isDebtLoading ? (
                  <span className="loading loading-dots loading-md"></span>
                ) : (
                  `${formattedDebt} STRK`
                )}
              </div>
              <div className="stat-desc text-white/80 font-medium">En todas las sesiones activas</div>
            </div>
          </div>

          <div className="mt-10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-base-content mb-0">Sesiones Recientes</h3>
              {onGoToCreate && (
                <button
                  className="btn btn-secondary btn-sm text-white font-bold border-0 rounded-full shadow-md hover:shadow-lg hover:scale-[1.05] transition-all px-4"
                  onClick={onGoToCreate}
                >
                  + Nueva Sesión
                </button>
              )}
            </div>
            <div className="overflow-x-auto rounded-xl border border-base-200 shadow-sm bg-base-100/50 backdrop-blur-sm">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>ID de Sesión</th>
                    <th>Monto Total</th>
                    <th>Estado</th>
                    <th className="w-12">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {isCounterLoading ? (
                    <tr>
                      <td colSpan={4} className="text-center italic opacity-60 py-4">
                        <span className="loading loading-spinner loading-md"></span>
                      </td>
                    </tr>
                  ) : sessionCounter === 0n ? (
                    <tr>
                      <td colSpan={4} className="text-center italic opacity-60 py-4">
                        No hay sesiones recientes aún.
                      </td>
                    </tr>
                  ) : (
                    recentSessions.map((id) => (
                      <SessionRow 
                        key={id.toString()} 
                        sessionId={id} 
                        onClick={() => setSelectedSession(id)}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <SessionDetailsModal 
        sessionId={selectedSession} 
        isOpen={selectedSession !== null} 
        onClose={() => setSelectedSession(null)} 
      />
    </>
  );
};
