// API для удаления партнера (только для админа)
const { deletePartner } = require('../../../lib/db')

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Проверка авторизации админа
    const authHeader = req.headers.authorization
    const apiSecret = process.env.API_SECRET
    const adminChatId = process.env.ADMIN_CHAT_ID

    const { telegram_id, admin_telegram_id } = req.body

    if (!telegram_id) {
      return res.status(400).json({ error: 'telegram_id is required' })
    }

    // Проверяем через API_SECRET или через telegram_id из body
    let isAuthorized = false
    
    if (apiSecret && authHeader === `Bearer ${apiSecret}`) {
      isAuthorized = true
    } else if (adminChatId && admin_telegram_id) {
      if (String(admin_telegram_id) === String(adminChatId)) {
        isAuthorized = true
      }
    }

    if (!isAuthorized) {
      console.error('❌ Unauthorized admin delete attempt')
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Проверяем что БД настроена
    if (!process.env.DB_HOST) {
      console.error('❌ Database not configured')
      return res.status(500).json({ 
        error: 'Database not configured',
        message: 'Please configure database connection in .env.local'
      })
    }

    // Удаляем партнера
    const result = await deletePartner(telegram_id)

    if (!result) {
      return res.status(404).json({ error: 'Partner not found or not approved' })
    }

    return res.status(200).json({
      success: true,
      message: 'Partner deleted successfully'
    })

  } catch (error) {
    console.error('❌ Error deleting partner:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    })
  }
}

