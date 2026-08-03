import type { MetadataRoute } from 'next'

const SITE_URL = 'https://themahjongcalculator.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // The recognition endpoint has nothing to index and costs money to call
      disallow: '/api/',
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
