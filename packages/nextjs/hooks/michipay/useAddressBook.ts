import { useState, useEffect } from 'react';

type AddressBookEntries = Record<string, string>;

/**
 * Hook to manage a local address book mapped to friendly names
 */
export const useAddressBook = () => {
  const [contacts, setContacts] = useState<AddressBookEntries>({});
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Load from local storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('michipay_address_book');
      if (stored) {
        setContacts(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load address book from local storage', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to local storage whenever contacts change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem('michipay_address_book', JSON.stringify(contacts));
      } catch (e) {
        console.error('Failed to save address book to local storage', e);
      }
    }
  }, [contacts, isLoaded]);

  const addContact = (name: string, address: string) => {
    if (!name.trim() || !address.trim()) return false;
    
    setContacts(prev => ({
      ...prev,
      [name]: address.trim()
    }));
    return true;
  };

  const removeContact = (name: string) => {
    setContacts(prev => {
      const updated = { ...prev };
      delete updated[name];
      return updated;
    });
  };

  const getAddressByName = (name: string): string | undefined => {
    return contacts[name];
  };

  // Helper for typeahead/autocomplete
  const getSuggestions = (query: string) => {
    const q = query.toLowerCase();
    return Object.entries(contacts)
      .filter(([name]) => name.toLowerCase().includes(q))
      .map(([name, address]) => ({ name, address }));
  };

  return {
    contacts,
    isLoaded,
    addContact,
    removeContact,
    getAddressByName,
    getSuggestions
  };
};
