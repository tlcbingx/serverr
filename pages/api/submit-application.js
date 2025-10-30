const { saveApplication } = require('../../lib/db')

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { user, formData, submittedAt } = req.body

    console.log('Received application:', {
      telegram_id: user?.id,
      username: user?.username,
      email: formData?.email
    })

    // Валидация данных
    if (!user || !user.id) {
      return res.status(400).json({ error: 'User data is required' })
    }

    if (!formData || !formData.fullName || !formData.email || !formData.telegramNick) {
      return res.status(400).json({ error: 'Required fields are missing' })
    }

    const applicationData = {
      telegram_id: user.id.toString(),
      username: user.username || null,
      first_name: user.first_name,
      last_name: user.last_name || null,
      photo_url: user.photo_url || null,
      email: formData.email,
      full_name: formData.fullName,
      form_data: formData,
      submitted_at: submittedAt
    }

    let savedData = null
    let dbSuccess = false

    // Сохранение заявки в базу данных
    if (process.env.DB_HOST) {
      try {
        savedData = await saveApplication(applicationData)
        dbSuccess = true
        console.log('✅ Application saved to database:', {
          id: savedData.id,
          telegram_id: user.id,
          username: user.username
        })
      } catch (dbError) {
        console.error('❌ Database connection error:', dbError)
        console.warn('⚠️ Proceeding without database save')
      }
    } else {
      console.warn('⚠️ Database not configured - application will be logged only')
    }

    // Если база данных не сохранила, просто логируем заявку
    if (!dbSuccess) {
      console.log('=== NEW APPLICATION (NO DATABASE) ===')
      console.log(JSON.stringify(applicationData, null, 2))
      console.log('====================================')
    }

    // ВСЕГДА отправляем уведомление в Telegram, независимо от БД
    try {
      console.log('📤 Attempting to send Telegram notification...')
      
      const BOT_TOKEN = process.env.BOT_TOKEN
      const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID

      if (!BOT_TOKEN || !ADMIN_CHAT_ID) {
        console.error('❌ Missing BOT_TOKEN or ADMIN_CHAT_ID')
        console.log('BOT_TOKEN exists:', !!BOT_TOKEN)
        console.log('ADMIN_CHAT_ID:', ADMIN_CHAT_ID)
      } else {
        // Парсим данные формы
        const sourceData = savedData || applicationData
        const parsedFormData = sourceData.form_data

        // Формируем сообщение
        const message = `
🆕 <b>Новая заявка на партнёрство!</b>

👤 <b>Контактная информация:</b>
ФИО: ${parsedFormData.fullName}
Telegram: ${parsedFormData.telegramNick}
Email: ${parsedFormData.email}
${parsedFormData.age ? `Возраст: ${parsedFormData.age}` : ''}
TG ID: <code>${sourceData.telegram_id}</code>

📝 <b>О себе:</b>
${parsedFormData.aboutYou || 'Не указано'}

👥 <b>Аудитория:</b>
${parsedFormData.hasAudience && parsedFormData.hasAudience.length > 0 ? parsedFormData.hasAudience.join(', ') : 'Не указано'}
${parsedFormData.socialLinks ? `\n🔗 Соцсети:\n${parsedFormData.socialLinks}` : ''}

📢 <b>Методы продвижения:</b>
${parsedFormData.promotionMethods && parsedFormData.promotionMethods.length > 0 ? parsedFormData.promotionMethods.join(', ') : 'Не указано'}

${parsedFormData.promotionDetails ? `<b>Детали:</b>\n${parsedFormData.promotionDetails}` : ''}

${parsedFormData.targetAudience ? `<b>Целевая аудитория:</b>\n${parsedFormData.targetAudience}` : ''}

🎯 <b>Ожидаемый результат:</b>
${parsedFormData.expectedResults || 'Не указано'}

📅 Подано: ${new Date(sourceData.submitted_at).toLocaleString('ru-RU')}
        `.trim()

        // Отправляем в Telegram
        const telegramResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: ADMIN_CHAT_ID,
            text: message,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [[
                { 
                  text: '✅ Одобрить (20%)', 
                  callback_data: savedData 
                    ? `approve_20_${savedData.id}_${savedData.telegram_id}` 
                    : `approve_20_temp_${sourceData.telegram_id}`
                },
                { 
                  text: '✅ Одобрить (10%)', 
                  callback_data: savedData 
                    ? `approve_10_${savedData.id}_${savedData.telegram_id}` 
                    : `approve_10_temp_${sourceData.telegram_id}`
                }
              ], [
                { 
                  text: '❌ Отклонить', 
                  callback_data: savedData 
                    ? `reject_${savedData.id}_${savedData.telegram_id}` 
                    : `reject_temp_${sourceData.telegram_id}`
                }
              ]]
            }
          })
        })

        const telegramData = await telegramResponse.json()
        console.log('📥 Telegram API response:', telegramData)

        if (telegramData.ok) {
          console.log('✅ Notification sent to admin in Telegram')
        } else {
          console.error('❌ Telegram API error:', telegramData)
        }
      }
    } catch (telegramError) {
      console.error('❌ Telegram notification error:', telegramError.message)
      console.error('Stack:', telegramError.stack)
    }

    return res.status(200).json({
      success: true,
      message: dbSuccess ? 'Application submitted successfully' : 'Application received (database not configured)',
      data: savedData,
      note: !dbSuccess ? 'To save applications permanently, configure Supabase in .env.local' : undefined
    })

  } catch (error) {
    console.error('Error processing application:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    })
  }
}

