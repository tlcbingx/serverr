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
    
    const queryParams = []
    queryParams.push(`symbol=${encodeURIComponent(kucoinSymbol)}`)
    queryParams.push(`type=${encodeURIComponent(kucoinInterval)}`)
    const limit = Math.min(options.limit || 200, 200) // KuCoin ограничивает до 200
    queryParams.push(`limit=${limit}`)
    
    if (options.startTime) {
      queryParams.push(`startAt=${Math.floor(options.startTime / 1000)}`) // Конвертируем в секунды
    }
    if (options.endTime) {
      queryParams.push(`endAt=${Math.floor(options.endTime / 1000)}`) // Конвертируем в секунды
    }
    
    const url = `${baseUrl}?${queryParams.join('&')}`
    
    return new Promise((resolve) => {
      https.get(url, (res) => {
        if (res.statusCode !== 200) {
          console.error(`[${symbol}] KuCoin API error: ${res.statusCode} ${res.statusMessage}`)
          resolve([])
          return
        }
        
        let data = ''
        res.on('data', (chunk) => { data += chunk })
        res.on('end', () => {
          try {
            const result = JSON.parse(data)
            
            // KuCoin возвращает { code: "200000", data: [...] }
            if (result.code === '200000' && Array.isArray(result.data) && result.data.length > 0) {
              const intervalMs = interval === '1h' ? 3600000 : interval === '4h' ? 14400000 : 86400000
              const formatted = result.data.map(k => ({
                openTime: parseInt(k[0]) * 1000, // Конвертируем из секунд в миллисекунды
                open: parseFloat(k[1]), // KuCoin: [time, open, close, high, low, volume, amount]
                high: parseFloat(k[3]),
                low: parseFloat(k[4]),
                close: parseFloat(k[2]),
                volume: parseFloat(k[5]),
                closeTime: parseInt(k[0]) * 1000 + intervalMs - 1,
                quoteVolume: parseFloat(k[6]) || (parseFloat(k[5]) * parseFloat(k[2])), // amount или volume * close
                trades: 0,
                takerBuyBaseVolume: 0,
                takerBuyQuoteVolume: 0
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
    console.error(`KuCoin API error for ${symbol}:`, error.message)
    return []
  }
}

function getTimeBoundaries() {
  // Используем UTC для гарантии правильной даты независимо от часового пояса сервера
  const now = new Date()
  const year = now.getUTCFullYear() // Используем UTC год вместо локального
  const month = now.getUTCMonth() // Используем UTC месяц
  const yearStart = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0))
  const monthStart = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0))
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
    const candlesPerRequest = 200 // KuCoin ограничивает до 200 свечей за запрос
    const hoursPerRequest = candlesPerRequest * hoursPerCandle
    const msPerRequest = hoursPerRequest * 60 * 60 * 1000
    
    let yearCandles = []
    let currentEndTime = now
    let requestCount = 0
    // Увеличиваем количество запросов, чтобы загрузить все свечи за год без разрывов
    // KuCoin ограничивает до 200 свечей за запрос
    // Для 4h: ~2190 свечей за год = нужно минимум 11 запросов (200 × 11 = 2200)
    // Для 1h: ~8760 свечей за год = нужно минимум 44 запроса (200 × 44 = 8800)
    // Увеличиваем лимит для гарантии загрузки всех свечей
    const maxRequests = timeframe === '1h' ? 50 : timeframe === '4h' ? 15 : 5
    
    while (currentEndTime > yearStart && requestCount < maxRequests) {
      const requestStartTime = Math.max(yearStart, currentEndTime - msPerRequest)
      const batch = await getFuturesCandles(symbol, timeframe === '1h' ? '1h' : timeframe === '4h' ? '4h' : '1d', {
        startTime: requestStartTime,
        endTime: currentEndTime,
        limit: 200 // KuCoin ограничивает до 200
      })
      
      if (batch.length === 0) break
      
      // Удаляем дубликаты перед добавлением
      const existingTimestamps = new Set(yearCandles.map(c => c.openTime))
      const newCandles = batch.filter(c => !existingTimestamps.has(c.openTime))
      yearCandles = [...newCandles, ...yearCandles]
      
      // Проверяем, достигли ли мы yearStart
      const oldestCandleTime = Math.min(...batch.map(c => c.openTime))
      if (oldestCandleTime <= yearStart) {
        break
      }
      
      // ВАЖНО: Обновляем currentEndTime правильно - минус 1 интервал, чтобы не пропустить свечи
      const intervalSeconds = timeframe === '1h' ? 3600 : timeframe === '4h' ? 14400 : 86400
      // Используем время самой старой свечи из batch (не из всех yearCandles)
      const batchOldestTime = Math.min(...batch.map(c => c.openTime))
      currentEndTime = Math.floor(batchOldestTime / 1000) * 1000 - intervalSeconds * 1000 // Конвертируем обратно в миллисекунды
      requestCount++
      
      console.log(`[${symbol}] Pagination progress:`, {
        request: requestCount,
        batchSize: batch.length,
        totalCandles: yearCandles.length,
        oldestCandle: new Date(batchOldestTime).toISOString(),
        currentEndTime: new Date(currentEndTime).toISOString(),
        yearStart: new Date(yearStart).toISOString(),
        needMore: currentEndTime > yearStart
      })
      
      // Небольшая задержка между запросами
      if (currentEndTime > yearStart) {
        await new Promise(resolve => setTimeout(resolve, 100)) // Увеличиваем задержку до 100ms
      }
    }
    
    yearCandles.sort((a, b) => a.openTime - b.openTime)
    
    // Удаляем дубликаты по timestamp после сортировки
    const uniqueYearCandles = []
    const seenTimestamps = new Set()
    for (const candle of yearCandles) {
      if (!seenTimestamps.has(candle.openTime)) {
        seenTimestamps.add(candle.openTime)
        uniqueYearCandles.push(candle)
      }
    }
    
    if (uniqueYearCandles.length < yearCandles.length) {
      console.log(`[${symbol}] Removed ${yearCandles.length - uniqueYearCandles.length} duplicate candles after sorting`)
    }
    
    // Фильтруем свечи: оставляем только те, которые попадают в период с начала года по сегодня
    const filteredYearCandles = uniqueYearCandles.filter(c => {
      return c.openTime >= yearStart && c.openTime <= now
    })
    
    if (filteredYearCandles.length < uniqueYearCandles.length) {
      console.log(`[${symbol}] Filtered out ${uniqueYearCandles.length - filteredYearCandles.length} candles outside year range`)
    }
    
    yearCandles = filteredYearCandles
    
    // Проверяем, сколько свечей должно быть за год
    const hoursPerCandleForCalc = timeframe === '1h' ? 1 : timeframe === '4h' ? 4 : 24
    const hoursInYear = (now - yearStart) / (1000 * 60 * 60)
    const expectedCandles = Math.floor(hoursInYear / hoursPerCandleForCalc)
    
    console.log(`[${symbol}] Received candles:`, {
      yearCandles: yearCandles?.length || 0,
      expectedCandles: expectedCandles,
      coverage: yearCandles?.length > 0 ? ((yearCandles.length / expectedCandles) * 100).toFixed(1) + '%' : '0%',
      monthCandles: monthCandles?.length || 0,
      timeframe,
      yearStart: new Date(yearStart).toISOString(),
      monthStart: new Date(monthStart).toISOString(),
      now: new Date(now).toISOString(),
      firstCandle: yearCandles?.[0] ? new Date(yearCandles[0].openTime).toISOString() : 'none',
      lastCandle: yearCandles?.[yearCandles.length - 1] ? new Date(yearCandles[yearCandles.length - 1].openTime).toISOString() : 'none'
    })
    
    if (!yearCandles || yearCandles.length === 0) {
      console.warn(`[${symbol}] No year candles after filtering`)
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
    
    console.log(`[${symbol}] Formatted candles:`, {
      yearCandles: formattedYearCandles.length,
      monthCandles: formattedMonthCandles.length,
      timeframe,
      monthStart: new Date(monthStart).toISOString(),
      now: new Date(now).toISOString()
    })
    
    const strategyParams = { 
      ...STRATEGY_PARAMS, 
      timeframe,
      initialCapital: 1000,
      positionSizePercent: 50
    }
    
    let yearPnlPercent = 0
    let hasData = false
    let yearFinalCapitalFromBacktest = null
    let monthFinalCapitalFromBacktest = null
    
    if (formattedYearCandles.length > 0) {
      try {
        const yearStrategy = new TradingStrategy(strategyParams)
        const yearResults = yearStrategy.backtest(formattedYearCandles)
        yearPnlPercent = yearResults.totalPnlPercent || 0
        hasData = true
        yearFinalCapitalFromBacktest = yearResults.finalCapital || (1000 * (1 + yearPnlPercent / 100))
        
        // Подсчитываем сделки по типам для проверки
        const entryTrades = yearResults.trades?.filter(t => t.type === 'BUY' || t.type === 'SELL') || []
        const exitTrades = yearResults.trades?.filter(t => t.type === 'EXIT') || []
        const reverseTrades = exitTrades.filter(t => t.exitType === 'REVERSE') || []
        const totalPnlFromTrades = exitTrades.reduce((sum, t) => sum + (t.pnlUsdt || 0), 0)
        
        console.log(`[${symbol}] Year backtest result:`, {
          totalPnlPercent: yearPnlPercent,
          totalPnl: yearResults.totalPnl,
          totalPnlFromTrades: totalPnlFromTrades.toFixed(2),
          trades: yearResults.trades?.length || 0,
          entryTrades: entryTrades.length,
          exitTrades: exitTrades.length,
          reverseTrades: reverseTrades.length,
          finalCapital: yearResults.finalCapital,
          initialCapital: yearStrategy.initialCapital
        })
      } catch (backtestError) {
        console.error(`[${symbol}] Year backtest error:`, backtestError.message)
      }
    }
    
    let monthPnlPercent = 0
    if (formattedMonthCandles.length > 0) {
      try {
        // Для месячного бэктеста используем меньшее минимальное количество свечей
        // так как за месяц может быть недостаточно свечей для полного trendLength (200)
        const minCandlesForMonth = Math.max(strategyParams.nSlow || 30, 14)
        console.log(`[${symbol}] Month backtest check:`, {
          candlesCount: formattedMonthCandles.length,
          minCandlesForMonth,
          timeframe,
          nSlow: strategyParams.nSlow,
          trendLength: strategyParams.trendLength
        })
        
        if (formattedMonthCandles.length < minCandlesForMonth) {
          console.warn(`[${symbol}] Not enough candles for month backtest: ${formattedMonthCandles.length} < ${minCandlesForMonth}`)
        } else {
          // Для месячного бэктеста адаптируем параметры стратегии
          // Уменьшаем trendLength, так как за месяц может быть недостаточно свечей
          const monthStrategyParams = {
            ...strategyParams,
            // Адаптируем trendLength: используем минимум из доступных свечей и исходного trendLength
            // Но не меньше чем nSlow * 2 для сохранения логики стратегии
            trendLength: Math.min(
              Math.max(Math.floor(formattedMonthCandles.length * 0.7), strategyParams.nSlow * 2),
              strategyParams.trendLength || 200
            )
          }
          
          console.log(`[${symbol}] Month strategy params:`, {
            originalTrendLength: strategyParams.trendLength,
            adaptedTrendLength: monthStrategyParams.trendLength,
            candlesCount: formattedMonthCandles.length
          })
          
          const monthStrategy = new TradingStrategy(monthStrategyParams)
          const monthResults = monthStrategy.backtest(formattedMonthCandles)
          monthPnlPercent = monthResults.totalPnlPercent || 0
          monthFinalCapitalFromBacktest = monthResults.finalCapital || (1000 * (1 + monthPnlPercent / 100))
          
          console.log(`[${symbol}] Month backtest result:`, {
            totalPnlPercent: monthPnlPercent,
            totalPnl: monthResults.totalPnl,
            trades: monthResults.trades?.length || 0,
            candlesCount: formattedMonthCandles.length,
            finalCapital: monthResults.finalCapital,
            initialCapital: monthStrategy.initialCapital
          })
        }
      } catch (backtestError) {
        console.error(`[${symbol}] Month backtest error:`, backtestError.message, backtestError.stack)
        monthPnlPercent = 0
      }
    } else {
      console.warn(`[${symbol}] No month candles available for backtest`, {
        monthCandlesRaw: monthCandles?.length || 0,
        formattedMonthCandles: formattedMonthCandles.length
      })
    }
    
    return { 
      symbol, 
      yearPnlPercent, 
      monthPnlPercent, 
      hasData,
      // Сохраняем также финальный капитал для правильного расчета общей доходности
      // Используем finalCapital из результатов backtest, если доступен
      yearFinalCapital: hasData ? (yearFinalCapitalFromBacktest || (1000 * (1 + yearPnlPercent / 100))) : 1000,
      monthFinalCapital: monthPnlPercent !== 0 ? (monthFinalCapitalFromBacktest || (1000 * (1 + monthPnlPercent / 100))) : 1000
    }
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
  
  // В TradingView при торговле несколькими символами каждая стратегия работает независимо
  // Общая доходность = СУММА процентов всех монет (как в TradingView portfolio)
  // Каждая монета торгуется с полным капиталом 1000 USDT, поэтому проценты суммируются
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
    
    // Логируем временные границы для отладки
    const timeBoundaries = getTimeBoundaries()
    console.log('Time boundaries:', {
      yearStart: new Date(timeBoundaries.yearStart).toISOString(),
      monthStart: new Date(timeBoundaries.monthStart).toISOString(),
      now: new Date(timeBoundaries.now).toISOString(),
      serverTime: new Date().toISOString(),
      utcYear: new Date().getUTCFullYear(),
      utcMonth: new Date().getUTCMonth() + 1, // +1 для читаемости (месяцы 0-11)
      localYear: new Date().getFullYear(),
      localMonth: new Date().getMonth() + 1
    })
    
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

