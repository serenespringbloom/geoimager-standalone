import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CVEDM",
  description: "CIELAB Vector Euclidean Distance Metrics — colour-based rock weathering grade classifier",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
