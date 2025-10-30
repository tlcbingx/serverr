import crypto from 'crypto'
const { saveUser } = require('../../../lib/db')

// ВАЖНО: Замените на токен вашего бота из @BotFather
const BOT_TOKEN = process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE'

/**
 * Проверка подписи данных от Telegram Login Widget
 * Документация: https://core.telegram.org/widgets/login#checking-authorization
 */
function verifyTelegramAuth(data) {
  const { hash, ...rest } = data

  // Создаем строку для проверки из всех полей кроме hash
  const checkString = Object.keys(rest)
    .sort()
    .map(key => `${key}=${rest[key]}`)
    .join('\n')

  // Создаем HMAC-SHA256 от токена бота
  const secretKey = crypto
    .createHash('sha256')
    .update(BOT_TOKEN)
    .digest()

  // Создаем HMAC-SHA256 от данных
  const hmac = crypto
    .createHmac('sha256', secretKey)
    .update(checkString)
    .digest('hex')

  // Сравниваем с полученным hash
  return hmac === hash
}

/**
 * Проверка что данные не устарели (не старше 24 часов)
 */
function checkAuthDate(authDate) {
  const maxAge = 86400 // 24 часа в секундах
  const currentTime = Math.floor(Date.now() / 1000)
  return (currentTime - authDate) <= maxAge
}

/**
 * Генерация JWT токена (упрощенная версия)
 * В продакшене используйте библиотеку jsonwebtoken
 */
function generateToken(user) {
  // Простая реализация - в продакшене используйте jwt.sign()
  const payload = {
    id: user.id,
    username: user.username,
    first_name: user.first_name,
    photo_url: user.photo_url,
    auth_date: user.auth_date
  }
  
  return Buffer.from(JSON.stringify(payload)).toString('base64')
}

/**
 * Сохранение или обновление пользователя в базе данных
 */
async function saveUserToDatabase(userData) {
  try {
    const userRecord = {
      telegram_id: userData.id.toString(),
      username: userData.username || null,
      first_name: userData.first_name,
      last_name: userData.last_name || null,
      photo_url: userData.photo_url || null,
      auth_date: userData.auth_date
    }

    const savedUser = await saveUser(userRecord)
    
    return { 
      success: true, 
      user: savedUser, 
      isNew: true // Упрощено, можно улучшить позже
    }
  } catch (error) {
    console.error('Database error:', error)
    return { success: false, error: error.message }
  }
}

export default async function handler(req, res) {
  // Разрешаем только POST запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const userData = req.body

    console.log('Received Telegram auth data:', {
      id: userData?.id,
      username: userData?.username,
      first_name: userData?.first_name
    })

    // Проверяем наличие обязательных полей
    if (!userData || !userData.id || !userData.first_name) {
      console.error('Missing required fields')
      return res.status(400).json({
        error: 'Недостаточно данных для авторизации'
      })
    }

    // Проверяем подпись только если есть hash и токен бота настроен
    if (userData.hash && BOT_TOKEN && BOT_TOKEN !== 'YOUR_BOT_TOKEN_HERE') {
      const isValid = verifyTelegramAuth(userData)
      
      if (!isValid) {
        console.error('Invalid signature')
        return res.status(401).json({
          error: 'Неверная подпись. Данные могли быть изменены.'
        })
      }

      // Проверяем что данные не устарели
      if (userData.auth_date && !checkAuthDate(userData.auth_date)) {
        console.error('Auth data expired')
        return res.status(401).json({
          error: 'Данные авторизации устарели. Попробуйте войти снова.'
        })
      }
    } else {
      console.warn('Skipping signature verification (no bot token configured)')
    }

    let dbResult = { success: false, isNew: true }

    // Пытаемся сохранить в базу данных
    if (process.env.DB_HOST) {
      try {
        dbResult = await saveUserToDatabase(userData)
        
        if (dbResult.success) {
          console.log('✅ User saved to database:', {
            telegram_id: userData.id,
            username: userData.username,
            isNew: dbResult.isNew
          })
        } else {
          console.error('❌ Failed to save user to database:', dbResult.error)
        }
      } catch (dbError) {
        console.error('❌ Database error:', dbError)
        // Продолжаем авторизацию даже если не удалось сохранить в БД
      }
    } else {
      console.warn('⚠️ Skipping database save (DB not configured)')
    }

    // Генерируем токен
    const token = generateToken(userData)

    // Возвращаем успешный ответ
    return res.status(200).json({
      success: true,
      token: token,
      user: {
        id: userData.id,
        username: userData.username,
        first_name: userData.first_name,
        last_name: userData.last_name,
        photo_url: userData.photo_url
      },
      isNewUser: dbResult.isNew || false,
      message: dbResult.isNew ? 'Регистрация успешна!' : 'С возвращением!'
    })

  } catch (error) {
    console.error('Telegram auth error:', error)
    return res.status(500).json({
      error: 'Ошибка сервера при авторизации',
      details: error.message
    })
  }
}

