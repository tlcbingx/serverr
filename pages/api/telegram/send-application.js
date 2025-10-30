// API для отправки заявок админу в Telegram

const BOT_TOKEN = process.env.BOT_TOKEN
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID // Ваш Telegram ID

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { application } = req.body

    if (!BOT_TOKEN || !ADMIN_CHAT_ID) {
      console.error('Missing BOT_TOKEN or ADMIN_CHAT_ID')
      return res.status(500).json({ error: 'Telegram not configured' })
    }

    // Парсим данные формы
    const formData = typeof application.form_data === 'string' 
      ? JSON.parse(application.form_data) 
      : application.form_data

    // Формируем красивое сообщение
    const message = `
🆕 <b>Новая заявка на партнёрство!</b>

👤 <b>Контактная информация:</b>
ФИО: ${formData.fullName}
Telegram: ${formData.telegramNick}
Email: ${formData.email}
${formData.age ? `Возраст: ${formData.age}` : ''}
TG ID: <code>${application.telegram_id}</code>

📝 <b>О себе:</b>
${formData.aboutYou || 'Не указано'}

👥 <b>Аудитория:</b>
${formData.hasAudience && formData.hasAudience.length > 0 ? formData.hasAudience.join(', ') : 'Не указано'}
${formData.socialLinks ? `\n🔗 Соцсети:\n${formData.socialLinks}` : ''}

📢 <b>Методы продвижения:</b>
${formData.promotionMethods && formData.promotionMethods.length > 0 ? formData.promotionMethods.join(', ') : 'Не указано'}

${formData.promotionDetails ? `<b>Детали:</b>\n${formData.promotionDetails}` : ''}

${formData.targetAudience ? `<b>Целевая аудитория:</b>\n${formData.targetAudience}` : ''}

🎯 <b>Ожидаемый результат:</b>
${formData.expectedResults || 'Не указано'}

📅 Подано: ${new Date(application.submitted_at).toLocaleString('ru-RU')}
`.trim()

    // Отправляем сообщение с Inline кнопками
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '✅ Одобрить',
                callback_data: `approve_${application.id}_${application.telegram_id}`
              },
              {
                text: '❌ Отклонить',
                callback_data: `reject_${application.id}_${application.telegram_id}`
              }
            ]
          ]
        }
      })
    })

    const data = await response.json()

    if (!data.ok) {
      console.error('Telegram API error:', data)
      return res.status(500).json({ error: 'Failed to send Telegram message', details: data })
    }

    console.log('✅ Application sent to admin in Telegram')

    return res.status(200).json({
      success: true,
      message: 'Application sent to admin'
    })

  } catch (error) {
    console.error('Error sending to Telegram:', error)
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    })
  }
}

