let listening = false;
let pendingMessages: string[] = [];

export const setListening = (listening: boolean) => {
  listening = listening;
};

export const addPendingMessage = (message: string) => {
  if (listening) {
    return;
  }
  pendingMessages.push(message);
};

export const popPendingMessages = () => {
  const messages = pendingMessages;
  pendingMessages = [];
  return messages;
};
