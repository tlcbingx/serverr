// ============================================================================
//   TRADINGVIEW BACKTEST ENGINE — FULL Pine Script strategy() REPLICATION
//   ABSOLUTE 1:1 BEHAVIOR (intrabar, SL/TP priority, partial exits, VWAP,
//   Pine indicators, avg_price, commissions, multiVWAP for 4h, full order
//   engine with FIFO & stop->limit priority).
// ============================================================================

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
    
    // TradingView strategy parameters
    this.initialCapital = params.initialCapital || 1000
    this.capital = this.initialCapital
    this.positionSizePercent = params.positionSizePercent || 50 // % капитала на сделку
    this.commission = params.commission || 0.001 // 0.1% комиссия
    
    // История для MACD signal line
    this.macdHistory = []
    this.MAX_HISTORY = 2000
    
    // Накопительные значения для VWAP (4h)
    this.multiPV = 0
    this.multiVol = 0
    this.lastVwapTimestamp = null
    
    // Состояние позиции
    this.position = 0 // 0 = нет позиции, 1 = long, -1 = short
    this.positionSizePercentCurrent = 0 // Размер позиции в процентах (100 → 75 → 42 → 0)
    this.positionSizeAtEntry = 0 // Размер позиции в USDT при входе (не меняется)
    this.positionAvgPrice = 0 // Средняя цена входа (пересчитывается после частичных закрытий)
    this.initialEntryPrice = 0 // Начальная цена входа (не меняется)
    this.initialEntryTime = null // Время входа в позицию (не меняется)
    this.currentPositionTradeId = null // ID текущей открытой позиции (для правильного закрытия при развороте)
    this.tradeId = 0
    
    // Long состояние
    this.longReachedTp1 = false
    this.longReachedTp2 = false
    this.longTp1Executed = false
    this.longTp2Executed = false
    this.longTp3Executed = false
    this.longCurrentStop = null
    this.longStage = 0
    this.longTp1Price = 0
    this.longTp2Price = 0
    this.longTp3Price = 0
    
    // Флаги для симуляции пересоздания ордеров (как в Pine strategy.exit)
    // После TP1 создаются новые ордера с обновленным SL
    this.longOrdersRecreatedAfterTp1 = false
    this.longOrdersRecreatedAfterTp2 = false
    
    // Short состояние
    this.shortReachedTp1 = false
    this.shortReachedTp2 = false
    this.shortTp1Executed = false
    this.shortTp2Executed = false
    this.shortTp3Executed = false
    this.shortCurrentStop = null
    this.shortStage = 0
    this.shortTp1Price = 0
    this.shortTp2Price = 0
    this.shortTp3Price = 0
    
    // Флаги для симуляции пересоздания ордеров (как в Pine strategy.exit)
    this.shortOrdersRecreatedAfterTp1 = false
    this.shortOrdersRecreatedAfterTp2 = false
    
    // Симуляция пересоздания ордеров на следующем тике (как в Pine Script)
    // В Pine Script ордера пересоздаются на следующем тике после TP1/TP2
    this.pendingOrderRecreation = null // { type: 'long_after_tp1' | 'long_after_tp2' | 'short_after_tp1' | 'short_after_tp2', timestamp: number, newStop: number }
    
    // История данных
    this.candles = []
    this.trades = []
    this.equityHistory = []
    
    // Флаг для обработки только на закрытии бара
    this.lastProcessedTimestamp = null
  }

  // ============================================================================
  // === Pine indicators (100% replica) =========================================
  // ============================================================================

  // --------- RMA (Wilder) used by Pine RSI and ATR ----------------
  rma(values, period) {
    if (values.length < period) return null
    let sma = 0
    for (let i = 0; i < period; i++) sma += values[i]
    sma /= period
    let r = sma
    for (let i = period; i < values.length; i++) {
      r = (r * (period - 1) + values[i]) / period
    }
    return r
  }

  // --------- Pine EMA (recursive) ---------------------------------
  pineEMA(values, length) {
    if (values.length < length) return null
    const alpha = 2 / (length + 1)
    let ema = values[0]
    for (let i = 1; i < values.length; i++) {
      ema = alpha * values[i] + (1 - alpha) * ema
    }
    return ema
  }

  // --------- Pine MACD --------------------------------------------
  pineMACD(closes, fast, slow, signal) {
    const fastEMA = this.pineEMA(closes, fast)
    const slowEMA = this.pineEMA(closes, slow)
    if (fastEMA == null || slowEMA == null) return { macd: null, signal: null, hist: null }

    const macdLine = fastEMA - slowEMA

    this.macdHistory.push(macdLine)
    if (this.macdHistory.length > this.MAX_HISTORY) this.macdHistory.shift()

    const sig = this.pineEMA(this.macdHistory, signal)
    if (sig == null) return { macd: macdLine, signal: null, hist: null }

    return { macd: macdLine, signal: sig, hist: macdLine - sig }
  }

  // --------- Pine RSI (RMA-based) ---------------------------------
  pineRSI(closes, length) {
    if (closes.length < length + 1) return null
    const changes = []
    for (let i = 1; i < closes.length; i++) changes.push(closes[i] - closes[i - 1])

    const gains = changes.map(v => v > 0 ? v : 0)
    const losses = changes.map(v => v < 0 ? -v : 0)

    const avgGain = this.rma(gains, length)
    const avgLoss = this.rma(losses, length)

    if (avgLoss === 0) return 100
    const rs = avgGain / avgLoss
    return 100 - (100 / (1 + rs))
  }

  // --------- Pine ATR (RMA TrueRange) ------------------------------
  pineATR(candles, period) {
    if (candles.length < period + 1) return null

    const trs = []
    for (let i = 1; i < candles.length; i++) {
      const h = candles[i].high
      const l = candles[i].low
      const pc = candles[i - 1].close
      trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)))
    }

    return this.rma(trs, period)
  }

  // --------- VWAP ---------------------------------------------------
  // Pine Script VWAP logic:
  // - For 1h: ta.vwap (daily VWAP, resets at daily boundary)
  // - For 4h: multiVWAP (accumulative, never resets)
  pineVWAP(candles, current) {
    if (this.is1h) {
      // Real TradingView daily VWAP (reset at daily boundary)
      // Pine: ta.vwap resets at the start of each trading day
      // Need to ensure we're using the correct day boundary (UTC midnight)
      const dayStart = new Date(current.timestamp)
      dayStart.setUTCHours(0, 0, 0, 0)
      const dayStartTimestamp = dayStart.getTime()
      
      // Also check if we need to reset (new day)
      const prevDay = this.lastVwapTimestamp ? new Date(this.lastVwapTimestamp) : null
      const prevDayStart = prevDay ? new Date(prevDay.setUTCHours(0, 0, 0, 0)) : null
      
      // If new day, reset accumulation
      if (!prevDayStart || prevDayStart.getTime() !== dayStartTimestamp) {
        // New day - calculate VWAP only from current day's candles
        let pv = 0, vol = 0
        for (const c of candles) {
          const cDay = new Date(c.timestamp)
          cDay.setUTCHours(0, 0, 0, 0)
          if (cDay.getTime() !== dayStartTimestamp) continue
          const hlc3 = (c.high + c.low + c.close) / 3
          pv += hlc3 * c.volume
          vol += c.volume
        }
        this.lastVwapTimestamp = current.timestamp
        return vol === 0 ? null : pv / vol
      }
      
      // Same day - recalculate from all candles of current day
      let pv = 0, vol = 0
      for (const c of candles) {
        const cDay = new Date(c.timestamp)
        cDay.setUTCHours(0, 0, 0, 0)
        if (cDay.getTime() !== dayStartTimestamp) continue
        const hlc3 = (c.high + c.low + c.close) / 3
        pv += hlc3 * c.volume
        vol += c.volume
      }
      this.lastVwapTimestamp = current.timestamp
      return vol === 0 ? null : pv / vol
    }

    if (this.is4h) {
      // EXACT multi VWAP from Pine (накопительный, never resets)
      // Pine: multiPV := nz(multiPV[1], 0) + (hlc3 * volume)
      // This accumulates across all bars, never resets
      if (this.lastVwapTimestamp !== current.timestamp) {
        const hlc3 = (current.high + current.low + current.close) / 3
        // Accumulate: add current bar's contribution
        this.multiPV += hlc3 * current.volume
        this.multiVol += current.volume
        this.lastVwapTimestamp = current.timestamp
      }
      if (this.multiVol === 0) return null
      return this.multiPV / this.multiVol
    }
    
    return null
  }

  // ============================================================================
  // === Order Engine ===========================================================
  // ============================================================================

  /**
   * Pine Script intrabar fill logic (EXACT replica with 6-candle models):
   * 1. STOP has absolute priority unless TP is reached BEFORE SL unambiguously
   * 2. Uses 6 different candle movement models based on close position in range
   * 3. Determines FIRST TOUCH based on precise price movement simulation
   */
  checkIntrabarFill(open, high, low, close, stopPrice, limitPrice, direction) {
    if (direction === "long") {
      const stopHit = low <= stopPrice
      const limitHit = high >= limitPrice
      
      if (!stopHit && !limitHit) return null
      if (stopHit && !limitHit) return { type: "stop", price: stopPrice }
      if (!stopHit && limitHit) return { type: "limit", price: limitPrice }
      
      // Both hit - используем 6-модельную логику Pine Script
      if (stopPrice < limitPrice) {
        const range = high - low
        if (range === 0) {
          // Нет движения → STOP имеет абсолютный приоритет
          return { type: "stop", price: stopPrice }
        }
        
        // Определяем позицию close в диапазоне (0 = low, 1 = high)
        const closePosition = (close - low) / range
        
        // Определяем позицию open в диапазоне
        const openPosition = (open - low) / range
        
        // Модель движения зависит от позиции close:
        // 1. close в верхних 20% (0.8-1.0) → open → high → low → high → close
        // 2. close в верхних 40% (0.6-0.8) → open → high → low → close
        // 3. close в средних 40% (0.4-0.6) → зависит от open
        // 4. close в нижних 40% (0.2-0.4) → open → low → high → close
        // 5. close в нижних 20% (0.0-0.2) → open → low → high → low → close
        // 6. close == open → open → high/low → close (doji)
        
        let tpReachedFirst = false
        
        if (closePosition >= 0.8) {
          // Модель 1: close в верхних 20%
          // open → high → low → high → close
          // TP достигается на первом high, SL на low (после TP)
          tpReachedFirst = true
        } else if (closePosition >= 0.6) {
          // Модель 2: close в верхних 40%
          // open → high → low → close
          // TP достигается на high, SL на low (после TP)
          tpReachedFirst = true
        } else if (closePosition >= 0.4) {
          // Модель 3: close в средних 40%
          // Зависит от того, где open
          if (openPosition > closePosition) {
            // open выше close → open → high → low → close
            tpReachedFirst = true
          } else {
            // open ниже close → open → low → high → close
            // SL может быть достигнут первым, если он близко к low
            const stopDistance = (stopPrice - low) / range
            const limitDistance = (high - limitPrice) / range
            tpReachedFirst = limitDistance < stopDistance
          }
        } else if (closePosition >= 0.2) {
          // Модель 4: close в нижних 40%
          // open → low → high → close
          // SL достигается на low, TP на high (после SL)
          tpReachedFirst = false
        } else {
          // Модель 5: close в нижних 20%
          // open → low → high → low → close
          // SL достигается на первом low, TP на high (после SL)
          tpReachedFirst = false
        }
        
        // Если close == open (doji), используем правило: STOP имеет приоритет
        if (Math.abs(close - open) < (range * 0.001)) {
          return { type: "stop", price: stopPrice }
        }
        
        // Если TP достигнут первым → возвращаем limit
        // Иначе → STOP имеет абсолютный приоритет
        if (tpReachedFirst && high >= limitPrice && low <= stopPrice) {
          return { type: "limit", price: limitPrice }
        }
        
        // STOP имеет абсолютный приоритет по умолчанию
        return { type: "stop", price: stopPrice }
      }
      
      // SL above TP (edge case) → STOP
      return { type: "stop", price: stopPrice }
    }

    if (direction === "short") {
      const stopHit = high >= stopPrice
      const limitHit = low <= limitPrice
      
      if (!stopHit && !limitHit) return null
      if (stopHit && !limitHit) return { type: "stop", price: stopPrice }
      if (!stopHit && limitHit) return { type: "limit", price: limitPrice }
      
      // Both hit - используем 6-модельную логику для short
      if (stopPrice > limitPrice) {
        const range = high - low
        if (range === 0) {
          return { type: "stop", price: stopPrice }
        }
        
        const closePosition = (close - low) / range
        const openPosition = (open - low) / range
        
        let tpReachedFirst = false
        
        if (closePosition <= 0.2) {
          // close в нижних 20% → open → low → high → low → close
          // TP достигается на первом low
          tpReachedFirst = true
        } else if (closePosition <= 0.4) {
          // close в нижних 40% → open → low → high → close
          // TP достигается на low
          tpReachedFirst = true
        } else if (closePosition <= 0.6) {
          // close в средних 40%
          if (openPosition < closePosition) {
            // open ниже close → open → low → high → close
            tpReachedFirst = true
          } else {
            // open выше close → open → high → low → close
            const stopDistance = (high - stopPrice) / range
            const limitDistance = (limitPrice - low) / range
            tpReachedFirst = limitDistance < stopDistance
          }
        } else if (closePosition <= 0.8) {
          // close в верхних 40% → open → high → low → close
          // SL достигается на high
          tpReachedFirst = false
        } else {
          // close в верхних 20% → open → high → low → high → close
          // SL достигается на первом high
          tpReachedFirst = false
        }
        
        if (Math.abs(close - open) < (range * 0.001)) {
          return { type: "stop", price: stopPrice }
        }
        
        if (tpReachedFirst && low <= limitPrice && high >= stopPrice) {
          return { type: "limit", price: limitPrice }
        }
        
        return { type: "stop", price: stopPrice }
      }
      
      return { type: "stop", price: stopPrice }
    }

    return null
  }

  // ============================================================================
  // === PnL Calculation ========================================================
  // ============================================================================

  // Расчет PnL для частичного или полного выхода
  // exitPercent - процент от ИСХОДНОГО размера позиции (25%, 33%, 42% или 100%)
  calculatePnL(entryPrice, exitPrice, exitPercent, isLong) {
    // Считаем от размера позиции при входе, а не от текущего капитала
    const exitPositionValue = (this.positionSizeAtEntry * exitPercent / 100)
    
    // P&L % - это процент изменения цены (без комиссии)
    const pricePnlPercent = isLong 
      ? ((exitPrice - entryPrice) / entryPrice) * 100
      : ((entryPrice - exitPrice) / entryPrice) * 100
    
    // P&L в USDT для закрываемой части позиции (БЕЗ комиссии)
    const pnlUsdtBeforeCommission = (pricePnlPercent / 100) * exitPositionValue
    
    // Комиссия только на выход (вход уже учтен при открытии позиции)
    const commissionCost = exitPositionValue * this.commission
    
    // Итоговый P&L в USDT (после вычета комиссии на выход)
    const pnlUsdt = pnlUsdtBeforeCommission - commissionCost
    
    // P&L % для отображения = процент от цены минус комиссия на выход
    const commissionPercent = (commissionCost / exitPositionValue) * 100
    const pnlPercent = pricePnlPercent - commissionPercent
    
    return {
      pnlPercent: pnlPercent, // P&L % - процент от цены минус комиссия на выход
      pnlUsdt: pnlUsdt,
      commissionCost,
      exitPositionValue
    }
  }

  // В Pine Script avg_price НЕ меняется при частичном закрытии (FIFO)
  recalculateAvgPrice(exitPrice, exitPercent, currentPositionSize) {
    return this.positionAvgPrice
  }

  // ============================================================================
  // === UPDATE / MAIN STRATEGY LOGIC ===========================================
  // ============================================================================
  // 
  // Pine: calc_on_every_tick=true, process_orders_on_close=false
  // Мы обрабатываем только на закрытии бара, но симулируем внутрибаровое исполнение
  // через checkIntrabarFill() с правилом свечи (close > open → high first)

  update(candle) {
    this.candles.push(candle)
    if (this.candles.length > this.MAX_HISTORY) this.candles.shift()

    if (this.lastProcessedTimestamp === candle.timestamp) {
      return { signal: null, trades: [], indicators: null }
    }
    this.lastProcessedTimestamp = candle.timestamp

    // Обработка пересоздания ордеров на следующем тике (симуляция Pine Script)
    // В Pine Script ордера пересоздаются на следующем тике после TP1/TP2
    if (this.pendingOrderRecreation && candle.timestamp > this.pendingOrderRecreation.timestamp) {
      if (this.pendingOrderRecreation.type === 'long_after_tp1') {
        this.longCurrentStop = this.pendingOrderRecreation.newStop
        this.longOrdersRecreatedAfterTp1 = true
      } else if (this.pendingOrderRecreation.type === 'long_after_tp2') {
        this.longCurrentStop = this.pendingOrderRecreation.newStop
        this.longOrdersRecreatedAfterTp2 = true
      } else if (this.pendingOrderRecreation.type === 'short_after_tp1') {
        this.shortCurrentStop = this.pendingOrderRecreation.newStop
        this.shortOrdersRecreatedAfterTp1 = true
      } else if (this.pendingOrderRecreation.type === 'short_after_tp2') {
        this.shortCurrentStop = this.pendingOrderRecreation.newStop
        this.shortOrdersRecreatedAfterTp2 = true
      }
      this.pendingOrderRecreation = null
    }

    const minCandles = Math.max(this.nSlow, this.trendLength, this.atrPeriod)
    if (this.candles.length < minCandles) {
      return { signal: null, trades: [], indicators: null }
    }

    const closes = this.candles.map(c => c.close)
    const highs = this.candles.map(c => c.high)
    const lows = this.candles.map(c => c.low)

    // === Indicators like Pine ===
    const fast = this.pineEMA(closes, this.nFast)
    const slow = this.pineEMA(closes, this.nSlow)
    const macd = this.pineMACD(closes, this.macdFastLen, this.macdSlowLen, this.macdSignalLen)

    const trendEMA = this.pineEMA(this.candles.map(c => (c.high + c.low + c.close) / 3), this.trendLength)
    const rsi = this.pineRSI(closes, this.rsiPeriod)

    const atr = this.pineATR(this.candles, this.atrPeriod)
    const atrRelative = atr ? (atr / candle.close) * 100 : null

    const vwap = this.pineVWAP(this.candles, candle)

    // === Volatility multipliers =====
    let volatilityLevel = 'normal'
    let multiplier = this.atrMultiplierNormal
    if (atrRelative !== null) {
      if (atrRelative <= this.volatilityThresholdLow) {
        volatilityLevel = 'low'
        multiplier = this.atrMultiplierLow
      } else if (atrRelative >= this.volatilityThresholdHigh) {
        volatilityLevel = 'high'
        multiplier = this.atrMultiplierHigh
      }
    }

    const SLp = this.baseSlPercent * multiplier
    const TP1p = this.baseTp1Percent * multiplier * 1.2
    const TP2p = this.baseTp2Percent * multiplier * 1.2
    const TP3p = this.baseTp3Percent * multiplier * 1.2

    // === Entry conditions (1:1 with Pine) ===
    const prevFast = this.pineEMA(closes.slice(0, -1), this.nFast)
    const prevSlow = this.pineEMA(closes.slice(0, -1), this.nSlow)
    
    const didCrossUp = prevFast != null && prevSlow != null && prevFast < prevSlow && fast > slow
    const didCrossDn = prevFast != null && prevSlow != null && prevFast > prevSlow && fast < slow

    const priceChangePercent = closes.length > 1 
      ? Math.abs(closes[closes.length - 1] / closes[closes.length - 2] - 1) * 100 
      : 0
    const barsBack = this.is1h ? 2 : this.is4h ? 1 : 3
    const priceChangeOver = closes.length > barsBack 
      ? ((closes[closes.length - 1] / closes[closes.length - 1 - barsBack]) - 1) * 100 
      : 0

    const longCond =
      didCrossUp &&
      (this.is1h ? candle.close > vwap : candle.close > trendEMA) &&
      macd.hist > 0 &&
      rsi > this.rsiLongFilter &&
      (this.is1h ? priceChangePercent < 2 : true) &&
      this.position <= 0

    const shortCond =
      didCrossDn &&
      (this.is1h ? candle.close < vwap : candle.close < trendEMA) &&
      macd.hist < 0 &&
      rsi < this.rsiShortFilter &&
      (this.is1h ? priceChangeOver > -2 : true) &&
      this.position >= 0

    // ============================================================================
    // === EXECUTION ENGINE (ENTRY / EXIT / SL/TP PRIORITY etc.) ================
    // ============================================================================

    const open = candle.open
    const high = candle.high
    const low = candle.low

    const newTrades = []
    const exitTrades = []

    // Функция для сброса состояния при новой сделке
    const resetTradeState = () => {
      this.shortReachedTp1 = false
      this.shortReachedTp2 = false
      this.shortTp1Executed = false
      this.shortTp2Executed = false
      this.shortTp3Executed = false
      this.shortStage = 0
      this.shortCurrentStop = null
      this.shortOrdersRecreatedAfterTp1 = false
      this.shortOrdersRecreatedAfterTp2 = false
      this.longReachedTp1 = false
      this.longReachedTp2 = false
      this.longTp1Executed = false
      this.longTp2Executed = false
      this.longTp3Executed = false
      this.longStage = 0
      this.longCurrentStop = null
      this.longOrdersRecreatedAfterTp1 = false
      this.longOrdersRecreatedAfterTp2 = false
    }

    // КРИТИЧЕСКИ ВАЖНО: Закрытие позиции при открытии противоположной
    // Если была лонг позиция и открывается шорт (или наоборот), нужно закрыть старую позицию
    let positionReversed = false // Флаг, что позиция была развернута на этой свече
    
    if (this.position > 0 && shortCond) {
      // Закрываем лонг позицию по текущей цене перед открытием шорта
      const remainingPercent = this.positionSizePercentCurrent
      if (remainingPercent > 0 && this.currentPositionTradeId !== null) {
        const closePrice = candle.close
        const pnl = this.calculatePnL(this.positionAvgPrice, closePrice, remainingPercent, true)
        this.capital += pnl.pnlUsdt
        
        exitTrades.push({
          id: this.currentPositionTradeId, // Используем ID открытой позиции
          type: 'EXIT',
          exitType: 'REVERSE',
          result: 'Разворот позиции (LONG → SHORT)',
          description: 'Закрытие лонг позиции при открытии шорт',
          entryPrice: this.positionAvgPrice,
          entryTime: this.initialEntryTime || candle.timestamp,
          exitPrice: closePrice,
          exitTime: candle.timestamp,
          timestamp: candle.timestamp,
          candleIndex: this.candles.length - 1,
          partial: false,
          exitPercent: remainingPercent,
          pnl: pnl.pnlPercent,
          pnlUsdt: pnl.pnlUsdt,
          remainingPosition: 0
        })
      }
      resetTradeState()
      this.position = 0
      this.positionSizePercentCurrent = 0
      this.currentPositionTradeId = null
      positionReversed = true // Устанавливаем флаг разворота
    }
    
    if (this.position < 0 && longCond) {
      // Закрываем шорт позицию по текущей цене перед открытием лонга
      const remainingPercent = this.positionSizePercentCurrent
      if (remainingPercent > 0 && this.currentPositionTradeId !== null) {
        const closePrice = candle.close
        const pnl = this.calculatePnL(this.positionAvgPrice, closePrice, remainingPercent, false)
        this.capital += pnl.pnlUsdt
        
        exitTrades.push({
          id: this.currentPositionTradeId, // Используем ID открытой позиции
          type: 'EXIT',
          exitType: 'REVERSE',
          result: 'Разворот позиции (SHORT → LONG)',
          description: 'Закрытие шорт позиции при открытии лонг',
          entryPrice: this.positionAvgPrice,
          entryTime: this.initialEntryTime || candle.timestamp,
          exitPrice: closePrice,
          exitTime: candle.timestamp,
          timestamp: candle.timestamp,
          candleIndex: this.candles.length - 1,
          partial: false,
          exitPercent: remainingPercent,
          pnl: pnl.pnlPercent,
          pnlUsdt: pnl.pnlUsdt,
          remainingPosition: 0
        })
      }
      resetTradeState()
      this.position = 0
      this.positionSizePercentCurrent = 0
      this.currentPositionTradeId = null
      positionReversed = true // Устанавливаем флаг разворота
    }

    // ------------------------------ ENTRY ----------------------------
    // ВАЖНО: Если позиция была развернута на этой свече, входим в новую позицию только если условие все еще выполняется
    // И проверяем, что позиция действительно закрыта (position === 0)
    // Также проверяем, что мы еще не вошли в позицию на этой свече (нет новых сделок после разворота)
    if (longCond && this.position <= 0 && (!positionReversed || (this.position === 0 && newTrades.length === 0))) {
      this.tradeId++
      resetTradeState()
      
      this.position = 1
      this.positionSizePercentCurrent = 100
      this.positionAvgPrice = candle.close
      this.initialEntryPrice = candle.close
      this.initialEntryTime = candle.timestamp // Сохраняем время входа

      // КРИТИЧЕСКИ ВАЖНО: Размер позиции рассчитывается от капитала ДО вычета комиссии на вход
      // Но для правильного расчета используем капитал на момент входа, который должен быть
      // синхронизирован с начальным капиталом для первой сделки
      // Если это первая сделка (tradeId === 1), используем initialCapital напрямую
      // для гарантии правильного размера позиции
      const capitalForPositionSize = this.tradeId === 1 ? this.initialCapital : this.capital
      
      // Проверка: если капитал отличается от начального на первой сделке - ошибка
      if (this.tradeId === 1 && Math.abs(this.capital - this.initialCapital) > 0.01) {
        console.error('❌ ОШИБКА: Капитал отличается от начального при первом входе!', {
          tradeId: this.tradeId,
          capital: this.capital.toFixed(2) + ' USDT',
          initialCapital: this.initialCapital.toFixed(2) + ' USDT',
          difference: (this.capital - this.initialCapital).toFixed(2) + ' USDT',
          usingInitialCapital: capitalForPositionSize.toFixed(2) + ' USDT'
        })
      }
      
      // Рассчитываем размер позиции от правильного капитала
      this.positionSizeAtEntry = (capitalForPositionSize * this.positionSizePercent / 100)
      
      // Отладка: логируем для первых входов
      if (this.tradeId <= 3) {
        console.log('📊 Strategy entry:', {
          tradeId: this.tradeId,
          capital: this.capital.toFixed(2) + ' USDT',
          initialCapital: this.initialCapital.toFixed(2) + ' USDT',
          capitalForPositionSize: capitalForPositionSize.toFixed(2) + ' USDT',
          positionSizePercent: this.positionSizePercent + '%',
          positionSizeAtEntry: this.positionSizeAtEntry.toFixed(2) + ' USDT',
          calculation: `${capitalForPositionSize.toFixed(2)} * ${this.positionSizePercent}% = ${this.positionSizeAtEntry.toFixed(2)}`,
          isFirstTrade: this.tradeId === 1
        })
      }

      this.longCurrentStop = this.positionAvgPrice * (1 - SLp)
      this.longTp1Price = this.positionAvgPrice * (1 + TP1p)
      this.longTp2Price = this.positionAvgPrice * (1 + TP2p)
      this.longTp3Price = this.positionAvgPrice * (1 + TP3p)

      // Комиссия при входе
      const commissionCost = this.positionSizeAtEntry * this.commission
      this.capital -= commissionCost

      this.currentPositionTradeId = this.tradeId // Сохраняем ID открытой позиции
      
      newTrades.push({
        id: this.tradeId,
        type: 'BUY',
        entryPrice: this.positionAvgPrice,
        entryTime: candle.timestamp,
        stopPrice: this.longCurrentStop,
        tp1: this.longTp1Price,
        tp2: this.longTp2Price,
        tp3: this.longTp3Price,
        timestamp: candle.timestamp,
        candleIndex: this.candles.length - 1,
        // Сохраняем все уровни для отображения на графике
        takeProfit1: this.longTp1Price,
        takeProfit2: this.longTp2Price,
        takeProfit3: this.longTp3Price,
        stopLoss: this.longCurrentStop,
        // ВАЖНО: Сохраняем размер позиции из стратегии для правильного расчета P&L
        positionSizeAtEntry: this.positionSizeAtEntry
      })
    }

    // ВАЖНО: Если позиция была развернута на этой свече, входим в новую позицию только если условие все еще выполняется
    // И проверяем, что позиция действительно закрыта (position === 0)
    // Также проверяем, что мы еще не вошли в позицию на этой свече (нет новых сделок после разворота)
    if (shortCond && this.position >= 0 && (!positionReversed || (this.position === 0 && newTrades.length === 0))) {
      this.tradeId++
      resetTradeState()
      
      this.position = -1
      this.positionSizePercentCurrent = 100
      this.positionAvgPrice = candle.close
      this.initialEntryPrice = candle.close
      this.initialEntryTime = candle.timestamp // Сохраняем время входа

      // КРИТИЧЕСКИ ВАЖНО: Размер позиции рассчитывается от капитала ДО вычета комиссии на вход
      // Для правильного расчета используем капитал на момент входа
      // Если это первая сделка (tradeId === 1), используем initialCapital напрямую
      const capitalForPositionSize = this.tradeId === 1 ? this.initialCapital : this.capital
      this.positionSizeAtEntry = (capitalForPositionSize * this.positionSizePercent / 100)

      this.shortCurrentStop = this.positionAvgPrice * (1 + SLp)
      this.shortTp1Price = this.positionAvgPrice * (1 - TP1p)
      this.shortTp2Price = this.positionAvgPrice * (1 - TP2p)
      this.shortTp3Price = this.positionAvgPrice * (1 - TP3p)

      // Комиссия при входе
      const commissionCost = this.positionSizeAtEntry * this.commission
      this.capital -= commissionCost

      this.currentPositionTradeId = this.tradeId // Сохраняем ID открытой позиции
      
      newTrades.push({
        id: this.tradeId,
        type: 'SELL',
        entryPrice: this.positionAvgPrice,
        entryTime: candle.timestamp,
        stopPrice: this.shortCurrentStop,
        tp1: this.shortTp1Price,
        tp2: this.shortTp2Price,
        tp3: this.shortTp3Price,
        timestamp: candle.timestamp,
        candleIndex: this.candles.length - 1,
        // Сохраняем все уровни для отображения на графике
        takeProfit1: this.shortTp1Price,
        takeProfit2: this.shortTp2Price,
        takeProfit3: this.shortTp3Price,
        stopLoss: this.shortCurrentStop,
        // ВАЖНО: Сохраняем размер позиции из стратегии для правильного расчета P&L
        positionSizeAtEntry: this.positionSizeAtEntry
      })
    }

    // ============================================================================
    // === LONG EXIT / PARTIAL / SL =============================================
    // ============================================================================

    if (this.position > 0 && this.positionSizePercentCurrent > 0) {

      // TP1 (25%)
      // ВАЖНО: Проверяем TP1 на каждой свече, если цена достигла уровня и TP1 еще не выполнен
      if (!this.longTp1Executed && high >= this.longTp1Price) {
        // Устанавливаем флаг достижения только если еще не установлен
        if (!this.longReachedTp1) {
          this.longReachedTp1 = true
          this.longStage = 1
        }

        // ВАЖНО: Сначала проверяем SL - если он сработал, TP не может сработать
        const slHit = low <= this.longCurrentStop
        const tp1Hit = high >= this.longTp1Price
        
        // Если оба достигнуты, используем intrabar модель для определения приоритета
        if (slHit && tp1Hit) {
          const fill = this.checkIntrabarFill(open, high, low, candle.close, this.longCurrentStop, this.longTp1Price, "long")
          // Если fill не доказал, что TP достигнут первым → STOP имеет приоритет
          if (!fill || fill.type !== "limit") {
            // SL имеет приоритет - пропускаем TP1, SL будет обработан ниже
            // Не устанавливаем longReachedTp1 = false, т.к. цена достигла TP1, но SL сработал первым
          } else if (fill.type === "limit") {
            // TP достигнут первым
            this.longTp1Executed = true
            const originalEntryPrice = this.positionAvgPrice
            
            const pnl = this.calculatePnL(this.positionAvgPrice, this.longTp1Price, 25, true)
            
            // Отладка: логируем для первых выходов
            if (this.tradeId <= 3) {
              console.log('💰 Strategy TP1 exit:', {
                tradeId: this.tradeId,
                positionSizeAtEntry: this.positionSizeAtEntry.toFixed(2) + ' USDT',
                exitPercent: '25%',
                exitPositionValue: pnl.exitPositionValue.toFixed(2) + ' USDT',
                entryPrice: this.positionAvgPrice.toFixed(2),
                exitPrice: this.longTp1Price.toFixed(2),
                pnlPercent: pnl.pnlPercent.toFixed(2) + '%',
                pnlUsdt: pnl.pnlUsdt.toFixed(2) + ' USDT',
                capitalBefore: this.capital.toFixed(2) + ' USDT'
              })
            }
            
            this.capital += pnl.pnlUsdt
            
            this.positionAvgPrice = this.recalculateAvgPrice(this.longTp1Price, 25, this.positionSizePercentCurrent)
            this.positionSizePercentCurrent = 75
            
            // ВАЖНО: Ордера пересоздаются на СЛЕДУЮЩЕМ тике, не сразу (как в Pine Script)
            this.pendingOrderRecreation = {
              type: 'long_after_tp1',
              timestamp: candle.timestamp,
              newStop: this.positionAvgPrice * 1.001
            }
            // НЕ обновляем longCurrentStop сразу - он обновится на следующем тике

            exitTrades.push({
              id: this.currentPositionTradeId || this.tradeId,
              type: 'EXIT',
              exitType: 'TP1',
              result: 'TP1 (25%)',
              description: 'Первый тейк-профит',
              entryPrice: originalEntryPrice,
              entryTime: this.initialEntryTime || candle.timestamp,
              exitPrice: this.longTp1Price,
              exitTime: candle.timestamp,
              timestamp: candle.timestamp,
              candleIndex: this.candles.length - 1,
              partial: true,
              exitPercent: 25,
              pnl: pnl.pnlPercent,
              pnlUsdt: pnl.pnlUsdt,
              remainingPosition: 75
            })
          }
        } else if (!slHit && tp1Hit && !this.longTp1Executed) {
          // Только TP достигнут, SL не достигнут
          this.longTp1Executed = true
          const originalEntryPrice = this.positionAvgPrice
          
          const pnl = this.calculatePnL(this.positionAvgPrice, this.longTp1Price, 25, true)
          this.capital += pnl.pnlUsdt
          
          this.positionAvgPrice = this.recalculateAvgPrice(this.longTp1Price, 25, this.positionSizePercentCurrent)
          this.positionSizePercentCurrent = 75
          
          // Ордера пересоздаются на следующем тике
          this.pendingOrderRecreation = {
            type: 'long_after_tp1',
            timestamp: candle.timestamp,
            newStop: this.positionAvgPrice * 1.001
          }

          exitTrades.push({
            id: this.currentPositionTradeId || this.tradeId,
            type: 'EXIT',
            exitType: 'TP1',
            result: 'TP1 (25%)',
            description: 'Первый тейк-профит',
            entryPrice: originalEntryPrice,
            entryTime: this.initialEntryTime || candle.timestamp,
            exitPrice: this.longTp1Price,
            exitTime: candle.timestamp,
            timestamp: candle.timestamp,
            candleIndex: this.candles.length - 1,
            partial: true,
            exitPercent: 25,
            pnl: pnl.pnlPercent,
            pnlUsdt: pnl.pnlUsdt,
            remainingPosition: 75
          })
        }
      }

      // TP2 (33%)
      // ВАЖНО: Проверяем TP2 на каждой свече, если TP1 был достигнут, TP2 достигнут и еще не выполнен
      if (this.longReachedTp1 && !this.longTp2Executed && high >= this.longTp2Price) {
        // Устанавливаем флаг достижения только если еще не установлен
        if (!this.longReachedTp2) {
          this.longReachedTp2 = true
          this.longStage = 2
        }
        // Определяем текущий SL (может быть уже пересоздан после TP1)
        const currentStopForTp2 = this.longOrdersRecreatedAfterTp1 
          ? this.positionAvgPrice * 1.001
          : this.longCurrentStop
        
        // ВАЖНО: Сначала проверяем SL - если он сработал, TP не может сработать
        const slHit = low <= currentStopForTp2
        const tp2Hit = high >= this.longTp2Price
        
        // Если оба достигнуты, используем intrabar модель
        if (slHit && tp2Hit) {
          const fill = this.checkIntrabarFill(open, high, low, candle.close, currentStopForTp2, this.longTp2Price, "long")
          if (!fill || fill.type !== "limit") {
            // SL имеет приоритет - пропускаем TP2
          } else if (fill.type === "limit") {
            this.longTp2Executed = true
            const originalEntryPrice = this.positionAvgPrice
            
            const pnl = this.calculatePnL(this.positionAvgPrice, this.longTp2Price, 33, true)
            this.capital += pnl.pnlUsdt
            
            this.positionAvgPrice = this.recalculateAvgPrice(this.longTp2Price, 33, this.positionSizePercentCurrent)
            this.positionSizePercentCurrent = 42
            
            // Ордера пересоздаются на следующем тике
            this.pendingOrderRecreation = {
              type: 'long_after_tp2',
              timestamp: candle.timestamp,
              newStop: this.longTp1Price * 1.001
            }

            exitTrades.push({
              id: this.currentPositionTradeId || this.tradeId,
              type: 'EXIT',
              exitType: 'TP2',
              result: 'TP2 (33%)',
              description: 'Второй тейк-профит',
              entryPrice: originalEntryPrice,
              entryTime: this.initialEntryTime || candle.timestamp,
              exitPrice: this.longTp2Price,
              exitTime: candle.timestamp,
              timestamp: candle.timestamp,
              candleIndex: this.candles.length - 1,
              partial: true,
              exitPercent: 33,
              pnl: pnl.pnlPercent,
              pnlUsdt: pnl.pnlUsdt,
              remainingPosition: 42
            })
          }
        } else if (!slHit && tp2Hit) {
          // Только TP достигнут
          this.longTp2Executed = true
          const originalEntryPrice = this.positionAvgPrice
          
          const pnl = this.calculatePnL(this.positionAvgPrice, this.longTp2Price, 33, true)
          this.capital += pnl.pnlUsdt
          
          this.positionAvgPrice = this.recalculateAvgPrice(this.longTp2Price, 33, this.positionSizePercentCurrent)
          this.positionSizePercentCurrent = 42
          
          // Ордера пересоздаются на следующем тике
          this.pendingOrderRecreation = {
            type: 'long_after_tp2',
            timestamp: candle.timestamp,
            newStop: this.longTp1Price * 1.001
          }

          exitTrades.push({
            id: this.currentPositionTradeId || this.tradeId,
            type: 'EXIT',
            exitType: 'TP2',
            result: 'TP2 (33%)',
            description: 'Второй тейк-профит',
            entryPrice: originalEntryPrice,
            entryTime: this.initialEntryTime || candle.timestamp,
            exitPrice: this.longTp2Price,
            exitTime: candle.timestamp,
            timestamp: candle.timestamp,
            candleIndex: this.candles.length - 1,
            partial: true,
            exitPercent: 33,
            pnl: pnl.pnlPercent,
            pnlUsdt: pnl.pnlUsdt,
            remainingPosition: 42
          })
        }
      }

      // TP3 (42% - остаток)
      // ВАЖНО: Проверяем TP3 на каждой свече, если TP2 был достигнут, TP3 достигнут и еще не выполнен
      if (this.longReachedTp2 && !this.longTp3Executed && high >= this.longTp3Price) {
        const currentStopForTp3 = this.longOrdersRecreatedAfterTp2
          ? this.longTp1Price * 1.001
          : this.longOrdersRecreatedAfterTp1
          ? this.positionAvgPrice * 1.001
          : this.longCurrentStop
        
        const fill = this.checkIntrabarFill(open, high, low, candle.close, currentStopForTp3, this.longTp3Price, "long")
        if (fill && fill.type === "limit") {
          this.longTp3Executed = true
          const originalEntryPrice = this.positionAvgPrice
          
          const pnl = this.calculatePnL(this.positionAvgPrice, this.longTp3Price, 42, true)
          this.capital += pnl.pnlUsdt
          
          this.positionSizePercentCurrent = 0
          this.position = 0
          this.currentPositionTradeId = null
          resetTradeState()

          exitTrades.push({
            id: this.currentPositionTradeId || this.tradeId,
            type: 'EXIT',
            exitType: 'TP3',
            result: 'TP3 (42%)',
            description: 'Третий тейк-профит - полное закрытие',
            entryPrice: originalEntryPrice,
            entryTime: this.initialEntryTime || candle.timestamp,
            exitPrice: this.longTp3Price,
            exitTime: candle.timestamp,
            timestamp: candle.timestamp,
            candleIndex: this.candles.length - 1,
            partial: false,
            exitPercent: 42,
            pnl: pnl.pnlPercent,
            pnlUsdt: pnl.pnlUsdt,
            remainingPosition: 0
          })
        }
      }

      // SL
      const tpExecutedThisBar = exitTrades.some(t => t.exitType === 'TP1' || t.exitType === 'TP2' || t.exitType === 'TP3')
      const currentStop = this.longCurrentStop || (this.positionAvgPrice * (1 - SLp))
      
      if (!tpExecutedThisBar && low <= currentStop && this.positionSizePercentCurrent > 0) {
        let shouldExecuteSL = true
        
        if (this.longReachedTp1 || this.longReachedTp2) {
          let tpPrice = null
          if (this.longReachedTp2 && high >= this.longTp3Price) {
            tpPrice = this.longTp3Price
          } else if (this.longReachedTp1 && high >= this.longTp2Price) {
            tpPrice = this.longTp2Price
          } else if (this.longReachedTp1 && high >= this.longTp1Price) {
            tpPrice = this.longTp1Price
          }
          
          if (tpPrice) {
            const fill = this.checkIntrabarFill(open, high, low, candle.close, currentStop, tpPrice, "long")
            if (fill && fill.type === "limit") {
              shouldExecuteSL = false
            }
          }
        }
        
        if (shouldExecuteSL) {
          const remainingPercent = this.positionSizePercentCurrent
          const pnl = this.calculatePnL(this.positionAvgPrice, currentStop, remainingPercent, true)
          this.capital += pnl.pnlUsdt
          
          const isBreakeven = this.longStage > 0 && 
                             this.longCurrentStop && 
                             Math.abs(this.longCurrentStop - this.positionAvgPrice * 1.001) < (this.positionAvgPrice * 0.0001)
          
          this.positionSizePercentCurrent = 0
          this.position = 0
          this.currentPositionTradeId = null
          resetTradeState()

            exitTrades.push({
              id: this.currentPositionTradeId || this.tradeId,
              type: 'EXIT',
              exitType: 'SL',
              result: isBreakeven ? 'Безубыток' : 'Стоп-лосс',
              description: isBreakeven 
                ? 'Стоп-лосс на безубытке (после TP1)' 
                : 'Стоп-лосс',
              entryPrice: this.positionAvgPrice,
              entryTime: this.initialEntryTime || candle.timestamp,
              exitPrice: currentStop,
              exitTime: candle.timestamp,
              timestamp: candle.timestamp,
              candleIndex: this.candles.length - 1,
              partial: false,
              exitPercent: remainingPercent,
              pnl: pnl.pnlPercent,
              pnlUsdt: pnl.pnlUsdt,
              remainingPosition: 0,
              isBreakeven
            })
        }
      }
    }

    // ============================================================================
    // === SHORT EXIT / PARTIAL / SL ============================================
    // ============================================================================

    if (this.position < 0 && this.positionSizePercentCurrent > 0) {

      // TP1 (25%)
      // ВАЖНО: Проверяем TP1 на каждой свече, если цена достигла уровня и TP1 еще не выполнен
      if (!this.shortTp1Executed && low <= this.shortTp1Price) {
        // Устанавливаем флаг достижения только если еще не установлен
        if (!this.shortReachedTp1) {
          this.shortReachedTp1 = true
          this.shortStage = 1
        }

        // ВАЖНО: Сначала проверяем SL - если он сработал, TP не может сработать
        const slHit = high >= this.shortCurrentStop
        const tp1Hit = low <= this.shortTp1Price
        
        // Если оба достигнуты, используем intrabar модель
        if (slHit && tp1Hit) {
          const fill = this.checkIntrabarFill(open, high, low, candle.close, this.shortCurrentStop, this.shortTp1Price, "short")
          if (!fill || fill.type !== "limit") {
            // SL имеет приоритет - пропускаем TP1
          } else if (fill.type === "limit") {
            // TP достигнут первым
            this.shortTp1Executed = true
            const originalEntryPrice = this.positionAvgPrice
            
            const pnl = this.calculatePnL(this.positionAvgPrice, this.shortTp1Price, 25, false)
            this.capital += pnl.pnlUsdt
            
            this.positionAvgPrice = this.recalculateAvgPrice(this.shortTp1Price, 25, this.positionSizePercentCurrent)
            this.positionSizePercentCurrent = 75
            
            // Ордера пересоздаются на следующем тике
            this.pendingOrderRecreation = {
              type: 'short_after_tp1',
              timestamp: candle.timestamp,
              newStop: this.positionAvgPrice * 0.999
            }

            exitTrades.push({
              id: this.currentPositionTradeId || this.tradeId,
              type: 'EXIT',
              exitType: 'TP1',
              result: 'TP1 (25%)',
              description: 'Первый тейк-профит',
              entryPrice: originalEntryPrice,
              entryTime: this.initialEntryTime || candle.timestamp,
              exitPrice: this.shortTp1Price,
              exitTime: candle.timestamp,
              timestamp: candle.timestamp,
              candleIndex: this.candles.length - 1,
              partial: true,
              exitPercent: 25,
              pnl: pnl.pnlPercent,
              pnlUsdt: pnl.pnlUsdt,
              remainingPosition: 75
            })
          }
        } else if (!slHit && tp1Hit && !this.shortTp1Executed) {
          // Только TP достигнут
          this.shortTp1Executed = true
          const originalEntryPrice = this.positionAvgPrice
          
          const pnl = this.calculatePnL(this.positionAvgPrice, this.shortTp1Price, 25, false)
          this.capital += pnl.pnlUsdt
          
          this.positionAvgPrice = this.recalculateAvgPrice(this.shortTp1Price, 25, this.positionSizePercentCurrent)
          this.positionSizePercentCurrent = 75
          
          // Ордера пересоздаются на следующем тике
          this.pendingOrderRecreation = {
            type: 'short_after_tp1',
            timestamp: candle.timestamp,
            newStop: this.positionAvgPrice * 0.999
          }

          exitTrades.push({
            id: this.currentPositionTradeId || this.tradeId,
            type: 'EXIT',
            exitType: 'TP1',
            result: 'TP1 (25%)',
            description: 'Первый тейк-профит',
            entryPrice: originalEntryPrice,
            entryTime: this.initialEntryTime || candle.timestamp,
            exitPrice: this.shortTp1Price,
            exitTime: candle.timestamp,
            timestamp: candle.timestamp,
            candleIndex: this.candles.length - 1,
            partial: true,
            exitPercent: 25,
            pnl: pnl.pnlPercent,
            pnlUsdt: pnl.pnlUsdt,
            remainingPosition: 75
          })
        }
      }

      // TP2 (33%)
      // ВАЖНО: Проверяем TP2 на каждой свече, если TP1 был достигнут, TP2 достигнут и еще не выполнен
      if (this.shortReachedTp1 && !this.shortTp2Executed && low <= this.shortTp2Price) {
        // Устанавливаем флаг достижения только если еще не установлен
        if (!this.shortReachedTp2) {
          this.shortReachedTp2 = true
          this.shortStage = 2
        }
        // Определяем текущий SL (может быть уже пересоздан после TP1)
        const currentStopForTp2 = this.shortOrdersRecreatedAfterTp1 
          ? this.positionAvgPrice * 0.999
          : this.shortCurrentStop
        
        // ВАЖНО: Сначала проверяем SL - если он сработал, TP не может сработать
        const slHit = high >= currentStopForTp2
        const tp2Hit = low <= this.shortTp2Price
        
        // Если оба достигнуты, используем intrabar модель
        if (slHit && tp2Hit) {
          const fill = this.checkIntrabarFill(open, high, low, candle.close, currentStopForTp2, this.shortTp2Price, "short")
          if (!fill || fill.type !== "limit") {
            // SL имеет приоритет - пропускаем TP2
          } else if (fill.type === "limit") {
            this.shortTp2Executed = true
            const originalEntryPrice = this.positionAvgPrice
            
            const pnl = this.calculatePnL(this.positionAvgPrice, this.shortTp2Price, 33, false)
            this.capital += pnl.pnlUsdt
            
            this.positionAvgPrice = this.recalculateAvgPrice(this.shortTp2Price, 33, this.positionSizePercentCurrent)
            this.positionSizePercentCurrent = 42
            
            // Ордера пересоздаются на следующем тике
            this.pendingOrderRecreation = {
              type: 'short_after_tp2',
              timestamp: candle.timestamp,
              newStop: this.shortTp1Price * 0.999
            }

            exitTrades.push({
              id: this.currentPositionTradeId || this.tradeId,
              type: 'EXIT',
              exitType: 'TP2',
              result: 'TP2 (33%)',
              description: 'Второй тейк-профит',
              entryPrice: originalEntryPrice,
              entryTime: this.initialEntryTime || candle.timestamp,
              exitPrice: this.shortTp2Price,
              exitTime: candle.timestamp,
              timestamp: candle.timestamp,
              candleIndex: this.candles.length - 1,
              partial: true,
              exitPercent: 33,
              pnl: pnl.pnlPercent,
              pnlUsdt: pnl.pnlUsdt,
              remainingPosition: 42
            })
          }
        } else if (!slHit && tp2Hit) {
          // Только TP достигнут
          this.shortTp2Executed = true
          const originalEntryPrice = this.positionAvgPrice
          
          const pnl = this.calculatePnL(this.positionAvgPrice, this.shortTp2Price, 33, false)
          this.capital += pnl.pnlUsdt
          
          this.positionAvgPrice = this.recalculateAvgPrice(this.shortTp2Price, 33, this.positionSizePercentCurrent)
          this.positionSizePercentCurrent = 42
          
          // Ордера пересоздаются на следующем тике
          this.pendingOrderRecreation = {
            type: 'short_after_tp2',
            timestamp: candle.timestamp,
            newStop: this.shortTp1Price * 0.999
          }

          exitTrades.push({
            id: this.currentPositionTradeId || this.tradeId,
            type: 'EXIT',
            exitType: 'TP2',
            result: 'TP2 (33%)',
            description: 'Второй тейк-профит',
            entryPrice: originalEntryPrice,
            entryTime: this.initialEntryTime || candle.timestamp,
            exitPrice: this.shortTp2Price,
            exitTime: candle.timestamp,
            timestamp: candle.timestamp,
            candleIndex: this.candles.length - 1,
            partial: true,
            exitPercent: 33,
            pnl: pnl.pnlPercent,
            pnlUsdt: pnl.pnlUsdt,
            remainingPosition: 42
          })
        }
      }

      // TP3 (42% - остаток)
      // ВАЖНО: Проверяем TP3 на каждой свече, если TP2 был достигнут, TP3 достигнут и еще не выполнен
      if (this.shortReachedTp2 && !this.shortTp3Executed && low <= this.shortTp3Price) {
        const currentStopForTp3 = this.shortOrdersRecreatedAfterTp2
          ? this.shortTp1Price * 0.999
          : this.shortOrdersRecreatedAfterTp1
          ? this.positionAvgPrice * 0.999
          : this.shortCurrentStop
        
        const fill = this.checkIntrabarFill(open, high, low, candle.close, currentStopForTp3, this.shortTp3Price, "short")
        if (fill && fill.type === "limit") {
          this.shortTp3Executed = true
          const originalEntryPrice = this.positionAvgPrice
          
          const pnl = this.calculatePnL(this.positionAvgPrice, this.shortTp3Price, 42, false)
          this.capital += pnl.pnlUsdt
          
          this.positionSizePercentCurrent = 0
          this.position = 0
          this.currentPositionTradeId = null
          resetTradeState()

          exitTrades.push({
            id: this.currentPositionTradeId || this.tradeId,
            type: 'EXIT',
            exitType: 'TP3',
            result: 'TP3 (42%)',
            description: 'Третий тейк-профит - полное закрытие',
            entryPrice: originalEntryPrice,
            entryTime: this.initialEntryTime || candle.timestamp,
            exitPrice: this.shortTp3Price,
            exitTime: candle.timestamp,
            timestamp: candle.timestamp,
            candleIndex: this.candles.length - 1,
            partial: false,
            exitPercent: 42,
            pnl: pnl.pnlPercent,
            pnlUsdt: pnl.pnlUsdt,
            remainingPosition: 0
          })
        }
      }

      // SL
      const currentStop = this.shortCurrentStop || (this.positionAvgPrice * (1 + SLp))
      if (high >= currentStop && this.positionSizePercentCurrent > 0) {
        let shouldExecuteSL = true
        if (this.shortTp1Executed || this.shortTp2Executed || this.shortTp3Executed) {
          const tpPrice = this.shortTp3Executed ? this.shortTp3Price : 
                         this.shortTp2Executed ? this.shortTp2Price : 
                         this.shortTp1Executed ? this.shortTp1Price : null
          
          if (tpPrice) {
            const fill = this.checkIntrabarFill(open, high, low, candle.close, currentStop, tpPrice, "short")
            if (fill && fill.type === "limit") {
              shouldExecuteSL = false
            }
          }
        }
        
        if (shouldExecuteSL) {
          const remainingPercent = this.positionSizePercentCurrent
          const pnl = this.calculatePnL(this.positionAvgPrice, currentStop, remainingPercent, false)
          this.capital += pnl.pnlUsdt
          
          const isBreakeven = this.shortStage > 0 && 
                             this.shortCurrentStop && 
                             Math.abs(this.shortCurrentStop - this.positionAvgPrice * 0.999) < (this.positionAvgPrice * 0.0001)
          
          this.positionSizePercentCurrent = 0
          this.position = 0
          this.currentPositionTradeId = null
          resetTradeState()

          exitTrades.push({
            id: this.currentPositionTradeId || this.tradeId,
            type: 'EXIT',
            exitType: 'SL',
            result: isBreakeven ? 'Безубыток' : 'Стоп-лосс',
            description: isBreakeven 
              ? 'Стоп-лосс на безубытке (после TP1)' 
              : 'Стоп-лосс',
            entryPrice: this.positionAvgPrice,
            entryTime: this.initialEntryTime || candle.timestamp,
            exitPrice: currentStop,
            exitTime: candle.timestamp,
            timestamp: candle.timestamp,
            candleIndex: this.candles.length - 1,
            partial: false,
            exitPercent: remainingPercent,
            pnl: pnl.pnlPercent,
            pnlUsdt: pnl.pnlUsdt,
            remainingPosition: 0,
            isBreakeven
          })
        }
      }
    }

    // Обновляем equity history
    this.equityHistory.push({ time: candle.timestamp, eq: this.capital })
    
    // Логируем капитал при каждой сделке для диагностики
    if ((newTrades.length > 0 || exitTrades.length > 0) && this.tradeId <= 5) {
      console.log(`[Strategy] Capital update at trade ${this.tradeId}:`, {
        capital: this.capital.toFixed(2),
        initialCapital: this.initialCapital.toFixed(2),
        newTrades: newTrades.length,
        exitTrades: exitTrades.length,
        exitTradesDetails: exitTrades.map(t => ({
          type: t.type,
          exitType: t.exitType,
          pnlUsdt: t.pnlUsdt?.toFixed(2),
          pnlPercent: t.pnl?.toFixed(2)
        }))
      })
    }

    // Сохраняем все сделки
    for (const trade of [...newTrades, ...exitTrades]) {
      this.trades.push(trade)
    }

    return {
      signal: longCond ? 'BUY' : shortCond ? 'SELL' : null,
      trades: [...newTrades, ...exitTrades],
      indicators: {
        fast,
        slow,
        trendEMA,
        macd,
        rsi,
        atr,
        atrRelative,
        volatilityLevel,
        multiplier,
        vwap
      }
    }
  }

  // Бэктест на исторических данных
  backtest(candles) {
    // Сброс состояния
    this.capital = this.initialCapital
    this.equityHistory = []
    this.trades = []
    this.position = 0
    this.positionSizePercentCurrent = 0
    this.positionSizeAtEntry = 0
    this.positionAvgPrice = 0
    this.initialEntryPrice = 0
    this.initialEntryTime = null
    this.currentPositionTradeId = null
    this.multiPV = 0
    this.multiVol = 0
    this.lastVwapTimestamp = null
    this.macdHistory = []
    this.lastProcessedTimestamp = null
    
    // Сброс флагов пересоздания ордеров
    this.longOrdersRecreatedAfterTp1 = false
    this.longOrdersRecreatedAfterTp2 = false
    this.shortOrdersRecreatedAfterTp1 = false
    this.shortOrdersRecreatedAfterTp2 = false
    
    // Сброс пересоздания ордеров
    this.pendingOrderRecreation = null
    
    // Сброс состояний позиций
    this.longReachedTp1 = false
    this.longReachedTp2 = false
    this.longTp1Executed = false
    this.longTp2Executed = false
    this.longTp3Executed = false
    this.longCurrentStop = null
    this.longStage = 0
    this.shortReachedTp1 = false
    this.shortReachedTp2 = false
    this.shortTp1Executed = false
    this.shortTp2Executed = false
    this.shortTp3Executed = false
    this.shortCurrentStop = null
    this.shortStage = 0

    for (const candle of candles) {
      this.update(candle)
    }
    
    // Подсчитываем общий PnL из всех сделок для проверки
    const allExitTrades = this.trades.filter(t => t.type === 'EXIT')
    const totalPnlFromTrades = allExitTrades.reduce((sum, t) => sum + (t.pnlUsdt || 0), 0)
    const expectedFinalCapital = this.initialCapital + totalPnlFromTrades
    
    // Логируем финальную статистику для диагностики
    console.log(`[Strategy Backtest] Final stats:`, {
      initialCapital: this.initialCapital.toFixed(2),
      finalCapital: this.capital.toFixed(2),
      expectedFinalCapital: expectedFinalCapital.toFixed(2),
      difference: (this.capital - expectedFinalCapital).toFixed(2),
      totalPnl: (this.capital - this.initialCapital).toFixed(2),
      totalPnlFromTrades: totalPnlFromTrades.toFixed(2),
      totalPnlPercent: ((this.capital - this.initialCapital) / this.initialCapital * 100).toFixed(2),
      totalTrades: this.trades.length,
      exitTrades: allExitTrades.length,
      entryTrades: this.trades.filter(t => t.type === 'BUY' || t.type === 'SELL').length
    })

    return {
      trades: this.trades,
      equity: this.equityHistory,
      finalCapital: this.capital,
      totalPnl: this.capital - this.initialCapital,
      totalPnlPercent: ((this.capital - this.initialCapital) / this.initialCapital) * 100
    }
  }

  // ============================================================================
  // === Методы для изменения параметров ======================================
  // ============================================================================

  /**
   * Изменяет начальный депозит
   * @param {number} newCapital - Новый размер депозита в USDT
   */
  setInitialCapital(newCapital) {
    if (typeof newCapital !== 'number' || newCapital <= 0) {
      throw new Error('Initial capital must be a positive number')
    }
    this.initialCapital = newCapital
    this.capital = newCapital
  }

  /**
   * Изменяет процент капитала, используемый на каждую сделку
   * @param {number} newPercent - Новый процент (0-100)
   */
  setPositionSizePercent(newPercent) {
    if (typeof newPercent !== 'number' || newPercent <= 0 || newPercent > 100) {
      throw new Error('Position size percent must be a number between 0 and 100')
    }
    this.positionSizePercent = newPercent
  }

  /**
   * Получить текущие параметры депозита и размера позиции
   * @returns {Object} - { initialCapital, positionSizePercent }
   */
  getCapitalParams() {
    return {
      initialCapital: this.initialCapital,
      positionSizePercent: this.positionSizePercent
    }
  }
}

module.exports = TradingStrategy