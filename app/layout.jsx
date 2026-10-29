import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });

export const metadata = {
  title: 'Ordens de Serviço · Climatização',
  description: 'Gestão de ordens de serviço, equipamentos e laudos de climatização.',
  appleWebApp: { capable: true, title: 'O.S. Clima', statusBarStyle: 'default' }
};

export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#127a98' };

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
