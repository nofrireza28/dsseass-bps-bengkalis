import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "SPK Pemilihan Pegawai Terbaik - BPS Bengkalis",
  description:
    "Sistem Pendukung Keputusan Pemilihan Pegawai Terbaik BPS Kabupaten Bengkalis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
