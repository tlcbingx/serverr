// API для обновления промокода и комиссии партнера (только для админа)
const { updatePartnerPromoCode, updatePartnerCommission } = require('../../../lib/db')

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Проверка авторизации админа
    const authHeader = req.headers.authorization
    const apiSecret = process.env.API_SECRET
    const adminChatId = process.env.ADMIN_CHAT_ID

    const { telegram_id, promo_code, commission_rate } = req.body

    // Проверяем через API_SECRET или через telegram_id из body
    let isAuthorized = false
    
    if (apiSecret && authHeader === `Bearer ${apiSecret}`) {
      isAuthorized = true
    } else if (adminChatId && req.body.admin_telegram_id) {
      // Проверяем через ADMIN_CHAT_ID из body
      if (String(req.body.admin_telegram_id) === String(adminChatId)) {
        isAuthorized = true
      }
    }

    if (!isAuthorized) {
      console.error('❌ Unauthorized admin update attempt')
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (!telegram_id) {
      return res.status(400).json({ error: 'telegram_id is required' })
    }

    // Проверяем что БД настроена
    if (!process.env.DB_HOST) {
      console.error('❌ Database not configured')
      return res.status(500).json({ 
        error: 'Database not configured',
        message: 'Please configure database connection in .env.local'
      })
    }

    let updatedFields = {}

    // Обновляем промокод если указан
    if (promo_code !== undefined && promo_code !== null) {
      try {
        const result = await updatePartnerPromoCode(telegram_id, promo_code)
        if (!result) {
          return res.status(404).json({ error: 'Partner not found or not approved' })
        }
        updatedFields.promo_code = result.promo_code
      } catch (error) {
        console.error('❌ Error updating promo code:', error)
        return res.status(400).json({ 
          error: 'Error updating promo code',
          details: error.message 
        })
      }
    }

    // Обновляем комиссию если указана
    if (commission_rate !== undefined && commission_rate !== null) {
      try {
        const result = await updatePartnerCommission(telegram_id, commission_rate)
        if (!result) {
          return res.status(404).json({ error: 'Partner not found or not approved' })
        }
        updatedFields.commission_rate = result.commission_rate
      } catch (error) {
        console.error('❌ Error updating commission:', error)
        return res.status(400).json({ 
          error: 'Error updating commission',
          details: error.message 
        })
      }
    }

    if (Object.keys(updatedFields).length === 0) {
      return res.status(400).json({ error: 'Nothing to update. Provide promo_code or commission_rate' })
    }

    return res.status(200).json({
      success: true,
      message: 'Partner updated successfully',
      updated: updatedFields
    })

  } catch (error) {
    console.error('❌ Error updating partner:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    })
  }
}

