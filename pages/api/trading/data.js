// API для получения данных с KuCoin и расчета стратегии
const TradingStrategy = require('../../../lib/trading-strategy')
const { getCandlesFromDB, getCandlesLastUpdate, saveCandles } = require('../../../lib/db')
const https = require('https')
const { URL } = require('url')

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

// Функция для запроса через прокси
function fetchThroughProxy(targetUrl, proxyUrl) {
  return new Promise((resolve, reject) => {
    const target = new URL(targetUrl)
    const proxy = new URL(proxyUrl)
    
    const options = {
      hostname: proxy.hostname,
      port: proxy.port || 443,
      path: targetUrl,
      method: 'GET',
      headers: {
        'Host': target.hostname,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    }
    
    // Если прокси требует авторизацию
    if (proxy.username && proxy.password) {
      const auth = Buffer.from(`${proxy.username}:${proxy.password}`).toString('base64')
      options.headers['Proxy-Authorization'] = `Basic ${auth}`
    }
    
    const req = https.request(options, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        if (res.statusCode === 403 || data.includes('CloudFront') || data.includes('block access from your country')) {
          console.warn(`[KuCoin] Access blocked (403) via proxy - geographic restriction`)
          resolve(null)
          return
        }
        
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`))
          return
        }
        
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(new Error(`JSON parse error: ${e.message}`))
        }
      })
    })
    
    req.on('error', (error) => {
      reject(error)
    })
    
    req.end()
  })
}

// Функция для получения свечей с KuCoin API (с кэшированием в БД)
async function getFuturesCandles(symbol, interval, options = {}) {
  try {
    const startTime = options.startTime ? parseInt(options.startTime) : null
    const endTime = options.endTime ? parseInt(options.endTime) : Date.now()
    
    // Проверяем БД перед запросом к API
    // Всегда используем кэш как базу, затем дополняем недостающие данные из API
    let cachedCandles = []
    if (process.env.DB_HOST) {
      try {
        // Получаем все свечи из кеша для диапазона (или без ограничений если диапазон не указан)
        const cacheStartTime = startTime || 0
        const cacheEndTime = endTime || Date.now()
        cachedCandles = await getCandlesFromDB(symbol, interval, cacheStartTime, cacheEndTime)
        
        if (cachedCandles && cachedCandles.length > 0) {
          console.log(`[KuCoin] Found ${cachedCandles.length} candles in cache for ${symbol} ${interval}`)
          
          // Проверяем разрывы в кеше
          const intervalMs = interval === '1h' ? 3600000 : interval === '4h' ? 14400000 : 86400000
          const sortedCache = cachedCandles.sort((a, b) => a.openTime - b.openTime)
          let hasGaps = false
          let missingRanges = []
          
          // Проверяем начало диапазона
          if (startTime && sortedCache.length > 0) {
            const firstCandleTime = sortedCache[0].openTime
            if (firstCandleTime > startTime + intervalMs) {
              hasGaps = true
              missingRanges.push({ start: startTime, end: firstCandleTime - 1 })
            }
          }
          
          // Проверяем разрывы между свечами
          for (let i = 1; i < sortedCache.length; i++) {
            const gap = sortedCache[i].openTime - sortedCache[i-1].openTime
            if (gap > intervalMs * 2) {
              hasGaps = true
              missingRanges.push({
                start: sortedCache[i-1].openTime + intervalMs,
                end: sortedCache[i].openTime - intervalMs
              })
            }
          }
          
          // Проверяем конец диапазона
          if (endTime && sortedCache.length > 0) {
            const lastCandleTime = sortedCache[sortedCache.length - 1].openTime
            const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000)
            // Если запрашиваем свежие данные и последняя свеча старше 1 дня, нужно обновить
            if (endTime > oneDayAgo && lastCandleTime < endTime - intervalMs) {
              hasGaps = true
              missingRanges.push({ start: lastCandleTime + intervalMs, end: endTime })
            }
          }
          
          // Если нет разрывов и кеш свежий, используем только кеш
          const lastUpdate = await getCandlesLastUpdate(symbol, interval)
          const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000)
          const isCacheFresh = lastUpdate && new Date(lastUpdate).getTime() > oneDayAgo
          
          if (!hasGaps && isCacheFresh) {
            let filtered = sortedCache
            if (startTime || endTime) {
              const start = startTime || 0
              const end = endTime || Date.now()
              filtered = sortedCache.filter(c => c.openTime >= start && c.openTime <= end)
            }
            
            if (options.limit && filtered.length > options.limit) {
              filtered = filtered.slice(-options.limit)
            }
            
            console.log(`[KuCoin] Returned ${filtered.length} candles from cache (complete, no gaps) for ${symbol}`)
            return filtered
          }
          
          // Если есть разрывы или кеш устарел, будем дополнять из API
          if (hasGaps) {
            console.log(`[KuCoin] Cache has ${missingRanges.length} gaps, will fill from API`)
          } else {
            console.log(`[KuCoin] Cache outdated, will update with new candles`)
          }
        }
      } catch (dbError) {
        console.warn(`[KuCoin] DB cache check failed, using API:`, dbError.message)
        // Продолжаем с API запросом
      }
    }
    
    // Если кэш не доступен или устарел, запрашиваем из API
    console.log(`[KuCoin] Fetching from API for ${symbol} ${interval}`)
    
    // Используем KuCoin API v1 для спот-торговли
    // API endpoint: https://api.kucoin.com/api/v1/market/candles
    const baseUrl = 'https://api.kucoin.com/api/v1/market/candles'
    const kucoinSymbol = convertSymbolToKuCoin(symbol)
    const kucoinInterval = convertIntervalToKuCoin(interval)
    
    // KuCoin API ограничивает limit до 200 свечей за запрос
    // Нужно делать пагинацию через startAt/endAt
    const maxLimit = 200
    let allCandles = []
    let endAt = options.endTime ? Math.floor(parseInt(options.endTime) / 1000) : Math.floor(Date.now() / 1000)
    let attempts = 0
    const maxAttempts = 500 // Много попыток для получения всей истории (может быть много лет данных)
    
    // Определяем targetStartTime - если не указан, берем с 2017 года
    // Но если указан limit, ограничиваем диапазон для ускорения
    let targetStartTime = options.startTime ? Math.floor(parseInt(options.startTime) / 1000) : Math.floor(new Date('2017-01-01').getTime() / 1000)
    
    // Оптимизация: если указан limit, вычисляем минимальный startTime для этого лимита
    if (options.limit && !options.startTime) {
      const intervalSeconds = interval === '1h' ? 3600 : interval === '4h' ? 14400 : 86400
      const limitSeconds = parseInt(options.limit) * intervalSeconds
      const minStartTime = endAt - limitSeconds
      // Берем максимум из 2017 года и вычисленного времени для лимита
      targetStartTime = Math.max(targetStartTime, minStartTime)
      console.log(`[KuCoin] Optimized startTime based on limit ${options.limit}: ${new Date(targetStartTime * 1000).toISOString()}`)
    }
    
    console.log(`[KuCoin] Fetching history for ${symbol} from ${new Date(targetStartTime * 1000).toISOString()} to ${new Date(endAt * 1000).toISOString()}`)
    
    while (attempts < maxAttempts) {
      // KuCoin API использует startAt и endAt в секундах
      const params = new URLSearchParams({
        symbol: kucoinSymbol,
        type: kucoinInterval,
        limit: maxLimit.toString(),
        endAt: endAt.toString()
      })
      
      // Если есть startAt, добавляем его
      if (targetStartTime && endAt > targetStartTime) {
        // Вычисляем startAt для этого батча (200 свечей назад от endAt)
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
      
      // KuCoin возвращает { code: "200000", data: [...] }
      if (result.code !== '200000') {
        // Если код ошибки, логируем и останавливаемся
        if (result.code !== '200000') {
          console.warn(`[KuCoin] API returned code ${result.code} for ${symbol}, message: ${result.msg || 'unknown'}`)
        }
        break
      }
      
      if (!Array.isArray(result.data)) {
        console.warn(`[KuCoin] API returned non-array data for ${symbol}`)
        break
      }
      
      // Если данных нет, но мы еще не достигли targetStartTime, продолжаем
      if (result.data.length === 0) {
        // Проверяем, достигли ли мы targetStartTime
        if (endAt <= targetStartTime) {
          console.log(`[KuCoin] No more data available, reached target start time`)
          break
        }
        // Если еще не достигли, продолжаем с более ранним endAt
        const intervalSeconds = interval === '1h' ? 3600 : interval === '4h' ? 14400 : 86400
        endAt = endAt - (maxLimit * intervalSeconds)
        attempts++
        continue
      }
      
      // Конвертируем формат KuCoin в формат библиотеки
      // KuCoin формат: [time (секунды), open, close, high, low, volume, amount]
      // KuCoin возвращает данные в обратном порядке (новые первыми)
      const intervalMs = interval === '1h' ? 3600000 : interval === '4h' ? 14400000 : 86400000
      const batch = result.data.map(k => {
        const timestamp = parseInt(k[0]) * 1000 // Конвертируем из секунд в миллисекунды
        return {
          openTime: timestamp,
          open: parseFloat(k[1]), // KuCoin: [time, open, close, high, low, volume, amount]
          high: parseFloat(k[3]),
          low: parseFloat(k[4]),
          close: parseFloat(k[2]),
          volume: parseFloat(k[5]),
          closeTime: timestamp + intervalMs - 1,
          quoteVolume: parseFloat(k[6]) || (parseFloat(k[5]) * parseFloat(k[2])), // amount или volume * close
          trades: 0,
          takerBuyBaseVolume: 0,
          takerBuyQuoteVolume: 0
        }
      })
      
      // KuCoin может вернуть больше свечей, чем запрошено (особенно при указании startAt/endAt)
      // Ограничиваем до ожидаемого количества, но обрабатываем все
      if (batch.length > maxLimit) {
        console.log(`[KuCoin] Batch ${attempts + 1}: received ${batch.length} candles (more than requested ${maxLimit}), processing all`)
      }
      
      // Удаляем дубликаты перед добавлением (по timestamp)
      const existingTimestamps = new Set(allCandles.map(c => c.openTime))
      const newCandles = batch.filter(c => !existingTimestamps.has(c.openTime))
      
      if (newCandles.length < batch.length) {
        console.log(`[KuCoin] Batch ${attempts + 1}: removed ${batch.length - newCandles.length} duplicate candles`)
      }
      
      allCandles = [...allCandles, ...newCandles]
      
      // Находим самую старую свечу в батче
      const oldestTimestamp = Math.min(...batch.map(c => c.openTime))
      const oldestDate = new Date(oldestTimestamp).toISOString()
      
      console.log(`[KuCoin] Batch ${attempts + 1}: received ${batch.length} candles (${newCandles.length} new), total: ${allCandles.length}, oldest: ${oldestDate}`)
      
      // Проверяем, достигли ли мы targetStartTime
      if (oldestTimestamp <= targetStartTime * 1000) {
        console.log(`[KuCoin] Reached target start time, stopping pagination`)
        break
      }
      
      // Если получили меньше maxLimit свечей, но еще не достигли targetStartTime, продолжаем
      // Если получили maxLimit свечей, обязательно продолжаем
      if (batch.length > 0 && oldestTimestamp > targetStartTime * 1000) {
        // ВАЖНО: Обновляем endAt для следующего запроса правильно
        // Берем время самой старой свечи минус 1 миллисекунду, чтобы не пропустить свечи
        // KuCoin API использует секунды, поэтому конвертируем обратно
        endAt = Math.floor(oldestTimestamp / 1000) - 1
        attempts++
        
        // Небольшая задержка для избежания rate limits (особенно для часовых графиков)
        const delay = interval === '1h' ? 200 : 100
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      // Если получили пустой батч или 0 свечей, останавливаемся
      break
    }
    
    console.log(`[KuCoin] Total fetched: ${allCandles.length} candles for ${symbol}`)
    
    // Фильтруем по временному диапазону если указан
    if (options.startTime || options.endTime) {
      const startTime = options.startTime ? parseInt(options.startTime) : 0
      const endTimeFilter = options.endTime ? parseInt(options.endTime) : Date.now()
      
      allCandles = allCandles.filter(c => {
        return c.openTime >= startTime && c.openTime <= endTimeFilter
      })
    }
    
    // Объединяем кеш и API данные
    if (cachedCandles.length > 0) {
      // Создаем Map для быстрого поиска свечей из кеша
      const cacheMap = new Map()
      cachedCandles.forEach(c => cacheMap.set(c.openTime, c))
      
      // Добавляем свечи из API, перезаписывая кеш если есть дубликаты
      allCandles.forEach(c => cacheMap.set(c.openTime, c))
      
      // Объединяем все свечи
      allCandles = Array.from(cacheMap.values())
      console.log(`[KuCoin] Merged cache (${cachedCandles.length}) + API (${allCandles.length - cachedCandles.length}) = ${allCandles.length} total candles`)
    }
    
    // Сортируем по времени (старые первыми) и удаляем дубликаты
    allCandles.sort((a, b) => a.openTime - b.openTime)
    
    // Удаляем дубликаты по timestamp (на всякий случай)
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
    allCandles = uniqueCandles
    
    // Проверяем на разрывы в данных
    if (allCandles.length > 1) {
      const intervalMs = interval === '1h' ? 3600000 : interval === '4h' ? 14400000 : 86400000
      let gaps = []
      for (let i = 1; i < allCandles.length; i++) {
        const gap = allCandles[i].openTime - allCandles[i-1].openTime
        if (gap > intervalMs * 2) { // Разрыв больше чем 2 интервала
          gaps.push({
            from: new Date(allCandles[i-1].openTime).toISOString(),
            to: new Date(allCandles[i].openTime).toISOString(),
            gapHours: Math.round(gap / (1000 * 60 * 60))
          })
        }
      }
      if (gaps.length > 0) {
        console.warn(`[KuCoin] Found ${gaps.length} gaps in candles for ${symbol}:`, gaps.slice(0, 5)) // Показываем первые 5 разрывов
      }
    }
    
    if (options.limit && allCandles.length > options.limit) {
      allCandles = allCandles.slice(-options.limit) // Берем последние N свечей
    }
    
    console.log(`[KuCoin] Received ${allCandles.length} candles for ${symbol} (after filtering and deduplication)`)
    
    // Сохраняем в БД для кэширования (асинхронно, не ждем)
    if (process.env.DB_HOST && allCandles.length > 0) {
      saveCandles(symbol, interval, allCandles).catch(err => {
        console.warn(`[KuCoin] Failed to save candles to cache:`, err.message)
      })
    }
    
    return allCandles
  } catch (error) {
    console.error(`[KuCoin] Error for ${symbol}:`, error.message)
    if (error.stack) {
      console.error(`[KuCoin] Stack:`, error.stack)
    }
    return []
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { symbol = 'BTCUSDT', timeframe = '4h', limit = 500, startTime, endTime, filterStartTime, filterEndTime, candlesOnly } = req.query
    
      // Если запрашивают только свечи (без стратегии), возвращаем быстро
      if (candlesOnly === 'true') {
        const kucoinInterval = timeframe === '1h' ? '1hour' : timeframe === '4h' ? '4hour' : '1day'
      
      let candles = []
      try {
        if (startTime && endTime) {
          const startTimeNum = parseInt(startTime)
          const endTimeNum = parseInt(endTime)
          if (isNaN(startTimeNum) || isNaN(endTimeNum) || startTimeNum >= endTimeNum) {
            console.warn('Invalid time range for candles only request')
            candles = []
          } else {
            candles = await getFuturesCandles(symbol, kucoinInterval, { startTime: startTimeNum, endTime: endTimeNum, limit: parseInt(limit) })
          }
        } else {
          candles = await getFuturesCandles(symbol, kucoinInterval, { limit: parseInt(limit) })
        }
      } catch (error) {
        console.error(`KuCoin API error (candles only) for ${symbol}:`, error.message)
        // Возвращаем пустой результат вместо ошибки, чтобы не ломать загрузку других монет
        return res.status(200).json({
          success: false,
          symbol,
          timeframe,
          candles: [],
          trades: [],
          statistics: null,
          closedTrades: [],
          error: error.message.includes('451') || error.message.includes('restricted') 
            ? 'Service unavailable from restricted location' 
            : `Failed to fetch candles for ${symbol}: ${error.message}`
        })
      }
      
      if (!candles || candles.length === 0) {
        // Не логируем, если это из-за географических ограничений (451)
        // console.warn(`No candles received for ${symbol}`)
        return res.status(200).json({
          success: false,
          symbol,
          timeframe,
          candles: [],
          trades: [],
          statistics: null,
          closedTrades: [],
          error: `No candles available for ${symbol}`
        })
      }
      
      const formattedCandles = candles.map(c => ({
        timestamp: c.openTime,
        open: parseFloat(c.open),
        high: parseFloat(c.high),
        low: parseFloat(c.low),
        close: parseFloat(c.close),
        volume: parseFloat(c.volume)
      }))
      
      return res.status(200).json({
        success: true,
        symbol,
        timeframe,
        candles: formattedCandles,
        trades: [],
        statistics: null,
        closedTrades: []
      })
    }

    // Параметры стратегии из запроса
    const strategyParams = {
      nFast: parseInt(req.query.nFast) || 15,
      nSlow: parseInt(req.query.nSlow) || 30,
      baseSlPercent: parseFloat(req.query.baseSlPercent) || 3,
      baseTp1Percent: parseFloat(req.query.baseTp1Percent) || 3,
      baseTp2Percent: parseFloat(req.query.baseTp2Percent) || 6,
      baseTp3Percent: parseFloat(req.query.baseTp3Percent) || 10,
      trendLength: parseInt(req.query.trendLength) || 200,
      rsiPeriod: parseInt(req.query.rsiPeriod) || 14,
      rsiLongFilter: parseInt(req.query.rsiLongFilter) || 50,
      rsiShortFilter: parseInt(req.query.rsiShortFilter) || 50,
      timeframe
    }

    // Конвертация таймфрейма для KuCoin
    const kucoinInterval = timeframe === '1h' ? '1hour' : timeframe === '4h' ? '4hour' : '1day'

    // Получение свечей с KuCoin
    let candles
    try {
      console.log('Fetching candles from KuCoin:', { symbol, interval: kucoinInterval, limit, startTime, endTime })
      
      if (startTime && endTime) {
        const startTimeNum = parseInt(startTime)
        const endTimeNum = parseInt(endTime)
        
        // Проверяем, что времена валидны и startTime < endTime
        if (isNaN(startTimeNum) || isNaN(endTimeNum) || startTimeNum >= endTimeNum) {
          console.warn('Invalid time range, returning empty result', { startTimeNum, endTimeNum })
          candles = []
        } else {
          // Загружаем всю историю через пагинацию
          // KuCoin спот имеет историю с момента запуска торговли
          try {
            // Для получения всей истории не ограничиваем limit
            candles = await getFuturesCandles(symbol, kucoinInterval, {
              startTime: startTimeNum,
              endTime: endTimeNum,
              limit: 100000 // Большое число, чтобы получить всю историю через пагинацию
            })
            console.log(`KuCoin returned ${candles?.length || 0} candles for range`, {
              start: new Date(startTimeNum).toISOString(),
              end: new Date(endTimeNum).toISOString()
            })
          } catch (apiError) {
            console.error('KuCoin API call failed:', apiError.message)
            candles = []
          }
        }
      } else {
        // Без временного диапазона - берем последние свечи
        try {
          candles = await getFuturesCandles(symbol, kucoinInterval, {
            limit: parseInt(limit)
          })
          console.log(`KuCoin returned ${candles?.length || 0} candles (no time range)`)
        } catch (apiError) {
          console.error('KuCoin API call failed (no time range):', apiError.message)
          candles = []
        }
      }
      
      // Логируем результат получения свечей
      if (candles && candles.length > 0) {
        console.log(`[KuCoin] Successfully received ${candles.length} candles for ${symbol}`)
        console.log(`[KuCoin] First candle:`, {
          time: new Date(candles[0].openTime).toISOString(),
          open: candles[0].open,
          close: candles[0].close
        })
        console.log(`[KuCoin] Last candle:`, {
          time: new Date(candles[candles.length - 1].openTime).toISOString(),
          open: candles[candles.length - 1].open,
          close: candles[candles.length - 1].close
        })
      } else {
        console.warn(`[KuCoin] No candles received for ${symbol}`)
        candles = []
      }
    } catch (kucoinError) {
      console.error('KuCoin API error:', kucoinError)
      
      // Для любых ошибок KuCoin возвращаем пустой результат вместо 500
      // Это позволяет продолжать работу даже если некоторые запросы не удались
      console.warn('KuCoin error, returning empty result to continue', {
        error: kucoinError.message || kucoinError.toString(),
        symbol,
        startTime,
        endTime
      })
      candles = []
    }
    
    // Если нет свечей, возвращаем пустой результат
    if (!candles || candles.length === 0) {
      return res.status(200).json({
        success: true,
        symbol,
        timeframe,
        candles: [],
        trades: [],
        equityCurve: [],
        indicators: {},
        statistics: {
          totalTrades: 0,
          closedTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          winRate: '0.00',
          totalPnl: '0.00',
          totalPnlPercent: '0.00',
          maxDrawdown: '0.00',
          maxDrawdownUsdt: '0.00',
          peakEquity: '1000.00',
          currentEquity: '1000.00',
          initialEquity: '1000.00',
          totalProfit: '0.00',
          totalLoss: '0.00',
          profitFactor: '0.00'
        },
        closedTrades: []
      })
    }

    // Преобразование данных KuCoin в формат для стратегии
    const formattedCandles = candles.map(candle => ({
      timestamp: candle.openTime,
      open: parseFloat(candle.open),
      high: parseFloat(candle.high),
      low: parseFloat(candle.low),
      close: parseFloat(candle.close),
      volume: parseFloat(candle.volume),
      closeTime: candle.closeTime
    }))

    // Инициализация стратегии
    const strategy = new TradingStrategy(strategyParams)

    // Запуск бэктеста (если есть свечи)
    let results = null
    try {
      console.log(`[Backtest] Starting with ${formattedCandles.length} candles for ${symbol}`)
      if (formattedCandles.length > 0) {
        results = strategy.backtest(formattedCandles)
        console.log(`[Backtest] Completed: ${results.trades?.length || 0} trades, PnL: ${results.totalPnlPercent || 0}%`)
      } else {
        console.warn(`[Backtest] No candles available for ${symbol}, creating empty result`)
        // Если нет свечей, создаем пустой результат
        results = {
          trades: [],
          equity: [],
          totalPnl: 0,
          winningTrades: 0,
          losingTrades: 0,
          maxDrawdown: 0,
          peakEquity: 1000
        }
      }
    } catch (strategyError) {
      console.error('Strategy backtest error:', strategyError)
      // В случае ошибки стратегии возвращаем пустой результат
      results = {
        trades: [],
        equity: [],
        totalPnl: 0,
        winningTrades: 0,
        losingTrades: 0,
        maxDrawdown: 0,
        peakEquity: 1000
      }
    }

    // Параметры торговли
    const initialEquity = 1000 // Начальный депозит $1000
    const positionSizePercent = 0.5 // 50% депозита на сделку
    const commissionEnter = 0.0005 // 0.05% комиссия на вход
    const commissionExit = 0.0005 // 0.05% комиссия на выход
    const totalCommission = commissionEnter + commissionExit // 0.1% общая комиссия
    
    // Расчет статистики
    let totalPnl = 0
    let totalPnlPercent = 0
    let winningTrades = 0
    let losingTrades = 0
    let totalProfit = 0
    let totalLoss = 0
    let maxDrawdown = 0
    let maxDrawdownUsdt = 0
    let peakEquity = initialEquity
    let currentEquity = initialEquity

    const equityCurve = []
    const trades = []
    const closedTrades = []

    // Симуляция сделок с правильным расчетом equity
    console.log('Starting backtest with', formattedCandles.length, 'candles')
    console.log('Strategy params:', {
      nFast: strategyParams.nFast,
      nSlow: strategyParams.nSlow,
      trendLength: strategyParams.trendLength,
      timeframe: strategyParams.timeframe,
      minCandlesNeeded: Math.max(strategyParams.nSlow || 30, strategyParams.trendLength || 200, 14)
    })
    const openPositions = [] // Отслеживаем открытые позиции
    
    for (let i = 0; i < formattedCandles.length; i++) {
      const candle = formattedCandles[i]
      const update = strategy.update(candle)

      // Обработка новых сделок
      if (update.trades && update.trades.length > 0) {
        console.log(`Candle ${i}/${formattedCandles.length}: Found ${update.trades.length} trades`, update.trades.map(t => ({ type: t.type, exitType: t.exitType })))
      }
      
      // Логируем каждую 100-ю свечу для диагностики
      if (i % 100 === 0 && i > 0) {
        console.log(`Backtest progress: ${i}/${formattedCandles.length} candles processed, ${trades.length} total trades, ${openPositions.length} open positions`)
      }
      
      for (const trade of update.trades) {
        const tradeWithIndex = {
          ...trade,
          candleIndex: i
        }
        trades.push(tradeWithIndex)
        
        // Обработка входов и выходов
        if (trade.type === 'BUY' || trade.type === 'SELL') {
          // Вход в позицию
          const positionSize = currentEquity * positionSizePercent
          const entryPrice = trade.entryPrice || candle.close
          const commissionCost = positionSize * commissionEnter
          
          openPositions.push({
            id: trade.id,
            type: trade.type,
            entryPrice,
            entryCandleIndex: i,
            entryEquity: currentEquity,
            positionSize,
            commissionEnter: commissionCost
          })
          
          // Вычитаем комиссию на вход
          currentEquity -= commissionCost
        } else if (trade.type === 'EXIT') {
          // Выход из позиции
          const position = openPositions.find(p => p.id === trade.id)
          if (position) {
            const exitPrice = trade.exitPrice || candle.close
            const exitPositionSize = position.positionSize
            
            // Расчет PnL
            let pnlPercent = 0
            if (position.type === 'BUY') {
              pnlPercent = ((exitPrice - position.entryPrice) / position.entryPrice) * 100
            } else {
              pnlPercent = ((position.entryPrice - exitPrice) / position.entryPrice) * 100
            }
            
            // Расчет PnL с учетом комиссии
            // Комиссия уже учтена в pnlPercent через вычитание totalCommission
            pnlPercent = pnlPercent - (totalCommission * 100)
            
            // PnL в USDT (комиссия уже учтена в процентах)
            const pnlUsdt = (pnlPercent / 100) * position.positionSize
            
            // Вычитаем комиссию на выход из equity
            const commissionExitCost = exitPositionSize * commissionExit
            
            // Обновляем equity (комиссия на вход уже вычтена при входе)
            currentEquity += pnlUsdt - commissionExitCost
            
            // Обновляем статистику
            if (pnlUsdt > 0) {
              winningTrades++
              totalProfit += pnlUsdt
            } else {
              losingTrades++
              totalLoss += Math.abs(pnlUsdt)
            }
            
            totalPnl += pnlUsdt
            
            // Добавляем в закрытые сделки
            closedTrades.push({
              ...position,
              exitPrice,
              exitTime: candle.timestamp,
              exitCandleIndex: i,
              pnl: pnlPercent,
              pnlUsdt,
              commissionExit: commissionExitCost
            })
            
            // Удаляем из открытых позиций
            const posIndex = openPositions.findIndex(p => p.id === trade.id)
            if (posIndex >= 0) {
              openPositions.splice(posIndex, 1)
            }
          }
        }
      }

      // Расчет equity curve
      equityCurve.push({
        timestamp: candle.timestamp,
        equity: currentEquity,
        price: candle.close
      })

      if (currentEquity > peakEquity) {
        peakEquity = currentEquity
      }

      const drawdown = peakEquity > 0 ? ((peakEquity - currentEquity) / peakEquity) * 100 : 0
      const drawdownUsdt = peakEquity - currentEquity
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown
        maxDrawdownUsdt = drawdownUsdt
      }
    }

    // Статистика уже рассчитана в цикле выше через отслеживание позиций
    // Если сделок нет, но есть входы без выходов, обрабатываем их
    if (closedTrades.length === 0 && trades.length > 0) {
      // Создаем закрытые сделки из входов (упрощенная модель)
      for (let i = 0; i < trades.length; i++) {
        const entryTrade = trades[i]
        if (entryTrade.type === 'BUY' || entryTrade.type === 'SELL') {
          // Ищем следующий выход или создаем фиктивный
          let exitTrade = null
          let exitCandleIndex = entryTrade.candleIndex
          
          // Ищем выход в следующих свечах
          for (let j = entryTrade.candleIndex + 1; j < formattedCandles.length && j < entryTrade.candleIndex + 50; j++) {
            const exitCandle = formattedCandles[j]
            if (!exitCandle) break
            
            // Проверяем есть ли выход в этой свече
            const exitInCandle = trades.find(t => 
              t.type === 'EXIT' && 
              t.candleIndex === j && 
              t.id === entryTrade.id
            )
            
            if (exitInCandle) {
              exitTrade = exitInCandle
              exitCandleIndex = j
              break
            }
          }
          
          // Если выхода нет, создаем фиктивный на основе цены
          if (!exitTrade) {
            exitCandleIndex = Math.min(entryTrade.candleIndex + 10, formattedCandles.length - 1)
            const exitCandle = formattedCandles[exitCandleIndex]
            const entryPrice = entryTrade.entryPrice || exitCandle.close
            const exitPrice = exitCandle.close
            
            // Расчет PnL с учетом комиссии
            let pnlPercent = 0
            if (entryTrade.type === 'BUY') {
              pnlPercent = ((exitPrice - entryPrice) / entryPrice) * 100
            } else {
              pnlPercent = ((entryPrice - exitPrice) / entryPrice) * 100
            }
            
            // Вычитаем комиссию (0.1% общая)
            pnlPercent = pnlPercent - (totalCommission * 100)
            
            // Размер позиции = 50% депозита на момент входа
            const entryCandleIndex = entryTrade.candleIndex
            const entryEquity = entryCandleIndex < equityCurve.length 
              ? equityCurve[entryCandleIndex].equity 
              : initialEquity
            const positionSize = entryEquity * positionSizePercent
            
            // Комиссия на вход и выход
            const commissionEnterCost = positionSize * commissionEnter
            const commissionExitCost = positionSize * commissionExit
            const totalCommissionCost = commissionEnterCost + commissionExitCost
            
            // PnL в USDT с учетом комиссии
            const pnlUsdt = (pnlPercent / 100) * positionSize - totalCommissionCost
            
            if (pnlPercent > 0) {
              winningTrades++
              totalProfit += pnlUsdt
            } else {
              losingTrades++
              totalLoss += Math.abs(pnlUsdt)
            }
            
            totalPnl += pnlUsdt
            closedTrades.push({
              ...entryTrade,
              exitPrice,
              exitTime: exitCandle.timestamp,
              pnl: pnlPercent,
              pnlUsdt
            })
          } else {
            // Используем реальный выход
            const entryPrice = entryTrade.entryPrice || formattedCandles[entryTrade.candleIndex]?.close || 0
            const exitPrice = exitTrade.exitPrice || formattedCandles[exitCandleIndex]?.close || entryPrice
            
            // Расчет PnL с учетом комиссии
            let pnlPercent = 0
            if (entryTrade.type === 'BUY') {
              pnlPercent = ((exitPrice - entryPrice) / entryPrice) * 100
            } else {
              pnlPercent = ((entryPrice - exitPrice) / entryPrice) * 100
            }
            
            // Вычитаем комиссию (0.1% общая)
            pnlPercent = pnlPercent - (totalCommission * 100)
            
            // Размер позиции = 50% депозита на момент входа
            const entryCandleIndex = entryTrade.candleIndex
            const entryEquity = entryCandleIndex < equityCurve.length 
              ? equityCurve[entryCandleIndex].equity 
              : initialEquity
            const positionSize = entryEquity * positionSizePercent
            
            // Комиссия на вход и выход
            const commissionEnterCost = positionSize * commissionEnter
            const commissionExitCost = positionSize * commissionExit
            const totalCommissionCost = commissionEnterCost + commissionExitCost
            
            // PnL в USDT с учетом комиссии
            const pnlUsdt = (pnlPercent / 100) * positionSize - totalCommissionCost
            
            if (pnlPercent > 0) {
              winningTrades++
              totalProfit += pnlUsdt
            } else {
              losingTrades++
              totalLoss += Math.abs(pnlUsdt)
            }
            
            totalPnl += pnlUsdt
            closedTrades.push({
              ...entryTrade,
              exitPrice,
              exitTime: exitTrade.timestamp,
              pnl: pnlPercent,
              pnlUsdt
            })
          }
        }
      }
    }

    totalPnlPercent = initialEquity > 0 ? (totalPnl / initialEquity) * 100 : 0
    currentEquity = initialEquity + totalPnl

    // Получение последних индикаторов
    const lastCandle = formattedCandles[formattedCandles.length - 1]
    const lastUpdate = strategy.update(lastCandle)

    console.log('Backtest complete:', {
      totalCandles: formattedCandles.length,
      totalTrades: trades.length,
      closedTrades: closedTrades.length,
      winningTrades,
      losingTrades,
      sampleClosedTrade: closedTrades[0] ? {
        type: closedTrades[0].type,
        exitType: closedTrades[0].exitType,
        exitTime: closedTrades[0].exitTime,
        entryPrice: closedTrades[0].entryPrice,
        exitPrice: closedTrades[0].exitPrice,
        pnl: closedTrades[0].pnl,
        pnlUsdt: closedTrades[0].pnlUsdt
      } : null
    })
    
    // Фильтрация статистики по периоду (если указан startTime/endTime)
    let filteredClosedTrades = closedTrades
    // totalTrades - количество входов в позицию (BUY/SELL), а не всех событий
    const totalEntries = trades.filter(t => t.type === 'BUY' || t.type === 'SELL').length
    let filteredStatistics = {
      totalTrades: totalEntries,
      closedTrades: closedTrades.length,
      winningTrades,
      losingTrades,
      winRate: closedTrades.length > 0 ? (winningTrades / closedTrades.length * 100).toFixed(2) : '0.00',
      totalPnl: totalPnl.toFixed(2),
      totalPnlPercent: totalPnlPercent.toFixed(2),
      maxDrawdown: maxDrawdown.toFixed(2),
      maxDrawdownUsdt: maxDrawdownUsdt.toFixed(2),
      peakEquity: peakEquity.toFixed(2),
      currentEquity: currentEquity.toFixed(2),
      initialEquity: initialEquity.toFixed(2),
      totalProfit: totalProfit.toFixed(2),
      totalLoss: totalLoss.toFixed(2),
      profitFactor: totalLoss > 0 ? (totalProfit / totalLoss).toFixed(2) : totalProfit > 0 ? '∞' : '0.00'
    }
    
    // Используем filterStartTime/filterEndTime для фильтрации статистики, если указаны
    // Иначе используем startTime/endTime
    const filterStart = filterStartTime || startTime
    const filterEnd = filterEndTime || endTime
    
    if (filterStart && filterEnd) {
      const startTimeNum = parseInt(filterStart)
      const endTimeNum = parseInt(filterEnd)
      
      console.log('Filtering closed trades by period:', {
        filterStart: new Date(startTimeNum).toLocaleDateString(),
        filterEnd: new Date(endTimeNum).toLocaleDateString(),
        totalClosedTrades: closedTrades.length,
        sampleTradeTime: closedTrades[0] ? {
          exitTime: closedTrades[0].exitTime ? new Date(closedTrades[0].exitTime).toLocaleDateString() : null,
          timestamp: closedTrades[0].timestamp ? new Date(closedTrades[0].timestamp).toLocaleDateString() : null,
          exitCandleIndex: closedTrades[0].exitCandleIndex,
          candleIndex: closedTrades[0].candleIndex
        } : null
      })
      
      // Фильтруем закрытые сделки по периоду
      filteredClosedTrades = closedTrades.filter(trade => {
        const tradeTime = trade.exitTime || trade.timestamp || formattedCandles[trade.exitCandleIndex || trade.candleIndex]?.timestamp
        const inRange = tradeTime >= startTimeNum && tradeTime <= endTimeNum
        if (!inRange && closedTrades.indexOf(trade) < 3) {
          console.log('Trade filtered out:', {
            tradeTime: tradeTime ? new Date(tradeTime).toLocaleDateString() : null,
            startTime: new Date(startTimeNum).toLocaleDateString(),
            endTime: new Date(endTimeNum).toLocaleDateString(),
            inRange
          })
        }
        return inRange
      })
      
      console.log('Filtered closed trades:', {
        before: closedTrades.length,
        after: filteredClosedTrades.length
      })
      
      // Пересчитываем статистику для отфильтрованных сделок
      let periodWinningTrades = 0
      let periodLosingTrades = 0
      let periodTotalProfit = 0
      let periodTotalLoss = 0
      let periodTotalPnl = 0
      
      for (const trade of filteredClosedTrades) {
        if (trade.pnlUsdt > 0) {
          periodWinningTrades++
          periodTotalProfit += trade.pnlUsdt
        } else {
          periodLosingTrades++
          periodTotalLoss += Math.abs(trade.pnlUsdt)
        }
        periodTotalPnl += trade.pnlUsdt
      }
      
      // Находим начальный equity для периода (equity на момент startTime)
      let periodStartEquity = initialEquity
      for (const equityPoint of equityCurve) {
        if (equityPoint.timestamp >= startTimeNum) {
          periodStartEquity = equityPoint.equity
          break
        }
      }
      
      // Находим текущий equity для периода (equity на момент endTime)
      let periodEndEquity = currentEquity
      for (let i = equityCurve.length - 1; i >= 0; i--) {
        if (equityCurve[i].timestamp <= endTimeNum) {
          periodEndEquity = equityCurve[i].equity
          break
        }
      }
      
      const periodPnlPercent = periodStartEquity > 0 ? ((periodEndEquity - periodStartEquity) / periodStartEquity) * 100 : 0
      
      // Фильтруем входы по периоду для подсчета totalTrades
      const filteredEntries = trades.filter(trade => {
        if (trade.type !== 'BUY' && trade.type !== 'SELL') return false
        const tradeTime = trade.timestamp || formattedCandles[trade.candleIndex]?.timestamp
        return tradeTime >= startTimeNum && tradeTime <= endTimeNum
      })
      
      filteredStatistics = {
        totalTrades: filteredEntries.length,
        closedTrades: filteredClosedTrades.length,
        winningTrades: periodWinningTrades,
        losingTrades: periodLosingTrades,
        winRate: filteredClosedTrades.length > 0 ? (periodWinningTrades / filteredClosedTrades.length * 100).toFixed(2) : '0.00',
        totalPnl: periodTotalPnl.toFixed(2),
        totalPnlPercent: periodPnlPercent.toFixed(2),
        maxDrawdown: maxDrawdown.toFixed(2), // Максимальная просадка за весь период
        maxDrawdownUsdt: maxDrawdownUsdt.toFixed(2),
        peakEquity: peakEquity.toFixed(2),
        currentEquity: periodEndEquity.toFixed(2),
        initialEquity: periodStartEquity.toFixed(2),
        totalProfit: periodTotalProfit.toFixed(2),
        totalLoss: periodTotalLoss.toFixed(2),
        profitFactor: periodTotalLoss > 0 ? (periodTotalProfit / periodTotalLoss).toFixed(2) : periodTotalProfit > 0 ? '∞' : '0.00'
      }
    }

    // Возврат данных
    return res.status(200).json({
      success: true,
      symbol,
      timeframe,
      candles: formattedCandles,
      trades: trades,
      equityCurve: equityCurve,
      indicators: lastUpdate.indicators,
      statistics: filteredStatistics,
      closedTrades: filteredClosedTrades, // Возвращаем отфильтрованные сделки для истории
      strategy: {
        params: strategyParams,
        position: strategy.position,
        positionSize: strategy.positionSize
      }
    })

  } catch (error) {
    console.error('❌ Error in trading data API:', error)
    // Возвращаем пустой результат вместо 500, чтобы клиент мог продолжить работу
    return res.status(200).json({
      success: true,
      symbol: req.query.symbol || 'BTCUSDT',
      timeframe: req.query.timeframe || '4h',
      candles: [],
      trades: [],
      equityCurve: [],
      indicators: {},
      statistics: {
        totalTrades: 0,
        closedTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: '0.00',
        totalPnl: '0.00',
        totalPnlPercent: '0.00',
        maxDrawdown: '0.00',
        maxDrawdownUsdt: '0.00',
        peakEquity: '1000.00',
        currentEquity: '1000.00',
        initialEquity: '1000.00',
        totalProfit: '0.00',
        totalLoss: '0.00',
        profitFactor: '0.00'
      },
      closedTrades: []
    })
  }
}

