import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth-guard";
import { User } from "@/models/User";
import { setUserActive } from "./actions";
import { CreateUser } from "./create-user";
import { UserForm } from "./user-form";

export const metadata: Metadata = { title: "Usuarios" };

export default async function UsuariosPage() {
  const me = await requireRole("admin");
  const users = await User.find().sort({ active: -1, name: 1 }).lean();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold">Usuarios</h1>

      <CreateUser />

      <ul className="flex flex-col gap-3">
        {users.map((u) => {
          const id = String(u._id);
          return (
            <li key={id} className={`sticker bg-card p-4 ${u.active ? "" : "opacity-60"}`}>
              <details>
                <summary className="flex cursor-pointer flex-wrap items-center gap-3">
                  <span className="font-heading text-lg font-semibold">{u.name}</span>
                  <span className="text-muted-foreground">@{u.username}</span>
                  <Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role === "admin" ? "Admin" : "Cajero"}</Badge>
                  {!u.active && <Badge variant="outline">Inactivo</Badge>}
                </summary>
                <div className="mt-4 flex flex-col gap-4">
                  <UserForm user={{ id, name: u.name, username: u.username, role: u.role }} />
                  {id !== me.id && (
                    <form action={setUserActive}>
                      <input type="hidden" name="id" value={id} />
                      <input type="hidden" name="active" value={String(!u.active)} />
                      <Button type="submit" variant={u.active ? "destructive" : "outline"} className="h-10 rounded-xl">
                        {u.active ? "Desactivar" : "Reactivar"}
                      </Button>
                    </form>
                  )}
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
