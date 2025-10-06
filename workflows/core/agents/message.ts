let pendingMessages: string[] = [];

export const addPendingMessage = (message: string) => {
  pendingMessages.push(message);
};

export const popPendingMessages = () => {
  const messages = pendingMessages;
  pendingMessages = [];
  return messages;
};
