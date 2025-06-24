import { vi } from "vitest";

const getMockSendMail = (nodemailer: any) => {
  const mockTransport = nodemailer.createTransport();
  return mockTransport.sendMail as ReturnType<typeof vi.fn>;
};

export { getMockSendMail };
