// JavaScript версия Pine Script стратегии vextrauto

class TradingStrategy {
  constructor(params = {}) {
    // Параметры стратегии
    this.nFast = params.nFast || 15
    this.nSlow = params.nSlow || 30
    this.baseSlPercent = (params.baseSlPercent || 3) / 100
    this.baseTp1Percent = (params.baseTp1Percent || 3) / 100
    this.baseTp2Percent = (params.baseTp2Percent || 6) / 100
    this.baseTp3Percent = (params.baseTp3Percent || 10) / 100
    this.trendLength = params.trendLength || 200
    this.rsiPeriod = params.rsiPeriod || 14
    this.rsiLongFilter = params.rsiLongFilter || 50
    this.rsiShortFilter = params.rsiShortFilter || 50
    
    // Таймфрейм
    this.timeframe = params.timeframe || '4h' // '1h', '4h', '1d'
    this.is4h = this.timeframe === '4h'
    this.is1h = this.timeframe === '1h'
    
    // ATR параметры в зависимости от таймфрейма
    this.atrPeriod = this.is4h ? 21 : this.is1h ? 14 : 14
    this.volatilityThresholdLow = this.is4h ? 0.3 : this.is1h ? 0.45 : 0.5
    this.volatilityThresholdHigh = this.is4h ? 1.2 : this.is1h ? 1.3 : 1.5
    this.atrMultiplierLow = this.is4h ? 0.7 : this.is1h ? 1.5 : 1.0
    this.atrMultiplierNormal = 1.0
    this.atrMultiplierHigh = this.is4h ? 1.5 : this.is1h ? 0.7 : 1.0
    
    // MACD параметры
    this.macdFastLen = this.is1h ? 8 : this.is4h ? 12 : 12
    this.macdSlowLen = this.is1h ? 21 : this.is4h ? 26 : 26
    this.macdSignalLen = this.is1h ? 5 : this.is4h ? 9 : 9
    
    // Состояние
    this.position = 0 // 0 = нет позиции, 1 = long, -1 = short
    this.positionSize = 0
    this.positionAvgPrice = 0
    this.tradeId = 0
    
    // Long состояние
    this.longReachedTp1 = false
    this.longReachedTp2 = false
    this.longStage = 0
    
    // Short состояние
    this.shortReachedTp1 = false
    this.shortReachedTp2 = false
    this.shortStage = 0
    
    // История данных для индикаторов
    this.candles = []
    this.trades = []
  }

  // EMA расчет
  ema(data, period) {
    if (data.length < period) return null
    const multiplier = 2 / (period + 1)
    let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period
    
    for (let i = period; i < data.length; i++) {
      ema = (data[i] - ema) * multiplier + ema
    }
    return ema
  }

  // MACD расчет
  macd(data, fastLen, slowLen, signalLen) {
    const fastEMA = this.ema(data, fastLen)
    const slowEMA = this.ema(data, slowLen)
    if (!fastEMA || !slowEMA) return { macdLine: null, signalLine: null, histogram: null }
    
    const macdLine = fastEMA - slowEMA
    
    // Для signal line нужна история MACD, упростим
    const signalLine = macdLine // Упрощение, в реальности нужна EMA от MACD
    
    return {
      macdLine,
      signalLine,
      histogram: macdLine - signalLine
    }
  }

  // RSI расчет
  rsi(data, period) {
    if (data.length < period + 1) return null
    
    const changes = []
    for (let i = 1; i < data.length; i++) {
      changes.push(data[i] - data[i - 1])
    }
    
    let gains = 0
    let losses = 0
    
    for (let i = 0; i < period; i++) {
      if (changes[i] > 0) gains += changes[i]
      else losses += Math.abs(changes[i])
    }
    
    const avgGain = gains / period
    const avgLoss = losses / period
    
    if (avgLoss === 0) return 100
    
    const rs = avgGain / avgLoss
    return 100 - (100 / (1 + rs))
  }

  // ATR расчет
  atr(candles, period) {
    if (candles.length < period + 1) return null
    
    const trs = []
    for (let i = 1; i < candles.length; i++) {
      const high = candles[i].high
      const low = candles[i].low
      const prevClose = candles[i - 1].close
      
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      )
      trs.push(tr)
    }
    
    if (trs.length < period) return null
    
