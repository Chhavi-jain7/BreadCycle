import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BreadCycle — Rescue Food. Restore Hope.',
  description:
    'Rescue good food and connect restaurants, individuals, NGOs, and community kitchens to build a greener, more caring future.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen flex flex-col bg-ivory-50 font-sans text-forest-950 antialiased selection:bg-wheat-300 selection:text-forest-950">
        {children}
      </body>
    </html>
  );
}
