// API для агрегированной статистики по всем монетам
// Рассчитывает доходность с начала месяца и с начала года

const https = require('https')
const TradingStrategy = require('../../../lib/trading-strategy')

const ALL_COINS = [
  'LINKUSDT', 'AVAXUSDT', 'SOLUSDT', 'TIAUSDT', 'HBARUSDT', // 1h
  'BTCUSDT', 'AAVEUSDT', 'INJUSDT', 'ADAUSDT', 'BNBUSDT', 'DOTUSDT' // 4h
]

const COIN_TIMEFRAMES = {
  // 1h монеты
  'LINKUSDT': '1h',
  'AVAXUSDT': '1h',
  'SOLUSDT': '1h',
  'TIAUSDT': '1h',
  'HBARUSDT': '1h',
  // 4h монеты
  'BTCUSDT': '4h',
  'AAVEUSDT': '4h',
  'INJUSDT': '4h',
  'ADAUSDT': '4h',
  'BNBUSDT': '4h',
  'DOTUSDT': '4h'
}

// Параметры стратегии (используем стандартные)
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

// Функция для конвертации символа в формат OKX (BTCUSDT -> BTC-USDT-SWAP для фьючерсов)
function convertSymbolToOKX(symbol) {
  const base = symbol.replace('USDT', '')
  return `${base}-USDT-SWAP`
}

// Функция для конвертации интервала в формат OKX
function convertIntervalToOKX(interval) {
  const mapping = {
    '1m': '1m',
    '3m': '3m',
    '5m': '5m',
    '15m': '15m',
    '30m': '30m',
    '1h': '1H',
    '2h': '2H',
    '4h': '4H',
    '6h': '6H',
    '12h': '12H',
    '1d': '1D',
    '1w': '1W',
    '1M': '1M'
  }
  return mapping[interval] || interval.toUpperCase()
}

// Функция для получения свечей с OKX API
async function getFuturesCandles(symbol, interval, options = {}) {
  try {
    const baseUrl = 'https://www.okx.com/api/v5/market/candles'
    const okxSymbol = convertSymbolToOKX(symbol)
    const okxInterval = convertIntervalToOKX(interval)
    
    const queryParams = []
    queryParams.push(`instId=${encodeURIComponent(okxSymbol)}`)
    queryParams.push(`bar=${encodeURIComponent(okxInterval)}`)
    const limit = Math.min(options.limit || 100, 100) // OKX ограничивает до 100
    queryParams.push(`limit=${limit}`)
    
    if (options.before) {
      queryParams.push(`before=${options.before}`)
    }
    if (options.after) {
      queryParams.push(`after=${options.after}`)
    }
    if (options.endTime) {
      queryParams.push(`before=${options.endTime}`)
    }
    if (options.startTime) {
      queryParams.push(`after=${options.startTime}`)
    }
    
    const url = `${baseUrl}?${queryParams.join('&')}`
    
    console.log(`[${symbol}] Requesting candles from OKX:`, {
      url,
      interval: okxInterval,
      startTime: options.startTime ? new Date(options.startTime).toISOString() : 'none',
      endTime: options.endTime ? new Date(options.endTime).toISOString() : 'none',
      limit: options.limit
    })
    
    // Используем встроенный модуль https для запроса
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        if (res.statusCode !== 200) {
          console.error(`[${symbol}] OKX API error: ${res.statusCode} ${res.statusMessage}`)
          resolve([])
          return
        }
        
        let data = ''
        
        // Логируем статус ответа
        console.log(`[${symbol}] OKX API response status:`, res.statusCode)
        
        res.on('data', (chunk) => {
          data += chunk
        })
        
        res.on('end', () => {
          try {
            const result = JSON.parse(data)
            
            if (result.code !== '0') {
              console.error(`[${symbol}] OKX API error:`, result.code, result.msg)
              resolve([])
              return
            }
            
            if (Array.isArray(result.data) && result.data.length > 0) {
              // OKX формат: [ts, o, h, l, c, vol, volCcy, volCcyQuote, confirm]
              const formatted = result.data.map(k => ({
                openTime: parseInt(k[0]),
                open: parseFloat(k[1]),
                high: parseFloat(k[2]),
                low: parseFloat(k[3]),
                close: parseFloat(k[4]),
                volume: parseFloat(k[5]),
                closeTime: parseInt(k[0]) + (interval === '1h' ? 3600000 : interval === '4h' ? 14400000 : 86400000) - 1,
                quoteVolume: parseFloat(k[6]),
                trades: 0,
                takerBuyBaseVolume: 0,
                takerBuyQuoteVolume: 0
              })).reverse() // OKX возвращает в обратном порядке
              console.log(`[${symbol}] Successfully received ${formatted.length} candles`)
              resolve(formatted)
            } else {
              console.warn(`[${symbol}] No data in OKX response`)
              resolve([])
            }
          } catch (parseError) {
            console.error(`[${symbol}] JSON parse error:`, parseError.message, 'Data:', data.substring(0, 200))
            resolve([])
          }
        })
      }).on('error', (error) => {
        console.error(`[${symbol}] HTTPS request error:`, error.message, error.stack)
        resolve([])
      })
    })
  } catch (error) {
    console.error(`OKX API error for ${symbol}:`, error.message)
    return []
  }
}