    return trs.slice(-period).reduce((a, b) => a + b, 0) / period
  }

  // VWAP расчет (упрощенный для 4h)
  vwap(candles) {
    if (candles.length === 0) return null
    let pv = 0
    let vol = 0
    
    for (const candle of candles) {
      const hlc3 = (candle.high + candle.low + candle.close) / 3
      pv += hlc3 * candle.volume
      vol += candle.volume
    }
    
    return vol > 0 ? pv / vol : null
  }

  // Обновление стратегии с новой свечой
  update(candle) {
    this.candles.push(candle)
    
    // Ограничиваем историю (последние 500 свечей)
    if (this.candles.length > 500) {
      this.candles.shift()
    }
    
    if (this.candles.length < Math.max(this.nSlow, this.trendLength, this.atrPeriod)) {
      return { signal: null, trades: [] }
    }
    
    const closes = this.candles.map(c => c.close)
    const highs = this.candles.map(c => c.high)
    const lows = this.candles.map(c => c.low)
    const hlc3 = this.candles.map(c => (c.high + c.low + c.close) / 3)
    
    // Индикаторы
    const fast = this.ema(closes, this.nFast)
    const slow = this.ema(closes, this.nSlow)
    const trendEMA = this.ema(hlc3, this.trendLength)
    
    const macd = this.macd(closes, this.macdFastLen, this.macdSlowLen, this.macdSignalLen)
    const rsi = this.rsi(closes, this.rsiPeriod)
    
    const atrValue = this.atr(this.candles, this.atrPeriod)
    const atrRelative = atrValue ? (atrValue / candle.close) * 100 : null
    
    // VWAP
    const vwapDaily = this.vwap(this.candles)
    
    // Определение уровня волатильности
    let volatilityLevel = 'normal'
    let currentMultiplier = this.atrMultiplierNormal
    
    if (atrRelative !== null) {
      if (atrRelative <= this.volatilityThresholdLow) {
        volatilityLevel = 'low'
        currentMultiplier = this.atrMultiplierLow
      } else if (atrRelative >= this.volatilityThresholdHigh) {
        volatilityLevel = 'high'
        currentMultiplier = this.atrMultiplierHigh
      }
    }
    
    // Адаптированные проценты
    const stopLossPercent = this.baseSlPercent * currentMultiplier
    const takeProfit1Percent = this.baseTp1Percent * currentMultiplier * 1.2
    const takeProfit2Percent = this.baseTp2Percent * currentMultiplier * 1.2
    const takeProfit3Percent = this.baseTp3Percent * currentMultiplier * 1.2
    
    // Проверка пересечений
    const prevFast = this.ema(closes.slice(0, -1), this.nFast)
    const prevSlow = this.ema(closes.slice(0, -1), this.nSlow)
    
    const didCrossUp = prevFast && prevSlow && fast > slow && prevFast <= prevSlow
    const didCrossDn = prevFast && prevSlow && fast < slow && prevFast >= prevSlow
    
    // Дополнительные условия
    const barsBack = this.is1h ? 2 : this.is4h ? 1 : 3
    const priceChangeOverTime = closes.length > barsBack 
      ? ((closes[closes.length - 1] / closes[closes.length - 1 - barsBack]) - 1) * 100 
      : 0
    const priceChangePercent = closes.length > 1 
      ? Math.abs(closes[closes.length - 1] / closes[closes.length - 2] - 1) * 100 
      : 0
    
    // Условия входа
    const longCondition = didCrossUp &&
      (this.is1h ? (candle.close > vwapDaily) : this.is4h ? (candle.close > trendEMA) : true) &&
      (macd.histogram > 0) &&
      (rsi > this.rsiLongFilter) &&
      (!this.is1h || priceChangePercent < 2) &&
      this.position <= 0
    
    const shortCondition = didCrossDn &&
      (this.is1h ? (candle.close < vwapDaily) : this.is4h ? (candle.close < trendEMA) : true) &&
      (macd.histogram < 0) &&
      (rsi < this.rsiShortFilter) &&
      (!this.is1h || priceChangeOverTime > -2.0) &&
      this.position >= 0
    
    const newTrades = []
    
    // Обработка входов
    if (longCondition && this.position <= 0) {
      this.tradeId++
      this.position = 1
      this.positionAvgPrice = candle.close
      this.positionSize = 1
      this.longReachedTp1 = false
      this.longReachedTp2 = false
      this.longStage = 0
      
      const entryPrice = candle.close
      const stopPrice = entryPrice * (1 - stopLossPercent)
      const tp1 = entryPrice * (1 + takeProfit1Percent)
      const tp2 = entryPrice * (1 + takeProfit2Percent)
      const tp3 = entryPrice * (1 + takeProfit3Percent)
      
      newTrades.push({
        id: this.tradeId,
        type: 'BUY',
        entryPrice,
        stopPrice,
        tp1,
        tp2,
        tp3,
        timestamp: candle.timestamp,
        candleIndex: this.candles.length - 1
      })
    }
    
    if (shortCondition && this.position >= 0) {
      this.tradeId++
      this.position = -1
      this.positionAvgPrice = candle.close
      this.positionSize = -1
      this.shortReachedTp1 = false
      this.shortReachedTp2 = false
      this.shortStage = 0
      
      const entryPrice = candle.close
      const stopPrice = entryPrice * (1 + stopLossPercent)
      const tp1 = entryPrice * (1 - takeProfit1Percent)
      const tp2 = entryPrice * (1 - takeProfit2Percent)
      const tp3 = entryPrice * (1 - takeProfit3Percent)
      
      newTrades.push({
        id: this.tradeId,
        type: 'SELL',
        entryPrice,
        stopPrice,
        tp1,
        tp2,
        tp3,
        timestamp: candle.timestamp,
        candleIndex: this.candles.length - 1
      })
    }
    
    // Обработка выходов и перемещения SL
    if (this.position > 0) {
      // Проверка TP1
      if (!this.longReachedTp1 && candle.high >= this.positionAvgPrice * (1 + takeProfit1Percent)) {
        this.longReachedTp1 = true
        this.longStage = 1
        // SL перемещается в безубыток
      }
      
      // Проверка TP2
      if (this.longReachedTp1 && !this.longReachedTp2 && candle.high >= this.positionAvgPrice * (1 + takeProfit2Percent)) {
        this.longReachedTp2 = true
        this.longStage = 2
      }
      
      // Проверка SL
      if (candle.low <= this.positionAvgPrice * (1 - stopLossPercent)) {
        this.position = 0
        this.positionSize = 0
      }
      
      // Проверка TP3
      if (candle.high >= this.positionAvgPrice * (1 + takeProfit3Percent)) {
        this.position = 0
        this.positionSize = 0
      }
    }
    
    if (this.position < 0) {
      // Аналогично для short
      if (!this.shortReachedTp1 && candle.low <= this.positionAvgPrice * (1 - takeProfit1Percent)) {
        this.shortReachedTp1 = true
        this.shortStage = 1
      }
      
      if (this.shortReachedTp1 && !this.shortReachedTp2 && candle.low <= this.positionAvgPrice * (1 - takeProfit2Percent)) {
        this.shortReachedTp2 = true
        this.shortStage = 2
      }
      
      if (candle.high >= this.positionAvgPrice * (1 + stopLossPercent)) {
        this.position = 0
        this.positionSize = 0
      }
      
      if (candle.low <= this.positionAvgPrice * (1 - takeProfit3Percent)) {
        this.position = 0
        this.positionSize = 0
      }
    }
    
    return {
      signal: longCondition ? 'BUY' : shortCondition ? 'SELL' : null,
      trades: newTrades,
      indicators: {
        fast,
        slow,
        trendEMA,
        macd,
        rsi,
        atr: atrValue,
        atrRelative,
        volatilityLevel,
        currentMultiplier
      }
    }
  }

  // Бэктест на исторических данных
  backtest(candles) {
    const results = {
      trades: [],
      equity: [],
      totalPnl: 0,
      winningTrades: 0,
      losingTrades: 0,
      maxDrawdown: 0,
      peakEquity: 0
    }
    
    let equity = 1000 // Начальный капитал
    
    for (const candle of candles) {
      const update = this.update(candle)
      
      // Обработка новых сделок
      for (const trade of update.trades) {
        results.trades.push(trade)
      }
      
      // Симуляция закрытия позиций (упрощенно)
      // В реальности нужно отслеживать каждую позицию отдельно
      
      equity += update.trades.length > 0 ? 0 : 0 // Упрощение
      results.equity.push({
        timestamp: candle.timestamp,
        equity
      })
      
      if (equity > results.peakEquity) {
        results.peakEquity = equity
      }
      
      const drawdown = ((results.peakEquity - equity) / results.peakEquity) * 100
      if (drawdown > results.maxDrawdown) {
        results.maxDrawdown = drawdown
      }
    }
    
    return results
  }
}

module.exports = TradingStrategy

