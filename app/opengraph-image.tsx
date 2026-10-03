import { ImageResponse } from "next/og";

// Vista previa al compartir el enlace (WhatsApp, Facebook…).
export const alt = "Katty Heladería";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          background: "linear-gradient(135deg, #F1E6FD 0%, #E6D4FA 55%, #F7B9DA 100%)",
          color: "#3D0F57",
        }}
      >
        <div style={{ fontSize: 160 }}>🍦☕</div>
        <div
          style={{
            display: "flex",
            fontSize: 110,
            fontWeight: 800,
            padding: "8px 48px",
            borderRadius: 48,
            background: "#ffffff",
            border: "10px solid #B98AE6",
          }}
        >
          Katty Heladería
        </div>
        <div style={{ fontSize: 40, color: "#5B1A7E" }}>Helados · Café · Postres</div>
      </div>
    ),
    size,
  );
}
