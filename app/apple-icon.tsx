import { ImageResponse } from "next/og";

// Ícono al guardar la web en la pantalla de inicio del iPhone (PNG 180×180).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#5B1A7E", fontSize: 120 }}>
        🍦
      </div>
    ),
    size,
  );
}
