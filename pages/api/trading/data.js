// API для получения данных с Binance и расчета стратегии
const Binance = require('binance-api-node').default
const TradingStrategy = require('../../../lib/trading-strategy')

// Инициализация Binance клиента (публичный доступ, без ключей)
const client = Binance()

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { symbol = 'BTCUSDT', timeframe = '4h', limit = 500, startTime, endTime } = req.query

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
        candles = await client.candles({
          symbol: symbol,
          interval: binanceInterval,
          startTime: parseInt(startTime),
          endTime: parseInt(endTime),
          limit: parseInt(limit)
        })
      } else {
        candles = await client.candles({
          symbol: symbol,
          interval: binanceInterval,
          limit: parseInt(limit)
        })
      }
      
      console.log('Received candles from Binance:', candles?.length || 0)
      
      if (!candles || candles.length === 0) {
        return res.status(404).json({
          error: 'No candles data received from Binance',
          details: 'Binance API returned empty result'
        })
      }
    } catch (binanceError) {
      console.error('Binance API error:', binanceError)
      return res.status(500).json({
        error: 'Failed to fetch data from Binance',
        details: binanceError.message
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

    // Запуск бэктеста
    const results = strategy.backtest(formattedCandles)

    // Расчет статистики
    let totalPnl = 0
    let winningTrades = 0
    let losingTrades = 0
    let maxDrawdown = 0
    let peakEquity = 1000
    let currentEquity = 1000

    const equityCurve = []
    const trades = []

    // Симуляция сделок (упрощенная версия)
    for (let i = 0; i < formattedCandles.length; i++) {
      const candle = formattedCandles[i]
      const update = strategy.update(candle)

      // Обработка новых сделок
      for (const trade of update.trades) {
        trades.push({
          ...trade,
          candleIndex: i
        })
      }

      // Упрощенный расчет equity (в реальности нужно отслеживать каждую позицию)
      if (update.trades.length > 0) {
        // Новая позиция открыта
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
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown
      }
    }

    // Получение последних индикаторов
    const lastCandle = formattedCandles[formattedCandles.length - 1]
    const lastUpdate = strategy.update(lastCandle)

    // Возврат данных
    return res.status(200).json({
      success: true,
      symbol,
      timeframe,
      candles: formattedCandles,
      trades: trades,
      equityCurve: equityCurve,
      indicators: lastUpdate.indicators,
      statistics: {
        totalTrades: trades.length,
        winningTrades,
        losingTrades,
        winRate: trades.length > 0 ? (winningTrades / trades.length * 100).toFixed(2) : 0,
        totalPnl: totalPnl.toFixed(2),
        maxDrawdown: maxDrawdown.toFixed(2),
        peakEquity: peakEquity.toFixed(2),
        currentEquity: currentEquity.toFixed(2)
      },
      strategy: {
        params: strategyParams,
        position: strategy.position,
        positionSize: strategy.positionSize
      }
    })

  } catch (error) {
    console.error('❌ Error in trading data API:', error)
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    })
  }
}

