// IPC Message handlers
const initializeIpcListeners = () => {
  // Send ping message
  window.ipc.send('message', 'ping 🏓');

  // Listen for reply
  window.ipc.receive('reply', () => {});
};

// Local Storage handlers
const initializeStorageHandlers = () => {
  // Set demo value
  window.ipc.set('unicorn', 'Hello World! 🦄');

  // Get and log stored value
};

// Initialize all listeners
initializeIpcListeners();
initializeStorageHandlers();

export {};
