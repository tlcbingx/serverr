// Модуль для работы с базой данных PostgreSQL

const { Pool } = require('pg');

let db = null;

/**
 * Получить подключение к базе данных
 */
function getDB() {
  if (db) return db;

  db = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    // Важно для Vercel/serverless - ограничиваем соединения
    max: 2, // Максимум 2 соединения на функцию
    idleTimeoutMillis: 30000, // Закрывать неиспользуемые соединения через 30 сек
    connectionTimeoutMillis: 5000, // Таймаут подключения 5 сек
    // Закрывать соединения при завершении функции
    allowExitOnIdle: true
  });
  
  // Обработка ошибок переполнения
  db.on('error', (err) => {
    console.error('❌ Unexpected database pool error:', err);
    // Сбрасываем pool при критической ошибке
    if (err.code === '53300' || err.message.includes('too many clients')) {
      console.error('⚠️ Too many connections, resetting pool...');
      db = null; // Сбросит pool при следующем запросе
    }
  });
  
  console.log('✅ Connected to PostgreSQL');
  return db;
}

/**
 * Генерация уникального промокода (6 заглавных букв)
 */
function generatePromoCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Проверка уникальности промокода
 */
async function isPromoCodeUnique(promoCode) {
  const db = getDB();
  try {
    const result = await db.query(
      'SELECT COUNT(*) as count FROM affiliate_applications WHERE promo_code = $1',
      [promoCode]
    );
    return parseInt(result.rows[0].count) === 0;
  } catch (error) {
    console.error('❌ Error checking promo code uniqueness:', error);
    return false;
  }
}

/**
 * Генерация уникального промокода с проверкой
 */
async function generateUniquePromoCode() {
  let promoCode;
  let attempts = 0;
  const maxAttempts = 50; // Увеличено до 50 попыток
  
  do {
    promoCode = generatePromoCode();
    attempts++;
    
    // Проверяем уникальность
    const isUnique = await isPromoCodeUnique(promoCode);
    
    if (isUnique) {
      return promoCode;
    }
    
    // Если не уникален, пробуем снова
    if (attempts >= maxAttempts) {
      // Если не удалось за 50 попыток, добавляем случайные цифры
      promoCode = generatePromoCode() + Math.floor(Math.random() * 100).toString().padStart(2, '0');
      const finalCheck = await isPromoCodeUnique(promoCode);
      if (finalCheck) {
        return promoCode;
      }
      // Если и это не помогло, используем комбинацию с telegram_id или timestamp
      const fallbackCode = 'VEXTR' + Date.now().toString().slice(-6);
      return fallbackCode;
    }
  } while (attempts < maxAttempts);
  
  // Не должно доходить сюда, но на всякий случай
  return 'VEXTR' + Date.now().toString().slice(-6);
}

/**
 * Сохранить пользователя Telegram в БД
 */
async function saveUser(userData) {
  const db = getDB();
  const { telegram_id, username, first_name, last_name, photo_url, auth_date } = userData;

  try {
    const query = `
      INSERT INTO telegram_users (telegram_id, username, first_name, last_name, photo_url, auth_date, last_login)
      VALUES ($1, $2, $3, $4, $5, to_timestamp($6), NOW())
      ON CONFLICT (telegram_id) 
      DO UPDATE SET 
        username = $2,
        first_name = $3,
        last_name = $4,
        photo_url = $5,
        last_login = NOW()
      RETURNING *
    `;
    const result = await db.query(query, [
      telegram_id,
      username || null,
      first_name,
      last_name || null,
      photo_url || null,
      auth_date
    ]);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error saving user:', error);
    throw error;
  }
}

/**
 * Сохранить заявку на партнерскую программу
 */
async function saveApplication(applicationData) {
  const db = getDB();
  const {
    telegram_id,
    username,
    first_name,
    last_name,
    photo_url,
    email,
    full_name,
    form_data,
    submitted_at
  } = applicationData;

  try {
    const query = `
      INSERT INTO affiliate_applications (
        telegram_id, username, first_name, last_name, photo_url,
        email, full_name, form_data, submitted_at, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
      RETURNING *
    `;
    const result = await db.query(query, [
      telegram_id,
      username || null,
      first_name,
      last_name || null,
      photo_url || null,
      email,
      full_name,
      JSON.stringify(form_data),
      submitted_at
    ]);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error saving application:', error);
    throw error;
  }
}

/**
 * Обновить статус заявки
 */
