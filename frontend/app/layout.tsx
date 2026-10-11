import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BreadCycle — Rescue Food. Restore Hope.',
  description:
    'Intelligent food rescue platform matching surplus meals with verified shelters, community kitchens, and individuals before safe consumption windows expire.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="bg-[#fdfbf7] text-[#1c1917] antialiased selection:bg-wheat-300 selection:text-forest-950 font-sans min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
