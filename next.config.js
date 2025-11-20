module.exports = {
  i18n: {
    locales: ['en'],
    defaultLocale: "en",
  },
  // Produce a standalone server build so Netlify's Next plugin can package
  // server artifacts reliably (creates .next/standalone)
  output: 'standalone',
  // Увеличиваем лимит размера тела запроса для API routes
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
    responseLimit: '10mb',
  },
  // Настройки для предотвращения проблем с загрузкой чанков
  generateBuildId: async () => {
    // Используем timestamp для уникальности билда
    return `build-${Date.now()}`
  },
  // Настройки кэширования для статических файлов
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}