async function updateApplicationStatus(applicationId, status, commissionRate, reviewedBy) {
  const db = getDB();

  try {
    // Генерируем промокод если заявка одобряется
    let promoCode = null;
    if (status === 'approved') {
      promoCode = await generateUniquePromoCode();
      console.log(`✅ Generated promo code: ${promoCode} for application ${applicationId}`);
    }

    const query = `
      UPDATE affiliate_applications
      SET status = $1, 
          commission_rate = $2,
          promo_code = $3,
          reviewed_at = NOW(),
          reviewed_by = $4
      WHERE id = $5
      RETURNING *
    `;
    const result = await db.query(query, [status, commissionRate, promoCode, reviewedBy, applicationId]);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error updating application:', error);
    throw error;
  }
}

/**
 * Обновить скидку партнёра
 */
async function updatePartnerDiscount(telegramId, discount) {
  const db = getDB();

  try {
    const query = `
      UPDATE affiliate_applications
      SET discount = $1, updated_at = NOW()
      WHERE telegram_id = $2 AND status = 'approved'
      RETURNING *
    `;
    const result = await db.query(query, [discount, telegramId]);
    
    if (result.rows.length === 0) {
      console.warn(`⚠️ No approved application found for telegram_id: ${telegramId}`);
      return null;
    }
    
    console.log(`✅ Updated discount to ${discount}% for telegram_id: ${telegramId}`);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error updating discount:', error);
    throw error;
  }
}

/**
 * Получить заявку по ID
 */
async function getApplication(applicationId) {
  const db = getDB();

  try {
    const result = await db.query('SELECT * FROM affiliate_applications WHERE id = $1', [applicationId]);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error getting application:', error);
    throw error;
  }
}

/**
 * Получить заявку по telegram_id
 */
async function getApplicationByTelegramId(telegramId) {
  const db = getDB();

  try {
    const result = await db.query(
      'SELECT * FROM affiliate_applications WHERE telegram_id = $1 ORDER BY submitted_at DESC LIMIT 1',
      [telegramId]
    );
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error getting application by telegram_id:', error);
    throw error;
  }
}

/**
 * Записать платёж в базу данных
 */
async function recordPayment(paymentData) {
  const db = getDB();
  const {
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
    paid_at
  } = paymentData;

  try {
    // Определяем referrer_telegram_id из промокода если не указан явно
    let finalReferrerId = referrer_telegram_id;
    let referralSource = null;

    if (!finalReferrerId && promo_code) {
      // Ищем партнёра по промокоду в базе данных
      const promoQuery = `
        SELECT telegram_id 
        FROM affiliate_applications 
        WHERE promo_code = $1 AND status = 'approved'
      `;
      const promoResult = await db.query(promoQuery, [promo_code]);
      
      if (promoResult.rows.length > 0) {
        finalReferrerId = promoResult.rows[0].telegram_id;
        referralSource = 'promo_code';
        console.log(`✅ Found partner by promo code ${promo_code}: ${finalReferrerId}`);
      } else {
        console.warn(`⚠️ Promo code ${promo_code} not found or not approved`);
      }
    } else if (finalReferrerId) {
      referralSource = 'referral_link';
    }

    // Проверяем это первая покупка пользователя или нет
    const checkQuery = `
      SELECT COUNT(*) as count 
      FROM affiliate_payments 
      WHERE user_telegram_id = $1 
        AND payment_status = 'completed'
    `;
    const checkResult = await db.query(checkQuery, [user_telegram_id]);
    const isFirstPayment = parseInt(checkResult.rows[0].count) === 0;

    // Получаем ставку партнёра если есть referrer
    let commissionRate = null;
    let commissionAmount = null;

    if (finalReferrerId) {
      const partnerQuery = `
        SELECT commission_rate 
        FROM affiliate_applications 
        WHERE telegram_id = $1 AND status = 'approved'
      `;
      const partnerResult = await db.query(partnerQuery, [finalReferrerId]);
      
      if (partnerResult.rows.length > 0) {
        commissionRate = partnerResult.rows[0].commission_rate;
        
        // Рассчитываем комиссию
        if (isFirstPayment) {
          // Первая покупка = 100% партнёру
          commissionAmount = amount;
        } else {
          // Последующие = commission_rate%
          commissionAmount = (amount * commissionRate) / 100;
        }
      }
    }

    // Вставляем платёж
    const insertQuery = `
      INSERT INTO affiliate_payments (
        user_telegram_id, username, first_name, last_name,
        amount, currency, payment_provider, transaction_id,
        referrer_telegram_id, promo_code, referral_source,
        is_first_payment, commission_rate, commission_amount,
        product_name, subscription_period, paid_at, payment_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'completed')
      RETURNING *
    `;

    const result = await db.query(insertQuery, [
      user_telegram_id,
      username || null,
      first_name || null,
      last_name || null,
      amount,
      currency,
      payment_provider || null,
      transaction_id || null,
      finalReferrerId || null,
      promo_code || null,
      referralSource,
      isFirstPayment,
      commissionRate,
      commissionAmount,
      product_name,
      subscription_period,
      paid_at
    ]);

    console.log('✅ Payment recorded:', {
      id: result.rows[0].id,
      user: user_telegram_id,
      amount,
      commission: commissionAmount,
      is_first: isFirstPayment,
      referrer: finalReferrerId
    });

    return result.rows[0];
  } catch (error) {
    console.error('❌ Error recording payment:', error);
    throw error;
  }
}

