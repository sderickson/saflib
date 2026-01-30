let printDirectToConsole = false;
let pendingMessages: string[] = [];

export const setPrintDirectToConsole = (printDirectToConsole: boolean) => {
  printDirectToConsole = printDirectToConsole;
};

export const addPendingMessage = (message: string) => {
  if (printDirectToConsole) {
    return;
  }
  pendingMessages.push(message);
};

export const popPendingMessages = () => {
  const messages = pendingMessages;
  pendingMessages = [];
  return messages;
};
