declare module "better-sqlite3-session-store" {
  import { Store } from "express-session";
  interface StoreOptions {
    client: any;
    expired?: {
      clear: boolean;
      intervalMs: number;
    };
  }
  export default function (session: any): {
    new (options: StoreOptions): Store;
  };
}
