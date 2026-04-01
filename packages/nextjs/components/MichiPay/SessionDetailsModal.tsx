"use client";

import { useScaffoldReadContract } from "~~/hooks/scaffold-stark/useScaffoldReadContract";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-stark/useScaffoldWriteContract";
import { useDeployedContractInfo } from "~~/hooks/scaffold-stark/useDeployedContractInfo";
import { useAccount, useProvider, useSendTransaction } from "@starknet-react/core";
import { useState, useMemo } from "react";
import { uint256 } from "starknet";

// Componente para leer y renderizar la deuda de un participante
const ParticipantRow = ({
  sessionId,
  participantAddress,
  isActive,
  isMe,
}: {
  sessionId: bigint;
  participantAddress: string;
  isActive: boolean;
  isMe: boolean;
}) => {
  const { data: debtData, isLoading } = useScaffoldReadContract({
    contractName: "MichiPayContract",
    functionName: "get_session_debt",
    args: [sessionId, participantAddress],
  } as any);

  // Parse u256 Debt
  const rawDebt = (Array.isArray(debtData) ? debtData[0] : debtData) as any;
  const debtBn =
    typeof rawDebt === "object" && rawDebt !== null && "low" in rawDebt
      ? BigInt(rawDebt.low)
      : BigInt(rawDebt || 0);

  const formattedAmount = (Number(debtBn) / 1e18).toFixed(4);
  const paid = debtBn === 0n;

  // Extraemos info de despliegue para el contrato MichiPay
  const { data: michiContract } = useDeployedContractInfo("MichiPayContract");

  // Armamos las llamadas combinadas (Multicall) "Approve" luego "Pay_Share"
  const calls = useMemo(() => {
    if (!michiContract || debtBn === 0n) return [];
    
    // Address del Token STRK en Sepolia Testnet
    const strkAddress = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
    const amountU256 = uint256.bnToUint256(debtBn);
    
    return [
      {
        contractAddress: strkAddress,
        entrypoint: "approve",
        calldata: [michiContract.address, amountU256.low.toString(), amountU256.high.toString()],
      },
      {
        contractAddress: michiContract.address,
        entrypoint: "pay_share",
        calldata: [sessionId.toString()],
      },
    ];
  }, [michiContract, debtBn, sessionId]);

  const { sendAsync: payShareTx } = useSendTransaction({ calls });

  const [isPaying, setIsPaying] = useState(false);
  const { provider } = useProvider();

  const handlePay = async () => {
    try {
      setIsPaying(true);
      const tx = await payShareTx();
      if (tx?.transaction_hash) await provider.waitForTransaction(tx.transaction_hash);
      // Fast refresh simulation / state reloader handled globally via contract interaction refetch logic in hook 
    } catch (e) {
      console.error(e);
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <tr className={`transition-colors hover:bg-base-200/50 ${isMe ? "bg-base-200/80" : ""}`}>
      <td className="font-mono text-xs text-base-content/80">
        {participantAddress.slice(0, 6)}...{participantAddress.slice(-4)}
        {isMe && <span className="badge badge-xs badge-info ml-2 border-0 bg-info/20 text-info font-medium">Tú</span>}
      </td>
      <td className="font-semibold text-right text-base-content/90 whitespace-nowrap">
        {isLoading ? "..." : `${formattedAmount} STRK`}
      </td>
      <td className="text-center">
        {paid ? (
          <span className="badge badge-success badge-sm border-0 bg-success/20 text-success font-medium">Pagado</span>
        ) : (
          <span className="badge badge-error badge-sm border-0 bg-error/20 text-error font-medium">Debe</span>
        )}
      </td>
      <td className="text-right">
        {isActive && isMe && !paid && (
          <button
            onClick={handlePay}
            disabled={isPaying}
            className="btn btn-secondary btn-xs rounded-full shadow-md bg-gradient-modal text-white border-0 hover:shadow-lg hover:scale-105 transition-all"
          >
            {isPaying ? "Pagando..." : "Pagar"}
          </button>
        )}
      </td>
    </tr>
  );
};

export const SessionDetailsModal = ({
  sessionId,
  isOpen,
  onClose,
}: {
  sessionId: bigint | null;
  isOpen: boolean;
  onClose: () => void;
}) => {
  const { address } = useAccount();
  const { provider } = useProvider();
  const [isClaiming, setIsClaiming] = useState(false);

  // 1. Obtener datos generales
  const { data: sessionData, isLoading: isSessionLoading } = useScaffoldReadContract({
    contractName: "MichiPayContract",
    functionName: "get_session",
    args: sessionId !== null ? [sessionId] : undefined,
  } as any);

  // 2. Obtener lista de participantes (agregado en actualización del Cairo Smart Contract)
  const { data: participantsData, isLoading: isPartsLoading } = useScaffoldReadContract({
    contractName: "MichiPayContract",
    functionName: "get_session_participants",
    args: sessionId !== null ? [sessionId] : undefined,
  } as any);

  // Hook para reclamar
  const { sendAsync: claimTx } = useScaffoldWriteContract({
    contractName: "MichiPayContract",
    functionName: "claim_funds",
    args: sessionId !== null ? [sessionId] : undefined,
  } as any);

  if (!isOpen || sessionId === null) return null;

  const session = sessionData as any;
  if (isSessionLoading || !session) {
    return (
      <dialog className="modal modal-open">
        <div className="modal-box text-center">
          <span className="loading loading-spinner loading-lg"></span>
          <p className="mt-4 text-sm opacity-60">Cargando Sesión en la Blockchain...</p>
        </div>
        <form method="dialog" className="modal-backdrop" onClick={onClose}>
          <button>Cerrar</button>
        </form>
      </dialog>
    );
  }

  // Parseos para Session Data
  const isActive = Boolean(session.is_active);
  // Total Amount
  const totalAmountRaw = session.total_amount;
  const totalAmountBn =
    typeof totalAmountRaw === "object" && totalAmountRaw !== null && "low" in totalAmountRaw
      ? BigInt(totalAmountRaw.low)
      : BigInt(totalAmountRaw || 0);

  // Amount Collected
  const amountCollectedRaw = session.amount_collected;
  const amountCollectedBn =
    typeof amountCollectedRaw === "object" && amountCollectedRaw !== null && "low" in amountCollectedRaw
      ? BigInt(amountCollectedRaw.low)
      : BigInt(amountCollectedRaw || 0);

  const formattedTotal = (Number(totalAmountBn) / 1e18).toFixed(4);
  const formattedCollected = (Number(amountCollectedBn) / 1e18).toFixed(4);

  // Parse Creator
  const rawCreator = session.creator?.toString() || "0";
  // Manejo de decimal addresses:
  let creatorAddressRaw = typeof rawCreator === "bigint" ? "0x" + rawCreator.toString(16) : rawCreator;
  const creatorAddress = creatorAddressRaw.startsWith("0x") ? creatorAddressRaw : "0x" + BigInt(creatorAddressRaw || "0").toString(16);

  const isMySession = BigInt(address || "0") === BigInt(creatorAddress || "0");
  
  // Evaluamos el array devolvido
  // rawPartsArray infiere tuples devueltas por Typechain mapping de arrays.
  const rawPartsArray = Array.isArray(participantsData) ? participantsData : [];
  const participantList = Array.isArray(rawPartsArray[0]) ? (rawPartsArray[0] as unknown as any[]) : rawPartsArray;

  const handleClaim = async () => {
    try {
      setIsClaiming(true);
      const tx = await claimTx();
      if (tx) await provider.waitForTransaction(tx);
      onClose(); // Cerrar modal al confirmar exito
    } catch (e) {
      console.error(e);
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <dialog className="modal modal-open bg-neutral/40 backdrop-blur-md">
      <div className="modal-box border border-base-200 bg-base-100 !w-11/12 !max-w-2xl shadow-2xl overflow-hidden p-4 md:p-8">
        <h3 className="font-extrabold text-2xl mb-3 text-base-content tracking-tight">Detalles de la Sesión <span className="text-base-content/50">#{sessionId.toString()}</span></h3>
        
        <div className="flex gap-2 items-center mb-6">
          <span className={`badge badge-sm font-medium border-0 ${isActive ? "bg-success/20 text-success" : "bg-base-300 text-base-content/60"}`}>
            {isActive ? "Activa" : "Cerrada (Reclamada)"}
          </span>
          <span className="text-xs text-base-content/70 font-mono bg-base-200 px-2 py-1 rounded-md">
            Creador: {creatorAddress.slice(0, 6)}...{creatorAddress.slice(-4)}
          </span>
        </div>

        <div className="stats shadow-sm bg-base-200/50 w-full mb-8 relative overflow-hidden border border-base-200">
          <div className="stat place-items-center relative z-10 px-2 py-4">
            <div className="stat-title text-xs font-semibold text-base-content/70 tracking-wide uppercase">Total Esperado</div>
            <div className="stat-value text-xl md:text-2xl text-base-content mt-1 drop-shadow-sm whitespace-nowrap">{formattedTotal} STRK</div>
          </div>
          <div className="stat place-items-center relative z-10 border-l border-base-300 px-2 py-4">
            <div className="stat-title text-xs font-semibold text-base-content/70 tracking-wide uppercase">Fondo Cobrado</div>
            <div className="stat-value text-xl md:text-2xl text-secondary mt-1 drop-shadow-sm whitespace-nowrap">{formattedCollected} STRK</div>
          </div>
        </div>

        <h4 className="font-bold text-lg mb-4 border-b border-base-200 pb-2 flex justify-between text-base-content/90">
          <span>Participantes ({participantList.length})</span>
          {isPartsLoading && <span className="loading loading-spinner loading-xs text-secondary"></span>}
        </h4>
        
        {isPartsLoading ? (
          <div className="text-center py-6 opacity-50"><span className="loading loading-dots"></span></div>
        ) : participantList.length === 0 ? (
           <p className="text-sm italic opacity-60 text-center py-4 bg-base-200 rounded-lg">Ningún participante indexado o tu Contrato en Testnet no ha sido actualizado a la última versión con soporte para listado.</p>
        ) : (
          <div className="overflow-x-auto max-h-72 border border-base-200 rounded-xl bg-base-100 shadow-inner">
            <table className="table table-sm table-pin-rows">
              <thead>
                <tr className="bg-base-200 text-base-content/70">
                  <th className="font-semibold">Cartera</th>
                  <th className="text-right font-semibold">Aporte</th>
                  <th className="text-center font-semibold">Estatus</th>
                  <th className="text-right font-semibold">Acción</th>
                </tr>
              </thead>
              <tbody>
                {participantList.map((pRaw, idx) => {
                  let pAddressRaw = typeof pRaw === "bigint" ? "0x" + pRaw.toString(16) : pRaw?.toString();
                  const pAddress = pAddressRaw?.startsWith("0x") ? pAddressRaw : "0x" + BigInt(pAddressRaw || "0").toString(16);
                  const isMe = BigInt(address || "0") === BigInt(pAddress || "0");

                  return (
                    <ParticipantRow 
                      key={idx} 
                      sessionId={sessionId} 
                      participantAddress={pAddress} 
                      isActive={isActive}
                      isMe={isMe}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="modal-action mt-8 pt-6 border-t border-base-200">
          <button className="btn btn-ghost hover:bg-base-200 text-base-content/70 transition-colors" onClick={onClose} disabled={isClaiming}>Volver</button>
          
          {isMySession && (
            <button 
              className="btn btn-success bg-success text-success-content border-0 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
              onClick={handleClaim}
              disabled={isClaiming || amountCollectedBn === 0n || !isActive}
            >
              {isClaiming ? "Reclamando..." : "Reclamar el Fondo"}
            </button>
          )}
        </div>
      </div>
      <form method="dialog" className="modal-backdrop" onClick={onClose}>
        <button>close</button>
      </form>
    </dialog>
  );
};
