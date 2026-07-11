import { useState, useCallback } from 'react';

/**
 * A hook that persists state in localStorage or sessionStorage.
 * @param {Storage} storage - The storage object (localStorage or sessionStorage)
 * @param {string} key - The key to store the value under
 * @param {any} initialValue - The initial value if no stored value exists
 * @returns {[any, function]} A stateful value and a setter function
 */
export const usePersistentState = (storage, key, initialValue) => {
  const [value, setValue] = useState(() => {
    try {
      const item = storage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading ${key} from storage:`, error);
      return initialValue;
    }
  });

  const setValueWrapper = useCallback((newValue) => {
    try {
      const valueToStore = newValue instanceof Function ? newValue(value) : newValue;
      setValue(valueToStore);
      storage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error saving to ${key}:`, error);
    }
  }, [value, key, storage]);

  return [value, setValueWrapper];
};

export default usePersistentState;