// API endpoint для обновления агрегированной статистики
// Этот endpoint будет вызываться по расписанию (cron job) каждый день в 12:00 ночи

const { saveAggregateStats } = require('../../../lib/db')
const https = require('https')
const TradingStrategy = require('../../../lib/trading-strategy')

// Копируем необходимые константы и функции из aggregate.js
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

const STRATEGY_PARAMS = {
  nFast: 15,
  nSlow: 30,
  baseSlPercent: 3,
  baseTp1Percent: 3,
  baseTp2Percent: 6,
  baseTp3Percent: 10,
  trendLength: 200,
  rsiPeriod: 14,
  rsiLongFilter: 50,
  rsiShortFilter: 50
}

// Функция для получения свечей (копируем из aggregate.js)
async function getFuturesCandles(symbol, interval, options = {}) {
  try {
    const baseUrl = 'https://fapi.binance.com/fapi/v1/klines'
    const queryParams = []
    queryParams.push(`symbol=${encodeURIComponent(symbol)}`)
    queryParams.push(`interval=${encodeURIComponent(interval)}`)
    const limit = Math.min(options.limit || 1000, 1000)
    queryParams.push(`limit=${limit}`)
    
    if (options.startTime) {
      queryParams.push(`startTime=${options.startTime}`)
    }
    if (options.endTime) {
      queryParams.push(`endTime=${options.endTime}`)
    }
    
    const url = `${baseUrl}?${queryParams.join('&')}`
    
    return new Promise((resolve) => {
      https.get(url, (res) => {
        // Проверяем статус ответа
        if (res.statusCode === 451) {
          console.error(`Binance API restricted (451) for ${symbol}: Service unavailable from restricted location`)
          resolve([])
          return
        }
        
        if (res.statusCode !== 200) {
          console.error(`Binance API error for ${symbol}: ${res.statusCode} ${res.statusMessage}`)
          resolve([])
          return
        }
        
        let data = ''
        res.on('data', (chunk) => { data += chunk })
        res.on('end', () => {
          try {
            const klines = JSON.parse(data)
            if (Array.isArray(klines) && klines.length > 0 && Array.isArray(klines[0])) {
              const formatted = klines.map(k => ({
                openTime: k[0],
                open: k[1],
                high: k[2],
                low: k[3],
                close: k[4],
                volume: k[5],
                closeTime: k[6],
                quoteVolume: k[7],
                trades: k[8],
                takerBuyBaseVolume: k[9],
                takerBuyQuoteVolume: k[10]
              }))
              resolve(formatted)
            } else {
              resolve([])
            }
          } catch (parseError) {
            console.error(`JSON parse error for ${symbol}:`, parseError.message)
            resolve([])
          }
        })
      }).on('error', (error) => {
        console.error(`HTTPS request error for ${symbol}:`, error.message)
        resolve([])
      })
    })
  } catch (error) {
    console.error(`Futures API error for ${symbol}:`, error.message)
    return []
  }
}

function getTimeBoundaries() {
  const now = new Date()
  const year = now.getFullYear()
  const yearStart = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0))
  const monthStart = new Date(Date.UTC(year, now.getUTCMonth(), 1, 0, 0, 0, 0))
  return {
    yearStart: yearStart.getTime(),
    monthStart: monthStart.getTime(),
    now: now.getTime()
  }
}

