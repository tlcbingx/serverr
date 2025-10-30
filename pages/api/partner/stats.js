const { getPartnerStats } = require('../../../lib/db')

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { telegram_id, period = '30' } = req.query

    if (!telegram_id) {
      return res.status(400).json({ error: 'telegram_id is required' })
    }

    console.log('Fetching stats for partner:', telegram_id, 'period:', period)

    // Проверяем что БД настроена
    if (!process.env.DB_HOST) {
      console.error('❌ Database not configured')
      return res.status(500).json({ 
        error: 'Database not configured',
        message: 'Please configure database connection in .env.local'
      })
    }

    // Получаем статистику партнера с фильтром по времени
    const stats = await getPartnerStats(telegram_id, period)

    console.log('📊 Partner stats from DB:', stats)

    if (!stats) {
      return res.status(200).json({
        success: true,
        stats: {
          totalPaidUsers: 0,
          totalRevenue: 0,
          commissionRate: 10,
          referralLink: `https://vextr.ru/?ref=${telegram_id}`,
          promoCode: `VEXTR${telegram_id}`,
          status: 'pending',
          firstPayments: 0,
          recurringPayments: 0,
          firstPaymentsRevenue: 0,
          recurringPaymentsRevenue: 0,
          discount: 0
        }
      })
    }

    return res.status(200).json({
      success: true,
      stats: {
        totalPaidUsers: stats.paid_users_count,
        totalRevenue: stats.total_revenue,
        commissionRate: stats.commission_rate,
        referralLink: stats.referral_link,
        promoCode: stats.promo_code,
        status: stats.status || 'approved', // Берём статус из базы данных
        firstPayments: stats.first_payments_count || 0,
        recurringPayments: stats.recurring_payments_count || 0,
        firstPaymentsRevenue: stats.first_payments_revenue || 0,
        recurringPaymentsRevenue: stats.recurring_payments_revenue || 0,
        discount: stats.discount || 0
      }
    })

  } catch (error) {
    console.error('❌ Error fetching partner stats:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    })
  }
}

