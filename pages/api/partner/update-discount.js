const { updatePartnerDiscount } = require('../../../lib/db')

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { telegram_id, discount } = req.body

    if (!telegram_id) {
      return res.status(400).json({ error: 'telegram_id is required' })
    }

    if (discount === undefined || discount < 0 || discount > 50) {
      return res.status(400).json({ error: 'discount must be between 0 and 50' })
    }

    console.log('Updating discount for partner:', telegram_id, 'discount:', discount)

    // Проверяем что БД настроена
    if (!process.env.DB_HOST) {
      console.error('❌ Database not configured')
      return res.status(500).json({ 
        error: 'Database not configured',
        message: 'Please configure database connection in .env.local'
      })
    }

    // Обновляем скидку партнера
    const result = await updatePartnerDiscount(telegram_id, discount)

    if (!result) {
      return res.status(404).json({ error: 'Partner not found or not approved' })
    }

    return res.status(200).json({
      success: true,
      message: 'Discount updated successfully'
    })

  } catch (error) {
    console.error('❌ Error updating discount:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    })
  }
}

