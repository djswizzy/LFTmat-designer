import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tile Mat Designer",
  description:
    "Design your own customizable hexagon tile mat. Paint, type, or import images, then see exactly which tiles to swap to bring it to life.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
