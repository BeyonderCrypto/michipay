"use client";

import { useState } from "react";
import { CallData } from "starknet";
import {
  useDeployedContractInfo,
  useTransactor,
} from "~~/hooks/scaffold-stark";
import { useFiatToStrk } from "~~/hooks/michipay/useFiatToStrk";
import { useAddressBook } from "~~/hooks/michipay/useAddressBook";

export const SessionCreator = () => {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"USD" | "MXN">("MXN");
  const [participants, setParticipants] = useState<string[]>([""]); // Start with 1 empty input
  const [isTxPending, setIsTxPending] = useState(false);

  const {
    convertFiatToStrkU256,
    convertFiatToStrkDisplay,
    isLoading: ratesLoading,
  } = useFiatToStrk();
  const { contacts, getSuggestions } = useAddressBook();

  const { data: deployedContractData } =
    useDeployedContractInfo("MichiPayContract");
  const { writeTransaction } = useTransactor();

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
    Number(amount) > 0;

  const handleSubmit = async () => {
    if (!isValid || !deployedContractData) return;

    try {
      setIsTxPending(true);
      const amountU256 = convertFiatToStrkU256(Number(amount), currency);
      if (!amountU256) throw new Error("Invalid amount conversion");

      // We explicitly compile Calldata for the tx array payload
      // writeTransaction from useTransactor expects an array of Calls
      await writeTransaction([
        {
          contractAddress: deployedContractData.address,
          entrypoint: "create_session",
          calldata: CallData.compile([
            amountU256 as any,
            validParticipants as any,
          ]),
        },
      ]);
      console.log("Session created successfully");
      // Reset form on success
      setAmount("");
      setParticipants([""]);
    } catch (e) {
      console.error("Failed to create session:", e);
    } finally {
      setIsTxPending(false);
    }
  };

  return (
    <div className="card bg-base-100 shadow-xl border border-primary/20">
      <div className="card-body">
        <h2 className="card-title text-2xl text-primary">Split a Bill</h2>

        <div className="form-control w-full my-2">
          <label className="label">
            <span className="label-text">Total Bill Amount</span>
            <span className="label-text-alt">
              {ratesLoading
                ? "Loading rates..."
                : `Est: ${convertFiatToStrkDisplay(Number(amount || 0), currency)?.toFixed(4) || "0.0000"} STRK`}
            </span>
          </label>
          <div className="join w-full">
            <input
              type="number"
              placeholder="0.00"
              className="input input-bordered join-item w-full"
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

        <div className="divider my-0"></div>

        <div className="flex justify-between items-center mb-2">
          <span className="label-text font-medium">Participants (2-5)</span>
          <span className="text-xs opacity-70">
            {validParticipants.length}/5 Valid
          </span>
        </div>

        {participants.map((participant, idx) => (
          <div key={idx} className="flex gap-2 mb-2">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Address (0x...) or Alias..."
                className="input input-bordered w-full input-sm"
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
              className="btn btn-square btn-sm btn-error btn-outline"
              onClick={() => handleRemoveParticipant(idx)}
              disabled={participants.length <= 1}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
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
          className="btn btn-sm btn-outline btn-block mt-2"
          onClick={handleAddParticipant}
          disabled={participants.length >= 5}
        >
          + Add Participant
        </button>

        <div className="card-actions justify-end mt-6">
          <button
            className="btn btn-primary w-full"
            disabled={!isValid || isTxPending}
            onClick={handleSubmit}
          >
            {isTxPending ? (
              <span className="loading loading-spinner"></span>
            ) : (
              "Create Session"
            )}
          </button>
        </div>

        {!isValid && amount && participants.length > 0 && (
          <p className="text-warning text-sm mt-2 text-center">
            Need 2 to 5 valid Starknet addresses to create a session.
          </p>
        )}
      </div>
    </div>
  );
};
