import { Badge } from "@/components/ui/badge";
import { stockStatus, type ClientProduct } from "@/lib/serialize";

export function StockBadge({ product }: { product: Pick<ClientProduct, "trackStock" | "stock" | "minStock"> }) {
  const s = stockStatus(product);
  if (s === "out") return <Badge variant="destructive">Agotado</Badge>;
  if (s === "low") return <Badge className="bg-caramelo-400 text-uva-900">Stock bajo · {product.stock}</Badge>;
  return null;
}