/**
 * Получить статистику партнера
 */
async function getPartnerStats(telegramId, period = '30') {
  const db = getDB();

  try {
    // Проверяем что партнёр одобрен
    const application = await getApplicationByTelegramId(telegramId);
    
    console.log('📝 Application from DB:', {
      id: application?.id,
      telegram_id: application?.telegram_id,
      status: application?.status,
      commission_rate: application?.commission_rate,
      promo_code: application?.promo_code
    });
    
    if (!application || application.status !== 'approved') {
      console.log('❌ Application not approved or not found. Status:', application?.status);
      return null;
    }

    // Определяем временной диапазон
    let dateFilter = '';
    if (period === '1') {
      // Вчера (с 00:00 до 23:59)
      dateFilter = `AND paid_at >= CURRENT_DATE - INTERVAL '1 day' AND paid_at < CURRENT_DATE`;
    } else if (period === '7') {
      // Последние 7 дней
      dateFilter = `AND paid_at >= NOW() - INTERVAL '7 days'`;
    } else {
      // Последние 30 дней (по умолчанию)
      dateFilter = `AND paid_at >= NOW() - INTERVAL '30 days'`;
    }

    // Получаем общую статистику по платежам
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT user_telegram_id) as paid_users_count,
        COALESCE(SUM(commission_amount), 0) as total_revenue,
        COUNT(CASE WHEN is_first_payment = true THEN 1 END) as first_payments_count,
        COUNT(CASE WHEN is_first_payment = false THEN 1 END) as recurring_payments_count,
        COALESCE(SUM(CASE WHEN is_first_payment = true THEN commission_amount ELSE 0 END), 0) as first_payments_revenue,
        COALESCE(SUM(CASE WHEN is_first_payment = false THEN commission_amount ELSE 0 END), 0) as recurring_payments_revenue
      FROM affiliate_payments 
      WHERE referrer_telegram_id = $1 
        AND payment_status = 'completed'
        ${dateFilter}
    `;
    
    const statsResult = await db.query(statsQuery, [telegramId]);
    const stats = statsResult.rows[0];

    // Получаем общее количество клиентов за ВСЁ время (для расчёта уровня)
    const totalUsersQuery = `
      SELECT COUNT(DISTINCT user_telegram_id) as total_paid_users
      FROM affiliate_payments 
      WHERE referrer_telegram_id = $1 
        AND payment_status = 'completed'
    `;
    const totalUsersResult = await db.query(totalUsersQuery, [telegramId]);
    const totalPaidUsers = parseInt(totalUsersResult.rows[0].total_paid_users) || 0;

    return {
      commission_rate: application.commission_rate,
      paid_users_count: totalPaidUsers, // Общее количество за всё время (для уровня)
      total_revenue: parseFloat(stats.total_revenue),
      first_payments_count: parseInt(stats.first_payments_count) || 0,
      recurring_payments_count: parseInt(stats.recurring_payments_count) || 0,
      first_payments_revenue: parseFloat(stats.first_payments_revenue) || 0,
      recurring_payments_revenue: parseFloat(stats.recurring_payments_revenue) || 0,
      referral_link: `https://vextr.ru?ref=${telegramId}`,
      promo_code: application.promo_code || 'Ожидание генерации',
      discount: application.discount || 0,
      status: application.status // Добавляем статус из базы данных
    };
  } catch (error) {
    console.error('❌ Error getting partner stats:', error);
    throw error;
  }
}

/**
 * Получить последние платежи партнёра
 */
async function getPartnerPayments(telegramId, limit = 10) {
  const db = getDB();

  try {
    const query = `
      SELECT 
        id,
        user_telegram_id,
        username,
        first_name,
        amount,
        commission_amount,
        is_first_payment,
        paid_at,
        product_name
      FROM affiliate_payments 
      WHERE referrer_telegram_id = $1 
        AND payment_status = 'completed'
      ORDER BY paid_at DESC
      LIMIT $2
    `;
    
    const result = await db.query(query, [telegramId, limit]);
    return result.rows;
  } catch (error) {
    console.error('❌ Error getting partner payments:', error);
    throw error;
  }
}

module.exports = {
  getDB,
  saveUser,
  saveApplication,
  updateApplicationStatus,
  updatePartnerDiscount,
  getApplication,
  getApplicationByTelegramId,
  recordPayment,
  getPartnerStats,
  getPartnerPayments
};

