import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react'
import Head from 'next/head'
import Navigation from '../components/navigation'
import Footer from '../components/footer'

// Компонент для отображения графика equity curve (волновой график капитала)
const EquityCurveChart = ({ equityCurve, initialEquity, currentEquity, totalPnlPercent }) => {
  const containerRef = useRef(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 })

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth || 800,
          height: 400
        })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  const chartData = useMemo(() => {
    if (!equityCurve || equityCurve.length === 0) return null

    // Нормализуем данные
    const data = equityCurve.map(point => {
      let time = point.time || point.timestamp || 0
      let value = point.value || point.equity || 0

      // Конвертируем время в секунды, если оно в миллисекундах
      if (time > 1e12) {
        time = Math.floor(time / 1000)
      }

      return {
        time: Math.floor(time),
        value: parseFloat(value)
      }
    }).filter(p => p.time > 0 && p.value > 0 && !isNaN(p.value) && !isNaN(p.time))

    if (data.length === 0) return null

    // Сортируем по времени
    data.sort((a, b) => a.time - b.time)

    // Определяем начальный капитал из статистики (если передан), иначе из первой точки
    // ВАЖНО: Используем initialEquity из статистики для правильного расчета процентов
    // чтобы они совпадали с totalPnlPercent
    const initialValue = initialEquity || data[0].value
    
    // КРИТИЧЕСКИ ВАЖНО: Используем currentEquity из статистики для финального значения
    // вместо последнего значения из equity curve, чтобы проценты совпадали
    const finalValue = currentEquity || data[data.length - 1].value
    const isPositive = finalValue >= initialValue

    // Рассчитываем проценты для всех точек относительно initialEquity из статистики
    // Но для последней точки используем currentEquity из статистики
    const percentages = data.map((d, index) => {
      // Для последней точки используем currentEquity из статистики, если доступен
      const value = (index === data.length - 1 && currentEquity) ? currentEquity : d.value
      return {
        ...d,
        value: value,
        percent: ((value - initialValue) / initialValue) * 100
      }
    })

    // Определяем диапазон процентов
    // Если totalPnlPercent доступен, учитываем его в диапазоне
    const percentValues = percentages.map(p => p.percent)
    let minPercent = Math.min(...percentValues)
    let maxPercent = Math.max(...percentValues)
    
    // Если totalPnlPercent выходит за пределы, обновляем диапазон
    if (totalPnlPercent !== undefined && totalPnlPercent !== null) {
      if (totalPnlPercent < minPercent) minPercent = totalPnlPercent
      if (totalPnlPercent > maxPercent) maxPercent = totalPnlPercent
    }
    
    // Фиксируем разумный диапазон для оси Y
    // НЕ показываем недостигнутые значения - только реальные minPercent и maxPercent
    // Добавляем минимальный запас только для визуализации (чтобы график не упирался в края)
    let displayMinPercent, displayMaxPercent
    if (minPercent >= 0) {
      // Все значения положительные - 0% внизу, идем вверх
      displayMinPercent = 0
      // Максимум - строго до реального максимума, только минимальный запас для визуализации
      // Если максимум очень маленький (меньше 1%), добавляем небольшой запас, иначе используем реальный максимум
      displayMaxPercent = maxPercent > 0 ? Math.max(maxPercent * 1.02, maxPercent + 0.5) : 1
    } else {
      // Есть отрицательные значения - 0% сверху, идем вниз
      // Используем реальные minPercent и maxPercent, только минимальный запас для визуализации
      displayMinPercent = Math.min(minPercent * 1.02, minPercent - 0.5)
      displayMaxPercent = Math.max(maxPercent * 1.02, maxPercent + 0.5)
      // Если maxPercent положительный, он должен быть наверху (0% на позиции maxPercent)
      // Если maxPercent отрицательный, он тоже должен быть наверху
      // В любом случае, 0% должен быть на позиции displayMaxPercent
    }
    const displayRange = displayMaxPercent - displayMinPercent || 1

    // Подготовка данных для оси X (даты)
    const firstTime = data[0].time
    const lastTime = data[data.length - 1].time
    const timeRange = lastTime - firstTime

    const padding = { top: 20, right: 70, bottom: 60, left: 20 } // Проценты справа, даты внизу
    const chartWidth = dimensions.width - padding.left - padding.right
    const chartHeight = dimensions.height - padding.top - padding.bottom

    // Создаем точки для SVG пути
    // Для последней точки используем totalPnlPercent из статистики, если доступен
    const points = percentages.map((point, index) => {
      const x = padding.left + (index / (percentages.length - 1 || 1)) * chartWidth
      
      // Для последней точки используем totalPnlPercent из статистики
      const pointPercent = (index === percentages.length - 1 && totalPnlPercent !== undefined && totalPnlPercent !== null)
        ? totalPnlPercent
        : point.percent
      
      let y
      if (minPercent >= 0) {
        // Все положительные - 0% внизу, идем вверх
        const yFromBottom = ((pointPercent - displayMinPercent) / displayRange) * chartHeight
        y = padding.top + chartHeight - yFromBottom
      } else {
        // Есть отрицательные - 0% сверху, идем вниз
        // 0% находится на позиции, соответствующей displayMaxPercent
        const zeroPercent = displayMaxPercent
        const yFromTop = ((zeroPercent - pointPercent) / displayRange) * chartHeight
        y = padding.top + yFromTop
      }
      
      return { x, y, value: point.value, percent: pointPercent, time: point.time }
    })

    // Функция для создания сглаженного пути (Catmull-Rom spline)
    const createSmoothPath = (points) => {
      if (points.length < 2) return ''
      
      let path = `M ${points[0].x} ${points[0].y}`
      
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = i > 0 ? points[i - 1] : points[i]
        const p1 = points[i]
        const p2 = points[i + 1]
        const p3 = i < points.length - 2 ? points[i + 2] : points[i + 1]
        
        // Точка контроля для сглаживания
        const cp1x = p1.x + (p2.x - p0.x) / 6
        const cp1y = p1.y + (p2.y - p0.y) / 6
        const cp2x = p2.x - (p3.x - p1.x) / 6
        const cp2y = p2.y - (p3.y - p1.y) / 6
        
        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
      }
      
      return path
    }

    return { 
      points, 
      initialValue, 
      finalValue, 
      isPositive, 
      minPercent, 
      maxPercent, 
      displayMinPercent,
      displayMaxPercent,
      displayRange,
      padding, 
      chartWidth, 
      chartHeight,
      createSmoothPath,
      data, // Сохраняем исходные данные для дат
      firstTime,
      lastTime,
      timeRange,
      hasNegativeValues: minPercent < 0, // Флаг есть ли отрицательные значения
      finalIsPositive: finalValue >= initialValue // Финальное значение положительное
    }
  }, [equityCurve, dimensions.width, initialEquity, currentEquity, totalPnlPercent])

  if (!chartData || !chartData.points || chartData.points.length === 0) {
    return (
      <div 
        ref={containerRef}
        style={{
          width: '100%',
          height: '400px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: 'var(--border-radius-md)',
          border: '1px solid var(--glass-border)'
        }}
      >
        <p style={{ color: 'var(--color-on-surface-secondary)' }}>Нет данных для отображения</p>
      </div>
    )
  }

  const { points, initialValue, finalValue, isPositive, minPercent, maxPercent, displayMinPercent, displayMaxPercent, displayRange, padding, chartWidth, chartHeight, createSmoothPath, data, firstTime, lastTime, timeRange, hasNegativeValues, finalIsPositive } = chartData

  // Цвет графика зависит от того, вырос капитал или упал
  const lineColor = isPositive ? '#9bff00' : '#ff6b6b'
  const gradientId = `equityGradient-${isPositive ? 'green' : 'red'}`

  // Создаем сглаженный путь для линии графика
  const smoothPathData = createSmoothPath(points)

  // Определяем позицию 0% и нижнюю линию для заливки
  // Если есть отрицательные значения - 0% сверху, иначе 0% внизу
  let zeroPercentY, bottomY
  if (!hasNegativeValues) {
    // Все значения положительные - 0% внизу
    zeroPercentY = padding.top + chartHeight
    bottomY = padding.top + chartHeight
  } else {
    // Есть отрицательные значения - 0% сверху
    const zeroPercent = displayMaxPercent
    zeroPercentY = padding.top + ((zeroPercent - 0) / displayRange) * chartHeight
    bottomY = padding.top + chartHeight
  }
  
  // Создаем область под линией (для заливки)
  const areaPath = `${smoothPathData} L ${points[points.length - 1].x} ${bottomY} L ${points[0].x} ${bottomY} Z`

  // Текущее значение - используем totalPnlPercent из статистики, если доступен
  // Это гарантирует совпадение с процентом в карточке
  // Иначе используем процент из последней точки
  const currentPercent = totalPnlPercent !== undefined && totalPnlPercent !== null 
    ? totalPnlPercent 
    : (points[points.length - 1]?.percent || 0)

  // Форматирование для подписей оси Y (проценты)
  // Прошедшие результаты должны оканчиваться на 0 (округляем до целых), текущее может быть не целым
  const formatPercent = (percent, isCurrent = false) => {
    if (percent === 0) return '0,00%'
    const sign = percent >= 0 ? '+' : ''
    // Если это текущее значение, показываем с двумя знаками после запятой
    if (isCurrent) {
      return `${sign}${percent.toFixed(2).replace('.', ',')}%`
    }
    // Иначе округляем до целого (оканчивается на 0)
    return `${sign}${Math.round(percent)},00%`
  }

  // Создаем деления для оси Y (проценты)
  // Динамически определяем шаг в зависимости от максимального значения
  // Если выросли на 6% - показываем 1%, 2%, 3%, 4%, 5%, 6%
  // Если выросли на 900% - показываем 100%, 200%, 300% и т.д.
  const yTickPercentValues = []
  const seenValues = new Set()
  
  if (!hasNegativeValues) {
    // Все значения положительные - от 0% вверх
    // Динамически определяем шаг на основе максимального процента
    let step
    if (maxPercent < 10) {
      // Малые значения (0-10%) - шаг 1%
      step = 1
    } else if (maxPercent < 50) {
      // Средние значения (10-50%) - шаг 5%
      step = 5
    } else if (maxPercent < 200) {
      // Большие значения (50-200%) - шаг 20%
      step = 20
    } else if (maxPercent < 1000) {
      // Очень большие значения (200-1000%) - шаг 100%
      step = 100
    } else {
      // Огромные значения (>1000%) - шаг 200%
      step = 200
    }
    
    // Создаем деления только до реального максимального значения
    // НЕ показываем недостигнутые значения - строго до maxPercent
    const maxToShow = Math.min(
      Math.ceil(maxPercent / step) * step, // Округляем вверх до кратного шага
      maxPercent // НЕ превышаем реальный максимум
    )
    
    // Генерируем деления от 0% до максимального достигнутого значения
    for (let percent = 0; percent <= maxToShow; percent += step) {
      // Показываем только до реального максимального значения (не показываем недостигнутые)
      if (percent <= maxPercent) {
        // Проверяем, что 0% еще не добавлен (избегаем дублирования)
        if (percent === 0 && seenValues.has(0)) {
          continue
        }
        yTickPercentValues.push(percent)
        seenValues.add(percent)
      }
    }
    
    // Добавляем текущее значение, если оно нужно и не целое
    // Используем реальный maxPercent, а не displayMaxPercent
    const shouldShowCurrent = currentPercent >= 0 && currentPercent <= maxPercent
    if (shouldShowCurrent && Math.abs(currentPercent - Math.round(currentPercent)) > 0.01) {
      // Проверяем, не слишком ли близко к уже существующим
      const tooClose = Array.from(seenValues).some(v => Math.abs(v - currentPercent) < (step / 2))
      if (!tooClose) {
        yTickPercentValues.push(currentPercent)
      }
    }
  } else {
    // Есть отрицательные - показываем только реальные достигнутые значения
    // Определяем шаг динамически
    const range = maxPercent - minPercent
    let step
    if (range < 20) {
      step = 5
    } else if (range < 100) {
      step = 20
    } else {
      step = 50
    }
    
    // Округляем до шага, но НЕ выходим за реальные minPercent и maxPercent
    const startPercent = Math.max(
      Math.floor(minPercent / step) * step,
      minPercent // НЕ показываем значения ниже реального минимума
    )
    const endPercent = Math.min(
      Math.ceil(maxPercent / step) * step,
      maxPercent // НЕ показываем значения выше реального максимума
    )
    
    for (let percent = startPercent; percent <= endPercent; percent += step) {
      // Показываем только значения в реальном диапазоне
      if (percent >= minPercent && percent <= maxPercent) {
        yTickPercentValues.push(percent)
        seenValues.add(percent)
      }
    }
    
    // Всегда показываем 0%, если он в диапазоне
    if (minPercent <= 0 && maxPercent >= 0 && !seenValues.has(0)) {
      yTickPercentValues.push(0)
      seenValues.add(0)
    }
    
    // Добавляем текущее значение, если оно нужно и не целое
    // Используем реальные minPercent и maxPercent
    const shouldShowCurrent = currentPercent >= minPercent && currentPercent <= maxPercent
    if (shouldShowCurrent && Math.abs(currentPercent - Math.round(currentPercent)) > 0.01) {
      const tooClose = Array.from(seenValues).some(v => Math.abs(v - currentPercent) < (step / 2))
      if (!tooClose) {
        yTickPercentValues.push(currentPercent)
      }
    }
  }
  
  // Сортируем значения
  yTickPercentValues.sort((a, b) => a - b)

  // Создаем деления для оси X (даты)
  const xTicks = 5
  const xTickTimes = []
  for (let i = 0; i <= xTicks; i++) {
    const time = firstTime + (timeRange / xTicks) * i
    xTickTimes.push(time)
  }

  // Форматирование даты - показываем название месяца
  const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000)
    const monthNames = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ]
    const month = monthNames[date.getMonth()]
    return month
  }

  return (
    <div 
      ref={containerRef}
      style={{
        width: '100%',
        height: '400px',
        background: 'rgba(255, 255, 255, 0.02)',
        borderRadius: 'var(--border-radius-md)',
        border: '1px solid var(--glass-border)',
        padding: '1rem',
        boxSizing: 'border-box'
      }}
    >
      <svg width={dimensions.width} height={dimensions.height} style={{ display: 'block' }}>
        {/* Сетка */}
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.4" />
            <stop offset="50%" stopColor={lineColor} stopOpacity="0.15" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0.05" />
          </linearGradient>
          {/* Фильтр свечения для линии графика */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Горизонтальные линии сетки */}
        {yTickPercentValues.map((percent, index) => {
          let y
          if (!hasNegativeValues) {
            // Все значения положительные - 0% внизу
            y = padding.top + chartHeight - ((percent - displayMinPercent) / displayRange) * chartHeight
          } else {
            // Есть отрицательные значения - 0% сверху
            const zeroPercent = displayMaxPercent
            y = padding.top + ((zeroPercent - percent) / displayRange) * chartHeight
          }
          // Выделяем линию текущего значения
          const isCurrent = Math.abs(percent - currentPercent) < 0.1
          return (
            <line
              key={`grid-${index}`}
              x1={padding.left}
              y1={y}
              x2={padding.left + chartWidth}
              y2={y}
              stroke={isCurrent ? "rgba(155, 255, 0, 0.3)" : "rgba(255, 255, 255, 0.08)"}
              strokeWidth={isCurrent ? "1.5" : "1"}
              strokeDasharray={isCurrent ? "2 2" : "none"}
            />
          )
        })}

        {/* Линия безубытка (0%) - только если есть отрицательные значения */}
        {hasNegativeValues && zeroPercentY >= padding.top && zeroPercentY <= padding.top + chartHeight && (
          <line
            x1={padding.left}
            y1={zeroPercentY}
            x2={padding.left + chartWidth}
            y2={zeroPercentY}
            stroke="rgba(255, 255, 255, 0.3)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        )}

        {/* Вертикальная линия слева */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={padding.top + chartHeight}
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="1"
        />

        {/* Горизонтальная линия снизу */}
        <line
          x1={padding.left}
          y1={padding.top + chartHeight}
          x2={padding.left + chartWidth}
          y2={padding.top + chartHeight}
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="1"
        />

        {/* Область под линией */}
        <path
          d={areaPath}
          fill={`url(#${gradientId})`}
        />

        {/* Сглаженная линия графика */}
        <path
          d={smoothPathData}
          fill="none"
          stroke={lineColor}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#glow)"
        />

        {/* Текущая точка (последняя точка графика) */}
        {points.length > 0 && (() => {
          const lastPoint = points[points.length - 1]
          const currentPercentText = formatPercent(currentPercent, true)
          return (
            <g>
              {/* Внешнее свечение */}
              <circle
                cx={lastPoint.x}
                cy={lastPoint.y}
                r="6"
                fill={lineColor}
                opacity="0.3"
              />
              {/* Среднее свечение */}
              <circle
                cx={lastPoint.x}
                cy={lastPoint.y}
                r="4"
                fill={lineColor}
                opacity="0.5"
              />
              {/* Основная точка */}
              <circle
                cx={lastPoint.x}
                cy={lastPoint.y}
                r="3"
                fill={lineColor}
                stroke="#050507"
                strokeWidth="2"
              />
            </g>
          )
        })()}

        {/* Подписи оси Y (проценты) - справа */}
        {yTickPercentValues.map((percent, index) => {
          let y
          if (!hasNegativeValues) {
            // Все значения положительные - 0% внизу
            y = padding.top + chartHeight - ((percent - displayMinPercent) / displayRange) * chartHeight
          } else {
            // Есть отрицательные значения - 0% сверху
            const zeroPercent = displayMaxPercent
            y = padding.top + ((zeroPercent - percent) / displayRange) * chartHeight
          }
          // Все проценты серые, кроме текущего значения (зеленое)
          const isCurrent = Math.abs(percent - currentPercent) < 0.1
          const color = isCurrent ? '#9bff00' : '#9da3a8'
          return (
            <g key={`y-label-${index}`}>
              {/* Свечение для текущего значения */}
              {isCurrent && (
                <text
                  x={padding.left + chartWidth + 10}
                  y={y + 4}
                  fill="#9bff00"
                  fontSize="13"
                  textAnchor="start"
                  fontWeight="bold"
                  opacity="0.5"
                >
                  {formatPercent(percent, isCurrent)}
                </text>
              )}
              <text
                x={padding.left + chartWidth + 10}
                y={y + 4}
                fill={color}
                fontSize={isCurrent ? "13" : "12"}
                textAnchor="start"
                fontWeight={isCurrent ? 'bold' : (percent === 0 ? 'bold' : 'normal')}
              >
                {formatPercent(percent, isCurrent)}
              </text>
            </g>
          )
        })}


        {/* Подпись с текущим процентом - рендерится последней, чтобы быть поверх других элементов */}
        {points.length > 0 && (() => {
          const lastPoint = points[points.length - 1]
          const currentPercentText = formatPercent(currentPercent, true)
          const labelWidth = currentPercentText.length * 7 + 8
          const labelX = lastPoint.x + 12
          const maxX = padding.left + chartWidth
          
          // Проверяем, не выходит ли подпись за правую границу
          // Если выходит - размещаем слева от точки
          const finalX = (labelX + labelWidth > maxX) 
            ? lastPoint.x - labelWidth - 12  // Слева от точки
            : labelX  // Справа от точки
          
          return (
            <g>
              {/* Фон для текста - полностью зеленый */}
              <rect
                x={finalX}
                y={lastPoint.y - 12}
                width={labelWidth}
                height="20"
                rx="4"
                fill={lineColor}
                stroke={lineColor}
                strokeWidth="1.5"
              />
              {/* Текст с текущим процентом - черный */}
              <text
                x={finalX + 4}
                y={lastPoint.y + 2}
                fill="#000000"
                fontSize="12"
                fontWeight="bold"
                textAnchor="start"
              >
                {currentPercentText}
              </text>
            </g>
          )
        })()}
      </svg>
    </div>
  )
}

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
  const [selectedPeriod, setSelectedPeriod] = useState('30')
  const [isClient, setIsClient] = useState(false)
  const [initialCapital, setInitialCapital] = useState(1000) // Начальный депозит
  const [positionSizePercent, setPositionSizePercent] = useState(50) // Размер позиции в процентах
  const [showSettings, setShowSettings] = useState(false) // Показать/скрыть модальное окно настроек
  const [activeTab, setActiveTab] = useState('report') // Активная вкладка: 'report' или 'history'
  
  // Временные состояния для модального окна настроек
  const [tempSelectedCoin, setTempSelectedCoin] = useState(selectedCoin)
  const [tempInitialCapital, setTempInitialCapital] = useState(initialCapital)
  const [tempPositionSizePercent, setTempPositionSizePercent] = useState(positionSizePercent)
  const [settingsError, setSettingsError] = useState(null) // Ошибка валидации настроек
  const chartContainerRef = useRef(null)
  const chartRef = useRef(null)
  const candlestickSeriesRef = useRef(null)
  const dataRef = useRef(null)
  
  // Убеждаемся, что мы на клиенте (для избежания ошибок гидратации)
  useEffect(() => {
    setIsClient(true)
  }, [])

  const periods = [
    { value: '30', label: 'За 30 дней' },
    { value: '90', label: 'За 3 месяца' },
    { value: '365', label: 'За год' },
    { value: 'all', label: 'За все время' }
  ]

  // Автоматическое определение таймфрейма по монете
  const getTimeframeForCoin = (coin) => {
    return COIN_TIMEFRAMES[coin] || '4h'
  }

  // Получение сделок для графика (новый формат из backtest API)
  const getTradesForChart = (dataToUse = data) => {
    if (!dataToUse || !dataToUse.trades) return []
    
    // Новый формат: сделки уже в правильном виде из backtest API
    // Просто возвращаем все сделки
    return [...dataToUse.trades]
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

    // Форматируем данные для lightweight-charts v5
    const chartData = dataToUpdate.candles.map(candle => {
      // lightweight-charts v5 использует Unix timestamp в секундах как число
      let time = candle.timestamp
      // Если timestamp в миллисекундах, конвертируем в секунды
      if (time > 1000000000000) {
        time = Math.floor(time / 1000)
      }
      // Убеждаемся, что time - это число
      time = Number(time)
      
      return {
        time: time,
        open: parseFloat(candle.open),
        high: parseFloat(candle.high),
        low: parseFloat(candle.low),
        close: parseFloat(candle.close),
      }
    }).filter(c => {
      // Проверяем валидность данных
      return c.time && 
             c.time > 0 && 
             !isNaN(c.time) &&
             !isNaN(c.open) && 
             !isNaN(c.high) && 
             !isNaN(c.low) && 
             !isNaN(c.close) &&
             c.open > 0 &&
             c.high > 0 &&
             c.low > 0 &&
             c.close > 0
    })

    console.log('updateChartData: formatted data', chartData.length, 'candles', chartData.slice(0, 3))

    if (chartData.length === 0) {
      console.error('updateChartData: no valid candles after formatting')
      return
    }

    try {
      console.log('updateChartData: calling setData with', chartData.length, 'candles')
      console.log('updateChartData: first candle sample', chartData[0])
      console.log('updateChartData: last candle sample', chartData[chartData.length - 1])
      
      // Проверяем, что серия существует и валидна
      if (!candlestickSeries) {
        console.error('updateChartData: candlestickSeries is null or undefined')
        return
      }
      
      if (typeof candlestickSeries.setData !== 'function') {
        console.error('updateChartData: setData is not a function on candlestickSeries')
        return
      }
      
      candlestickSeries.setData(chartData)
      console.log('updateChartData: setData called successfully')

      // Добавляем отметки входов и выходов стратегии
      // Получаем сделки в новом формате из backtest API
      const trades = dataToUpdate.trades || []
      console.log('updateChartData: trades', trades.length)
      
      if (trades.length > 0) {
        const markers = []
        
        // Отладочная информация о первых нескольких сделках
        let entryCount = 0
        let exitCount = 0
        trades.forEach(trade => {
          if (trade.exitType === 'ENTRY') entryCount++
          if (trade.exitType && trade.exitType !== 'ENTRY') exitCount++
        })
        console.log('updateChartData: trades breakdown', {
          total: trades.length,
          entries: entryCount,
          exits: exitCount,
          sample: trades.slice(0, 5).map(t => ({
            exitType: t.exitType,
            entryTime: t.entryTime,
            exitTime: t.exitTime,
            type: t.type,
            entryPrice: t.entryPrice
          }))
        })
        
        trades.forEach(trade => {
          // Новый формат: { entryTime, entryPrice, type, exitTime, exitPrice, result, exitType }
          // entryTime и exitTime могут быть в секундах или миллисекундах
          
          const isLong = trade.type === 'long'
          
          // Конвертируем время в секунды, если оно в миллисекундах
          let entryTime = trade.entryTime
          if (entryTime) {
            if (entryTime > 1e12) {
              // Миллисекунды, конвертируем в секунды
              entryTime = Math.floor(entryTime / 1000)
            } else if (entryTime > 0) {
              // Уже в секундах, округляем
              entryTime = Math.floor(entryTime)
            }
          }
          
          let exitTime = trade.exitTime
          if (exitTime) {
            if (exitTime > 1e12) {
              // Миллисекунды, конвертируем в секунды
              exitTime = Math.floor(exitTime / 1000)
            } else if (exitTime > 0) {
              // Уже в секундах, округляем
              exitTime = Math.floor(exitTime)
            }
          }
          
          // Маркер входа (exitType === 'ENTRY')
          // Для входов используем entryTime, даже если он может быть 0 (тогда попробуем найти время из свечей)
          if (trade.exitType === 'ENTRY') {
            let finalEntryTime = entryTime
            
            // Если entryTime равен 0 или отсутствует, попробуем найти время из других полей
            if (!finalEntryTime || finalEntryTime === 0) {
              // Проверяем, может быть время в других полях
              if (trade.timestamp && trade.timestamp > 0) {
                finalEntryTime = trade.timestamp > 1e12 ? Math.floor(trade.timestamp / 1000) : Math.floor(trade.timestamp)
              } else if (trade.time && trade.time > 0) {
                finalEntryTime = trade.time > 1e12 ? Math.floor(trade.time / 1000) : Math.floor(trade.time)
              }
            }
            
            if (finalEntryTime && finalEntryTime > 0) {
              console.log('updateChartData: adding entry marker', {
                finalEntryTime,
                originalEntryTime: trade.entryTime,
                timestamp: trade.timestamp,
                type: trade.type,
                entryPrice: trade.entryPrice
              })
              markers.push({
                time: finalEntryTime,
                position: isLong ? 'belowBar' : 'aboveBar',
                color: isLong ? '#9bff00' : '#ff6b6b',
                shape: isLong ? 'arrowUp' : 'arrowDown',
                text: (isLong ? 'ВХОД LONG' : 'ВХОД SHORT') + (trade.entryPrice ? `\n${trade.entryPrice.toFixed(2)}` : ''),
                size: 2,
              })
            } else {
              console.warn('updateChartData: entry marker skipped - no valid entryTime found', {
                exitType: trade.exitType,
                entryTime: trade.entryTime,
                timestamp: trade.timestamp,
                time: trade.time,
                type: trade.type,
                allKeys: Object.keys(trade)
              })
            }
          }
          
          // Маркер выхода (все типы выходов)
          if (exitTime && trade.exitType && trade.exitType !== 'ENTRY') {
            
            let exitText = ''
            let exitColor = '#9bff00'
            let exitShape = 'circle'
            
            // Определяем тип выхода и форматируем текст
            if (trade.exitType === 'TP1') {
              exitText = 'TP1 (25%)'
              exitColor = '#9bff00'
              exitShape = 'circle'
            } else if (trade.exitType === 'TP2') {
              exitText = 'TP2 (33%)'
              exitColor = '#9bff00'
              exitShape = 'circle'
            } else if (trade.exitType === 'TP3') {
              exitText = 'TP3 (42%)'
              exitColor = '#9bff00'
              exitShape = 'circle'
            } else if (trade.exitType === 'SL') {
              if (trade.isBreakeven) {
                exitText = 'Безубыток'
                exitColor = '#ffd700'
                exitShape = 'diamond'
              } else {
                exitText = 'SL'
                exitColor = '#ff6b6b'
                exitShape = 'square'
              }
            } else {
              // Неизвестный тип выхода
              exitText = trade.exitType || 'Выход'
              exitColor = trade.result > 0 ? '#9bff00' : '#ff6b6b'
              exitShape = trade.result > 0 ? 'circle' : 'square'
            }
            
            // Добавляем цену выхода и P&L
            if (trade.exitPrice) {
              exitText += `\n${trade.exitPrice.toFixed(2)}`
            }
            if (trade.result !== undefined && trade.result !== null) {
              exitText += `\n${trade.result > 0 ? '+' : ''}${trade.result.toFixed(2)} USDT`
            }
            
            markers.push({
              time: exitTime,
              position: trade.result >= 0 ? 'aboveBar' : 'belowBar',
              color: exitColor,
              shape: exitShape,
              text: exitText,
              size: 1.5,
            })
          }
        })

        const entryMarkers = markers.filter(m => m.shape === 'arrowUp' || m.shape === 'arrowDown')
        const exitMarkers = markers.filter(m => m.shape !== 'arrowUp' && m.shape !== 'arrowDown')
        console.log('updateChartData: markers created', {
          total: markers.length,
          entries: entryMarkers.length,
          exits: exitMarkers.length,
          sampleEntry: entryMarkers[0],
          sampleExit: exitMarkers[0]
        })
        if (markers.length > 0) {
          try {
            // В lightweight-charts v5 маркеры устанавливаются через setMarkers
            // Проверяем, что метод существует и серия валидна
            if (candlestickSeries && typeof candlestickSeries.setMarkers === 'function') {
              candlestickSeries.setMarkers(markers)
              console.log('updateChartData: markers set successfully')
            } else {
              console.warn('updateChartData: setMarkers is not available', {
                hasSeries: !!candlestickSeries,
                hasMethod: candlestickSeries ? typeof candlestickSeries.setMarkers : 'no series',
                seriesType: candlestickSeries ? typeof candlestickSeries : 'undefined'
              })
            }
          } catch (markerError) {
            console.error('updateChartData: error setting markers', markerError)
            console.error('updateChartData: marker error details', {
              error: markerError.message,
              markersCount: markers.length,
              sampleMarker: markers[0]
            })
          }
        }
      }


      // Масштабируем график
      console.log('updateChartData: calling fitContent')
      chart.timeScale().fitContent()
      
      // Принудительно обновляем размер графика после обновления данных
      if (chartContainerRef.current && chart) {
        const width = chartContainerRef.current.clientWidth
        const height = chartContainerRef.current.clientHeight
        if (width > 0 && height > 0) {
          // Используем resize() если доступен, иначе applyOptions
          if (typeof chart.resize === 'function') {
            chart.resize(width, 700)
          } else {
            chart.applyOptions({ width })
          }
        }
      }
      
      console.log('updateChartData: chart updated successfully')
    } catch (error) {
      console.error('updateChartData: error updating chart', error)
      console.error('updateChartData: error stack', error.stack)
    }
  }

  // Синхронизация временных состояний при открытии модального окна
  useEffect(() => {
    if (showSettings) {
      setTempSelectedCoin(selectedCoin)
      setTempInitialCapital(initialCapital)
      setTempPositionSizePercent(positionSizePercent)
      setSettingsError(null) // Очищаем ошибку при открытии
    }
  }, [showSettings, selectedCoin, initialCapital, positionSizePercent])

  useEffect(() => {
    fetchData()
  }, [selectedCoin, selectedPeriod, initialCapital, positionSizePercent])

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
    let resizeObserver = null
    let isMounted = true

    const initChart = async () => {
      // Ждем пока контейнер появится в DOM и получит размеры
      let attempts = 0
      while ((!chartContainerRef.current || chartContainerRef.current.clientWidth === 0) && attempts < 50) {
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

      // Дополнительная проверка размера контейнера и его видимости
      let containerWidth = chartContainerRef.current.clientWidth
      let containerHeight = chartContainerRef.current.clientHeight
      
      // Проверяем видимость контейнера
      const containerStyle = window.getComputedStyle(chartContainerRef.current)
      const isVisible = containerStyle.display !== 'none' && 
                        containerStyle.visibility !== 'hidden' &&
                        containerStyle.opacity !== '0'
      
      if (containerWidth === 0 || containerHeight === 0 || !isVisible) {
        console.warn('Chart init: container has zero dimensions or is hidden, waiting a bit more...', {
          width: containerWidth,
          height: containerHeight,
          isVisible,
          display: containerStyle.display,
          visibility: containerStyle.visibility
        })
        await new Promise(resolve => setTimeout(resolve, 200))
        // Повторная проверка
        if (!chartContainerRef.current) {
          console.error('Chart init: container lost after additional wait')
          return
        }
        containerWidth = chartContainerRef.current.clientWidth
        containerHeight = chartContainerRef.current.clientHeight
        if (containerWidth === 0 || containerHeight === 0) {
          console.error('Chart init: container still has zero dimensions after additional wait')
          return
        }
      }

      console.log('Chart init: container found, importing lightweight-charts...', {
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight
      })
      
      try {
        // Динамический импорт lightweight-charts (только на клиенте)
        const lightweightCharts = await import('lightweight-charts')
        const { createChart, ColorType, CandlestickSeries } = lightweightCharts
        console.log('Chart init: lightweight-charts imported successfully', {
          hasCreateChart: typeof createChart === 'function',
          hasCandlestickSeries: typeof CandlestickSeries !== 'undefined',
          chartMethods: Object.keys(lightweightCharts)
        })
        
        if (!isMounted || !chartContainerRef.current) {
          console.log('Chart init: component unmounted or container lost after import')
          return
        }

        const finalContainerWidth = chartContainerRef.current.clientWidth || 800
        console.log('Chart init: creating chart...', {
          containerWidth: finalContainerWidth,
          containerHeight: chartContainerRef.current.clientHeight
        })
        
        // Создаем график
        const chart = createChart(chartContainerRef.current, {
          width: finalContainerWidth,
          height: 700,
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
          rightPriceScale: {
            borderColor: 'rgba(255, 255, 255, 0.1)',
          },
        })

        console.log('Chart init: chart created', {
          chartType: typeof chart,
          chartMethods: Object.keys(chart).filter(m => m.toLowerCase().includes('add') || m.toLowerCase().includes('series'))
        })
        
        console.log('Chart init: adding candlestick series...')
        // Создаем серию свечей
        // В lightweight-charts v5 нужно использовать addSeries с CandlestickSeries
        let candlestickSeries
        try {
          if (!CandlestickSeries) {
            throw new Error('CandlestickSeries not found in lightweight-charts import')
          }
          
          console.log('Using addSeries with CandlestickSeries (v5 API)')
          candlestickSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#9bff00',
            downColor: '#ff6b6b',
            borderVisible: false,
            wickUpColor: '#9bff00',
            wickDownColor: '#ff6b6b',
          })
          console.log('Candlestick series created successfully', {
            seriesType: typeof candlestickSeries,
            hasSetMarkers: typeof candlestickSeries.setMarkers === 'function',
            methods: Object.keys(candlestickSeries).filter(m => m.toLowerCase().includes('marker') || m.toLowerCase().includes('set'))
          })
        } catch (err) {
          console.error('Error creating candlestick series:', err)
          console.error('Error details:', err.message, err.stack)
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

        // Функция для обновления размера графика
        const handleResize = () => {
          if (chartContainerRef.current && chart) {
            const width = chartContainerRef.current.clientWidth
            const height = chartContainerRef.current.clientHeight
            if (width > 0 && height > 0) {
              // Используем resize() вместо applyOptions для более надежного обновления
              if (typeof chart.resize === 'function') {
                chart.resize(width, 700)
              } else {
                chart.applyOptions({ width })
              }
            }
          }
        }

        // Обработка изменения размера окна
        resizeHandler = () => {
          handleResize()
        }
        window.addEventListener('resize', resizeHandler)

        // Используем ResizeObserver для отслеживания изменений размера контейнера
        if (typeof ResizeObserver !== 'undefined' && chartContainerRef.current) {
          resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
              if (entry.target === chartContainerRef.current) {
                handleResize()
              }
            }
          })
          resizeObserver.observe(chartContainerRef.current)
        }

        // Принудительно вызываем resize после небольшой задержки
        setTimeout(() => {
          if (isMounted && chart) {
            handleResize()
          }
        }, 100)

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
            // Вызываем resize после обновления данных
            setTimeout(() => {
              if (isMounted && chart) {
                handleResize()
              }
            }, 100)
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
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
      if (chartInstance) {
        chartInstance.remove()
      }
      chartRef.current = null
      candlestickSeriesRef.current = null
    }
  }, [])

  // Обновление размера графика при изменении состояния загрузки
  useEffect(() => {
    if (!loading && chartRef.current && chartContainerRef.current) {
      // Когда загрузка завершена, обновляем размер графика
      setTimeout(() => {
        if (chartRef.current && chartContainerRef.current) {
          const width = chartContainerRef.current.clientWidth
          const height = chartContainerRef.current.clientHeight
          if (width > 0 && height > 0) {
            if (typeof chartRef.current.resize === 'function') {
              chartRef.current.resize(width, 700)
            } else {
              chartRef.current.applyOptions({ width })
            }
            // Также вызываем fitContent для правильного масштабирования
            if (chartRef.current.timeScale) {
              chartRef.current.timeScale().fitContent()
            }
          }
        }
      }, 100)
    }
  }, [loading])

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

      // ШАГ 1: Быстро загружаем только свечи для графика (без стратегии)
      const endTime = Date.now()
      const chartRequests = []
      
      const hoursPerCandle = timeframe === '1h' ? 1 : timeframe === '4h' ? 4 : 24
      // Увеличиваем количество запросов для загрузки всей истории
      // Для 1h: ~100 запросов = ~4 года истории (1000 свечей * 1 час = ~41 день на запрос)
      // Для 4h: ~50 запросов = ~8 лет истории (1000 свечей * 4 часа = ~166 дней на запрос)
      const numRequests = timeframe === '1h' ? 100 : 50
      
      // Дата запуска фьючерсов BTC на Binance: примерно 2019-09-13
      // Используем эту дату как минимальную точку отсчета
      const btcFuturesLaunchDate = new Date('2019-09-13').getTime()
      const minHistoryTime = btcFuturesLaunchDate
      
      let currentEndTime = endTime
      
      for (let i = 0; i < numRequests; i++) {
        const requestStartTime = currentEndTime - (1000 * hoursPerCandle * 60 * 60 * 1000)
        
        // Останавливаемся только если достигли даты запуска фьючерсов или раньше
        if (requestStartTime < minHistoryTime) {
          console.log(`Reached minimum history (futures launch date), stopping at request ${i + 1}`)
          break
        }
        
        if (requestStartTime >= currentEndTime) {
          console.warn(`Skipping invalid time range for request ${i}`)
          break
        }
        
        const requestParams = new URLSearchParams({
          symbol: selectedCoin,
          timeframe: timeframe,
          limit: '1000',
          startTime: requestStartTime.toString(),
          endTime: currentEndTime.toString()
        })
        // Запрашиваем только свечи, без стратегии (добавим параметр для этого)
        chartRequests.push(fetch(`/api/trading/data?${requestParams}&candlesOnly=true`))
        currentEndTime = requestStartTime
      }
      
      // Fallback запрос
      const fallbackParams = new URLSearchParams({
        symbol: selectedCoin,
        timeframe: timeframe,
        limit: '1000',
        candlesOnly: 'true'
      })
      chartRequests.push(fetch(`/api/trading/data?${fallbackParams}`))

      console.log('fetchData: step 1 - loading candles only (fast)')
      
      // Загружаем свечи быстро
      const chartResponses = await Promise.all(chartRequests)
      
      // Объединяем результаты графиков с обработкой ошибок
      const chartResults = await Promise.all(chartResponses.map(async (r) => {
        try {
          if (!r.ok) {
            const errorText = await r.text().catch(() => 'Unknown error')
            console.warn('Chart response not OK:', r.status, r.statusText, errorText.substring(0, 100))
            return { success: false, error: `HTTP ${r.status}`, candles: [] }
          }
          return await r.json()
        } catch (e) {
          console.error('Error parsing chart response:', e)
          return { success: false, error: e.message, candles: [] }
        }
      }))
      
      // Фильтруем только успешные результаты
      const successfulChartResults = chartResults.filter(r => r.success && r.candles && r.candles.length > 0)
      
      if (successfulChartResults.length === 0) {
        console.error('fetchData: no successful chart results, all requests failed')
        const errors = chartResults.filter(r => r.error).map(r => r.error)
        const errorMessage = errors.length > 0 
          ? `Не удалось загрузить данные для ${selectedCoin}. ${errors[0]}`
          : `Не удалось загрузить данные для ${selectedCoin}. Проверьте подключение к интернету.`
        setError(errorMessage)
        setLoading(false)
        return
      }
      
      // Логируем предупреждения о неудачных запросах
      const failedResults = chartResults.filter(r => !r.success || !r.candles || r.candles.length === 0)
      if (failedResults.length > 0) {
        console.warn(`fetchData: ${failedResults.length} requests failed out of ${chartResults.length}`, {
          failed: failedResults.map(r => ({ symbol: r.symbol, error: r.error }))
        })
      }
      
      // Объединяем все свечи (убираем дубликаты)
      const allCandles = []
      const seenTimestamps = new Set()
      
      for (let i = successfulChartResults.length - 1; i >= 0; i--) {
        const result = successfulChartResults[i]
        if (result.success && result.candles) {
          for (const candle of result.candles) {
            if (!seenTimestamps.has(candle.timestamp)) {
              seenTimestamps.add(candle.timestamp)
              allCandles.push(candle)
            }
          }
        }
      }
      
      // Сортируем свечи по времени (от старых к новым)
      allCandles.sort((a, b) => a.timestamp - b.timestamp)
      
      console.log('fetchData: step 1 complete - loaded', allCandles.length, 'candles')
      
      // ШАГ 2: Показываем график сразу (быстро)
      const initialData = {
        success: true,
        candles: allCandles,
        trades: [],
        statistics: null,
        statsTrades: [],
        equityCurve: []
      }
      
      dataRef.current = initialData
      setData(initialData)
      setLoading(false) // График загружен, убираем индикатор загрузки
      
      // ШАГ 3: Запускаем стратегию на всех свечах в фоне
      console.log('fetchData: step 2 - running strategy on all candles (background)')
      
      // Используем ВСЕ свечи для backtest
      // Оптимизируем данные: отправляем только необходимые поля для уменьшения размера
      const optimizedCandles = allCandles.map(c => ({
        timestamp: c.timestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume || 0
      }))
      
      // КРИТИЧЕСКИ ВАЖНО: Фильтруем свечи по периоду ДО запуска бэктеста
      // Это гарантирует, что каждый период начинается с начального капитала (1000$)
      let candlesForBacktest = optimizedCandles
      
      if (selectedPeriod !== 'all' && !isNaN(parseInt(selectedPeriod))) {
        const days = parseInt(selectedPeriod)
        const statsEndTime = Date.now()
        const statsStartTime = statsEndTime - (days * 24 * 60 * 60 * 1000)
        
        // Фильтруем свечи по времени (периоду)
        candlesForBacktest = optimizedCandles.filter(candle => {
          const candleTimestamp = candle.timestamp || candle.time
          if (!candleTimestamp) return false
          
          // Проверяем формат timestamp: если > 1000000000000, то уже в миллисекундах
          const candleTime = candleTimestamp > 1000000000000 
            ? candleTimestamp 
            : candleTimestamp * 1000 // Конвертируем из секунд в миллисекунды
          
          return candleTime >= statsStartTime && candleTime <= statsEndTime
        })
        
        console.log('fetchData: filtering candles by period before backtest', {
          period: selectedPeriod,
          days: days,
          originalCandles: optimizedCandles.length,
          filteredCandles: candlesForBacktest.length,
          startTime: new Date(statsStartTime).toISOString(),
          endTime: new Date(statsEndTime).toISOString()
        })
        
        // Проверяем, что после фильтрации остались свечи
        if (candlesForBacktest.length === 0) {
          console.warn('fetchData: no candles after filtering by period, using all candles')
          candlesForBacktest = optimizedCandles
        }
      } else {
        console.log('fetchData: using', optimizedCandles.length, 'candles for backtest (all candles)')
      }
      
      // Проверяем, что есть свечи для бэктеста
      if (!candlesForBacktest || candlesForBacktest.length === 0) {
        throw new Error('No candles available for backtest')
      }
      
      try {
        const backtestResponse = await fetch('/api/trading/backtest', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            candles: candlesForBacktest, // Используем отфильтрованные свечи
            symbol: selectedCoin,
            timeframe: timeframe,
            strategyParams: {
              initialCapital: initialCapital, // Всегда начинаем с начального капитала (1000$)
              positionSizePercent: positionSizePercent
            }
          })
        })
        
        if (!backtestResponse.ok) {
          throw new Error(`Backtest failed: ${backtestResponse.status}`)
        }
        
        const backtestResult = await backtestResponse.json()
        
        if (!backtestResult.success) {
          throw new Error(backtestResult.error || 'Backtest failed')
        }
        
        console.log('fetchData: step 2 complete - got', backtestResult.trades.length, 'trades', {
          symbol: selectedCoin,
          timeframe: timeframe,
          hasStatistics: !!backtestResult.statistics,
          statistics: backtestResult.statistics
        })
        
        // Если нет статистики из backtest, создаем пустую
        if (!backtestResult.statistics) {
          console.warn('fetchData: backtest returned no statistics, creating empty stats')
          backtestResult.statistics = {
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
            currentEquity: 1000,
            initialEquity: 1000,
            peakEquity: 1000
          }
        }
        
        // КРИТИЧЕСКИ ВАЖНО: Теперь сделки уже отфильтрованы свечами периода,
        // поэтому бэктест уже выполнен только на нужном периоде с начальным капиталом (1000$)
        // Не нужно дополнительно фильтровать сделки - они уже правильные
        const filteredTrades = backtestResult.trades || []
        
        // Используем статистику напрямую из бэктеста, так как он уже запущен только на нужном периоде
        // Начальный капитал всегда = initialCapital (1000$), независимо от периода
        const filteredStatistics = {
          ...backtestResult.statistics,
          // Статистика уже правильная, так как бэктест запущен только на нужном периоде
          initialEquity: backtestResult.statistics?.initialEquity || initialCapital, // Всегда 1000$
          currentEquity: backtestResult.statistics?.currentEquity || initialCapital
        }
        
        console.log('fetchData: backtest completed for period', {
          period: selectedPeriod === 'all' ? 'all' : selectedPeriod + ' days',
          trades: filteredTrades.length,
          initialEquity: filteredStatistics.initialEquity,
          totalPnl: filteredStatistics.totalPnl,
          currentEquity: filteredStatistics.currentEquity
        })
        
        // Обновляем данные с результатами стратегии
        const finalData = {
          success: true,
          candles: allCandles,
          trades: backtestResult.trades, // Все сделки для графика
          statistics: filteredStatistics, // Статистика с учетом периода
          statsTrades: filteredTrades, // Отфильтрованные сделки для истории
          equityCurve: backtestResult.statistics?.equityCurve || backtestResult.equityCurve || [] // Волновой график капитала
        }
        
        dataRef.current = finalData
        setData(finalData)
        
        console.log('fetchData: complete - chart updated with trades and statistics')
        
      } catch (backtestError) {
        console.error('fetchData: backtest error', backtestError)
        console.error('fetchData: backtest error details', {
          symbol: selectedCoin,
          timeframe: timeframe,
          error: backtestError.message,
          stack: backtestError.stack
        })
        
        // Если ошибка, показываем пустую статистику вместо отсутствия данных
        const emptyStatistics = {
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
          currentEquity: 1000,
          initialEquity: 1000,
          peakEquity: 1000
        }
        
        const errorData = {
          success: true,
          candles: allCandles,
          trades: [],
          statistics: emptyStatistics,
          statsTrades: [],
          equityCurve: []
        }
        
        dataRef.current = errorData
        setData(errorData)
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
        <style dangerouslySetInnerHTML={{
          __html: `
            select {
              color: #ffffff !important;
              background-color: rgba(255, 255, 255, 0.04) !important;
            }
            select option {
              background-color: #1a1a1a !important;
              color: #ffffff !important;
            }
            select:focus {
              color: #ffffff !important;
              outline: none;
            }
            input[type="number"] {
              color: #ffffff !important;
              -moz-appearance: textfield;
            }
            input[type="number"]::-webkit-inner-spin-button,
            input[type="number"]::-webkit-outer-spin-button {
              -webkit-appearance: none;
              margin: 0;
            }
          `
        }} />
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

            {/* Панель управления */}
            <div style={{ 
              display: 'flex', 
              gap: '1rem', 
              flexWrap: 'wrap',
              marginTop: '2rem',
              marginBottom: '2rem',
              justifyContent: 'center',
              alignItems: 'flex-end'
            }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem',
                  color: 'var(--color-on-surface)',
                  fontSize: '0.9rem',
                  fontWeight: '500'
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
                    color: '#ffffff',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    minWidth: '150px',
                    fontWeight: '500'
                  }}
                >
                  {periods.map(period => (
                    <option 
                      key={period.value} 
                      value={period.value}
                      style={{
                        background: '#1a1a1a',
                        color: '#ffffff'
                      }}
                    >
                      {period.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem',
                  color: 'var(--color-on-surface)',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  opacity: 0
                }}>
                  &nbsp;
                </label>
                <button
                  onClick={() => setShowSettings(true)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: 'var(--border-radius-md)',
                    border: '1px solid var(--color-primary)',
                    background: 'rgba(155, 255, 0, 0.1)',
                    color: 'var(--color-primary)',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(155, 255, 0, 0.2)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(155, 255, 0, 0.1)'
                  }}
                >
                  ⚙️ Настройки
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem',
                  color: 'var(--color-on-surface)',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  opacity: 0
                }}>
                  &nbsp;
                </label>
                <div style={{ 
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--border-radius-md)',
                  border: '1px solid var(--glass-border)',
                  background: 'rgba(155, 255, 0, 0.1)',
                  color: 'var(--color-primary)',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  whiteSpace: 'nowrap'
                }}>
                  {selectedCoin.replace('USDT', '')} ({getTimeframeForCoin(selectedCoin)})
                </div>
              </div>
            </div>

            {/* Модальное окно настроек */}
            {showSettings && (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0, 0, 0, 0.7)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 1000,
                  backdropFilter: 'blur(5px)'
                }}
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setShowSettings(false)
                  }
                }}
              >
                <div
                  style={{
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--border-radius-lg)',
                    padding: '2rem',
                    maxWidth: '500px',
                    width: '90%',
                    maxHeight: '90vh',
                    overflowY: 'auto'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1.5rem'
                  }}>
                    <h2 style={{
                      fontSize: '1.5rem',
                      color: 'var(--color-on-surface)',
                      margin: 0
                    }}>
                      Настройки бэктеста
                    </h2>
                    <button
                      onClick={() => setShowSettings(false)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-on-surface-secondary)',
                        fontSize: '1.5rem',
                        cursor: 'pointer',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '0.5rem',
                        color: 'var(--color-on-surface)',
                        fontSize: '1rem',
                        fontWeight: 'bold'
                      }}>
                        Монета:
                      </label>
                      <select
                        value={tempSelectedCoin}
                        onChange={(e) => setTempSelectedCoin(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          borderRadius: 'var(--border-radius-md)',
                          border: '1px solid var(--glass-border)',
                          background: 'var(--glass-bg)',
                          color: '#ffffff',
                          fontSize: '1rem',
                          cursor: 'pointer',
                          fontWeight: '500'
                        }}
                      >
                        {ALL_COINS.map(coin => {
                          const timeframe = getTimeframeForCoin(coin)
                          const displayName = `${coin.replace('USDT', '')} (${timeframe})`
                          return (
                            <option key={coin} value={coin}>{displayName}</option>
                          )
                        })}
                      </select>
                      <p style={{
                        marginTop: '0.5rem',
                        fontSize: '0.85rem',
                        color: 'var(--color-on-surface-secondary)'
                      }}>
                        Таймфрейм: {getTimeframeForCoin(tempSelectedCoin)}
                      </p>
                    </div>

                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '0.5rem',
                        color: 'var(--color-on-surface)',
                        fontSize: '1rem',
                        fontWeight: 'bold'
                      }}>
                        Начальный депозит (USDT):
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={tempInitialCapital === null || tempInitialCapital === undefined ? '' : tempInitialCapital}
                        onChange={(e) => {
                          const value = e.target.value
                          if (value === '' || value === null || value === undefined) {
                            setTempInitialCapital('')
                            setSettingsError(null)
                          } else {
                            const numValue = parseFloat(value)
                            if (!isNaN(numValue) && numValue >= 1) {
                              setTempInitialCapital(numValue)
                              setSettingsError(null)
                            }
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          borderRadius: 'var(--border-radius-md)',
                          border: settingsError && (tempInitialCapital === '' || tempInitialCapital === null || tempInitialCapital === undefined) 
                            ? '1px solid #ff6b6b' 
                            : '1px solid var(--glass-border)',
                          background: 'var(--glass-bg)',
                          color: '#ffffff',
                          fontSize: '1rem'
                        }}
                      />
                      <p style={{
                        marginTop: '0.5rem',
                        fontSize: '0.85rem',
                        color: 'var(--color-on-surface-secondary)'
                      }}>
                        Начальный капитал для бэктеста
                      </p>
                    </div>

                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '0.5rem',
                        color: 'var(--color-on-surface)',
                        fontSize: '1rem',
                        fontWeight: 'bold'
                      }}>
                        Размер позиции (%):
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        step="1"
                        value={tempPositionSizePercent === null || tempPositionSizePercent === undefined ? '' : tempPositionSizePercent}
                        onChange={(e) => {
                          const value = e.target.value
                          if (value === '' || value === null || value === undefined) {
                            setTempPositionSizePercent('')
                            setSettingsError(null)
                          } else {
                            const numValue = parseFloat(value)
                            if (!isNaN(numValue) && numValue >= 1 && numValue <= 100) {
                              setTempPositionSizePercent(numValue)
                              setSettingsError(null)
                            }
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          borderRadius: 'var(--border-radius-md)',
                          border: settingsError && (tempPositionSizePercent === '' || tempPositionSizePercent === null || tempPositionSizePercent === undefined) 
                            ? '1px solid #ff6b6b' 
                            : '1px solid var(--glass-border)',
                          background: 'var(--glass-bg)',
                          color: '#ffffff',
                          fontSize: '1rem'
                        }}
                      />
                      <p style={{
                        marginTop: '0.5rem',
                        fontSize: '0.85rem',
                        color: 'var(--color-on-surface-secondary)'
                      }}>
                        Процент капитала на каждую сделку (1-100%)
                      </p>
                    </div>

                    {settingsError && (
                      <div style={{
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--border-radius-md)',
                        background: 'rgba(255, 107, 107, 0.1)',
                        border: '1px solid #ff6b6b',
                        color: '#ff6b6b',
                        fontSize: '0.9rem',
                        marginTop: '0.5rem'
                      }}>
                        {settingsError}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        // Валидация перед применением
                        if (tempInitialCapital === '' || tempInitialCapital === null || tempInitialCapital === undefined || tempInitialCapital < 1) {
                          setSettingsError('Начальный депозит должен быть не менее 1 USDT')
                          return
                        }
                        if (tempPositionSizePercent === '' || tempPositionSizePercent === null || tempPositionSizePercent === undefined || tempPositionSizePercent < 1 || tempPositionSizePercent > 100) {
                          setSettingsError('Размер позиции должен быть от 1 до 100%')
                          return
                        }
                        
                        // Очищаем ошибку и применяем изменения
                        setSettingsError(null)
                        setSelectedCoin(tempSelectedCoin)
                        setInitialCapital(Number(tempInitialCapital))
                        setPositionSizePercent(Number(tempPositionSizePercent))
                        setShowSettings(false)
                      }}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1.5rem',
                        borderRadius: 'var(--border-radius-md)',
                        border: 'none',
                        background: 'var(--color-primary)',
                        color: '#000',
                        fontSize: '1rem',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        marginTop: '1rem',
                        transition: 'opacity 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '0.9'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '1'
                      }}
                    >
                      Применить
                    </button>
                  </div>
                </div>
              </div>
            )}

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

            {/* График с японскими свечами - всегда рендерим контейнер */}
            <div className="performance__panel" style={{ marginBottom: '2rem', display: loading ? 'none' : 'block' }}>
              <div 
                ref={chartContainerRef}
                style={{ 
                  width: '100%', 
                  minWidth: '300px',
                  height: '700px',
                  minHeight: '700px',
                  position: 'relative',
                  boxSizing: 'border-box',
                  overflow: 'hidden'
                }}
              />
              
              {/* Статистика overlay на графике */}
              {isClient && !loading && !error && data && data.statistics && (
                <div style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: 'rgba(5, 5, 7, 0.9)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 'var(--border-radius-md)',
                  padding: '1rem',
                  minWidth: '200px',
                  zIndex: 10,
                  backdropFilter: 'blur(10px)'
                }}>
                  <h3 style={{ 
                    fontSize: '0.9rem', 
                    marginBottom: '0.75rem',
                    color: 'var(--color-on-surface)',
                    fontWeight: 'bold'
                  }}>
                    Статистика
                  </h3>
                  <div style={{ fontSize: '0.85rem', lineHeight: '1.6' }}>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <span style={{ opacity: 0.7 }}>ПР/УБ: </span>
                      <span style={{ 
                        color: parseFloat(data.statistics.totalPnl) >= 0 ? '#9bff00' : '#ff6b6b',
                        fontWeight: 'bold'
                      }}>
                        {data.statistics?.totalPnl >= 0 ? '+' : ''}{data.statistics?.totalPnl?.toFixed(2) || '0.00'} USDT
                      </span>
                      <span style={{ opacity: 0.6, fontSize: '0.8rem', marginLeft: '0.25rem' }}>
                        ({data.statistics?.totalPnlPercent >= 0 ? '+' : ''}{data.statistics?.totalPnlPercent?.toFixed(2) || '0.00'}%)
                      </span>
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <span style={{ opacity: 0.7 }}>Сделок: </span>
                      <span style={{ color: 'var(--color-on-surface)' }}>{data.statistics?.totalTrades || 0}</span>
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <span style={{ opacity: 0.7 }}>Win Rate: </span>
                      <span style={{ color: '#9bff00', fontWeight: 'bold' }}>{data.statistics?.winRate?.toFixed(2) || '0.00'}%</span>
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <span style={{ opacity: 0.7 }}>Просадка: </span>
                      <span style={{ color: '#ff6b6b' }}>{data.statistics?.maxDrawdown?.toFixed(2) || '0.00'}%</span>
                    </div>
                    <div>
                      <span style={{ opacity: 0.7 }}>Profit Factor: </span>
                      <span style={{ color: '#9bff00', fontWeight: 'bold' }}>{data.statistics?.profitFactor === Infinity ? '∞' : (data.statistics?.profitFactor?.toFixed(2) || '0.00')}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {isClient && !loading && !error && (
              <>
                {/* Табы для переключения между отчетом и историей */}
                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  marginBottom: '2rem',
                  borderBottom: '1px solid var(--glass-border)'
                }}>
                  <button
                    onClick={() => setActiveTab('report')}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: activeTab === 'report' ? '2px solid var(--color-primary)' : '2px solid transparent',
                      color: activeTab === 'report' ? 'var(--color-primary)' : 'var(--color-on-surface-secondary)',
                      fontSize: '1rem',
                      fontWeight: activeTab === 'report' ? 'bold' : 'normal',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    Отчёт
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: activeTab === 'history' ? '2px solid var(--color-primary)' : '2px solid transparent',
                      color: activeTab === 'history' ? 'var(--color-primary)' : 'var(--color-on-surface-secondary)',
                      fontSize: '1rem',
                      fontWeight: activeTab === 'history' ? 'bold' : 'normal',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    История сделок
                  </button>
                </div>

                {/* Вкладка: Отчёт */}
                {activeTab === 'report' && data && data.statistics && (
                  <div className="performance__panel">
                    <h2 className="section-title" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>
                      Отчёт по стратегии
                    </h2>
                    
                    {/* Основные метрики */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '1rem',
                      marginBottom: '2rem'
                    }}>
                      <div className="performance-card">
                        <div className="performance-card__content">
                          <div className="metric-bg">
                            <h3 className="performance-card__value" style={{ 
                              color: parseFloat(data.statistics.totalPnl) >= 0 ? '#9bff00' : '#ff6b6b' 
                            }}>
                              {data.statistics?.totalPnl >= 0 ? '+' : ''}{data.statistics?.totalPnl?.toFixed(2) || '0.00'} USDT
                            </h3>
                            <p className="performance-card__label">
                              Общие ПР/УБ
                            </p>
                            <p className="performance-card__label" style={{ fontSize: '0.9rem', opacity: 0.7, marginTop: '0.25rem' }}>
                              ({data.statistics?.totalPnlPercent >= 0 ? '+' : ''}{data.statistics?.totalPnlPercent?.toFixed(2) || '0.00'}%)
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="performance-card">
                        <div className="performance-card__content">
                          <div className="metric-bg">
                            <h3 className="performance-card__value" style={{ color: '#ff6b6b' }}>
                              {data.statistics?.maxDrawdownUsdt?.toFixed(2) || '0.00'} USDT
                            </h3>
                            <p className="performance-card__label">
                              Макс. просадка средств
                            </p>
                            <p className="performance-card__label" style={{ fontSize: '0.9rem', opacity: 0.7, marginTop: '0.25rem' }}>
                              ({data.statistics?.maxDrawdown?.toFixed(2) || '0.00'}%)
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="performance-card">
                        <div className="performance-card__content">
                          <div className="metric-bg">
                            <h3 className="performance-card__value">
                              {data.statistics?.totalTrades || 0}
                            </h3>
                            <p className="performance-card__label">Всего сделок</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="performance-card">
                        <div className="performance-card__content">
                          <div className="metric-bg">
                            <h3 className="performance-card__value">
                              {data.statistics?.currentEquity?.toFixed(2) || '1000.00'} USDT
                            </h3>
                            <p className="performance-card__label">Текущий капитал</p>
                            <p className="performance-card__label" style={{ fontSize: '0.9rem', opacity: 0.7, marginTop: '0.25rem' }}>
                              Начальный: {data.statistics?.initialEquity?.toFixed(2) || '1000.00'} USDT
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* График equity curve (волновой график капитала) */}
                    {data.equityCurve && data.equityCurve.length > 0 && (
                      <div style={{ marginTop: '2rem' }}>
                        <h3 className="section-title" style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
                          Динамика капитала
                        </h3>
                        <EquityCurveChart 
                          equityCurve={data.equityCurve} 
                          initialEquity={data.statistics?.initialEquity}
                          currentEquity={data.statistics?.currentEquity}
                          totalPnlPercent={data.statistics?.totalPnlPercent}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Вкладка: История сделок */}
                {activeTab === 'history' && (
                  <div className="performance__panel">
                    <h2 className="section-title" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>
                      История торговли
                    </h2>
                    {isClient && data && data.statsTrades && data.statsTrades.length > 0 ? (
                    <div style={{ 
                      overflowX: 'auto',
                      maxHeight: '600px',
                      overflowY: 'auto'
                    }}>
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '0.9rem'
                      }}>
                        <thead style={{
                          position: 'sticky',
                          top: 0,
                          background: 'var(--glass-bg)',
                          zIndex: 1
                        }}>
                          <tr style={{ borderBottom: '2px solid var(--glass-border)' }}>
                            <th style={{ 
                              padding: '0.75rem', 
                              textAlign: 'left',
                              color: 'var(--color-on-surface-secondary)',
                              fontWeight: 'bold'
                            }}>Дата</th>
                            <th style={{ 
                              padding: '0.75rem', 
                              textAlign: 'left',
                              color: 'var(--color-on-surface-secondary)',
                              fontWeight: 'bold'
                            }}>Тип</th>
                            <th style={{ 
                              padding: '0.75rem', 
                              textAlign: 'left',
                              color: 'var(--color-on-surface-secondary)',
                              fontWeight: 'bold'
                            }}>Результат</th>
                            <th style={{ 
                              padding: '0.75rem', 
                              textAlign: 'right',
                              color: 'var(--color-on-surface-secondary)',
                              fontWeight: 'bold'
                            }}>Цена входа</th>
                            <th style={{ 
                              padding: '0.75rem', 
                              textAlign: 'right',
                              color: 'var(--color-on-surface-secondary)',
                              fontWeight: 'bold'
                            }}>Цена выхода</th>
                            <th style={{ 
                              padding: '0.75rem', 
                              textAlign: 'right',
                              color: 'var(--color-on-surface-secondary)',
                              fontWeight: 'bold'
                            }}>Размер позиции</th>
                            <th style={{ 
                              padding: '0.75rem', 
                              textAlign: 'right',
                              color: 'var(--color-on-surface-secondary)',
                              fontWeight: 'bold'
                            }}>P&L</th>
                            <th style={{ 
                              padding: '0.75rem', 
                              textAlign: 'right',
                              color: 'var(--color-on-surface-secondary)',
                              fontWeight: 'bold'
                            }}>P&L %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...data.statsTrades]
                            // Сортируем сделки: новые сверху (по убыванию времени)
                            .sort((a, b) => {
                              const timeA = (a.exitType === 'ENTRY' ? a.entryTime : a.exitTime) || 0
                              const timeB = (b.exitType === 'ENTRY' ? b.entryTime : b.exitTime) || 0
                              return timeB - timeA // Убывание: новые сверху
                            })
                            .map((trade, index) => {
                            // Новый формат из backtest API: { entryTime, entryPrice, type, exitTime, exitPrice, result }
                            const entryPrice = trade.entryPrice || 0
                            const exitPrice = trade.exitPrice || entryPrice
                            const isLong = trade.type === 'long'
                            const pnlUsdt = trade.result || 0
                            
                            // Рассчитываем P&L в процентах
                            // P&L % показывает процент изменения цены, независимо от размера закрываемой части
                            let pnlPercent = 0
                            if (trade.exitType === 'ENTRY') {
                              // Это запись о входе - нет P&L
                              pnlPercent = 0
                            } else if (entryPrice > 0) {
                              // Рассчитываем процент от цены
                              const pricePnlPercent = isLong 
                                ? ((exitPrice - entryPrice) / entryPrice * 100)
                                : ((entryPrice - exitPrice) / entryPrice * 100)
                              // Вычитаем комиссию на выход (0.1% = 0.1)
                              // Комиссия на вход уже учтена при открытии позиции
                              pnlPercent = pricePnlPercent - 0.1
                            }
                            // Для входов используем entryTime, для выходов - exitTime
                            // Время в секундах, конвертируем в миллисекунды
                            const tradeTimestamp = (trade.exitType === 'ENTRY' ? trade.entryTime : trade.exitTime) 
                              ? ((trade.exitType === 'ENTRY' ? trade.entryTime : trade.exitTime) * 1000)
                              : (isClient ? Date.now() : 0)
                            let dateStr = '—'
                            if (isClient && tradeTimestamp > 0) {
                              const date = new Date(tradeTimestamp)
                              dateStr = date.toLocaleDateString('ru-RU', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            }
                            
                            // Определяем результат сделки
                            const resultText = trade.resultText || trade.exitType || '—'
                            const getResultColor = (result) => {
                              if (!result || result === '—') return 'var(--color-on-surface)'
                              if (result.includes('TP1') || result.includes('TP2') || result.includes('TP3')) return '#9bff00'
                              if (result.includes('Безубыток')) return '#ffd700'
                              if (result.includes('Стоп-лосс') || result.includes('SL')) return '#ff6b6b'
                              return 'var(--color-on-surface)'
                            }
                            
                            // Проверяем, является ли сделка открытой (не закрыта полностью)
                            // Позиция открыта только если это запись о входе И нет ни одного выхода для этой позиции
                            let isOpenPosition = false
                            if (trade.exitType === 'ENTRY') {
                              // Проверяем, есть ли выходы для этой позиции (по entryTime)
                              const hasExits = data.statsTrades.some(t => 
                                t.exitType !== 'ENTRY' && 
                                t.entryTime === trade.entryTime
                              )
                              // Если нет выходов - позиция открыта
                              isOpenPosition = !hasExits
                            }
                            
                            return (
                              <tr 
                                key={trade.id || index}
                                data-open-position={isOpenPosition}
                                style={{
                                  borderBottom: '1px solid var(--glass-border)',
                                  transition: 'background 0.2s',
                                  position: 'relative'
                                }}
                                onMouseEnter={(e) => {
                                  if (isOpenPosition) {
                                    e.currentTarget.style.background = 'rgba(255, 107, 107, 0.1)'
                                    const tooltip = e.currentTarget.querySelector('.open-position-tooltip')
                                    if (tooltip) {
                                      tooltip.style.opacity = '1'
                                    }
                                  } else {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'transparent'
                                  if (isOpenPosition) {
                                    const tooltip = e.currentTarget.querySelector('.open-position-tooltip')
                                    if (tooltip) {
                                      tooltip.style.opacity = '0'
                                    }
                                  }
                                }}
                              >
                                <td style={{ padding: '0.75rem', color: 'var(--color-on-surface)' }}>
                                  {dateStr}
                                </td>
                                <td style={{ padding: '0.75rem', position: 'relative' }}>
                                  {isOpenPosition ? (
                                    <span 
                                      style={{
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '4px',
                                        background: 'rgba(128, 128, 128, 0.2)',
                                        color: 'var(--color-on-surface-secondary)',
                                        fontWeight: 'bold',
                                        fontSize: '0.85rem',
                                        filter: 'blur(4px)',
                                        userSelect: 'none',
                                        cursor: 'help',
                                        position: 'relative'
                                      }}
                                      title="Оплатите доступ чтобы увидеть эту сделку"
                                    >
                                      ???
                                    </span>
                                  ) : (
                                    <span style={{
                                      padding: '0.25rem 0.5rem',
                                      borderRadius: '4px',
                                      background: isLong ? 'rgba(155, 255, 0, 0.2)' : 'rgba(255, 107, 107, 0.2)',
                                      color: isLong ? '#9bff00' : '#ff6b6b',
                                      fontWeight: 'bold',
                                      fontSize: '0.85rem'
                                    }}>
                                      {isLong ? 'LONG' : 'SHORT'}
                                    </span>
                                  )}
                                  {isOpenPosition && (
                                    <div style={{
                                      position: 'absolute',
                                      top: '100%',
                                      left: '50%',
                                      transform: 'translateX(-50%)',
                                      marginTop: '0.5rem',
                                      padding: '0.6rem 0.9rem',
                                      background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.15) 0%, rgba(0, 0, 0, 0.95) 100%)',
                                      border: '1px solid rgba(255, 107, 107, 0.3)',
                                      borderRadius: '8px',
                                      color: '#ff6b6b',
                                      fontSize: '0.85rem',
                                      fontWeight: '500',
                                      whiteSpace: 'nowrap',
                                      opacity: 0,
                                      pointerEvents: 'none',
                                      transition: 'opacity 0.3s ease, transform 0.3s ease',
                                      zIndex: 1000,
                                      boxShadow: '0 4px 20px rgba(255, 107, 107, 0.2), 0 0 20px rgba(255, 107, 107, 0.1)',
                                      backdropFilter: 'blur(10px)'
                                    }}
                                    className="open-position-tooltip"
                                    >
                                      <span style={{ marginRight: '0.5rem' }}>🔒</span>
                                      Оплатите доступ чтобы увидеть эту сделку
                                    </div>
                                  )}
                                </td>
                                <td style={{ 
                                  padding: '0.75rem', 
                                  textAlign: 'left',
                                  color: getResultColor(resultText),
                                  fontWeight: 'bold',
                                  fontSize: '0.9rem'
                                }}>
                                  {resultText}
                                </td>
                                <td style={{ 
                                  padding: '0.75rem', 
                                  textAlign: 'right',
                                  color: 'var(--color-on-surface)',
                                  position: 'relative'
                                }}>
                                  {isOpenPosition ? (
                                    <span style={{
                                      filter: 'blur(4px)',
                                      userSelect: 'none',
                                      cursor: 'help'
                                    }}
                                    title="Оплатите доступ чтобы увидеть эту сделку"
                                    >
                                      ???
                                    </span>
                                  ) : (
                                    entryPrice > 0 ? entryPrice.toFixed(2) : '—'
                                  )}
                                </td>
                                <td style={{ 
                                  padding: '0.75rem', 
                                  textAlign: 'right',
                                  color: 'var(--color-on-surface)'
                                }}>
                                  {trade.exitType === 'ENTRY' ? '—' : (exitPrice > 0 ? exitPrice.toFixed(2) : '—')}
                                </td>
                                <td style={{ 
                                  padding: '0.75rem', 
                                  textAlign: 'right',
                                  color: 'var(--color-on-surface)',
                                  fontWeight: 'bold'
                                }}>
                                  {isOpenPosition ? (
                                    <span style={{
                                      filter: 'blur(4px)',
                                      userSelect: 'none',
                                      cursor: 'help'
                                    }}
                                    title="Оплатите доступ чтобы увидеть эту сделку"
                                    >
                                      ???
                                    </span>
                                  ) : (
                                    trade.exitType === 'ENTRY' 
                                      ? (trade.positionSizeAtEntry ? trade.positionSizeAtEntry.toFixed(2) + ' USDT' : '—')
                                      : (trade.exitPositionSize ? trade.exitPositionSize.toFixed(2) + ' USDT' : '—')
                                  )}
                                </td>
                                <td style={{ 
                                  padding: '0.75rem', 
                                  textAlign: 'right',
                                  color: trade.exitType === 'ENTRY' ? 'var(--color-on-surface-secondary)' : (pnlUsdt >= 0 ? '#9bff00' : '#ff6b6b'),
                                  fontWeight: trade.exitType === 'ENTRY' ? 'normal' : 'bold'
                                }}>
                                  {trade.exitType === 'ENTRY' ? '—' : (pnlUsdt >= 0 ? '+' : '') + pnlUsdt.toFixed(2) + ' USDT'}
                                </td>
                                <td style={{ 
                                  padding: '0.75rem', 
                                  textAlign: 'right',
                                  color: trade.exitType === 'ENTRY' ? 'var(--color-on-surface-secondary)' : (pnlPercent >= 0 ? '#9bff00' : '#ff6b6b'),
                                  fontWeight: trade.exitType === 'ENTRY' ? 'normal' : 'bold'
                                }}>
                                  {trade.exitType === 'ENTRY' ? '—' : (pnlPercent >= 0 ? '+' : '') + pnlPercent.toFixed(2) + '%'}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    ) : (
                      <div style={{
                        padding: '3rem',
                        textAlign: 'center',
                        color: 'var(--color-on-surface-secondary)'
                      }}>
                        <p>Нет данных о сделках</p>
                      </div>
                    )}
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
