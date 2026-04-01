use starknet::ContractAddress;

#[starknet::interface]
pub trait IERC20<TState> {
    fn transfer_from(
        ref self: TState, sender: ContractAddress, recipient: ContractAddress, amount: u256,
    ) -> bool;
    fn transfer(ref self: TState, recipient: ContractAddress, amount: u256) -> bool;
}

#[derive(Drop, Serde, starknet::Store)]
pub struct MichiSession {
    pub creator: ContractAddress,
    pub total_amount: u256,
    pub amount_collected: u256,
    pub is_active: bool,
}

#[starknet::interface]
pub trait IMichiPay<TContractState> {
    fn create_session(
        ref self: TContractState, total_amount: u256, participants: Array<ContractAddress>,
    ) -> u32;
    fn pay_share(ref self: TContractState, session_id: u32);
    fn claim_funds(ref self: TContractState, session_id: u32);
    fn get_user_debt(self: @TContractState, user: ContractAddress) -> u256;
    fn get_session(self: @TContractState, session_id: u32) -> MichiSession;
    fn get_session_counter(self: @TContractState) -> u32;
    fn get_session_debt(self: @TContractState, session_id: u32, user: ContractAddress) -> u256;
    fn get_session_participants(self: @TContractState, session_id: u32) -> Array<ContractAddress>;
}

#[starknet::contract]
pub mod MichiPayContract {
    use starknet::storage::{
        Map, StoragePathEntry, StoragePointerReadAccess, StoragePointerWriteAccess,
    };
    use starknet::{ContractAddress, get_caller_address, get_contract_address};
    use super::{IERC20Dispatcher, IERC20DispatcherTrait, MichiSession};

    #[storage]
    struct Storage {
        strk_token_address: ContractAddress,
        session_counter: u32,
        sessions: Map<u32, MichiSession>,
        debts: Map<(u32, ContractAddress), u256>,
        session_participants_count: Map<u32, u32>,
        session_participants: Map<(u32, u32), ContractAddress>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        SessionCreated: SessionCreated,
        SharePaid: SharePaid,
        FundsClaimed: FundsClaimed,
    }

    #[derive(Drop, starknet::Event)]
    pub struct SessionCreated {
        pub session_id: u32,
        pub creator: ContractAddress,
        pub total_amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct SharePaid {
        pub session_id: u32,
        pub participant: ContractAddress,
        pub amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct FundsClaimed {
        pub session_id: u32,
        pub creator: ContractAddress,
        pub amount: u256,
    }

    #[constructor]
    fn constructor(ref self: ContractState, strk_address: ContractAddress) {
        self.strk_token_address.write(strk_address);
    }

    #[abi(embed_v0)]
    impl MichiPayImpl of super::IMichiPay<ContractState> {
        fn create_session(
            ref self: ContractState, total_amount: u256, participants: Array<ContractAddress>,
        ) -> u32 {
            let num_participants = participants.len();
            assert(num_participants >= 2, 'Minimo 2 participantes');
            assert(num_participants <= 5, 'Maximo 5 participantes');
            assert(total_amount > 0, 'Total debe ser mayor a 0');

            let creator = get_caller_address();
            let session_id = self.session_counter.read() + 1;
            let amount_per_person = total_amount / num_participants.into();
            let num_participants_u32: u32 = num_participants.try_into().unwrap();

            let mut i: u32 = 0;
            loop {
                if i == num_participants_u32 {
                    break;
                }
                let i_usize: usize = i.try_into().unwrap();
                let participant_address = *participants.at(i_usize);
                self.debts.entry((session_id, participant_address)).write(amount_per_person);
                self.session_participants.entry((session_id, i)).write(participant_address);
                i += 1;
            }

            self.session_participants_count.entry(session_id).write(num_participants_u32);

            let new_session = MichiSession {
                creator: creator, total_amount: total_amount, amount_collected: 0, is_active: true,
            };

            self.sessions.entry(session_id).write(new_session);
            self.session_counter.write(session_id);

            self.emit(SessionCreated { session_id, creator, total_amount });
            session_id
        }

        fn pay_share(ref self: ContractState, session_id: u32) {
            let caller = get_caller_address();
            let amount_owed = self.debts.entry((session_id, caller)).read();
            assert(amount_owed > 0, 'No tienes deuda o ya pagaste');

            let mut session = self.sessions.entry(session_id).read();
            assert(session.is_active, 'La sesion no esta activa');

            self.debts.entry((session_id, caller)).write(0);
            session.amount_collected += amount_owed;
            self.sessions.entry(session_id).write(session);

            let strk_address = self.strk_token_address.read();
            let strk_dispatcher = IERC20Dispatcher { contract_address: strk_address };
            let this_contract = get_contract_address();

            let success = strk_dispatcher.transfer_from(caller, this_contract, amount_owed);
            assert(success, 'Fallo transferencia STRK');

            self.emit(SharePaid { session_id, participant: caller, amount: amount_owed });
        }

        fn claim_funds(ref self: ContractState, session_id: u32) {
            let caller = get_caller_address();
            let mut session = self.sessions.entry(session_id).read();

            assert(caller == session.creator, 'Solo creador puede retirar');
            assert(session.is_active, 'Sesion ya cerrada');
            assert(session.amount_collected > 0, 'No hay fondos');

            let amount_to_transfer = session.amount_collected;
            session.amount_collected = 0;
            session.is_active = false;
            self.sessions.entry(session_id).write(session);

            let strk_address = self.strk_token_address.read();
            let strk_dispatcher = IERC20Dispatcher { contract_address: strk_address };

            let success = strk_dispatcher.transfer(caller, amount_to_transfer);
            assert(success, 'Fallo el retiro');

            self.emit(FundsClaimed { session_id, creator: caller, amount: amount_to_transfer });
        }

        fn get_user_debt(self: @ContractState, user: ContractAddress) -> u256 {
            let mut total_debt: u256 = 0;
            let counter = self.session_counter.read();
            let mut i: u32 = 1;

            loop {
                if i > counter {
                    break;
                }
                let session = self.sessions.entry(i).read();
                if session.is_active {
                    let debt = self.debts.entry((i, user)).read();
                    total_debt += debt;
                }
                i += 1;
            };

            total_debt
        }

        fn get_session(self: @ContractState, session_id: u32) -> MichiSession {
            self.sessions.entry(session_id).read()
        }

        fn get_session_counter(self: @ContractState) -> u32 {
            self.session_counter.read()
        }

        fn get_session_debt(self: @ContractState, session_id: u32, user: ContractAddress) -> u256 {
            self.debts.entry((session_id, user)).read()
        }

        fn get_session_participants(self: @ContractState, session_id: u32) -> Array<ContractAddress> {
            let mut result = ArrayTrait::new();
            let count = self.session_participants_count.entry(session_id).read();
            let mut i: u32 = 0;
            loop {
                if i == count {
                    break;
                }
                result.append(self.session_participants.entry((session_id, i)).read());
                i += 1;
            };
            result
        }
    }
}
