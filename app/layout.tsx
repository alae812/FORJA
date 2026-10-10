import type { Metadata, Viewport } from "next";
import { Geist, Rajdhani } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "FORJA — Tu historia de entrenamiento",
  description:
    "App privada de fitness gamificado: entrena, sube de nivel y vive una novela visual original.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#06060c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geist.variable} ${rajdhani.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
