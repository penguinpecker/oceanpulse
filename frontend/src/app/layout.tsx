import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OceanPulse — AI Infrastructure Health Agent",
  description:
    "Connect your DigitalOcean account. OceanPulse scans your entire infrastructure, finds cost savings, security gaps, and performance issues — then fixes them with your approval.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
