import { describe, expect, it } from "vitest";
import { formatCOP } from "@/lib/money";

describe("formatCOP", () => {
  it("usa punto de miles y sin decimales", () => {
    expect(formatCOP(25000).replace(/\s/g, "")).toBe("$25.000");
    expect(formatCOP(1250000).replace(/\s/g, "")).toBe("$1.250.000");
    expect(formatCOP(0).replace(/\s/g, "")).toBe("$0");
  });
});