async function getCoinStats(symbol, timeframe) {
  try {
    const { yearStart, monthStart, now } = getTimeBoundaries()
    
    const monthCandles = await getFuturesCandles(symbol, timeframe === '1h' ? '1h' : timeframe === '4h' ? '4h' : '1d', { 
      startTime: monthStart, 
      endTime: now, 
      limit: 1000 
    })
    
    const hoursPerCandle = timeframe === '1h' ? 1 : timeframe === '4h' ? 4 : 24
    const candlesPerRequest = 1000
    const hoursPerRequest = candlesPerRequest * hoursPerCandle
    const msPerRequest = hoursPerRequest * 60 * 60 * 1000
    
    let yearCandles = []
    let currentEndTime = now
    let requestCount = 0
    const maxRequests = timeframe === '1h' ? 4 : timeframe === '4h' ? 3 : 1
    
    while (currentEndTime > yearStart && requestCount < maxRequests) {
      const requestStartTime = Math.max(yearStart, currentEndTime - msPerRequest)
      const batch = await getFuturesCandles(symbol, timeframe === '1h' ? '1h' : timeframe === '4h' ? '4h' : '1d', {
        startTime: requestStartTime,
        endTime: currentEndTime,
        limit: 1000
      })
      
      if (batch.length === 0) break
      yearCandles = [...batch, ...yearCandles]
      currentEndTime = requestStartTime
      requestCount++
      if (requestCount < maxRequests && currentEndTime > yearStart) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }
    }
    
    yearCandles.sort((a, b) => a.openTime - b.openTime)
    
    if (!yearCandles || yearCandles.length === 0) {
      return { symbol, yearPnlPercent: 0, monthPnlPercent: 0, hasData: false }
    }
    
    const formatCandles = (candles) => candles.map(c => ({
      timestamp: c.openTime,
      open: parseFloat(c.open),
      high: parseFloat(c.high),
      low: parseFloat(c.low),
      close: parseFloat(c.close),
      volume: parseFloat(c.volume)
    }))
    
    const formattedYearCandles = formatCandles(yearCandles)
    const formattedMonthCandles = monthCandles && monthCandles.length > 0 ? formatCandles(monthCandles) : []
    
    const strategyParams = { 
      ...STRATEGY_PARAMS, 
      timeframe,
      initialCapital: 1000,
      positionSizePercent: 50
    }
    
    let yearPnlPercent = 0
    let hasData = false
    
    if (formattedYearCandles.length > 0) {
      try {
        const yearStrategy = new TradingStrategy(strategyParams)
        const yearResults = yearStrategy.backtest(formattedYearCandles)
        yearPnlPercent = yearResults.totalPnlPercent || 0
        hasData = true
      } catch (backtestError) {
        console.error(`[${symbol}] Year backtest error:`, backtestError.message)
      }
    }
    
    let monthPnlPercent = 0
    if (formattedMonthCandles.length > 0) {
      try {
        const monthStrategy = new TradingStrategy(strategyParams)
        const monthResults = monthStrategy.backtest(formattedMonthCandles)
        monthPnlPercent = monthResults.totalPnlPercent || 0
      } catch (backtestError) {
        console.error(`[${symbol}] Month backtest error:`, backtestError.message)
      }
    }
    
    return { symbol, yearPnlPercent, monthPnlPercent, hasData }
  } catch (error) {
    console.error(`[${symbol}] Error calculating stats:`, error.message)
    return { symbol, yearPnlPercent: 0, monthPnlPercent: 0, hasData: false }
  }
}

async function calculateAggregateStats() {
  const promises = ALL_COINS.map(coin => {
    const timeframe = COIN_TIMEFRAMES[coin] || '4h'
    return getCoinStats(coin, timeframe)
  })
  
  const results = await Promise.all(promises)
  const coinsWithData = results.filter(r => r.hasData)
  
  if (coinsWithData.length === 0) {
    return { totalYearPnl: 0, totalMonthPnl: 0, activeCoins: 0, coinStats: results }
  }
  
  const totalYearPnl = coinsWithData.reduce((sum, coin) => sum + coin.yearPnlPercent, 0)
  const totalMonthPnl = coinsWithData.reduce((sum, coin) => sum + coin.monthPnlPercent, 0)
  
  return {
    totalYearPnl,
    totalMonthPnl,
    activeCoins: coinsWithData.length,
    coinStats: results
  }
}

export default async function handler(req, res) {
  // Проверяем секретный ключ для безопасности (чтобы только наш cron job мог вызывать)
  const secretKey = req.headers['x-cron-secret'] || req.query.secret
  const expectedSecret = process.env.CRON_SECRET_KEY || 'your-secret-key-here'
  
  if (secretKey !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('=== Updating aggregate stats in DB ===')
    
    // Проверяем, что БД настроена
    if (!process.env.DB_HOST) {
      console.error('❌ Database not configured')
      return res.status(500).json({ 
        error: 'Database not configured',
        message: 'Please configure database connection in .env.local'
      })
    }

    // Рассчитываем статистику
    const stats = await calculateAggregateStats()
    
    // Сохраняем в БД
    const savedStats = await saveAggregateStats({
      yearPnlPercent: stats.totalYearPnl,
      monthPnlPercent: stats.totalMonthPnl,
      activeCoins: stats.activeCoins,
      coinStats: stats.coinStats,
      updatedAt: new Date()
    })
    
    console.log('✅ Aggregate stats saved to DB:', {
      yearPnlPercent: savedStats.year_pnl_percent,
      monthPnlPercent: savedStats.month_pnl_percent,
      activeCoins: savedStats.active_coins,
      updatedAt: savedStats.updated_at
    })
    
    return res.status(200).json({
      success: true,
      message: 'Stats updated successfully',
      data: {
        yearPnlPercent: savedStats.year_pnl_percent,
        monthPnlPercent: savedStats.month_pnl_percent,
        activeCoins: savedStats.active_coins,
        updatedAt: savedStats.updated_at
      }
    })
  } catch (error) {
    console.error('❌ Error updating aggregate stats:', error.message, error.stack)
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
}

