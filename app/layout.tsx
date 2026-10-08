import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rutina del día",
  description: "Rutinas de hipertrofia que se adaptan a tu tiempo y a cómo te sientes, generadas con IA.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0f1115" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
