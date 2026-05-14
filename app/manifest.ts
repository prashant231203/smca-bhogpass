import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BhogPass',
    short_name: 'BhogPass',
    description: 'SMCA Event Gateway',
    start_url: '/',
    display: 'standalone',
    background_color: '#4f46e5',
    theme_color: '#4f46e5',
    icons: [
      {
        src: '/icon',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
