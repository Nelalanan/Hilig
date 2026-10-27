import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  allowedDevOrigins: ['guzzler-antsy-diffuser.ngrok-free.dev'],
  images: {
    // Remote hosts that next/image is allowed to optimise.
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // Supabase Storage (public buckets), used once hosts upload their own photos.
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
    ],
  },
}

export default nextConfig

