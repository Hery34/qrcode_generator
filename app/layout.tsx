import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { BRAND_COMPANY_NAME, brandCssVariables } from '@/lib/brand';
import './globals.css';

export const metadata: Metadata = {
  title: `${BRAND_COMPANY_NAME} — QR & fiches`,
  description: `Générateur de QR codes ${BRAND_COMPANY_NAME} avec fiche publique et export PNG/PDF.`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased" style={brandCssVariables as CSSProperties}>
        {children}
      </body>
    </html>
  );
}
