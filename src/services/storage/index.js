// src/services/storage/index.js
import indexedDb from './adapters/indexedDb';
import localStorageAdapter from './adapters/localStorage';

const storage = indexedDb; // zmień na localStorageAdapter, jeśli chcesz fallback na szybko
export default storage;
