import "server-only";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { type Role, User } from "@/models/User";

export class ForbiddenError extends Error {}

/**
 * Verifica sesión + rol en el servidor. Consulta la BD para que un usuario desactivado
 * o con rol cambiado pierda acceso de inmediato, aunque su JWT siga vigente.
 */
export async function requireRole(...roles: Role[]) {
  const session = await auth();
  if (!session?.user) throw new ForbiddenError("No autenticado");
  await connectDB();
  const user = await User.findById(session.user.id).lean();
  if (!user?.active || !roles.includes(user.role)) throw new ForbiddenError("Sin permiso");
  return { id: String(user._id), name: user.name, username: user.username, role: user.role };
}