// Функция для получения временных границ
function getTimeBoundaries() {
  const now = new Date()
  const year = now.getFullYear()
  
  // Начало текущего года (1 января текущего года, 00:00:00 UTC)
  const yearStart = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0))
  const yearStartTimestamp = yearStart.getTime()
  
  // Начало текущего месяца (1 число текущего месяца, 00:00:00 UTC)
  const monthStart = new Date(Date.UTC(year, now.getUTCMonth(), 1, 0, 0, 0, 0))
  const monthStartTimestamp = monthStart.getTime()
  
  // Текущее время
  const nowTimestamp = now.getTime()
  
  return {
    yearStart: yearStartTimestamp,
    monthStart: monthStartTimestamp,
    now: nowTimestamp
  }
}

// Функция для расчета статистики по одной монете
// Использует тот же подход, что и /api/trading/data - напрямую вызывает strategy.backtest()
async function getCoinStats(symbol, timeframe) {
  try {
    const { yearStart, monthStart, now } = getTimeBoundaries()
    
    console.log(`[${symbol}] Calculating stats:`, {
      timeframe,
      yearStart: new Date(yearStart).toISOString(),
      monthStart: new Date(monthStart).toISOString(),
      now: new Date(now).toISOString()
    })
    
    // Получаем свечи за месяц (1000 свечей достаточно)
    const monthCandles = await getFuturesCandles(symbol, timeframe === '1h' ? '1h' : timeframe === '4h' ? '4h' : '1d', { 
      startTime: monthStart, 
      endTime: now, 
      limit: 1000 
    })
    
    // Для годовых данных нужно больше свечей - используем пагинацию
    // ОПТИМИЗАЦИЯ: Ограничиваем количество запросов для ускорения
    // Для 4h: ~2190 свечей за год, но достаточно 2-3 запросов (2000-3000 свечей)
    // Для 1h: ~8760 свечей за год, но достаточно 3-4 запросов (3000-4000 свечей)
    const hoursPerCandle = timeframe === '1h' ? 1 : timeframe === '4h' ? 4 : 24
    const candlesPerRequest = 1000
    const hoursPerRequest = candlesPerRequest * hoursPerCandle
    const msPerRequest = hoursPerRequest * 60 * 60 * 1000
    
    let yearCandles = []
    let currentEndTime = now
    let requestCount = 0
    // Ограничиваем количество запросов для ускорения (3-4 запроса достаточно для годовых данных)
    const maxRequests = timeframe === '1h' ? 4 : timeframe === '4h' ? 3 : 1
    
    while (currentEndTime > yearStart && requestCount < maxRequests) {
      const requestStartTime = Math.max(yearStart, currentEndTime - msPerRequest)
      
      const batch = await getFuturesCandles(symbol, timeframe === '1h' ? '1h' : timeframe === '4h' ? '4h' : '1d', {
        startTime: requestStartTime,
        endTime: currentEndTime,
        limit: 1000
      })
      
      if (batch.length === 0) {
        break
      }
      
      // Добавляем свечи в начало массива (так как идем от конца к началу)
      yearCandles = [...batch, ...yearCandles]
      
      // Обновляем currentEndTime для следующего запроса
      currentEndTime = requestStartTime
      requestCount++
      
      // Небольшая задержка между запросами (уменьшена для ускорения)
      if (requestCount < maxRequests && currentEndTime > yearStart) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }
    }
    
    // Сортируем свечи по времени (на случай если порядок нарушен)
    yearCandles.sort((a, b) => a.openTime - b.openTime)
    
    console.log(`[${symbol}] Received candles:`, {
      yearCandles: yearCandles?.length || 0,
      monthCandles: monthCandles?.length || 0
    })
    
    if (!yearCandles || yearCandles.length === 0) {
      console.warn(`[${symbol}] No year candles received`)
      return {
        symbol,
        yearPnlPercent: 0,
        monthPnlPercent: 0,
        hasData: false
      }
    }
    
    // Форматируем свечи (как в trading/data.js)
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
    
    // Создаем стратегию с теми же параметрами, что и в trading/data.js
    // ВАЖНО: Используем те же значения по умолчанию, что и в TradingStrategy
    const strategyParams = { 
      ...STRATEGY_PARAMS, 
      timeframe,
      initialCapital: 1000,  // Явно указываем, как в trading/data.js
      positionSizePercent: 50 // Явно указываем, как в trading/data.js
    }
    
    // Годовая статистика - используем strategy.backtest() как в trading/data.js
    let yearPnlPercent = 0
    let hasData = false
    
    if (formattedYearCandles.length > 0) {
      try {
        // Проверяем минимальное количество свечей для стратегии
        const minCandles = Math.max(strategyParams.nSlow || 30, strategyParams.trendLength || 200, 14)
        if (formattedYearCandles.length < minCandles) {
          console.warn(`[${symbol}] Not enough candles for year backtest: ${formattedYearCandles.length} < ${minCandles}`)
        } else {
          const yearStrategy = new TradingStrategy(strategyParams)
          const yearResults = yearStrategy.backtest(formattedYearCandles)
          // Используем totalPnlPercent из результатов backtest (как в trading/data.js)
          yearPnlPercent = yearResults.totalPnlPercent || 0
          hasData = true
          
          console.log(`[${symbol}] Year backtest result:`, {
            totalPnlPercent: yearPnlPercent,
            totalPnl: yearResults.totalPnl,
            trades: yearResults.trades?.length || 0,
            finalCapital: yearResults.finalCapital,
            initialCapital: yearStrategy.initialCapital,
            candlesCount: formattedYearCandles.length
          })
        }
      } catch (backtestError) {
        console.error(`[${symbol}] Year backtest error:`, backtestError.message, backtestError.stack)
      }
    }
    
    // Месячная статистика
    let monthPnlPercent = 0
    if (formattedMonthCandles.length > 0) {
      try {
        // Проверяем минимальное количество свечей для стратегии
        const minCandles = Math.max(strategyParams.nSlow || 30, strategyParams.trendLength || 200, 14)
        if (formattedMonthCandles.length < minCandles) {
          console.warn(`[${symbol}] Not enough candles for month backtest: ${formattedMonthCandles.length} < ${minCandles}`)
        } else {
          const monthStrategy = new TradingStrategy(strategyParams)
          const monthResults = monthStrategy.backtest(formattedMonthCandles)
          monthPnlPercent = monthResults.totalPnlPercent || 0
          
          console.log(`[${symbol}] Month backtest result:`, {
            totalPnlPercent: monthPnlPercent,
            totalPnl: monthResults.totalPnl,
            trades: monthResults.trades?.length || 0,
            finalCapital: monthResults.finalCapital,
            initialCapital: monthStrategy.initialCapital,
            candlesCount: formattedMonthCandles.length
          })
        }
      } catch (backtestError) {
        console.error(`[${symbol}] Month backtest error:`, backtestError.message, backtestError.stack)
      }
    } else {
      console.warn(`[${symbol}] No month candles available for backtest`)
    }
    
    console.log(`[${symbol}] Final stats:`, {
      yearPnlPercent,
      monthPnlPercent,
      hasData
    })
    
    return {
      symbol,
      yearPnlPercent,
      monthPnlPercent,
      hasData
    }
  } catch (error) {
    console.error(`[${symbol}] Error calculating stats:`, error.message, error.stack)
    return {
      symbol,
      yearPnlPercent: 0,
      monthPnlPercent: 0,
      hasData: false
    }
  }
}

