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
}