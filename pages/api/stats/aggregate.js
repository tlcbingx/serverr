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
    // KuCoin ограничивает до 200 свечей за запрос для spot, но для futures может быть другой лимит
    // Используем максимум 200 для надежности
    const limit = Math.min(options.limit || 200, 200)
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
              console.log(`[${symbol}] Successfully received ${formatted.length} candles from KuCoin`)
              resolve(formatted)
            } else {
              resolve([])
            }
          } catch (parseError) {
            console.error(`[${symbol}] JSON parse error:`, parseError.message)
            resolve([])
          }
        })
      }).on('error', (error) => {
        console.error(`[${symbol}] HTTPS request error:`, error.message)
        resolve([])
      })
    })
  } catch (error) {
    console.error(`KuCoin API error for ${symbol}:`, error.message)
    return []
  }
}

// Функция для получения временных границ
function getTimeBoundaries() {
  // Используем UTC для гарантии правильной даты независимо от часового пояса сервера
  const now = new Date()
  const month = now.getUTCMonth() // Используем UTC месяц
  
  // ВАЖНО: Используем последние 365 дней (как в детальной странице), а не календарный год
  // Это соответствует тому, что пользователь видит при выборе "За 365 дней" в details.js
  const nowTimestamp = now.getTime()
  const yearStartTimestamp = nowTimestamp - (365 * 24 * 60 * 60 * 1000) // 365 дней назад
  
  // Начало текущего месяца (1 число текущего месяца, 00:00:00 UTC)
  const year = now.getUTCFullYear()
  const monthStart = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0))
  const monthStartTimestamp = monthStart.getTime()
  
  return {
    yearStart: yearStartTimestamp,
    monthStart: monthStartTimestamp,
    now: nowTimestamp
  }
}

// Вспомогательная функция для вызова /api/trading/backtest (использует ту же логику, что и детальная страница)
async function callBacktestAPI(candles, symbol, timeframe, strategyParams) {
  try {
    // В серверном коде Next.js используем внутренний HTTP вызов
    // Определяем базовый URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    
    const url = `${baseUrl}/api/trading/backtest`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candles,
        symbol,
        timeframe,
        strategyParams
      })
    })
    
    if (!response.ok) {
      throw new Error(`Backtest API error: ${response.status} ${response.statusText}`)
    }
    
    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error || 'Backtest failed')
    }
    
    return result
  } catch (error) {
    console.error(`[${symbol}] Error calling backtest API:`, error.message)
    throw error
  }
}

