import type { Metadata, Viewport } from "next";
import { Figtree, Fredoka, Pacifico } from "next/font/google";
import { MotionProvider } from "@/components/motion/providers";
import "./globals.css";

const fredoka = Fredoka({ variable: "--font-fredoka", subsets: ["latin"] });
const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"] });
const pacifico = Pacifico({ variable: "--font-pacifico", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: { default: "Katty Heladería", template: "%s · Katty Heladería" },
  description: "Helados, café y postres. Sistema de ventas e inventario de Katty Heladería.",
  applicationName: "Katty Heladería",
  appleWebApp: { title: "Katty Heladería" },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-CO"
      className={`${fredoka.variable} ${figtree.variable} ${pacifico.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
