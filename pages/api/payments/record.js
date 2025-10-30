// API для записи платежей от Python бота
const { recordPayment } = require('../../../lib/db')

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Проверка авторизации
    const authHeader = req.headers.authorization
    const apiSecret = process.env.API_SECRET

    if (!apiSecret || authHeader !== `Bearer ${apiSecret}`) {
      console.error('❌ Unauthorized payment attempt')
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const {
      user_telegram_id,
      amount,
      currency = 'RUB',
      username,
      first_name,
      last_name,
      transaction_id,
      promo_code,
      referrer_telegram_id,
      product_name = 'VEXTR Subscription',
      subscription_period = '1_month',
      payment_provider,
      paid_at
    } = req.body

    // Валидация обязательных полей
    if (!user_telegram_id || !amount) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['user_telegram_id', 'amount']
      })
    }

    console.log('📥 Recording payment:', {
      user: user_telegram_id,
      amount,
      promo_code,
      referrer: referrer_telegram_id
    })

    // Проверка наличия базы данных
    if (!process.env.DB_HOST) {
      console.warn('⚠️ Database not configured - logging payment only')
      console.log('Payment data:', req.body)
      return res.status(200).json({
        success: true,
        message: 'Payment logged (database not configured)',
        payment: req.body
      })
    }

    // Записываем платёж в базу
    const payment = await recordPayment({
      user_telegram_id,
      username,
      first_name,
      last_name,
      amount,
      currency,
      payment_provider,
      transaction_id,
      promo_code,
      referrer_telegram_id,
      product_name,
      subscription_period,
      paid_at: paid_at || new Date().toISOString()
    })

    console.log('✅ Payment recorded:', payment.id)

    return res.status(200).json({
      success: true,
      message: 'Payment recorded successfully',
      payment: {
        id: payment.id,
        user_telegram_id: payment.user_telegram_id,
        amount: payment.amount,
        commission_amount: payment.commission_amount,
        is_first_payment: payment.is_first_payment,
        referrer_telegram_id: payment.referrer_telegram_id
      }
    })

  } catch (error) {
    console.error('❌ Error recording payment:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    })
  }
}