// Функция для расчета статистики по одной монете
// ИСПОЛЬЗУЕТ ТОТ ЖЕ API /api/trading/backtest, что и детальная страница - гарантирует идентичные результаты
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
      
      if (batch.length === 0) {
        break
      }
      
      // Удаляем дубликаты перед добавлением (по timestamp)
      const existingTimestamps = new Set(yearCandles.map(c => c.openTime))
      const newCandles = batch.filter(c => !existingTimestamps.has(c.openTime))
      
      if (newCandles.length < batch.length) {
        console.log(`[${symbol}] Batch ${requestCount + 1}: removed ${batch.length - newCandles.length} duplicate candles`)
      }
      
      // Добавляем свечи в начало массива (так как идем от конца к началу)
      yearCandles = [...newCandles, ...yearCandles]
      
      // Проверяем, достигли ли мы yearStart
      const oldestCandleTime = Math.min(...batch.map(c => c.openTime))
      if (oldestCandleTime <= yearStart) {
        console.log(`[${symbol}] Reached yearStart, stopping pagination at request ${requestCount + 1}`)
        break
      }
      
      // ВАЖНО: Обновляем currentEndTime для следующего запроса правильно
      // Берем время самой старой свечи минус 1 интервал, чтобы не пропустить свечи
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
    
    // Сортируем свечи по времени (на случай если порядок нарушен)
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
    
    // Проверяем, есть ли разрывы в данных
    if (yearCandles.length > 1) {
      const intervalMs = timeframe === '1h' ? 3600000 : timeframe === '4h' ? 14400000 : 86400000
      let gaps = []
      for (let i = 1; i < yearCandles.length; i++) {
        const gap = yearCandles[i].openTime - yearCandles[i-1].openTime
        if (gap > intervalMs * 2) { // Разрыв больше чем 2 интервала
          gaps.push({
            from: new Date(yearCandles[i-1].openTime).toISOString(),
            to: new Date(yearCandles[i].openTime).toISOString(),
            gapHours: Math.round(gap / (1000 * 60 * 60))
          })
        }
      }
      if (gaps.length > 0) {
        console.warn(`[${symbol}] Found ${gaps.length} gaps in year candles:`, gaps.slice(0, 5)) // Показываем первые 5 разрывов
      }
    }
    
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
    
    // Годовая статистика - используем /api/trading/backtest (тот же API, что и детальная страница)
    let yearPnlPercent = 0
    let hasData = false
    let yearFinalCapital = 1000
    let monthFinalCapital = 1000
    
    if (formattedYearCandles.length > 0) {
      try {
        const yearResult = await callBacktestAPI(formattedYearCandles, symbol, timeframe, strategyParams)
        if (yearResult.statistics) {
          yearPnlPercent = yearResult.statistics.totalPnlPercent || 0
          yearFinalCapital = yearResult.statistics.currentEquity || 1000
          hasData = true
          console.log(`[${symbol}] Year stats from /api/trading/backtest:`, {
            totalPnlPercent: yearPnlPercent,
            currentEquity: yearFinalCapital,
            initialEquity: yearResult.statistics.initialEquity
          })
        }
      } catch (backtestError) {
        console.error(`[${symbol}] Year backtest API error:`, backtestError.message)
      }
    }
    
    // Месячная статистика - используем /api/trading/backtest
    let monthPnlPercent = 0
    if (formattedMonthCandles.length > 0) {
      try {
        const monthResult = await callBacktestAPI(formattedMonthCandles, symbol, timeframe, strategyParams)
        if (monthResult.statistics) {
          monthPnlPercent = monthResult.statistics.totalPnlPercent || 0
          monthFinalCapital = monthResult.statistics.currentEquity || 1000
          console.log(`[${symbol}] Month stats from /api/trading/backtest:`, {
            totalPnlPercent: monthPnlPercent,
            currentEquity: monthFinalCapital
          })
        }
      } catch (backtestError) {
        console.error(`[${symbol}] Month backtest API error:`, backtestError.message)
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
      hasData,
      yearFinalCapital,
      monthFinalCapital
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
  
  // Суммируем проценты всех монет (как в TradingView portfolio)
  // Каждая монета торгуется с полным капиталом 1000 USDT, поэтому проценты суммируются
  const totalYearPnl = coinsWithData.reduce((sum, coin) => sum + coin.yearPnlPercent, 0)
  const totalMonthPnl = coinsWithData.reduce((sum, coin) => sum + coin.monthPnlPercent, 0)
  
  // Проверяем, что все монеты учтены
  const allCoinsProcessed = results.length === ALL_COINS.length
  const missingCoins = ALL_COINS.filter(coin => !results.find(r => r.symbol === coin && r.hasData))
  
  console.log('Aggregate stats (sum of percentages, like TradingView portfolio):', {
    totalYearPnl: totalYearPnl.toFixed(2) + '%',
    totalMonthPnl: totalMonthPnl.toFixed(2) + '%',
    activeCoins: coinsWithData.length,
    totalCoins: ALL_COINS.length,
    allCoinsProcessed,
    missingCoins: missingCoins.length > 0 ? missingCoins : 'none',
    coinDetails: coinsWithData.map(c => ({
      symbol: c.symbol,
      year: c.yearPnlPercent.toFixed(2) + '%',
      month: c.monthPnlPercent.toFixed(2) + '%'
    })),
    coinsWithoutData: results.filter(r => !r.hasData).map(r => r.symbol)
  })
  
  if (missingCoins.length > 0) {
    console.warn('⚠️ Some coins are missing from results:', missingCoins)
  }
  
  if (coinsWithData.length < ALL_COINS.length) {
    console.warn(`⚠️ Only ${coinsWithData.length} out of ${ALL_COINS.length} coins have data`)
  }
  
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
    // Проверяем параметр force для принудительного обновления
    const forceUpdate = req.query.force === 'true' || req.query.force === '1'
    
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

    // Если НЕ принудительное обновление, пытаемся получить из БД
    let dbStats = null
    if (!forceUpdate) {
      try {
        const { getLatestAggregateStats } = require('../../../lib/db')
        dbStats = await getLatestAggregateStats()
      } catch (dbError) {
        console.warn('⚠️ Failed to get stats from DB, will recalculate:', dbError.message)
        // Продолжаем расчет, если не удалось получить из БД
      }
    } else {
      console.log('=== Force update requested, skipping DB read ===')
    }
    
    if (dbStats && !forceUpdate) {
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
    } else if (!forceUpdate) {
      console.log('=== No stats in DB, calculating ===')
    }
    
    // Если в БД нет данных или они устарели, или принудительное обновление, рассчитываем на лету
    if (forceUpdate) {
      console.log('=== Force update requested, recalculating stats ===')
    } else {
      console.log('=== Calculating stats on the fly ===')
    }
    const stats = await calculateAggregateStats()
    
    // Сохраняем в БД (асинхронно, не ждем) - всегда сохраняем при пересчете
    // Запускаем сохранение в фоне, не блокируя ответ
    if (dbStats === null || forceUpdate) {
      // Используем setTimeout для гарантии, что ответ вернется до попытки сохранения
      // В serverless окружениях это более надежно, чем process.nextTick
      setTimeout(async () => {
        try {
          const { saveAggregateStats } = require('../../../lib/db')
          await saveAggregateStats({
            yearPnlPercent: stats.totalYearPnl,
            monthPnlPercent: stats.totalMonthPnl,
            activeCoins: stats.activeCoins,
            coinStats: stats.coinStats,
            updatedAt: new Date()
          })
          console.log('✅ Stats saved to DB successfully')
        } catch (err) {
          // Ошибка сохранения не критична - данные уже возвращены клиенту
          // Логируем, но не прерываем выполнение
          console.error('⚠️ Failed to save stats to DB (non-blocking):', err.message)
          if (err.stack) {
            console.error('Stack:', err.stack.split('\n').slice(0, 3).join('\n'))
          }
        }
      }, 100) // Небольшая задержка, чтобы ответ успел отправиться
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

