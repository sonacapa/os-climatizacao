import './globals.css';

export const metadata = {
  title: 'Ordens de Serviço · Climatização',
  description: 'Gestão de ordens de serviço, equipamentos e laudos de climatização.',
  appleWebApp: { capable: true, title: 'O.S. Clima', statusBarStyle: 'default' }
};

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#0284c7' };

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
