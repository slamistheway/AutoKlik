import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoKlik Admin | Demo prototip",
  description: "Administracijski prototip AutoKlika s demonstracijskim podacima.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="hr">
      <body>{children}</body>
    </html>
  );
}
