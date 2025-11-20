// API для запуска стратегии на всей истории сразу
const TradingStrategy = require('../../../lib/trading-strategy')

// Увеличиваем лимит размера тела запроса для этого API route
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
    responseLimit: '50mb',
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { candles, symbol, timeframe, strategyParams: customParams } = req.body

    if (!candles || !Array.isArray(candles) || candles.length === 0) {
      return res.status(400).json({ error: 'Candles array is required' })
    }

    // Параметры стратегии
    const strategyParams = {
      nFast: customParams?.nFast || 15,
      nSlow: customParams?.nSlow || 30,
      baseSlPercent: customParams?.baseSlPercent || 3,
      baseTp1Percent: customParams?.baseTp1Percent || 3,
      baseTp2Percent: customParams?.baseTp2Percent || 6,
      baseTp3Percent: customParams?.baseTp3Percent || 10,
      trendLength: customParams?.trendLength || 200,
      rsiPeriod: customParams?.rsiPeriod || 14,
      rsiLongFilter: customParams?.rsiLongFilter || 50,
      rsiShortFilter: customParams?.rsiShortFilter || 50,
      timeframe: timeframe || '4h',
      // Параметры депозита и размера позиции
      initialCapital: customParams?.initialCapital || 1000,
      positionSizePercent: customParams?.positionSizePercent || 50
    }

    // Форматируем свечи для стратегии
    const formattedCandles = candles.map(c => ({
      timestamp: c.timestamp || c.time,
      open: parseFloat(c.open),
      high: parseFloat(c.high),
      low: parseFloat(c.low),
      close: parseFloat(c.close),
      volume: parseFloat(c.volume || 0)
    })).sort((a, b) => a.timestamp - b.timestamp)

    console.log('Backtest: starting with', formattedCandles.length, 'candles', {
      symbol,
      timeframe,
      strategyParams
    })

    // Создаем стратегию
    const strategy = new TradingStrategy(strategyParams)
    
    // Логируем параметры стратегии для проверки
    console.log('📊 Strategy params:', {
      initialCapital: strategyParams.initialCapital,
      positionSizePercent: strategyParams.positionSizePercent,
      positionSizeAtEntry: `${strategyParams.initialCapital * (strategyParams.positionSizePercent / 100)} USDT`
    })
    
    if (formattedCandles.length === 0) {
      console.warn('Backtest: no candles provided')
      const defaultInitialEquity = strategyParams.initialCapital || 1000
      return res.status(200).json({
        success: true,
        trades: [],
        statistics: {
          winRate: 0,
          profitFactor: 0,
          maxDrawdown: 0,
          maxDrawdownUsdt: 0,
          totalProfit: 0,
          totalLoss: 0,
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          avgRR: 0,
          totalPnl: 0,
          totalPnlPercent: 0,
          currentEquity: defaultInitialEquity,
          initialEquity: defaultInitialEquity,
          peakEquity: defaultInitialEquity,
          equityCurve: []
        }
      })
    }

    // Параметры для расчета PnL (используем из стратегии)
    const initialEquity = strategyParams.initialCapital
    const positionSizePercent = strategyParams.positionSizePercent / 100 // Конвертируем из процентов в дробь (50% -> 0.5)
    // Комиссия должна совпадать со стратегией (0.1% = 0.001)
    const commissionEnter = 0.001 // 0.1% на вход (как в стратегии)
    const commissionExit = 0.001 // 0.1% на выход (как в стратегии)
    const totalCommission = commissionEnter + commissionExit

    let totalPnl = 0
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
    const openPositions = []

    // КРИТИЧЕСКИ ВАЖНО: Сбрасываем капитал стратегии перед запуском
    // Это гарантирует, что каждый бэктест начинается с начального капитала
    // ВАЖНО: При выборе периода (30, 90 дней и т.д.) бэктест должен начинаться с начального капитала,
    // не учитывая результаты предыдущих сделок (как отдельный независимый бэктест)
    // КРИТИЧЕСКИ ВАЖНО: Сбрасываем И capital, И initialCapital, чтобы размер позиции рассчитывался правильно
    strategy.initialCapital = strategyParams.initialCapital
    strategy.capital = strategyParams.initialCapital // Должен быть равен initialCapital
    strategy.positionSizeAtEntry = 0 // Сбрасываем размер позиции
    strategy.position = 0
    strategy.positionSizePercentCurrent = 0
    strategy.positionAvgPrice = 0
    strategy.initialEntryPrice = 0
    strategy.initialEntryTime = null
    strategy.tradeId = 0
    strategy.trades = []
    strategy.equityHistory = []
    
    // Логируем сброс капитала для проверки
    console.log('🔄 Strategy reset:', {
      capital: strategy.capital.toFixed(2) + ' USDT',
      initialCapital: strategy.initialCapital.toFixed(2) + ' USDT',
      positionSizePercent: strategy.positionSizePercent + '%',
      expectedPositionSize: (strategy.capital * strategy.positionSizePercent / 100).toFixed(2) + ' USDT'
    })
    
    // Сброс состояний позиций
    strategy.longReachedTp1 = false
    strategy.longReachedTp2 = false
    strategy.longTp1Executed = false
    strategy.longTp2Executed = false
    strategy.longTp3Executed = false
    strategy.longCurrentStop = null
    strategy.longStage = 0
    strategy.shortReachedTp1 = false
    strategy.shortReachedTp2 = false
    strategy.shortTp1Executed = false
    strategy.shortTp2Executed = false
    strategy.shortTp3Executed = false
    strategy.shortCurrentStop = null
    strategy.shortStage = 0
    
    // Сброс флагов пересоздания ордеров
    strategy.longOrdersRecreatedAfterTp1 = false
    strategy.longOrdersRecreatedAfterTp2 = false
    strategy.shortOrdersRecreatedAfterTp1 = false
    strategy.shortOrdersRecreatedAfterTp2 = false
    strategy.pendingOrderRecreation = null
    
    // Запускаем стратегию на всех свечах
    let lastEquityCurveTimestamp = 0 // Отслеживаем последний timestamp equity curve
    for (let i = 0; i < formattedCandles.length; i++) {
      const candle = formattedCandles[i]
      const update = strategy.update(candle)

      // Обработка новых сделок
      for (const trade of update.trades) {
        const tradeWithIndex = {
          ...trade,
          candleIndex: i
        }
        trades.push(tradeWithIndex)

        // Обработка входов и выходов
        if (trade.type === 'BUY' || trade.type === 'SELL') {
          // Вход в позицию
          // ВАЖНО: Используем размер позиции из стратегии (positionSizeAtEntry),
          // а не пересчитываем от currentEquity, чтобы избежать расхождений
          // из-за накопленных комиссий или других факторов
          let positionSize = trade.positionSizeAtEntry || (currentEquity * positionSizePercent)
          
          // КРИТИЧЕСКИ ВАЖНО: Синхронизируем currentEquity с капиталом стратегии
          // Стратегия рассчитывает positionSizeAtEntry от капитала ДО вычета комиссии:
          // positionSizeAtEntry = capital * (positionSizePercent / 100)
          // Отсюда: capital = positionSizeAtEntry / (positionSizePercent / 100)
          // Но positionSizePercent в стратегии в процентах (50), а в backtest.js в дроби (0.5)
          // Поэтому: capital = positionSizeAtEntry / positionSizePercent (дробь)
          // Так как мы конвертировали в дробь: capital = positionSizeAtEntry / 0.5 = positionSizeAtEntry * 2
          if (trade.positionSizeAtEntry) {
            // В стратегии positionSizePercent в процентах (50), но мы конвертировали в дробь (0.5)
            // Поэтому используем дробь для расчета
            const capitalBeforeEntry = trade.positionSizeAtEntry / positionSizePercent
            // Синхронизируем currentEquity с капиталом стратегии ДО вычета комиссии
            // Это критически важно для правильного расчета следующих сделок
            currentEquity = capitalBeforeEntry
            positionSize = trade.positionSizeAtEntry
            
            // Отладка: логируем размер позиции и капитал для первых входов
            const entryCount = openPositions.length
            if (entryCount < 3) {
              console.log('📊 Entry sync:', {
                tradeId: trade.id,
                positionSizeAtEntry: trade.positionSizeAtEntry.toFixed(2) + ' USDT',
                capitalBeforeEntry: capitalBeforeEntry.toFixed(2) + ' USDT',
                positionSizePercent: (positionSizePercent * 100).toFixed(2) + '%',
                initialCapital: initialEquity.toFixed(2) + ' USDT',
                currentEquityBefore: currentEquity.toFixed(2) + ' USDT',
                calculation: `${capitalBeforeEntry.toFixed(2)} * ${(positionSizePercent * 100).toFixed(0)}% = ${trade.positionSizeAtEntry.toFixed(2)}`
              })
            }
          }
          
          const entryPrice = trade.entryPrice || candle.close
          const commissionCost = positionSize * commissionEnter

          openPositions.push({
            id: trade.id,
            type: trade.type,
            entryPrice,
            entryTime: trade.entryTime || candle.timestamp,
            entryCandleIndex: i,
            entryEquity: currentEquity,
            positionSize, // Текущий размер позиции (уменьшается при частичных закрытиях)
            positionSizeAtEntry: positionSize, // Сохраняем исходный размер позиции для расчета частичных выходов
            commissionEnter: commissionCost
          })

          // Комиссия на вход вычитается из equity ПОСЛЕ расчета размера позиции
          currentEquity -= commissionCost
        } else if (trade.type === 'EXIT') {
          // Выход из позиции (может быть частичным или полным)
          const position = openPositions.find(p => p.id === trade.id)
          if (!position) {
            console.warn('⚠️ Position not found for exit trade:', {
              tradeId: trade.id,
              exitType: trade.exitType,
              openPositionsCount: openPositions.length,
              openPositionIds: openPositions.map(p => p.id)
            })
            // Пропускаем выход, если позиция не найдена
            continue
          }
          
          // Позиция найдена, обрабатываем выход
          const exitPrice = trade.exitPrice || candle.close
          // Для частичных выходов используем exitPercent, для полных - весь positionSize
          // ВАЖНО: exitPercent - это процент от ИСХОДНОГО размера позиции (positionSizeAtEntry),
          // а не от текущего размера позиции после предыдущих частичных закрытий
          const exitPercent = trade.exitPercent || 100
          
          // Используем исходный размер позиции (positionSizeAtEntry), если он сохранен
          // Это важно для правильного расчета частичных выходов
          const originalPositionSize = position.positionSizeAtEntry || position.positionSize
          const exitPositionSize = (originalPositionSize * exitPercent / 100)

          // Расчет PnL
          // Сначала считаем процент прибыли от цены (без комиссии)
          let pricePnlPercent = 0
          if (position.type === 'BUY') {
            pricePnlPercent = ((exitPrice - position.entryPrice) / position.entryPrice) * 100
          } else {
            pricePnlPercent = ((position.entryPrice - exitPrice) / position.entryPrice) * 100
          }

          // PnL в USDT для закрываемой части позиции (БЕЗ комиссии)
          // exitPositionSize - это размер закрываемой части в USDT
          const pnlUsdtBeforeCommission = (pricePnlPercent / 100) * exitPositionSize

          // Комиссия на выход (0.1% = 0.001)
          const commissionExitCost = exitPositionSize * commissionExit
          
          // Итоговый P&L в USDT (после вычета комиссии на выход)
          // ВАЖНО: Комиссия вычитается только один раз - из P&L в USDT
          const pnlUsdt = pnlUsdtBeforeCommission - commissionExitCost

          // P&L % для отображения = процент от цены минус комиссия на выход
          // Комиссия на выход в процентах от размера позиции (0.1% = 0.1)
          const commissionExitPercent = commissionExit * 100 // 0.001 * 100 = 0.1
          const pnlPercent = pricePnlPercent - commissionExitPercent

          // КРИТИЧЕСКИ ВАЖНО: Используем ТОЛЬКО pnlUsdt из стратегии!
          // Стратегия правильно рассчитывает от positionSizeAtEntry (от капитала ДО вычета комиссии)
          // Пересчитанный pnlUsdt использует неправильный размер позиции (от currentEquity после комиссий)
          const finalPnlUsdt = trade.pnlUsdt ?? 0
          
          // Если pnlUsdt отсутствует в стратегии - это критическая ошибка, логируем
          if (!trade.pnlUsdt && trade.exitType !== 'ENTRY') {
            const entryCount = openPositions.length
            if (entryCount <= 3) {
              console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: trade.pnlUsdt отсутствует!', {
                id: trade.id,
                exitType: trade.exitType,
                exitPrice: trade.exitPrice,
                entryPrice: position?.entryPrice,
                calculatedPnlUsdt: pnlUsdt,
                tradeKeys: Object.keys(trade)
              })
            }
          }
          
          // Обновляем equity (добавляем P&L, комиссия уже вычтена)
          // Используем P&L из стратегии для правильной синхронизации капитала
          currentEquity += finalPnlUsdt

          // КРИТИЧЕСКИ ВАЖНО: Обновляем equity curve при каждом частичном закрытии
          // Это позволяет графику показывать постепенный рост при TP1, TP2, TP3
          // вместо резких скачков только при полном закрытии
          const exitTimestamp = trade.exitTime || candle.timestamp
          // Добавляем точку только если это новый timestamp (избегаем дубликатов)
          if (exitTimestamp !== lastEquityCurveTimestamp) {
            equityCurve.push({
              timestamp: exitTimestamp,
              equity: currentEquity,
              price: exitPrice
            })
            lastEquityCurveTimestamp = exitTimestamp
          } else {
            // Если timestamp тот же, обновляем последнюю точку
            if (equityCurve.length > 0) {
              equityCurve[equityCurve.length - 1] = {
                timestamp: exitTimestamp,
                equity: currentEquity,
                price: exitPrice
              }
            }
          }

          // Обновляем статистику только для полных выходов
          const isFullExit = !trade.partial || exitPercent >= 100 || trade.remainingPosition === 0
          if (isFullExit) {
            if (finalPnlUsdt > 0) {
              winningTrades++
              totalProfit += finalPnlUsdt
            } else {
              losingTrades++
              totalLoss += Math.abs(finalPnlUsdt)
            }
          }

          totalPnl += finalPnlUsdt

          // Добавляем в закрытые сделки с информацией о результате
          // ВАЖНО: Для частичных выходов создаем отдельную запись для каждого выхода
          closedTrades.push({
            ...position,
            exitPrice,
            exitTime: trade.exitTime || candle.timestamp,
            exitCandleIndex: i,
            pnl: pnlPercent,
            pnlUsdt: finalPnlUsdt, // Используем P&L из стратегии для правильной синхронизации
            commissionExit: commissionExitCost,
            // Добавляем информацию из стратегии, если есть
            exitType: trade.exitType || '',
            result: trade.result || '',
            description: trade.description || '',
            partial: trade.partial || false,
            exitPercent: trade.exitPercent || 0,
            remainingPosition: trade.remainingPosition || 0,
            isBreakeven: trade.isBreakeven || false,
            // Используем entryTime из стратегии, если есть
            entryTime: trade.entryTime || position.entryTime || candle.timestamp,
            // Добавляем уникальный идентификатор для поиска (id + exitType + exitPercent)
            tradeExitKey: `${trade.id}_${trade.exitType}_${trade.exitPercent || 100}`
          })

          // Удаляем из открытых позиций только при полном закрытии
          if (isFullExit) {
            const posIndex = openPositions.findIndex(p => p.id === trade.id)
            if (posIndex >= 0) {
              openPositions.splice(posIndex, 1)
            }
          } else {
            // Обновляем размер позиции для частичного закрытия
            // ВАЖНО: Уменьшаем размер позиции на размер закрытой части (exitPositionSize),
            // а не умножаем на remainingPosition, так как exitPercent считается от исходного размера
            position.positionSize = position.positionSize - exitPositionSize
            // positionSizeAtEntry остается неизменным для правильного расчета следующих частичных выходов
          }
        }
      }

      // Расчет equity curve на каждой свече
      // Добавляем точку только если она еще не была добавлена при частичном закрытии на этой свече
      if (candle.timestamp !== lastEquityCurveTimestamp) {
        equityCurve.push({
          timestamp: candle.timestamp,
          equity: currentEquity,
          price: candle.close
        })
        lastEquityCurveTimestamp = candle.timestamp
      } else {
        // Если точка уже была добавлена при частичном закрытии, обновляем её
        if (equityCurve.length > 0) {
          equityCurve[equityCurve.length - 1] = {
            timestamp: candle.timestamp,
            equity: currentEquity,
            price: candle.close
          }
        }
      }

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

    // Формируем список сделок в нужном формате
    // Собираем все входы и выходы из trades напрямую (включая частичные выходы)
    const formattedTrades = []
    const entryMap = new Map() // tradeId -> entry info
    
    // Сначала собираем все входы
    for (const trade of trades) {
      if (trade.type === 'BUY' || trade.type === 'SELL') {
        // Запись о входе
        let entryTime = trade.entryTime || trade.timestamp || 0
        // Конвертируем timestamp в секунды, если он в миллисекундах
        // Проверяем: если timestamp > 1e12, значит это миллисекунды (дата после 2001 года)
        if (entryTime > 1e12) {
          entryTime = Math.floor(entryTime / 1000)
        } else if (entryTime > 1e10) {
          // Если timestamp > 1e10, но < 1e12, это уже секунды (но очень большие числа)
          // Оставляем как есть
          entryTime = Math.floor(entryTime)
        }
        if (!entryTime && trade.candleIndex !== undefined) {
          const entryCandle = formattedCandles[trade.candleIndex]
          if (entryCandle) {
            let candleTime = entryCandle.timestamp
            if (candleTime > 1e12) {
              candleTime = Math.floor(candleTime / 1000)
            }
            entryTime = candleTime
          }
        }
        
        const entryInfo = {
          entryTime,
          entryPrice: trade.entryPrice || trade.price || 0,
          type: trade.type === 'BUY' ? 'long' : 'short',
          tradeId: trade.id,
          positionSizeAtEntry: trade.positionSizeAtEntry || 0, // Размер позиции при входе
          // Добавляем уровни TP и SL для отображения на графике
          takeProfit1: trade.takeProfit1 || trade.tp1 || 0,
          takeProfit2: trade.takeProfit2 || trade.tp2 || 0,
          takeProfit3: trade.takeProfit3 || trade.tp3 || 0,
          stopLoss: trade.stopLoss || trade.stopPrice || 0
        }
        
        entryMap.set(trade.id, entryInfo)
        
        // Добавляем запись о входе
        formattedTrades.push({
          ...entryInfo,
          exitTime: 0,
          exitPrice: 0,
          result: 0,
          resultText: 'Вход в позицию',
          description: `Вход в ${trade.type === 'BUY' ? 'LONG' : 'SHORT'} позицию`,
          exitType: 'ENTRY',
          partial: false,
          exitPercent: 0,
          remainingPosition: 100,
          isBreakeven: false,
          exitPositionSize: 0 // Для входов размер позиции = 0 (еще не закрыта)
        })
      }
    }
    
    // Теперь собираем все выходы (включая частичные TP1, TP2, TP3)
    for (const trade of trades) {
      if (trade.type === 'EXIT') {
        const entryInfo = entryMap.get(trade.id)
        if (!entryInfo) {
          // Если нет информации о входе, пропускаем
          continue
        }
        
        // Запись о выходе
        let exitTime = trade.exitTime || trade.timestamp || 0
        // Конвертируем timestamp в секунды, если он в миллисекундах
        if (exitTime > 1e12) {
          exitTime = Math.floor(exitTime / 1000)
        } else if (exitTime > 1e10) {
          exitTime = Math.floor(exitTime)
        }
        if (!exitTime && trade.candleIndex !== undefined) {
          const exitCandle = formattedCandles[trade.candleIndex]
          if (exitCandle) {
            let candleTime = exitCandle.timestamp
            if (candleTime > 1e12) {
              candleTime = Math.floor(candleTime / 1000)
            }
            exitTime = candleTime
          }
        }
        
        // Определяем результат сделки из exitType или result
        let resultText = trade.exitType || 'Неизвестно'
        if (trade.result) {
          resultText = trade.result
        } else if (trade.exitType === 'TP1') {
          resultText = 'TP1 (25%)'
        } else if (trade.exitType === 'TP2') {
          resultText = 'TP2 (33%)'
        } else if (trade.exitType === 'TP3') {
          resultText = 'TP3 (42%)'
        } else if (trade.exitType === 'SL') {
          resultText = trade.isBreakeven ? 'Безубыток' : 'Стоп-лосс'
        }
        
        // ВАЖНО: Используем pnlUsdt напрямую из стратегии, так как стратегия правильно рассчитывает
        // PnL с учетом размера позиции при входе (positionSizeAtEntry)
        // В backtest.js пересчет может использовать неправильный размер позиции
        // Ищем закрытую сделку только для получения дополнительной информации
        const tradeExitKey = `${trade.id}_${trade.exitType}_${trade.exitPercent || 100}`
        const closedTrade = closedTrades.find(ct => ct.tradeExitKey === tradeExitKey)
        
        // ВАЖНО: Используем pnlUsdt из стратегии, если доступен, иначе из closedTrade
        const finalPnlUsdt = trade.pnlUsdt ?? closedTrade?.pnlUsdt ?? 0
        
        // Отладка: логируем только первые несколько выходов
        const exitTradesCount = formattedTrades.filter(t => t.exitType !== 'ENTRY').length
        if (exitTradesCount < 5 && trade.exitType !== 'ENTRY') {
          console.log('💰 Exit P&L:', {
            tradeId: trade.id,
            exitType: trade.exitType,
            exitPercent: trade.exitPercent,
            entryPrice: entryInfo?.entryPrice,
            exitPrice: trade.exitPrice,
            pnlUsdtFromStrategy: trade.pnlUsdt,
            pnlPercentFromStrategy: trade.pnl,
            finalPnlUsdt: finalPnlUsdt,
            hasPnlUsdt: !!trade.pnlUsdt,
            closedTradePnlUsdt: closedTrade?.pnlUsdt
          })
        }
        // Используем pnl (процент) из стратегии, если он доступен
        // В стратегии pnl - это pnlPercent (процент от цены минус комиссия на выход)
        const finalPnlPercent = trade.pnl ?? null
        
        // Рассчитываем размер закрытой позиции в USDT
        // Используем exitPositionValue из стратегии, если доступен, иначе из closedTrade
        let exitPositionSize = 0
        if (trade.exitPercent && entryInfo.positionSizeAtEntry) {
          // Рассчитываем от размера позиции при входе
          exitPositionSize = (entryInfo.positionSizeAtEntry * trade.exitPercent / 100)
        } else if (closedTrade?.exitPositionSize !== undefined) {
          exitPositionSize = closedTrade.exitPositionSize
        } else if (closedTrade?.positionSizeAtEntry && trade.exitPercent) {
          exitPositionSize = (closedTrade.positionSizeAtEntry * trade.exitPercent / 100)
        }
        
        // Добавляем запись о выходе (каждый частичный выход - отдельная запись)
        formattedTrades.push({
          entryTime: entryInfo.entryTime,
          entryPrice: entryInfo.entryPrice,
          type: entryInfo.type,
          exitTime,
          exitPrice: trade.exitPrice || 0,
          result: finalPnlUsdt, // Используем pnlUsdt из стратегии
          pnl: finalPnlPercent, // Используем pnl (процент) из стратегии для правильного отображения
          resultText: resultText,
          description: trade.description || '',
          exitType: trade.exitType || '',
          partial: trade.partial || false,
          exitPercent: trade.exitPercent || 0,
          remainingPosition: trade.remainingPosition || 0,
          isBreakeven: trade.isBreakeven || false,
          exitPositionSize: exitPositionSize, // Размер закрытой позиции в USDT
          // Сохраняем уровни TP и SL из входа для отображения на графике
          takeProfit1: entryInfo.takeProfit1 || 0,
          takeProfit2: entryInfo.takeProfit2 || 0,
          takeProfit3: entryInfo.takeProfit3 || 0,
          stopLoss: entryInfo.stopLoss || 0
        })
      }
    }
    
    // Сортируем по времени входа, потом по времени выхода
    formattedTrades.sort((a, b) => {
      // Сначала по времени входа
      if (a.entryTime !== b.entryTime) {
        return a.entryTime - b.entryTime
      }
      // Если время входа одинаковое, то сначала вход, потом выход
      if (a.exitType === 'ENTRY' && b.exitType !== 'ENTRY') return -1
      if (a.exitType !== 'ENTRY' && b.exitType === 'ENTRY') return 1
      // Если оба выхода, сортируем по времени выхода
      return a.exitTime - b.exitTime
    })

    // Расчет статистики
    // totalTrades - количество входов в позицию (не выходов)
    const totalTrades = formattedTrades.filter(t => t.exitType === 'ENTRY').length
    // winRate считаем от количества закрытых сделок (выходов)
    const closedTradesCount = closedTrades.length
    const winRate = closedTradesCount > 0 ? (winningTrades / closedTradesCount * 100) : 0
    const profitFactor = totalLoss > 0 ? (totalProfit / totalLoss) : (totalProfit > 0 ? Infinity : 0)
    const totalPnlPercent = initialEquity > 0 ? (totalPnl / initialEquity) * 100 : 0

    // Расчет среднего RR (Risk/Reward)
    let totalRR = 0
    let rrCount = 0
    for (const trade of closedTrades) {
      const risk = Math.abs(trade.entryPrice - (trade.type === 'BUY' ? trade.entryPrice * 0.97 : trade.entryPrice * 1.03)) // Примерный риск 3%
      const reward = Math.abs(trade.exitPrice - trade.entryPrice)
      if (risk > 0) {
        totalRR += reward / risk
        rrCount++
      }
    }
    const avgRR = rrCount > 0 ? (totalRR / rrCount) : 0

    const statistics = {
      winRate: parseFloat(winRate.toFixed(2)),
      profitFactor: profitFactor === Infinity ? Infinity : parseFloat(profitFactor.toFixed(2)),
      maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
      maxDrawdownUsdt: parseFloat(maxDrawdownUsdt.toFixed(2)),
      totalProfit: parseFloat(totalProfit.toFixed(2)),
      totalLoss: parseFloat(totalLoss.toFixed(2)),
      totalTrades,
      winningTrades,
      losingTrades,
      avgRR: parseFloat(avgRR.toFixed(2)),
      totalPnl: parseFloat(totalPnl.toFixed(2)),
      totalPnlPercent: parseFloat(totalPnlPercent.toFixed(2)),
      currentEquity: parseFloat(currentEquity.toFixed(2)),
      initialEquity: parseFloat(initialEquity.toFixed(2)),
      peakEquity: parseFloat(peakEquity.toFixed(2)),
      equityCurve: equityCurve.map(e => ({
        time: Math.floor(e.timestamp / 1000),
        value: parseFloat(e.equity.toFixed(2))
      }))
    }

    console.log('Backtest complete:', {
      totalCandles: formattedCandles.length,
      totalTrades: formattedTrades.length,
      statistics
    })

    return res.status(200).json({
      success: true,
      trades: formattedTrades,
      statistics,
      equityCurve: equityCurve // Возвращаем equity curve для расчета начального депозита периода
    })

  } catch (error) {
    console.error('❌ Error in backtest API:', error)
    console.error('❌ Error stack:', error.stack)
    console.error('❌ Error details:', {
      message: error.message,
      name: error.name,
      symbol: req.body?.symbol,
      timeframe: req.body?.timeframe,
      candlesCount: req.body?.candles?.length
    })
    return res.status(500).json({
      success: false,
      error: error.message,
      trades: [],
      statistics: null
    })
  }
}

