import React, { useState, useEffect, useLayoutEffect, useRef } from 'react'
import Head from 'next/head'
import Navigation from '../components/navigation'
import Footer from '../components/footer'

// Маппинг монет к таймфреймам
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

// Все доступные монеты
const ALL_COINS = [
  'LINKUSDT', 'AVAXUSDT', 'SOLUSDT', 'TIAUSDT', 'HBARUSDT', // 1h
  'BTCUSDT', 'AAVEUSDT', 'INJUSDT', 'ADAUSDT', 'BNBUSDT', 'DOTUSDT' // 4h
]

const Details = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)
  const [selectedCoin, setSelectedCoin] = useState('BTCUSDT')
  const [selectedPeriod, setSelectedPeriod] = useState('7')
  const chartContainerRef = useRef(null)
  const chartRef = useRef(null)
  const candlestickSeriesRef = useRef(null)
  const dataRef = useRef(null)

  const periods = [
    { value: '7', label: '7 дней' },
    { value: '30', label: '30 дней' },
    { value: '90', label: '3 месяца' },
    { value: 'all', label: 'Все время' }
  ]

  // Автоматическое определение таймфрейма по монете
  const getTimeframeForCoin = (coin) => {
    return COIN_TIMEFRAMES[coin] || '4h'
  }

  // Получение сделок для графика (исключая текущую открытую позицию)
  const getTradesForChart = (dataToUse = data) => {
    if (!dataToUse || !dataToUse.trades) return []
    
    // Фильтруем сделки - показываем все кроме текущей открытой
    let trades = [...dataToUse.trades]
    
    // Если есть открытая позиция, убираем последнюю сделку
    if (dataToUse.strategy && dataToUse.strategy.position !== 0 && trades.length > 0) {
      trades = trades.slice(0, -1)
    }
    
    return trades
  }

  // Функция обновления данных графика
  const updateChartData = (dataToUpdate, candlestickSeries, chart) => {
    if (!dataToUpdate || !candlestickSeries || !chart) {
      console.log('updateChartData: missing params', { dataToUpdate: !!dataToUpdate, candlestickSeries: !!candlestickSeries, chart: !!chart })
      return
    }

    if (!dataToUpdate.candles || dataToUpdate.candles.length === 0) {
      console.log('updateChartData: no candles data')
      return
    }

    console.log('updateChartData: updating chart with', dataToUpdate.candles.length, 'candles')

    // Форматируем данные для lightweight-charts
    const chartData = dataToUpdate.candles.map(candle => {
      // lightweight-charts версия 5.0 использует Unix timestamp в секундах как число
      let time = candle.timestamp
      // Если timestamp в миллисекундах, конвертируем в секунды
      if (time > 1000000000000) {
        time = Math.floor(time / 1000)
      } else if (time < 1000000000) {
        // Если уже в секундах, оставляем как есть
        time = time
      }
      
      return {
        time: time,
        open: parseFloat(candle.open),
        high: parseFloat(candle.high),
        low: parseFloat(candle.low),
        close: parseFloat(candle.close),
      }
    }).filter(c => c.time && c.time > 0 && !isNaN(c.open) && !isNaN(c.high) && !isNaN(c.low) && !isNaN(c.close))

    console.log('updateChartData: formatted data', chartData.length, 'candles', chartData.slice(0, 3))

    if (chartData.length === 0) {
      console.error('updateChartData: no valid candles after formatting')
      return
    }

    try {
      console.log('updateChartData: calling setData with', chartData.length, 'candles')
      console.log('updateChartData: first candle sample', chartData[0])
      console.log('updateChartData: last candle sample', chartData[chartData.length - 1])
      
      candlestickSeries.setData(chartData)
      console.log('updateChartData: setData called successfully')

      // Добавляем отметки входов стратегии
      const trades = getTradesForChart(dataToUpdate)
      console.log('updateChartData: trades', trades.length)
      
      if (trades.length > 0) {
        const markers = trades.map(trade => {
          const candle = dataToUpdate.candles[trade.candleIndex]
          if (!candle) return null
          
          let candleTime = candle.timestamp
          // Конвертируем в секунды если нужно
          if (candleTime > 1000000000000) {
            candleTime = Math.floor(candleTime / 1000)
          }
          
          if (!candleTime || candleTime <= 0) return null
          
          return {
            time: candleTime,
            position: trade.type === 'BUY' ? 'belowBar' : 'aboveBar',
            color: trade.type === 'BUY' ? '#9bff00' : '#ff6b6b',
            shape: trade.type === 'BUY' ? 'arrowUp' : 'arrowDown',
            text: trade.type,
            size: 1,
          }
        }).filter(m => m !== null)

        console.log('updateChartData: markers', markers.length)
        if (markers.length > 0) {
          candlestickSeries.setMarkers(markers)
          console.log('updateChartData: markers set successfully')
        }
      }

      // Масштабируем график
      console.log('updateChartData: calling fitContent')
      chart.timeScale().fitContent()
      console.log('updateChartData: chart updated successfully')
    } catch (error) {
      console.error('updateChartData: error updating chart', error)
      console.error('updateChartData: error stack', error.stack)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedCoin, selectedPeriod])

  // Инициализация графика
  useLayoutEffect(() => {
    console.log('Chart init useLayoutEffect: starting, container ref:', !!chartContainerRef.current)
    
    // Если график уже инициализирован, не делаем ничего
    if (chartRef.current) {
      console.log('Chart already initialized, skipping')
      return
    }
    
    let chartInstance = null
    let candlestickSeriesInstance = null
    let resizeHandler = null
    let isMounted = true

    const initChart = async () => {
      // Ждем пока контейнер появится в DOM
      let attempts = 0
      while ((!chartContainerRef.current || chartContainerRef.current.clientWidth === 0) && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 100))
        attempts++
      }

      if (!chartContainerRef.current) {
        console.error('Chart init: container ref not found after waiting')
        return
      }

      if (!isMounted) {
        console.log('Chart init: component unmounted, aborting')
        return
      }

      console.log('Chart init: container found, importing lightweight-charts...', {
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight
      })
      
      try {
        // Динамический импорт lightweight-charts (только на клиенте)
        const lightweightCharts = await import('lightweight-charts')
        const { createChart, ColorType } = lightweightCharts
        console.log('Chart init: lightweight-charts imported successfully', {
          hasCreateChart: typeof createChart === 'function',
          chartMethods: Object.keys(lightweightCharts)
        })
        
        if (!isMounted || !chartContainerRef.current) {
          console.log('Chart init: component unmounted or container lost after import')
          return
        }

        const containerWidth = chartContainerRef.current.clientWidth || 800
        console.log('Chart init: creating chart...', {
          containerWidth,
          containerHeight: chartContainerRef.current.clientHeight
        })
        
        // Создаем график
        const chart = createChart(chartContainerRef.current, {
          width: containerWidth,
          height: 600,
          layout: {
            background: { type: ColorType.Solid, color: '#050507' },
            textColor: '#9da3a8',
          },
          grid: {
            vertLines: { color: 'rgba(255, 255, 255, 0.1)' },
            horzLines: { color: 'rgba(255, 255, 255, 0.1)' },
          },
          timeScale: {
            timeVisible: true,
            secondsVisible: false,
          },
        })

        console.log('Chart init: chart created', {
          chartType: typeof chart,
          chartMethods: Object.keys(chart).filter(m => m.toLowerCase().includes('add') || m.toLowerCase().includes('series'))
        })
        
        console.log('Chart init: adding candlestick series...')
        // Создаем серию свечей
        // В lightweight-charts v5 используется addCandlestickSeries
        let candlestickSeries
        try {
          // Проверяем все возможные способы
          if (chart.addCandlestickSeries) {
            console.log('Using addCandlestickSeries method')
            candlestickSeries = chart.addCandlestickSeries({
              upColor: '#9bff00',
              downColor: '#ff6b6b',
              borderVisible: false,
              wickUpColor: '#9bff00',
              wickDownColor: '#ff6b6b',
            })
          } else if (chart.addSeries) {
            console.log('Using addSeries method')
            candlestickSeries = chart.addSeries('Candlestick', {
              upColor: '#9bff00',
              downColor: '#ff6b6b',
              borderVisible: false,
              wickUpColor: '#9bff00',
              wickDownColor: '#ff6b6b',
            })
          } else {
            // Пробуем через прототип или другой способ
            console.log('Trying alternative method, available methods:', Object.keys(chart).filter(k => k.includes('add') || k.includes('series')))
            // В v5 может быть другой способ
            const SeriesApi = lightweightCharts.SeriesApi || lightweightCharts.SeriesType
            if (SeriesApi) {
              candlestickSeries = chart.addSeries(SeriesApi.Candlestick || 'Candlestick', {
                upColor: '#9bff00',
                downColor: '#ff6b6b',
                borderVisible: false,
                wickUpColor: '#9bff00',
                wickDownColor: '#ff6b6b',
              })
            } else {
              throw new Error('Cannot find method to add candlestick series. Chart methods: ' + Object.keys(chart).slice(0, 20).join(', '))
            }
          }
        } catch (err) {
          console.error('Error creating candlestick series:', err)
          console.error('Chart object:', chart)
          console.error('Available methods:', Object.keys(chart))
          throw err
        }

        console.log('Chart init: candlestick series created', {
          chart: !!chart,
          candlestickSeries: !!candlestickSeries
        })

        if (!isMounted) {
          chart.remove()
          return
        }

        chartInstance = chart
        candlestickSeriesInstance = candlestickSeries
        chartRef.current = chart
        candlestickSeriesRef.current = candlestickSeries

        console.log('Chart initialized, candlestickSeries ready', {
          chartRef: !!chartRef.current,
          candlestickSeriesRef: !!candlestickSeriesRef.current
        })

        // Обработка изменения размера
        resizeHandler = () => {
          if (chartContainerRef.current && chart) {
            chart.applyOptions({
              width: chartContainerRef.current.clientWidth,
            })
          }
        }

        window.addEventListener('resize', resizeHandler)

        // Если данные уже загружены, обновляем график
        setTimeout(() => {
          if (!isMounted) return
          const currentData = dataRef.current
          console.log('Chart init: checking for data after init', {
            hasData: !!currentData,
            candlesCount: currentData?.candles?.length
          })
          if (currentData && currentData.candles && currentData.candles.length > 0) {
            console.log('Chart ready, data available, updating chart with', currentData.candles.length, 'candles')
            updateChartData(currentData, candlestickSeries, chart)
          } else {
            console.log('Chart ready, but no data yet')
          }
        }, 500)
      } catch (err) {
        console.error('Error loading lightweight-charts:', err)
        if (isMounted) {
          setError('Ошибка загрузки библиотеки графиков: ' + err.message)
        }
      }
    }

    initChart()

    return () => {
      console.log('Chart init: cleanup')
      isMounted = false
      if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler)
      }
      if (chartInstance) {
        chartInstance.remove()
      }
      chartRef.current = null
      candlestickSeriesRef.current = null
    }
  }, [])

  // Обновление данных графика
  useEffect(() => {
    console.log('useEffect data: triggered', {
      hasData: !!data,
      candlesCount: data?.candles?.length || 0,
      hasCandlestickSeries: !!candlestickSeriesRef.current,
      hasChart: !!chartRef.current
    })

    if (!data || !data.candles || data.candles.length === 0) {
      console.log('useEffect data: no data yet or empty candles')
      return
    }

    // Обновляем dataRef сразу
    dataRef.current = data
    console.log('useEffect data: dataRef updated with', data.candles.length, 'candles')
    
    const updateChart = () => {
      if (!candlestickSeriesRef.current || !chartRef.current) {
        console.log('useEffect data: chart not ready', {
          hasCandlestickSeries: !!candlestickSeriesRef.current,
          hasChart: !!chartRef.current
        })
        return false
      }
      const currentData = dataRef.current
      if (!currentData || !currentData.candles || currentData.candles.length === 0) {
        console.log('useEffect data: no data in dataRef')
        return false
      }
      console.log('useEffect data: updating chart with data', currentData.candles.length, 'candles')
      updateChartData(currentData, candlestickSeriesRef.current, chartRef.current)
      return true
    }

    // Пытаемся обновить сразу
    if (!updateChart()) {
      // Если не получилось, повторяем попытки
      let attempts = 0
      const maxAttempts = 20
      const interval = setInterval(() => {
        attempts++
        console.log(`useEffect data: retry attempt ${attempts}/${maxAttempts}`)
        if (updateChart() || attempts >= maxAttempts) {
          clearInterval(interval)
          if (attempts >= maxAttempts) {
            console.error('Failed to update chart after', maxAttempts, 'attempts')
          } else {
            console.log('useEffect data: chart updated successfully after retry')
          }
        }
      }, 300)
      
      return () => clearInterval(interval)
    } else {
      console.log('useEffect data: chart updated successfully immediately')
    }
  }, [data])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const timeframe = getTimeframeForCoin(selectedCoin)
      console.log('fetchData: starting', { selectedCoin, timeframe, selectedPeriod })

      // Расчет времени для периода
      let startTime = null
      const endTime = Date.now()
      
      if (selectedPeriod !== 'all' && !isNaN(parseInt(selectedPeriod))) {
        const days = parseInt(selectedPeriod)
        startTime = endTime - (days * 24 * 60 * 60 * 1000)
      }

      const params = new URLSearchParams({
        symbol: selectedCoin,
        timeframe: timeframe,
        limit: '500',
        ...(startTime && { startTime: startTime.toString(), endTime: endTime.toString() })
      })

      console.log('fetchData: fetching from API', `/api/trading/data?${params}`)
      const response = await fetch(`/api/trading/data?${params}`)
      console.log('fetchData: response status', response.status)
      
      const result = await response.json()
      console.log('fetchData: response data', { 
        success: result.success, 
        candlesCount: result.candles?.length,
        tradesCount: result.trades?.length,
        error: result.error 
      })

      if (result.success) {
        console.log('fetchData: setting data', result.candles?.length, 'candles')
        dataRef.current = result
        setData(result)
      } else {
        console.error('fetchData: API error', result.error)
        setError(result.error || 'Ошибка загрузки данных')
      }
    } catch (err) {
      console.error('fetchData: exception', err)
      setError('Не удалось загрузить данные: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Статистика торговли — VEXTR</title>
        <meta name="description" content="Детальная статистика торгового бота VEXTR с графиками и анализом" />
      </Head>
      <Navigation></Navigation>
      <main style={{ paddingTop: 100, minHeight: '80vh' }}>
        <section className="performance" style={{ padding: 'var(--section-gap) var(--spacing-2xl)' }}>
          <div className="performance__container">
            <header className="performance__header">
              <h1 className="section-title">
                Статистика торговли
              </h1>
              <p className="section-subtitle">
                График и детальная статистика работы торгового бота
              </p>
            </header>

            {/* Селекторы */}
            <div style={{ 
              display: 'flex', 
              gap: '1rem', 
              flexWrap: 'wrap',
              marginBottom: '2rem',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem',
                  color: 'var(--color-on-surface-secondary)',
                  fontSize: '0.9rem'
                }}>
                  Монета:
                </label>
                <select
                  value={selectedCoin}
                  onChange={(e) => setSelectedCoin(e.target.value)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--border-radius-md)',
                    border: '1px solid var(--glass-border)',
                    background: 'var(--glass-bg)',
                    color: 'var(--color-on-surface)',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    minWidth: '150px'
                  }}
                >
                  {ALL_COINS.map(coin => (
                    <option key={coin} value={coin}>{coin}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem',
                  color: 'var(--color-on-surface-secondary)',
                  fontSize: '0.9rem'
                }}>
                  Период:
                </label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--border-radius-md)',
                    border: '1px solid var(--glass-border)',
                    background: 'var(--glass-bg)',
                    color: 'var(--color-on-surface)',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    minWidth: '150px'
                  }}
                >
                  {periods.map(period => (
                    <option key={period.value} value={period.value}>{period.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ 
                padding: '0.75rem 1rem',
                borderRadius: 'var(--border-radius-md)',
                border: '1px solid var(--glass-border)',
                background: 'rgba(155, 255, 0, 0.1)',
                color: 'var(--color-primary)',
                fontSize: '0.9rem'
              }}>
                Таймфрейм: {getTimeframeForCoin(selectedCoin)}
              </div>
            </div>

            {loading && (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <p className="section-subtitle">Загрузка данных...</p>
              </div>
            )}

            {error && (
              <div className="glass-main" style={{ textAlign: 'center', padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
                <h2 className="section-title" style={{ color: '#ff6b6b' }}>Ошибка</h2>
                <p className="section-subtitle">{error}</p>
                <button 
                  onClick={fetchData}
                  className="btn-primary btn"
                  style={{ marginTop: '1rem' }}
                >
                  Попробовать снова
                </button>
              </div>
            )}

            {/* Временное сообщение о работе */}
            <div className="performance__panel" style={{ 
              marginBottom: '2rem', 
              textAlign: 'center', 
              padding: '4rem 2rem',
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--border-radius-md)'
            }}>
              <h2 className="section-title" style={{ fontSize: '2rem', marginBottom: '1rem' }}>
                🚧 Работа над графиком
              </h2>
              <p className="section-subtitle" style={{ fontSize: '1.2rem', opacity: 0.8 }}>
                Мы работаем над улучшением отображения графика. Скоро здесь появится интерактивный график с японскими свечами и всеми сделками стратегии.
              </p>
            </div>

            {/* График с японскими свечами - скрыт пока идет работа */}
            <div className="performance__panel" style={{ marginBottom: '2rem', display: 'none' }}>
              <div 
                ref={chartContainerRef}
                style={{ 
                  width: '100%', 
                  height: '600px',
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--border-radius-md)',
                  padding: '1rem'
                }}
              />
            </div>

            {!loading && !error && (
              <>

                {/* Статистика */}
                {data && data.statistics && (
                  <div className="performance__panel">
                    <h2 className="section-title" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>
                      Статистика
                    </h2>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '1rem'
                    }}>
                      <div className="performance-card">
                        <div className="performance-card__content">
                          <div className="metric-bg">
                            <h3 className="performance-card__value">
                              {data.statistics.totalTrades}
                            </h3>
                            <p className="performance-card__label">Всего сделок</p>
                          </div>
                        </div>
                      </div>
                      <div className="performance-card">
                        <div className="performance-card__content">
                          <div className="metric-bg">
                            <h3 className="performance-card__value" style={{ color: '#9bff00' }}>
                              {data.statistics.winRate}%
                            </h3>
                            <p className="performance-card__label">Win Rate</p>
                          </div>
                        </div>
                      </div>
                      <div className="performance-card">
                        <div className="performance-card__content">
                          <div className="metric-bg">
                            <h3 className="performance-card__value">
                              {data.statistics.maxDrawdown}%
                            </h3>
                            <p className="performance-card__label">Макс. просадка</p>
                          </div>
                        </div>
                      </div>
                      <div className="performance-card">
                        <div className="performance-card__content">
                          <div className="metric-bg">
                            <h3 className="performance-card__value">
                              {data.statistics.currentEquity}
                            </h3>
                            <p className="performance-card__label">Текущий капитал</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
      <Footer></Footer>
    </>
  )
}

export default Details
