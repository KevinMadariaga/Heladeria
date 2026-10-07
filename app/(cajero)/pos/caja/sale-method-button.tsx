"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { formatCOP } from "@/lib/money";
import type { PaymentMethod } from "@/models/Sale";
import { ChangeMethod } from "../change-method";

export function SaleMethodButton({ saleId, number, method, total }: { saleId: string; number: number; method: PaymentMethod; total: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="outline" className="h-9 rounded-xl" onClick={() => setOpen(true)}>
        Cambiar pago
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Venta #${number} · ${formatCOP(total)}`}>
        <ChangeMethod saleId={saleId} current={method} total={total} />
      </Modal>
    </>
  );
}
