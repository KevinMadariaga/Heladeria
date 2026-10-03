import type { Role } from "@/models/User";

declare module "next-auth" {
  interface User {
    role: Role;
    username: string;
  }
  interface Session {
    user: { id: string; name: string; username: string; role: Role };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    username: string;
  }
}