// Функция для расчета агрегированной статистики (экспортируем для использования в update.js)
async function calculateAggregateStats() {
  console.log('Starting aggregate stats calculation for', ALL_COINS.length, 'coins')
  
  // Получаем статистику по всем монетам параллельно
  const promises = ALL_COINS.map(coin => {
    const timeframe = COIN_TIMEFRAMES[coin] || '4h'
    return getCoinStats(coin, timeframe)
  })
  
  const results = await Promise.all(promises)
  
  console.log('All coin stats received:', results.map(r => ({
    symbol: r.symbol,
    hasData: r.hasData,
    yearPnl: r.yearPnlPercent,
    monthPnl: r.monthPnlPercent
  })))
  
  // Фильтруем монеты с данными
  const coinsWithData = results.filter(r => r.hasData)
  
  console.log('Coins with data:', coinsWithData.length, 'out of', results.length)
  
  if (coinsWithData.length === 0) {
    return {
      totalYearPnl: 0,
      totalMonthPnl: 0,
      activeCoins: 0,
      coinStats: results
    }
  }
  
  // Просто суммируем проценты всех монет
  const totalYearPnl = coinsWithData.reduce((sum, coin) => sum + coin.yearPnlPercent, 0)
  const totalMonthPnl = coinsWithData.reduce((sum, coin) => sum + coin.monthPnlPercent, 0)
  
  console.log('Aggregate stats (sum of percentages):', {
    totalYearPnl: totalYearPnl.toFixed(2),
    totalMonthPnl: totalMonthPnl.toFixed(2),
    activeCoins: coinsWithData.length,
    coinDetails: coinsWithData.map(c => ({
      symbol: c.symbol,
      year: c.yearPnlPercent.toFixed(2),
      month: c.monthPnlPercent.toFixed(2)
    }))
  })
  
  return {
    totalYearPnl: totalYearPnl,
    totalMonthPnl: totalMonthPnl,
    activeCoins: coinsWithData.length,
    coinStats: results
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Проверяем, что БД настроена
    if (!process.env.DB_HOST) {
      console.warn('⚠️ Database not configured, calculating stats on the fly')
      // Если БД не настроена, рассчитываем на лету
      const stats = await calculateAggregateStats()
      return res.status(200).json({
        success: true,
        data: {
          yearPnlPercent: stats.totalYearPnl.toFixed(2),
          monthPnlPercent: stats.totalMonthPnl.toFixed(2),
          activeCoins: stats.activeCoins,
          coinStats: stats.coinStats,
          timestamp: Date.now()
        }
      })
    }

    // Пытаемся получить статистику из БД
    const { getLatestAggregateStats } = require('../../../lib/db')
    const dbStats = await getLatestAggregateStats()
    
    if (dbStats) {
      // Проверяем, не устарела ли статистика (если старше 25 часов, пересчитываем)
      const statsAge = Date.now() - dbStats.timestamp
      const MAX_AGE = 25 * 60 * 60 * 1000 // 25 часов
      
      if (statsAge < MAX_AGE) {
        console.log('=== Returning stats from DB ===', {
          age: Math.round(statsAge / 1000 / 60 / 60) + ' hours'
        })
        return res.status(200).json({
          success: true,
          data: {
            yearPnlPercent: dbStats.yearPnlPercent.toFixed(2),
            monthPnlPercent: dbStats.monthPnlPercent.toFixed(2),
            activeCoins: dbStats.activeCoins,
            coinStats: dbStats.coinStats,
            timestamp: dbStats.timestamp,
            fromDB: true
          }
        })
      } else {
        console.log('=== Stats in DB are too old, recalculating ===')
      }
    } else {
      console.log('=== No stats in DB, calculating ===')
    }
    
    // Если в БД нет данных или они устарели, рассчитываем на лету
    console.log('=== Calculating stats on the fly ===')
    const stats = await calculateAggregateStats()
    
    // Сохраняем в БД (асинхронно, не ждем)
    if (dbStats === null) {
      const { saveAggregateStats } = require('../../../lib/db')
      saveAggregateStats({
        yearPnlPercent: stats.totalYearPnl,
        monthPnlPercent: stats.totalMonthPnl,
        activeCoins: stats.activeCoins,
        coinStats: stats.coinStats,
        updatedAt: new Date()
      }).catch(err => {
        console.error('Failed to save stats to DB:', err)
      })
    }
    
    const response = {
      success: true,
      data: {
        yearPnlPercent: stats.totalYearPnl.toFixed(2),
        monthPnlPercent: stats.totalMonthPnl.toFixed(2),
        activeCoins: stats.activeCoins,
        coinStats: stats.coinStats,
        timestamp: Date.now()
      }
    }
    
    console.log('=== Aggregate Stats Response ===', response.data)
    
    return res.status(200).json(response)
  } catch (error) {
    console.error('❌ Error in aggregate stats API:', error.message, error.stack)
    return res.status(200).json({
      success: false,
      data: {
        yearPnlPercent: '0.00',
        monthPnlPercent: '0.00',
        activeCoins: 0,
        coinStats: [],
        timestamp: Date.now(),
        error: error.message
      }
    })
  }
}

// Функция calculateAggregateStats уже определена выше и доступна для использования

