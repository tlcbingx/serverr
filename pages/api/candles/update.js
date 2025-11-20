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
      
      allCandles = [...allCandles, ...batch]
      
      const oldestTimestamp = Math.min(...batch.map(c => c.openTime))
      
      if (oldestTimestamp <= targetStartTime * 1000) {
        break
      }
      
      if (batch.length > 0 && oldestTimestamp > targetStartTime * 1000) {
        endAt = Math.floor(oldestTimestamp / 1000) - 1
        attempts++
        continue
      }
      
      break
    }
    
    console.log(`[KuCoin] Total fetched: ${allCandles.length} candles for ${symbol}`)
    
    // Сортируем по времени
    allCandles.sort((a, b) => a.openTime - b.openTime)
    
    return allCandles
  } catch (error) {
    console.error(`[KuCoin] Error for ${symbol}:`, error.message)
    return []
  }
}

export default async function handler(req, res) {
  // Проверяем секретный ключ для безопасности
  const secretKey = req.headers['x-cron-secret'] || req.query.secret
  const expectedSecret = process.env.CRON_SECRET_KEY || 'your-secret-key-here'
  
  if (secretKey !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('=== Updating candles cache in DB ===')
    
    // Проверяем, что БД настроена
    if (!process.env.DB_HOST) {
      console.error('❌ Database not configured')
      return res.status(500).json({ 
        error: 'Database not configured',
        message: 'Please configure database connection'
      })
    }

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
    
    return res.status(200).json({
      success: true,
      message: `Updated candles cache for ${successCount}/${ALL_COINS.length} coins`,
      totalCandles,
      results
    })

  } catch (error) {
    console.error('❌ Error updating candles cache:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    })
  }
}

