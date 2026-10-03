import { connectDB } from "@/lib/db";
import { ImageBlob } from "@/models/ImageBlob";

// Público a propósito: son fotos del menú. El id cambia en cada subida → caché inmutable.
export async function GET(_req: Request, ctx: RouteContext<"/api/images/[id]">) {
  const { id } = await ctx.params;
  if (!/^[a-f0-9]{24}$/.test(id)) return new Response(null, { status: 404 });
  await connectDB();
  const img = await ImageBlob.findById(id);
  if (!img) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(img.data), {
    headers: { "Content-Type": img.contentType, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
