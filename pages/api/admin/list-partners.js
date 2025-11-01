// API для получения списка всех партнеров (только для админа)
const { getAllPartners } = require('../../../lib/db')

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Проверка авторизации админа
    const authHeader = req.headers.authorization
    const apiSecret = process.env.API_SECRET
    const adminChatId = process.env.ADMIN_CHAT_ID

    // Проверяем через API_SECRET или получаем telegram_id из query
    const telegramId = req.query.telegram_id
    
    if (!apiSecret || authHeader !== `Bearer ${apiSecret}`) {
      // Если нет API_SECRET, проверяем через ADMIN_CHAT_ID
      if (!adminChatId || !telegramId || String(telegramId) !== String(adminChatId)) {
        console.error('❌ Unauthorized admin access attempt')
        return res.status(401).json({ error: 'Unauthorized' })
      }
    }

    // Проверяем что БД настроена
    if (!process.env.DB_HOST) {
      console.error('❌ Database not configured')
      return res.status(500).json({ 
        error: 'Database not configured',
        message: 'Please configure database connection in .env.local'
      })
    }

    // Получаем всех партнеров
    const partners = await getAllPartners()

    console.log('📊 Partners from DB:', partners.length, 'partners')
    console.log('📋 Sample partner data:', partners[0] || 'No partners')

    return res.status(200).json({
      success: true,
      partners: partners
    })

  } catch (error) {
    console.error('❌ Error getting partners list:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    })
  }
}

