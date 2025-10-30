// Webhook для обработки нажатий на кнопки в Telegram
const { updateApplicationStatus, getApplication } = require('../../../lib/db')

const BOT_TOKEN = process.env.BOT_TOKEN

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const update = req.body
    console.log('Received webhook update:', JSON.stringify(update, null, 2))

    // Обрабатываем нажатие на кнопку
    if (update.callback_query) {
      const callbackQuery = update.callback_query
      const data = callbackQuery.data // approve_123_456789 или reject_123_456789
      const messageId = callbackQuery.message.message_id
      const chatId = callbackQuery.message.chat.id

      console.log('🔔 Callback data:', data)

      // Парсим данные из callback
      // Формат: approve_20_123_456789 или approve_10_123_456789 или reject_123_456789
      const parts = data.split('_')
      const action = parts[0] // approve или reject
      const commissionRate = action === 'approve' ? parseInt(parts[1]) : null // 20 или 10
      const applicationId = action === 'approve' ? parts[2] : parts[1]
      const telegramId = action === 'approve' ? parts[3] : parts[2]

      console.log('📊 Parsed:', { action, commissionRate, applicationId, telegramId })

      if (!process.env.DB_HOST) {
        console.error('❌ DB_HOST not configured')
        await answerCallback(callbackQuery.id, '❌ База данных не настроена')
        return res.status(200).json({ ok: true })
      }
      
      console.log('✅ DB_HOST configured:', process.env.DB_HOST)

      // Обновляем статус заявки в базе
      const newStatus = action === 'approve' ? 'approved' : 'rejected'
      const reviewedBy = callbackQuery.from.username || callbackQuery.from.first_name
      
      console.log('🔄 Updating application status...', { applicationId, newStatus, commissionRate })
      
      let updatedApplication
      try {
        updatedApplication = await updateApplicationStatus(
          applicationId,
          newStatus,
          commissionRate,
          reviewedBy
        )

        console.log('📝 Updated application:', updatedApplication)

        if (!updatedApplication) {
          console.error('❌ Application not found:', applicationId)
          await answerCallback(callbackQuery.id, '❌ Заявка не найдена')
          return res.status(200).json({ ok: true })
        }

        console.log('✅ Application status updated:', newStatus, 'commission:', commissionRate, 'promo:', updatedApplication.promo_code)
      } catch (dbError) {
        console.error('❌ Database error:', dbError)
        console.error('Error stack:', dbError.stack)
        await answerCallback(callbackQuery.id, '❌ Ошибка базы данных: ' + dbError.message)
        return res.status(200).json({ ok: true })
      }

      // Обновляем сообщение - убираем кнопки и добавляем статус
      const statusEmoji = action === 'approve' ? '✅' : '❌'
      const statusText = action === 'approve' ? `ОДОБРЕНО (${commissionRate}% ставка)` : 'ОТКЛОНЕНО'
      const reviewedByDisplay = callbackQuery.from.username ? `@${callbackQuery.from.username}` : callbackQuery.from.first_name

      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageReplyMarkup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          reply_markup: {
            inline_keyboard: []
          }
        })
      })

      // Добавляем текст со статусом
      const originalText = callbackQuery.message.text
      const newText = `${originalText}\n\n${statusEmoji} <b>${statusText}</b>\n👤 Рассмотрено: ${reviewedByDisplay}\n🕐 ${new Date().toLocaleString('ru-RU')}`

      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: newText,
          parse_mode: 'HTML'
        })
      })

      // Отправляем уведомление пользователю
      const notificationText = action === 'approve'
        ? `✅ <b>Ваша заявка одобрена!</b>

Поздравляем! Вы стали партнером VEXTR.

💰 <b>Ваша ставка:</b>
• 100% от первого платежа
• ${commissionRate}% от всех последующих платежей

🔗 <b>Ваши инструменты:</b>
• Реферальная ссылка: https://vextr.ru/?ref=${telegramId}
• Промокод: <code>${updatedApplication.promo_code}</code>

📊 <b>Партнёрский кабинет:</b>
https://vextr.ru/partner-dashboard

Используйте реферальную ссылку или промокод для привлечения пользователей и отслеживайте статистику в своём кабинете!`
        : `❌ <b>Ваша заявка отклонена</b>

К сожалению, ваша заявка не была одобрена.
Вы можете подать заявку повторно через некоторое время.`

      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramId,
          text: notificationText,
          parse_mode: 'HTML',
          disable_web_page_preview: true
        })
      })

      // Отвечаем на callback
      console.log('📤 Sending callback answer...')
      await answerCallback(
        callbackQuery.id,
        action === 'approve' ? '✅ Заявка одобрена' : '❌ Заявка отклонена'
      )
      console.log('✅ Callback answered successfully')
    }

    console.log('🎉 Webhook processed successfully')
    return res.status(200).json({ ok: true })

  } catch (error) {
    console.error('❌ Webhook error:', error)
    console.error('Error stack:', error.stack)
    return res.status(200).json({ ok: true }) // Всегда возвращаем 200 для Telegram
  }
}

// Вспомогательная функция для ответа на callback
async function answerCallback(callbackQueryId, text) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text: text,
      show_alert: false
    })
  })
}

