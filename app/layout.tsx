import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "The Rosemont Club",
  description:
    "A neighborhood site for Rosemont, Alexandria, Virginia: groups, events, local resources, and community questions.",
  icons: { icon: "/favicon.svg" },
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
