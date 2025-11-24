// API endpoint для обновления кэша свечей
// Этот endpoint будет вызываться по расписанию (cron job) раз в 3 дня

const { saveCandles } = require('../../../lib/db')

// Список всех монет и их таймфреймов
const ALL_COINS = [
  'LINKUSDT', 'AVAXUSDT', 'SOLUSDT', 'TIAUSDT', 'HBARUSDT', // 1h
  'BTCUSDT', 'AAVEUSDT', 'INJUSDT', 'ADAUSDT', 'BNBUSDT', 'DOTUSDT' // 4h
]

const COIN_TIMEFRAMES = {
  'LINKUSDT': '1h',
  'AVAXUSDT': '1h',
  'SOLUSDT': '1h',
  'TIAUSDT': '1h',
  'HBARUSDT': '1h',
  'BTCUSDT': '4h',
  'AAVEUSDT': '4h',
  'INJUSDT': '4h',
  'ADAUSDT': '4h',
  'BNBUSDT': '4h',
  'DOTUSDT': '4h'
}

// Функция для конвертации символа в формат KuCoin (BTCUSDT -> BTC-USDT)
function convertSymbolToKuCoin(symbol) {
  const base = symbol.replace('USDT', '')
  return `${base}-USDT`
}

// Функция для конвертации интервала в формат KuCoin
function convertIntervalToKuCoin(interval) {
  const mapping = {
    '1m': '1min',
    '3m': '3min',
    '5m': '5min',
    '15m': '15min',
    '30m': '30min',
    '1h': '1hour',
    '2h': '2hour',
    '4h': '4hour',
    '6h': '6hour',
    '8h': '8hour',
    '12h': '12hour',
    '1d': '1day',
    '1w': '1week'
  }
  return mapping[interval] || interval
}

// Функция для получения свечей с KuCoin API
async function getFuturesCandles(symbol, interval, options = {}) {
  try {
    const baseUrl = 'https://api.kucoin.com/api/v1/market/candles'
    const kucoinSymbol = convertSymbolToKuCoin(symbol)
    const kucoinInterval = convertIntervalToKuCoin(interval)
    
    const maxLimit = 200
    let allCandles = []
    let endAt = options.endTime ? Math.floor(parseInt(options.endTime) / 1000) : Math.floor(Date.now() / 1000)
    let attempts = 0
    const maxAttempts = 500
    
    const targetStartTime = options.startTime ? Math.floor(parseInt(options.startTime) / 1000) : Math.floor(new Date('2017-01-01').getTime() / 1000)
    
    console.log(`[KuCoin] Fetching history for ${symbol} from ${new Date(targetStartTime * 1000).toISOString()} to ${new Date(endAt * 1000).toISOString()}`)
    
    while (attempts < maxAttempts) {
      const params = new URLSearchParams({
        symbol: kucoinSymbol,
        type: kucoinInterval,
        limit: maxLimit.toString(),
        endAt: endAt.toString()
      })
      
      if (targetStartTime && endAt > targetStartTime) {
        const intervalSeconds = interval === '1h' ? 3600 : interval === '4h' ? 14400 : 86400
        const batchDuration = maxLimit * intervalSeconds
        const startAt = Math.max(targetStartTime, endAt - batchDuration)
        params.append('startAt', startAt.toString())
      }
      
      const url = `${baseUrl}?${params.toString()}`
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      })
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText)
        console.error(`[KuCoin] HTTP error ${response.status}:`, errorText.substring(0, 200))
        break
      }
      
      const result = await response.json()
      
      if (result.code !== '200000' || !Array.isArray(result.data) || result.data.length === 0) {
        break
      }
      
      const intervalMs = interval === '1h' ? 3600000 : interval === '4h' ? 14400000 : 86400000
      const batch = result.data.map(k => {
        const timestamp = parseInt(k[0]) * 1000
        return {
          openTime: timestamp,
          open: parseFloat(k[1]),
          high: parseFloat(k[3]),
          low: parseFloat(k[4]),
          close: parseFloat(k[2]),
          volume: parseFloat(k[5]),
          closeTime: timestamp + intervalMs - 1,
          quoteVolume: parseFloat(k[6]) || (parseFloat(k[5]) * parseFloat(k[2])),
          trades: 0,
          takerBuyBaseVolume: 0,
          takerBuyQuoteVolume: 0
        }
      })
      
      // Удаляем дубликаты перед добавлением (по timestamp)
      const existingTimestamps = new Set(allCandles.map(c => c.openTime))
      const newCandles = batch.filter(c => !existingTimestamps.has(c.openTime))
      
      if (newCandles.length < batch.length) {
        console.log(`[KuCoin] Batch ${attempts + 1}: removed ${batch.length - newCandles.length} duplicate candles`)
      }
      
      allCandles = [...allCandles, ...newCandles]
      
      const oldestTimestamp = Math.min(...batch.map(c => c.openTime))
      
      if (oldestTimestamp <= targetStartTime * 1000) {
        break
      }
      
      if (batch.length > 0 && oldestTimestamp > targetStartTime * 1000) {
        // ВАЖНО: Обновляем endAt правильно - минус 1 секунда от самой старой свечи
        // Это гарантирует, что мы не пропустим свечи
        endAt = Math.floor(oldestTimestamp / 1000) - 1
        attempts++
        
        // Небольшая задержка для избежания rate limits (особенно для часовых графиков)
        const delay = interval === '1h' ? 200 : 100
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      break
    }
    
    console.log(`[KuCoin] Total fetched: ${allCandles.length} candles for ${symbol}`)
    
    // Сортируем по времени и удаляем дубликаты
    allCandles.sort((a, b) => a.openTime - b.openTime)
    
    // Удаляем дубликаты по timestamp
    const uniqueCandles = []
    const seenTimestamps = new Set()
    for (const candle of allCandles) {
      if (!seenTimestamps.has(candle.openTime)) {
        seenTimestamps.add(candle.openTime)
        uniqueCandles.push(candle)
      }
    }
    
    if (uniqueCandles.length < allCandles.length) {
      console.log(`[KuCoin] Removed ${allCandles.length - uniqueCandles.length} duplicate candles after sorting`)
    }
    
    // Проверяем на разрывы в данных
    if (uniqueCandles.length > 1) {
      const intervalMs = interval === '1h' ? 3600000 : interval === '4h' ? 14400000 : 86400000
      let gaps = []
      for (let i = 1; i < uniqueCandles.length; i++) {
        const gap = uniqueCandles[i].openTime - uniqueCandles[i-1].openTime
        if (gap > intervalMs * 2) { // Разрыв больше чем 2 интервала
          gaps.push({
            from: new Date(uniqueCandles[i-1].openTime).toISOString(),
            to: new Date(uniqueCandles[i].openTime).toISOString(),
            gapHours: Math.round(gap / (1000 * 60 * 60))
          })
        }
      }
      if (gaps.length > 0) {
        console.warn(`[KuCoin] Found ${gaps.length} gaps in candles for ${symbol}:`, gaps.slice(0, 5))
      }
    }
    
    return uniqueCandles
  } catch (error) {
    console.error(`[KuCoin] Error for ${symbol}:`, error.message)
    return []
  }
}

