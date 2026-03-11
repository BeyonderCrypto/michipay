import { ConnectedAddress } from "~~/components/ConnectedAddress";
import { Dashboard } from "~~/components/MichiPay/Dashboard";
import { SessionCreator } from "~~/components/MichiPay/SessionCreator";

const Home = () => {
  return (
    <div className="flex items-center flex-col grow pt-10">
      <div className="px-5 w-full max-w-4xl text-center">
        <h1 className="text-center">
          <span className="block text-2xl mb-2">Welcome to</span>
          <span className="block text-4xl font-bold text-primary">MichiPay</span>
        </h1>
        <p className="text-xl mb-4 text-base-content/80 font-medium tracking-wide">
          Split bills easily on Starknet L2.
        </p>
        <ConnectedAddress />
      </div>

      <div className="grow w-full mt-8 px-4 sm:px-8 py-12">
        <div className="flex justify-center gap-8 flex-col lg:flex-row w-full max-w-6xl mx-auto">
          {/* Left Column: Dashboard/Status */}
          <div className="flex-1 w-full">
            <Dashboard />
          </div>
          
          {/* Right Column: Create Session */}
          <div className="flex-1 w-full shrink-0 lg:max-w-md">
             <SessionCreator />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
