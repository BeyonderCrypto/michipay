"use client";

import { useState } from "react";
import { useProvider } from "@starknet-react/core";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-stark/useScaffoldWriteContract";
import { useFiatToStrk } from "~~/hooks/michipay/useFiatToStrk";
import { useAddressBook } from "~~/hooks/michipay/useAddressBook";

export const SessionCreator = ({
  onSuccess,
  onCancel,
}: {
  onSuccess?: () => void;
  onCancel?: () => void;
}) => {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"USD" | "MXN">("MXN");
  const [participants, setParticipants] = useState<string[]>([""]); // Start with 1 empty input
  const [isTxPending, setIsTxPending] = useState(false);
  const { provider } = useProvider();

  const {
    convertFiatToStrkU256,
    convertFiatToStrkDisplay,
    isLoading: ratesLoading,
  } = useFiatToStrk();
  const { contacts, getSuggestions } = useAddressBook();

  const handleAddParticipant = () => {
    if (participants.length < 5) {
      setParticipants([...participants, ""]);
    }
  };

  const handleRemoveParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const updateParticipant = (index: number, value: string) => {
    const newParticipants = [...participants];
    // Check if value is a name in the address book
    const address = contacts[value] || value;
    newParticipants[index] = address;
    setParticipants(newParticipants);
  };

  // Clean empty and invalid addresses before submission
  const getValidParticipants = () =>
    participants.filter((p) => p.startsWith("0x") && p.length > 20);
  const validParticipants = getValidParticipants();

  // Validation based on Cairo asserts (2 to 5 participants)
  const isValid =
    validParticipants.length >= 2 &&
    validParticipants.length <= 5 &&
    Number(amount) > 0 &&
    !ratesLoading;

  const { sendAsync: createSessionTx } = useScaffoldWriteContract({
    contractName: "MichiPayContract",
    functionName: "create_session",
    args: [
      convertFiatToStrkU256(Number(amount || 0), currency) as any,
      validParticipants as any,
    ],
  });

  const handleSubmit = async () => {
    if (!isValid) return;

    try {
      setIsTxPending(true);
      const txHash = await createSessionTx();
      if (txHash) {
        await provider.waitForTransaction(txHash);
      }
      console.log("Sesión creada exitosamente");
      // Reset form on success
      setAmount("");
      setParticipants([""]);
      if (onSuccess) onSuccess();
    } catch (e) {
      console.error("Error al crear la sesión:", e);
    } finally {
      setIsTxPending(false);
    }
  };

  return (
    <div className="card bg-base-100/90 shadow-2xl border border-base-200 backdrop-blur-md transition-all">
      <div className="card-body p-6 md:p-8">
        <div className="flex items-center gap-3 mb-4">
          {onCancel && (
            <button
              className="btn btn-ghost btn-circle btn-sm shadow-sm border border-base-200 hover:bg-base-200 transition-colors"
              onClick={onCancel}
              disabled={isTxPending}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-base-content/70"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
          <h2 className="card-title text-2xl md:text-3xl font-extrabold text-base-content tracking-tight m-0">
            Dividir una Cuenta
          </h2>
        </div>

        <div className="form-control w-full my-3">
          <label className="label pb-1">
            <span className="label-text font-semibold text-base-content/90">
              Monto Total de la Cuenta
            </span>
            <span className="label-text-alt">
              {ratesLoading
                ? "Cargando tasas..."
                : `Est: ${convertFiatToStrkDisplay(Number(amount || 0), currency)?.toFixed(4) || "0.0000"} STRK`}
            </span>
          </label>
          <div className="join w-full shadow-sm rounded-lg overflow-hidden border border-base-300">
            <input
              type="number"
              placeholder="0.00"
              className="input bg-base-100 focus:outline-none focus:ring-0 join-item w-full transition-all text-lg font-medium"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.01"
            />
            <select
              className="select select-bordered join-item"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as "USD" | "MXN")}
            >
              <option value="MXN">MXN</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>

        <div className="divider my-4 opacity-70"></div>

        <div className="flex justify-between items-center mb-4">
          <span className="label-text font-semibold text-base-content/90 text-sm uppercase tracking-wide">
            Participantes (2-5)
          </span>
          <span className="badge badge-sm badge-neutral/20 border-0 bg-base-200 text-base-content/80 font-medium px-2 py-3 rounded-md">
            {validParticipants.length}/5 Válidos
          </span>
        </div>

        {participants.map((participant, idx) => (
          <div key={idx} className="flex gap-2 mb-3 items-center group">
            <div className="relative w-full shadow-sm">
              <input
                type="text"
                placeholder="Dirección (0x...) o Alias..."
                className="input input-bordered border-base-300 bg-base-100 focus:border-secondary focus:ring-1 focus:ring-secondary w-full transition-all"
                value={participant}
                onChange={(e) => updateParticipant(idx, e.target.value)}
                list={`contacts-list-${idx}`}
              />
              <datalist id={`contacts-list-${idx}`}>
                {Object.entries(contacts).map(([name, addr]) => (
                  <option key={name} value={addr}>
                    {name}
                  </option>
                ))}
              </datalist>
            </div>

            <button
              className="btn btn-square btn-ghost text-error/60 hover:bg-error hover:text-error-content transition-colors"
              onClick={() => handleRemoveParticipant(idx)}
              disabled={participants.length <= 1}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        ))}

        <button
          className="btn btn-ghost border border-base-300 bg-base-200/50 hover:bg-base-200 hover:border-base-300 text-base-content/80 font-medium btn-block mt-2 shadow-sm rounded-xl transition-all"
          onClick={handleAddParticipant}
          disabled={participants.length >= 5}
        >
          + Añadir Participante
        </button>

        <div className="card-actions justify-end mt-8">
          <button
            className="btn btn-secondary text-white border-0 w-full shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all rounded-xl text-lg font-bold"
            disabled={!isValid || isTxPending}
            onClick={handleSubmit}
          >
            {isTxPending ? (
              <span className="loading loading-spinner"></span>
            ) : (
              "Crear Sesión"
            )}
          </button>
        </div>

        {!isValid && amount && participants.length > 0 && (
          <p className="text-warning text-sm mt-2 text-center">
            Se requieren de 2 a 5 direcciones de Starknet válidas para crear una
            sesión.
          </p>
        )}
      </div>
    </div>
  );
};
