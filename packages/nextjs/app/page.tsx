"use client";

import { useState } from "react";
import Image from "next/image";
import { ConnectedAddress } from "~~/components/ConnectedAddress";
import { Dashboard } from "~~/components/MichiPay/Dashboard";
import { SessionCreator } from "~~/components/MichiPay/SessionCreator";

type ViewState = "welcome" | "dashboard" | "create";

const Home = () => {
  const [currentView, setCurrentView] = useState<ViewState>("welcome");

  return (
    <div className="flex flex-col grow pt-4 px-4 max-w-2xl mx-auto w-full mb-10 overflow-x-hidden">
      {currentView === "welcome" && (
        <div className="flex flex-col items-center justify-center grow space-y-6 w-full animate-[fadeIn_0.5s_ease-in-out] text-center mt-6">
          <div className="relative w-64 h-64 rounded-3xl overflow-hidden shadow-2xl border-4 border-primary/20 bg-base-200">
            <Image 
              src="/hero-cat.png" 
              alt="MichiPay Hero Cat" 
              fill 
              className="object-cover"
              priority
            />
          </div>
          
          <div className="backdrop-blur-xl bg-base-100/60 p-6 rounded-[2rem] shadow-xl border border-white/10 w-full mb-2">
            <h1 className="text-center">
              <span className="block text-2xl mb-1 font-medium italic text-base-content/80">Bienvenido a</span>
              <span className="block text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary drop-shadow-sm">
                MichiPay
              </span>
            </h1>
            <p className="text-lg mt-4 mb-2 text-base-content/90 font-medium">
              Divide cuentas fácilmente<br />en Starknet L2.
            </p>
          </div>
          
          <div className="w-full">
            <ConnectedAddress />
          </div>

          <button 
            onClick={() => setCurrentView("dashboard")}
            className="btn btn-primary btn-lg w-full rounded-full shadow-lg hover:scale-105 transition-transform duration-200 mt-4"
          >
            Ir al Panel
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      )}

      {currentView === "dashboard" && (
        <div className="w-full animate-[fadeIn_0.3s_ease-in-out]">
          <Dashboard onGoToCreate={() => setCurrentView("create")} />
          <div className="flex justify-center w-full mt-8">
            <button 
               onClick={() => setCurrentView("welcome")}
               className="btn btn-ghost border border-base-300 bg-base-100 hover:bg-base-200 text-base-content/80 font-medium w-full max-w-sm rounded-xl shadow-sm transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver al Inicio
            </button>
          </div>
        </div>
      )}

      {currentView === "create" && (
        <div className="w-full animate-[fadeIn_0.3s_ease-in-out]">
          <SessionCreator 
            onSuccess={() => setCurrentView("dashboard")} 
            onCancel={() => setCurrentView("dashboard")} 
          />
        </div>
      )}
    </div>
  );
};

export default Home;
