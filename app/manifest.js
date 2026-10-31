export default function manifest() {
  return {
    id: '/',
    name: 'ClimaOS',
    short_name: 'ClimaOS',
    description: 'Ordens de serviço, aparelhos e laudos de climatização.',
    lang: 'pt-BR',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f2f4f8',
    theme_color: '#2a49c6',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  };
}