export default async function handler(req, res) {
  // Проверяем секретный ключ для безопасности (отдельный ключ для обновления свечей)
  const secretKey = req.headers['x-cron-secret'] || req.query.secret
  const expectedSecret = process.env.CANDLES_UPDATE_SECRET || process.env.CRON_SECRET_KEY || 'your-secret-key-here'
  
  if (secretKey !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Проверяем, что БД настроена
  if (!process.env.DB_HOST) {
    return res.status(500).json({ 
      error: 'Database not configured',
      message: 'Please configure database connection'
    })
  }

  // Сразу возвращаем ответ, чтобы избежать таймаута cron job
  // Обновление будет выполняться в фоне
  res.status(202).json({
    success: true,
    message: 'Candles update started in background',
    coins: ALL_COINS.length,
    note: 'Update is running asynchronously, check logs for progress'
  })

  // Продолжаем обновление в фоне (не ждем завершения)
  ;(async () => {
    try {
      console.log('=== Updating candles cache in DB (background) ===')
      
      const results = []
      
      // Обновляем свечи для каждой монеты
      for (const symbol of ALL_COINS) {
        const interval = COIN_TIMEFRAMES[symbol]
        
        try {
          console.log(`📊 Updating candles for ${symbol} ${interval}...`)
          
          // Загружаем всю историю с 2017 года
          const candles = await getFuturesCandles(symbol, interval, {
            startTime: new Date('2017-01-01').getTime(),
            endTime: Date.now()
          })
          
          if (candles && candles.length > 0) {
            // Сохраняем в БД
            await saveCandles(symbol, interval, candles)
            results.push({
              symbol,
              interval,
              candlesCount: candles.length,
              success: true
            })
            console.log(`✅ Updated ${candles.length} candles for ${symbol} ${interval}`)
          } else {
            results.push({
              symbol,
              interval,
              candlesCount: 0,
              success: false,
              error: 'No candles received'
            })
            console.warn(`⚠️ No candles received for ${symbol} ${interval}`)
          }
        } catch (error) {
          console.error(`❌ Error updating candles for ${symbol} ${interval}:`, error.message)
          results.push({
            symbol,
            interval,
            success: false,
            error: error.message
          })
        }
        
        // Небольшая задержка между монетами чтобы не перегрузить API
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
      const successCount = results.filter(r => r.success).length
      const totalCandles = results.reduce((sum, r) => sum + (r.candlesCount || 0), 0)
      
      console.log(`✅ Candles cache update completed: ${successCount}/${ALL_COINS.length} coins, ${totalCandles} total candles`)
    } catch (error) {
      console.error('❌ Error updating candles cache:', error)
    }
  })()
}

