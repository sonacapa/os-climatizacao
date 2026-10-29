export default function manifest() {
  return {
    name: 'Ordens de Serviço',
    short_name: 'O.S. Clima',
    description: 'Ordens de serviço, aparelhos e laudos de climatização.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#2a49c6',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  };
}
