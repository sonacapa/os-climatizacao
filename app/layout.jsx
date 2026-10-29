import './globals.css';
import PwaRegister from '@/components/PwaRegister';
import { Bricolage_Grotesque, Figtree } from 'next/font/google';

const display = Bricolage_Grotesque({ subsets: ['latin'], display: 'swap', variable: '--font-display' });
const body = Figtree({ subsets: ['latin'], display: 'swap', variable: '--font-body' });

export const metadata = {
  title: 'Ordens de Serviço · Climatização',
  description: 'Gestão de ordens de serviço, equipamentos e laudos de climatização.',
  appleWebApp: { capable: true, title: 'O.S. Clima', statusBarStyle: 'default' }
};

export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#2a49c6' };

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable}`}>
      <body className="font-sans">{children}<PwaRegister /></body>
    </html>
  );
}
