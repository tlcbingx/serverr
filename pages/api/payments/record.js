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

    // Отправляем уведомление партнёру, если есть referrer и комиссия
    if (payment.referrer_telegram_id && payment.commission_amount) {
      try {
        const BOT_TOKEN = process.env.BOT_TOKEN
        
        if (BOT_TOKEN) {
          const partnerMessage = `
🎉 <b>Новая покупка по вашему промокоду!</b>

💰 <b>Сумма платежа:</b>
<code>${parseFloat(payment.amount).toLocaleString('ru-RU')} ${payment.currency || 'RUB'}</code>

💵 <b>Ваша комиссия:</b>
<code>${parseFloat(payment.commission_amount || 0).toLocaleString('ru-RU')} ${payment.currency || 'RUB'}</code>
${payment.is_first_payment ? '(100% от суммы)' : `(${payment.commission_rate || 0}% от суммы)`}

${payment.promo_code ? `🎁 Промокод: <code>${payment.promo_code}</code>` : ''}
📅 ${new Date(payment.paid_at || new Date()).toLocaleString('ru-RU')}
          `.trim()

          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: payment.referrer_telegram_id,
              text: partnerMessage,
              parse_mode: 'HTML',
              disable_web_page_preview: true
            })
          })

          console.log('✅ Notification sent to partner:', payment.referrer_telegram_id)
        } else {
          console.warn('⚠️ BOT_TOKEN not configured - skipping partner notification')
        }
      } catch (notificationError) {
        console.error('❌ Error sending partner notification:', notificationError)
        // Не блокируем ответ при ошибке уведомления
      }
    }

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

