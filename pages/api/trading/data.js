// API для получения данных с Binance и расчета стратегии
const Binance = require('binance-api-node').default
const TradingStrategy = require('../../../lib/trading-strategy')

// Инициализация Binance клиента (публичный доступ, без ключей)
const client = Binance()

// Функция для получения свечей с фьючерсов Binance
async function getFuturesCandles(symbol, interval, options = {}) {
  try {
    // Используем прямой запрос к Binance Futures API
    // Futures API endpoint: https://fapi.binance.com/fapi/v1/klines
    const baseUrl = 'https://fapi.binance.com/fapi/v1/klines'
    const params = new URLSearchParams({
      symbol: symbol,
      interval: interval,
      limit: options.limit || 1000
    })
    
    if (options.startTime) {
      params.append('startTime', options.startTime)
    }
    if (options.endTime) {
      params.append('endTime', options.endTime)
    }
    
    const url = `${baseUrl}?${params.toString()}`
    const response = await fetch(url)
    
    // Проверяем статус ответа перед парсингом
    if (!response.ok) {
      // Для ошибки 451 (географические ограничения) возвращаем понятное сообщение
      if (response.status === 451) {
        const errorText = await response.text().catch(() => 'Service unavailable from restricted location')
        throw new Error(`Binance API restricted (451): ${errorText}`)
      }
      const errorText = await response.text().catch(() => response.statusText)
      throw new Error(`Futures API error: ${response.status} ${errorText}`)
    }
    
    const klines = await response.json()
    
    // Проверяем, что получили массив
    if (!Array.isArray(klines)) {
      throw new Error('Invalid response format from Binance API')
    }
    
    // Конвертируем формат Binance в формат библиотеки
    return klines.map(k => ({
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
  } catch (error) {
    console.error('Futures API error:', error.message)
    
    // Для ошибки 451 не пробуем spot API, так как она тоже будет заблокирована
    if (error.message.includes('451') || error.message.includes('restricted')) {
      throw error
    }
    
    // Fallback: пробуем использовать spot API (на случай если символ не фьючерсный)
    console.warn('Falling back to spot API')
    try {
      return await client.candles({ symbol, interval, ...options })
    } catch (spotError) {
      console.error('Spot API also failed:', spotError.message)
      throw error
    }
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
      const binanceInterval = timeframe === '1h' ? '1h' : timeframe === '4h' ? '4h' : '1d'
      
      let candles = []
      try {
        if (startTime && endTime) {
          const startTimeNum = parseInt(startTime)
          const endTimeNum = parseInt(endTime)
          if (isNaN(startTimeNum) || isNaN(endTimeNum) || startTimeNum >= endTimeNum) {
            console.warn('Invalid time range for candles only request')
            candles = []
          } else {
            candles = await getFuturesCandles(symbol, binanceInterval, { startTime: startTimeNum, endTime: endTimeNum, limit: parseInt(limit) })
          }
        } else {
          candles = await getFuturesCandles(symbol, binanceInterval, { limit: parseInt(limit) })
        }
      } catch (error) {
        console.error(`Binance API error (candles only) for ${symbol}:`, error.message)
        // Возвращаем пустой результат вместо ошибки, чтобы не ломать загрузку других монет
        return res.status(200).json({
          success: false,
          symbol,
          timeframe,
          candles: [],
          trades: [],
          statistics: null,
          closedTrades: [],
          error: `Failed to fetch candles for ${symbol}: ${error.message}`
        })
      }
      
      if (!candles || candles.length === 0) {
        console.warn(`No candles received for ${symbol}`)
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

    // Конвертация таймфрейма для Binance
    const binanceInterval = timeframe === '1h' ? '1h' : timeframe === '4h' ? '4h' : '1d'

    // Получение свечей с Binance
    let candles
    try {
      console.log('Fetching candles from Binance:', { symbol, interval: binanceInterval, limit, startTime, endTime })
      
      if (startTime && endTime) {
        const startTimeNum = parseInt(startTime)
        const endTimeNum = parseInt(endTime)
        
        // Проверяем, что времена валидны и startTime < endTime
        if (isNaN(startTimeNum) || isNaN(endTimeNum) || startTimeNum >= endTimeNum) {
          console.warn('Invalid time range, returning empty result', { startTimeNum, endTimeNum })
          candles = []
        } else {
          // Убираем ограничение на старые данные - загружаем всю историю
          // Binance фьючерсы имеют историю с момента запуска контракта
          try {
            candles = await getFuturesCandles(symbol, binanceInterval, {
              startTime: startTimeNum,
              endTime: endTimeNum,
              limit: parseInt(limit)
            })
            console.log(`Binance returned ${candles?.length || 0} candles for range`, {
              start: new Date(startTimeNum).toISOString(),
              end: new Date(endTimeNum).toISOString()
            })
          } catch (apiError) {
            console.error('Binance API call failed:', apiError.message)
            candles = []
          }
        }
      } else {
        // Без временного диапазона - берем последние свечи
        try {
          candles = await getFuturesCandles(symbol, binanceInterval, {
            limit: parseInt(limit)
          })
          console.log(`Binance returned ${candles?.length || 0} candles (no time range)`)
        } catch (apiError) {
          console.error('Binance API call failed (no time range):', apiError.message)
          candles = []
        }
      }
      
      console.log('Received candles from Binance:', candles?.length || 0)
      
      // Если нет свечей, возвращаем пустой результат вместо ошибки
      if (!candles || candles.length === 0) {
        console.warn('No candles received, returning empty result')
        candles = []
      }
    } catch (binanceError) {
      console.error('Binance API error:', binanceError)
      
      // Для любых ошибок Binance возвращаем пустой результат вместо 500
      // Это позволяет продолжать работу даже если некоторые запросы не удались
      console.warn('Binance error, returning empty result to continue', {
        error: binanceError.message || binanceError.toString(),
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

    // Преобразование данных Binance в формат для стратегии
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
      if (formattedCandles.length > 0) {
        results = strategy.backtest(formattedCandles)
      } else {
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

