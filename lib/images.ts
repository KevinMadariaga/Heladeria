import "server-only";
import { v2 as cloudinary } from "cloudinary";
import { BusinessError } from "@/lib/cash";
import { connectDB } from "@/lib/db";
import { ImageBlob } from "@/models/ImageBlob";

const MAX_BYTES = 3 * 1024 * 1024;
const LOCAL_PREFIX = "/api/images/";

/** Sube a Cloudinary si está configurado; si no, guarda en MongoDB y sirve por /api/images/:id. */
export async function uploadProductImage(file: File) {
  if (!file.type.startsWith("image/")) throw new BusinessError("El archivo debe ser una imagen");
  if (file.size > MAX_BYTES) throw new BusinessError("La imagen debe pesar máximo 3 MB");
  const buffer = Buffer.from(await file.arrayBuffer());

  const { CLOUDINARY_CLOUD_NAME: cloud_name, CLOUDINARY_API_KEY: api_key, CLOUDINARY_API_SECRET: api_secret } = process.env;
  if (!cloud_name || !api_key || !api_secret) {
    await connectDB();
    const img = await ImageBlob.create({ data: buffer, contentType: file.type });
    return `${LOCAL_PREFIX}${img.id}`;
  }

  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
  const result = await new Promise<{ secure_url: string }>((resolve, reject) =>
    cloudinary.uploader
      .upload_stream(
        { folder: "kathy-pos/productos", transformation: [{ width: 900, height: 900, crop: "limit" }, { quality: "auto", fetch_format: "auto" }] },
        (err, res) => (err || !res ? reject(err) : resolve(res)),
      )
      .end(buffer),
  );
  return result.secure_url;
}

/** Borra la foto anterior si estaba en Mongo (las de Cloudinary se quedan allá). */
export async function deleteLocalImage(url?: string | null) {
  const id = url?.startsWith(LOCAL_PREFIX) && url.slice(LOCAL_PREFIX.length);
  if (id && /^[a-f0-9]{24}$/.test(id)) await ImageBlob.deleteOne({ _id: id });
}
