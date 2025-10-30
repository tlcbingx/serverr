import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'

import Navigation from '../components/navigation'
import Footer from '../components/footer'

const PartnerDashboard = () => {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview') // overview, levels, wallet
  const [timePeriod, setTimePeriod] = useState('30') // 1 (вчера), 7, 30
  const [promoDiscount, setPromoDiscount] = useState(0) // Скидка на промокод (0-50%)
  const [isSavingDiscount, setIsSavingDiscount] = useState(false)
  const [calculatorReferrals, setCalculatorReferrals] = useState(10)
  const [calculatorAvgCheck, setCalculatorAvgCheck] = useState(500)
  const [calculatorRecurringRate, setCalculatorRecurringRate] = useState(30)
  const [stats, setStats] = useState({
    totalPaidUsers: 0,
    totalRevenue: 0,
    commissionRate: 0,
    referralLink: '',
    promoCode: '',
    status: 'pending',
    firstPayments: 0,
    recurringPayments: 0,
    firstPaymentsRevenue: 0,
    recurringPaymentsRevenue: 0,
    discount: 0
  })

  useEffect(() => {
    const savedUser = localStorage.getItem('telegram_user')
    if (!savedUser) {
      router.push('/register')
      return
    }
    
    const userData = JSON.parse(savedUser)
    setUser(userData)
    fetchPartnerStats(userData.id)
  }, [router])

  const fetchPartnerStats = async (telegramId, period = '30') => {
    try {
      const response = await fetch(`/api/partner/stats?telegram_id=${telegramId}&period=${period}`)
      const data = await response.json()
      
      if (data.success) {
        setStats(data.stats)
        setPromoDiscount(data.stats.discount || 0)
      } else {
        console.error('Failed to fetch stats:', data.error)
        if (data.error === 'Database not configured') {
          alert('База данных не настроена. Обратитесь к администратору.')
        }
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
      alert('Ошибка загрузки данных. Попробуйте позже.')
    } finally {
      setLoading(false)
    }
  }

  const updatePromoDiscount = async (discount) => {
    if (!user) return
    
    setIsSavingDiscount(true)
    try {
      const response = await fetch('/api/partner/update-discount', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegram_id: user.id,
          discount: discount
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setStats({...stats, discount: discount})
        alert('Скидка обновлена!')
      } else {
        alert('Ошибка при обновлении скидки')
        setPromoDiscount(stats.discount || 0)
      }
    } catch (error) {
      console.error('Error updating discount:', error)
      alert('Ошибка при обновлении скидки')
      setPromoDiscount(stats.discount || 0)
    } finally {
      setIsSavingDiscount(false)
    }
  }

  // Обновление статистики при изменении периода
  useEffect(() => {
    if (user) {
      fetchPartnerStats(user.id, timePeriod)
      
      // Автообновление статистики каждые 60 секунд
      const intervalId = setInterval(() => {
        fetchPartnerStats(user.id, timePeriod)
        console.log('📊 Статистика обновлена автоматически')
      }, 60000) // 60 секунд
      
      return () => clearInterval(intervalId)
    }
  }, [timePeriod, user])

  const handleLogout = () => {
    localStorage.removeItem('telegram_user')
    localStorage.removeItem('auth_token')
    router.push('/register')
  }

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text)
    alert(`${type} скопирован!`)
  }

  // Расчёт уровня партнёра и прогресса
  const calculatePartnerLevel = (paidUsers, baseCommissionRate) => {
    let level = 1
    let currentRate = 10
    let nextMilestone = 10
    let progress = 0
    let usersUntilNext = 10
    
    // Определяем стартовый уровень на основе базовой ставки от админа
    const startLevel = baseCommissionRate === 20 ? 2 : 1
    
    if (paidUsers >= 125) {
      level = 6
      currentRate = 50
      nextMilestone = 125
      progress = 100
      usersUntilNext = 0
    } else if (paidUsers >= 75) {
      level = 5
      currentRate = 45
      nextMilestone = 125
      progress = ((paidUsers - 75) / 50) * 100
      usersUntilNext = 125 - paidUsers
    } else if (paidUsers >= 50) {
      level = 4
      currentRate = 40
      nextMilestone = 75
      progress = ((paidUsers - 50) / 25) * 100
      usersUntilNext = 75 - paidUsers
    } else if (paidUsers >= 25) {
      level = 3
      currentRate = 30
      nextMilestone = 50
      progress = ((paidUsers - 25) / 25) * 100
      usersUntilNext = 50 - paidUsers
    } else if (paidUsers >= 10) {
      level = 2
      currentRate = 20
      nextMilestone = 25
      progress = ((paidUsers - 10) / 15) * 100
      usersUntilNext = 25 - paidUsers
    } else {
      // Если не достигли 10 пользователей - используем базовую ставку
      level = startLevel
      currentRate = baseCommissionRate
      nextMilestone = startLevel === 2 ? 25 : 10
      
      if (startLevel === 2) {
        // Для тех кто стартовал с 20% - прогресс до уровня 3
        progress = (paidUsers / 25) * 100
        usersUntilNext = 25 - paidUsers
      } else {
        // Для тех кто стартовал с 10% - прогресс до уровня 2
        progress = (paidUsers / 10) * 100
        usersUntilNext = 10 - paidUsers
      }
    }

    return {
      level,
      currentRate,
      nextMilestone,
      progress,
      usersUntilNext,
      baseRate: baseCommissionRate
    }
  }

  const levelInfo = calculatePartnerLevel(stats.totalPaidUsers, stats.commissionRate)

  // Расчёт комиссий
  const firstPaymentCommission = stats.totalRevenue > 0 ? Math.round(stats.totalRevenue * 0.4) : 0
  const recurringCommission = stats.totalRevenue - firstPaymentCommission

  if (loading) {
    return (
      <>
        <Head>
          <title>Загрузка... — VEXTR</title>
        </Head>
        <Navigation />
        <div className="dashboard-loading">
          <div className="spinner-container">
            <div className="spinner" />
            <p>Загрузка данных...</p>
          </div>
        </div>
        <Footer />
        <style jsx>{styles}</style>
      </>
    )
  }

  if (stats.status !== 'approved') {
    return (
      <>
        <Head>
          <title>Партнёрский кабинет — VEXTR</title>
        </Head>
        <Navigation />
        
        <div className="dashboard-container">
          <div className="pending-state">
            <h1 className="pending-title">
              {stats.status === 'pending' ? 'Заявка на рассмотрении' : 'Заявка отклонена'}
            </h1>
            <p className="pending-text">
              {stats.status === 'pending' 
                ? 'Ваша заявка находится на рассмотрении. Мы свяжемся с вами в ближайшее время через Telegram.'
                : 'К сожалению, ваша заявка была отклонена. Вы можете подать новую заявку позже.'}
            </p>
            <button onClick={() => router.push('/affiliate')} className="btn-back">
              Вернуться к программе
            </button>
          </div>
        </div>
        
        <Footer />
        <style jsx>{styles}</style>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>Партнёрский кабинет — VEXTR</title>
      </Head>
      <Navigation />
      
      <div className="dashboard-wrapper">
        {/* Плавающие декоративные элементы */}
        <div className="float-element float-1" />
        <div className="float-element float-2" />
        <div className="float-element float-3" />

        {/* Упрощенная шапка */}
        <div className="program-header-simple">
          <div className="program-meta-simple">
            <span className="level-badge-simple">Уровень {levelInfo.level}</span>
            <span className="rate-info-simple">Ставка повторных платежей: {levelInfo.currentRate}%</span>
          </div>
          <button onClick={handleLogout} className="btn-logout-header">
            Выйти
          </button>
        </div>

        {/* Навигация вкладками */}
        <div className="tabs-container">
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Обзор
            </button>
            <button
              className={`tab ${activeTab === 'levels' ? 'active' : ''}`}
              onClick={() => setActiveTab('levels')}
            >
              Уровни
            </button>
            <button
              className={`tab ${activeTab === 'wallet' ? 'active' : ''}`}
              onClick={() => setActiveTab('wallet')}
            >
              Кошелек
            </button>
          </div>
        </div>

        {/* Контент вкладок */}
        <div className="dashboard-content">
          {activeTab === 'overview' && (
            <div className="tab-content">
              {/* Статистика */}
              <div className="section-header-with-filter">
                <div>
                  <h2>Статистика</h2>
                  <p className="last-update">Последнее обновление: {new Date().toLocaleString('ru-RU')}</p>
                </div>
                <div className="time-filter">
                  <button 
                    className={`filter-btn ${timePeriod === '1' ? 'active' : ''}`}
                    onClick={() => setTimePeriod('1')}
                  >
                    Вчера
                  </button>
                  <button 
                    className={`filter-btn ${timePeriod === '7' ? 'active' : ''}`}
                    onClick={() => setTimePeriod('7')}
                  >
                    7 дней
                  </button>
                  <button 
                    className={`filter-btn ${timePeriod === '30' ? 'active' : ''}`}
                    onClick={() => setTimePeriod('30')}
                  >
                    30 дней
                  </button>
                </div>
              </div>

              <div className="stats-grid-compact">
                <div className="stat-card-okx">
                  <div className="stat-header-okx">
                    <span className="stat-label-okx">Первые платежи</span>
                  </div>
                  <div className="stat-value-okx">{stats.firstPayments}</div>
                  <div className="stat-revenue">{stats.firstPaymentsRevenue.toLocaleString('ru-RU')} ₽</div>
                </div>

                <div className="stat-card-okx">
                  <div className="stat-header-okx">
                    <span className="stat-label-okx">Повторные платежи</span>
                  </div>
                  <div className="stat-value-okx">{stats.recurringPayments}</div>
                  <div className="stat-revenue">{stats.recurringPaymentsRevenue.toLocaleString('ru-RU')} ₽</div>
                </div>

                <div className="stat-card-okx highlight">
                  <div className="stat-header-okx">
                    <span className="stat-label-okx">Общая комиссия</span>
                  </div>
                  <div className="stat-value-okx green">{stats.totalRevenue.toLocaleString('ru-RU')} ₽</div>
                </div>

                <div className="stat-card-okx">
                  <div className="stat-header-okx">
                    <span className="stat-label-okx">Всего клиентов</span>
                  </div>
                  <div className="stat-value-okx">{stats.totalPaidUsers}</div>
                </div>
              </div>

              {/* Блоки с промокодом и комиссиями */}
              <div className="content-row">
                {/* Промокод */}
                <div className="promo-block">
                  <h3 className="block-title">Промокод по умолчанию</h3>
                  <div className="promo-rates">
                    <div className="rate-item">
                      <div className="rate-label">От первого платежа</div>
                      <div className="rate-value">{100 - promoDiscount}%</div>
                    </div>
                    <div className="rate-divider">→</div>
                    <div className="rate-item">
                      <div className="rate-label">От последующих</div>
                      <div className="rate-value">{levelInfo.currentRate}%</div>
                    </div>
                  </div>

                  {/* Управление скидкой */}
                  <div className="discount-control">
                    <div className="discount-header">
                      <span className="discount-label">Скидка для клиента</span>
                      <span className="discount-value">{promoDiscount}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      step="5"
                      value={promoDiscount}
                      onChange={(e) => setPromoDiscount(parseInt(e.target.value))}
                      className="discount-slider"
                      disabled={isSavingDiscount}
                    />
                    <div className="discount-marks">
                      <span>0%</span>
                      <span>25%</span>
                      <span>50%</span>
                    </div>
                    <button
                      onClick={() => updatePromoDiscount(promoDiscount)}
                      className="btn-save-discount"
                      disabled={isSavingDiscount || promoDiscount === stats.discount}
                    >
                      {isSavingDiscount ? 'Сохранение...' : 'Сохранить скидку'}
                    </button>
                    <p className="discount-hint">
                      Чем больше скидка, тем привлекательнее ваш промокод для клиентов, но тем меньше вы получите с первого платежа
                    </p>
                  </div>

                  <div className="promo-code-container">
                    <input
                      type="text"
                      value={stats.promoCode}
                      readOnly
                      className="promo-input-okx"
                    />
                    <button
                      onClick={() => copyToClipboard(stats.promoCode, 'Промокод')}
                      className="btn-copy-okx"
                    >
                      Копировать
                    </button>
                  </div>
                  <p className="promo-hint">
                    Клиенты вводят промокод в боте: <code>/promo {stats.promoCode}</code>
                  </p>
                </div>

                {/* Калькулятор заработка */}
                <div className="commission-breakdown">
                  <h3 className="block-title">Калькулятор заработка</h3>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '12px',
                    padding: '1.5rem'
                  }}>
                    {/* Количество рефералов */}
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '0.85rem',
                        color: 'rgba(255, 255, 255, 0.7)',
                        marginBottom: '0.5rem',
                        fontWeight: '600'
                      }}>
                        Количество рефералов
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <input
                          type="range"
                          min="1"
                          max="200"
                          value={calculatorReferrals}
                          onChange={(e) => setCalculatorReferrals(Number(e.target.value))}
                          style={{
                            flex: 1,
                            height: '6px',
                            borderRadius: '3px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            outline: 'none',
                            appearance: 'none',
                            cursor: 'pointer'
                          }}
                        />
                        <span style={{
                          fontSize: '1.2rem',
                          fontWeight: '800',
                          color: '#9FFF00',
                          minWidth: '50px',
                          textAlign: 'right'
                        }}>
                          {calculatorReferrals}
                        </span>
                      </div>
                    </div>

                    {/* Средний чек */}
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '0.85rem',
                        color: 'rgba(255, 255, 255, 0.7)',
                        marginBottom: '0.5rem',
                        fontWeight: '600'
                      }}>
                        Средний чек (₽)
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <input
                          type="range"
                          min="100"
                          max="2000"
                          step="100"
                          value={calculatorAvgCheck}
                          onChange={(e) => setCalculatorAvgCheck(Number(e.target.value))}
                          style={{
                            flex: 1,
                            height: '6px',
                            borderRadius: '3px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            outline: 'none',
                            appearance: 'none',
                            cursor: 'pointer'
                          }}
                        />
                        <span style={{
                          fontSize: '1.2rem',
                          fontWeight: '800',
                          color: '#9FFF00',
                          minWidth: '80px',
                          textAlign: 'right'
                        }}>
                          {calculatorAvgCheck}₽
                        </span>
                      </div>
                    </div>

                    {/* Процент повторных */}
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '0.85rem',
                        color: 'rgba(255, 255, 255, 0.7)',
                        marginBottom: '0.5rem',
                        fontWeight: '600'
                      }}>
                        % повторных платежей в месяц
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={calculatorRecurringRate}
                          onChange={(e) => setCalculatorRecurringRate(Number(e.target.value))}
                          style={{
                            flex: 1,
                            height: '6px',
                            borderRadius: '3px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            outline: 'none',
                            appearance: 'none',
                            cursor: 'pointer'
                          }}
                        />
                        <span style={{
                          fontSize: '1.2rem',
                          fontWeight: '800',
                          color: '#9FFF00',
                          minWidth: '50px',
                          textAlign: 'right'
                        }}>
                          {calculatorRecurringRate}%
                        </span>
                      </div>
                    </div>

                    {/* Результаты */}
                    <div style={{
                      background: 'rgba(159, 255, 0, 0.05)',
                      border: '1px solid rgba(159, 255, 0, 0.3)',
                      borderRadius: '12px',
                      padding: '1rem'
                    }}>
                      <div style={{
                        fontSize: '0.75rem',
                        color: 'rgba(255, 255, 255, 0.6)',
                        marginBottom: '0.75rem',
                        fontWeight: '600',
                        textAlign: 'center'
                      }}>
                        ВАШ ДОХОД В МЕСЯЦ
                      </div>

                      {/* Доход от первого платежа */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.75rem',
                        paddingBottom: '0.75rem',
                        borderBottom: '1px solid rgba(159, 255, 0, 0.2)'
                      }}>
                        <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                          С первого платежа (100%)
                        </span>
                        <span style={{
                          fontSize: '1.1rem',
                          fontWeight: '800',
                          color: '#9FFF00'
                        }}>
                          {(calculatorReferrals * calculatorAvgCheck).toLocaleString('ru-RU')} ₽
                        </span>
                      </div>

                      {/* Доход от повторных */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1rem',
                        paddingBottom: '0.75rem',
                        borderBottom: '1px solid rgba(159, 255, 0, 0.2)'
                      }}>
                        <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                          С повторных ({levelInfo.currentRate}%)
                        </span>
                        <span style={{
                          fontSize: '1.1rem',
                          fontWeight: '800',
                          color: 'rgba(159, 255, 0, 0.9)'
                        }}>
                          {Math.round(calculatorReferrals * calculatorAvgCheck * (calculatorRecurringRate / 100) * (levelInfo.currentRate / 100)).toLocaleString('ru-RU')} ₽
                        </span>
                      </div>

                      {/* Итого */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingTop: '0.75rem',
                        borderTop: '2px solid rgba(159, 255, 0, 0.5)'
                      }}>
                        <span style={{
                          fontSize: '0.95rem',
                          color: '#ffffff',
                          fontWeight: '700'
                        }}>
                          ИТОГО
                        </span>
                        <span style={{
                          fontSize: '1.8rem',
                          fontWeight: '900',
                          color: '#9FFF00',
                          textShadow: '0 0 20px rgba(159, 255, 0, 0.6)'
                        }}>
                          {(calculatorReferrals * calculatorAvgCheck + Math.round(calculatorReferrals * calculatorAvgCheck * (calculatorRecurringRate / 100) * (levelInfo.currentRate / 100))).toLocaleString('ru-RU')} ₽
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Информация */}
              <div className="info-section">
                <h3 className="block-title">Условия программы</h3>
                <ul className="info-list-okx">
                  <li>Получайте <strong>100%</strong> от первого платежа каждого приглашенного клиента</li>
                  <li>Зарабатывайте <strong>{levelInfo.currentRate}%</strong> со всех последующих покупок</li>
                  <li>Повышайте уровень для увеличения процента комиссии</li>
                  <li>Минимальная сумма для вывода: <strong>1 000 ₽</strong></li>
                  <li>Выплаты в течение <strong>7 рабочих дней</strong></li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'levels' && (
            <div className="tab-content">
              <div className="section-header">
                <h2>Система уровней</h2>
                <p className="subtitle">Привлекайте больше пользователей для повышения комиссии</p>
              </div>

              {/* Текущий уровень */}
              <div className="current-level-card">
                <div className="level-header-large">
                  <div className="level-badge-large">
                    <div>
                      <div className="level-number">Уровень {levelInfo.level}</div>
                      <div className="level-rate-large">Ставка {levelInfo.currentRate}%</div>
                    </div>
                  </div>
                  <div className="level-users">
                    <div className="users-count">{stats.totalPaidUsers}</div>
                    <div className="users-label">Приглашено</div>
                  </div>
                </div>

                {/* Прогресс */}
                <div className="progress-section">
                  <div className="progress-info">
                    <span>Прогресс до следующего уровня</span>
                    {levelInfo.usersUntilNext > 0 && (
                      <span className="progress-remaining">{levelInfo.usersUntilNext} пользователей осталось</span>
                    )}
                  </div>
                  <div className="progress-bar-large">
                    <div 
                      className="progress-fill-large" 
                      style={{ width: `${levelInfo.progress}%` }}
                    >
                      <span className="progress-label">{Math.round(levelInfo.progress)}%</span>
                    </div>
                  </div>
                  {levelInfo.usersUntilNext === 0 && (
                    <p className="max-level-text">Поздравляем! Вы достигли максимального уровня</p>
                  )}
                </div>
              </div>

              {/* Все уровни */}
              <div className="levels-grid">
                <div className={`level-card-compact ${levelInfo.level >= 1 ? 'active' : ''}`}>
                  <div className="level-card-header">
                    <span className="level-number-card">1</span>
                    <span className="level-status">{levelInfo.level >= 1 ? 'Текущий' : 'Заблокирован'}</span>
                  </div>
                  <h3 className="level-title-compact">Уровень 1</h3>
                  <div className="level-rate-display-compact">
                    <span className="rate-value-compact">10%</span>
                  </div>
                  <div className="level-requirement">
                    <span>0+ пользователей</span>
                  </div>
                  <ul className="level-benefits-list">
                    <li>100% от первого платежа</li>
                    <li>10% от последующих</li>
                  </ul>
                </div>

                <div className={`level-card-compact ${levelInfo.level >= 2 ? 'active' : ''}`}>
                  <div className="level-card-header">
                    <span className="level-number-card">2</span>
                    <span className="level-status">{levelInfo.level >= 2 ? 'Текущий' : 'Заблокирован'}</span>
                  </div>
                  <h3 className="level-title-compact">Уровень 2</h3>
                  <div className="level-rate-display-compact">
                    <span className="rate-value-compact">20%</span>
                  </div>
                  <div className="level-requirement">
                    <span>10+ пользователей</span>
                  </div>
                  <ul className="level-benefits-list">
                    <li>100% от первого платежа</li>
                    <li>20% от последующих</li>
                  </ul>
                </div>

                <div className={`level-card-compact ${levelInfo.level >= 3 ? 'active' : ''}`}>
                  <div className="level-card-header">
                    <span className="level-number-card">3</span>
                    <span className="level-status">{levelInfo.level >= 3 ? 'Текущий' : 'Заблокирован'}</span>
                  </div>
                  <h3 className="level-title-compact">Уровень 3</h3>
                  <div className="level-rate-display-compact">
                    <span className="rate-value-compact">30%</span>
                  </div>
                  <div className="level-requirement">
                    <span>25+ пользователей</span>
                  </div>
                  <ul className="level-benefits-list">
                    <li>100% от первого платежа</li>
                    <li>30% от последующих</li>
                  </ul>
                </div>

                <div className={`level-card-compact ${levelInfo.level >= 4 ? 'active' : ''}`}>
                  <div className="level-card-header">
                    <span className="level-number-card">4</span>
                    <span className="level-status">{levelInfo.level >= 4 ? 'Текущий' : 'Заблокирован'}</span>
                  </div>
                  <h3 className="level-title-compact">Уровень 4</h3>
                  <div className="level-rate-display-compact">
                    <span className="rate-value-compact">40%</span>
                  </div>
                  <div className="level-requirement">
                    <span>50+ пользователей</span>
                  </div>
                  <ul className="level-benefits-list">
                    <li>100% от первого платежа</li>
                    <li>40% от последующих</li>
                  </ul>
                </div>

                <div className={`level-card-compact ${levelInfo.level >= 5 ? 'active' : ''}`}>
                  <div className="level-card-header">
                    <span className="level-number-card">5</span>
                    <span className="level-status">{levelInfo.level >= 5 ? 'Текущий' : 'Заблокирован'}</span>
                  </div>
                  <h3 className="level-title-compact">Уровень 5</h3>
                  <div className="level-rate-display-compact">
                    <span className="rate-value-compact">45%</span>
                  </div>
                  <div className="level-requirement">
                    <span>75+ пользователей</span>
                  </div>
                  <ul className="level-benefits-list">
                    <li>100% от первого платежа</li>
                    <li>45% от последующих</li>
                  </ul>
                </div>

                <div className={`level-card-compact ${levelInfo.level >= 6 ? 'active' : ''}`}>
                  <div className="level-card-header">
                    <span className="level-number-card">6</span>
                    <span className="level-status">{levelInfo.level >= 6 ? 'Текущий' : 'Заблокирован'}</span>
                  </div>
                  <h3 className="level-title-compact">Уровень 6</h3>
                  <div className="level-rate-display-compact">
                    <span className="rate-value-compact">50%</span>
                  </div>
                  <div className="level-requirement">
                    <span>125+ пользователей</span>
                  </div>
                  <ul className="level-benefits-list">
                    <li>100% от первого платежа</li>
                    <li>50% от последующих</li>
                  </ul>
                </div>
              </div>

              {/* Дополнительная информация */}
              <div className="levels-info">
                <h3 className="block-title">Как повысить уровень</h3>
                <div className="tips-grid">
                  <div className="tip-card">
                    <h4>Приглашайте активно</h4>
                    <p>Делитесь промокодом с потенциальными клиентами</p>
                  </div>
                  <div className="tip-card">
                    <h4>Создавайте контент</h4>
                    <p>Рассказывайте о VEXTR в соцсетях и блогах</p>
                  </div>
                  <div className="tip-card">
                    <h4>Помогайте клиентам</h4>
                    <p>Качественная поддержка увеличивает конверсию</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'wallet' && (
            <div className="tab-content">
              <div className="section-header">
                <h2>Кошелек</h2>
                <p className="subtitle">Управляйте своими заработками</p>
              </div>

              {/* Баланс */}
              <div className="wallet-summary-grid">
                <div className="wallet-card">
                  <div className="wallet-card-header">
                    <span className="wallet-label">Общий заработок</span>
                  </div>
                  <div className="wallet-value">
                    {(
                      (stats.firstPaymentsRevenue * (100 - stats.discount) / 100) + 
                      stats.recurringPaymentsRevenue
                    ).toFixed(2)} ₽
                  </div>
                  <div className="wallet-description">
                    Вся комиссия за все время
                  </div>
                </div>

                <div className="wallet-card highlight">
                  <div className="wallet-card-header">
                    <span className="wallet-label">Доступно для вывода</span>
                  </div>
                  <div className="wallet-value">
                    {(
                      (stats.firstPaymentsRevenue * (100 - stats.discount) / 100) + 
                      stats.recurringPaymentsRevenue
                    ).toFixed(2)} ₽
                  </div>
                  <div className="wallet-description">
                    Можно вывести прямо сейчас
                  </div>
                </div>

                <div className="wallet-card">
                  <div className="wallet-card-header">
                    <span className="wallet-label">Выведено</span>
                  </div>
                  <div className="wallet-value">
                    0.00 ₽
                  </div>
                  <div className="wallet-description">
                    Всего выплачено
                  </div>
                </div>
              </div>

              {/* Кнопка вывода */}
              <div className="withdrawal-section">
                <div className="withdrawal-info-card">
                  <h3>Как вывести средства</h3>
                  <ul className="withdrawal-steps">
                    <li>Минимальная сумма для вывода: <strong>1 000 ₽</strong></li>
                    <li>Нажмите кнопку "Запросить вывод"</li>
                    <li>Напишите в поддержку сумму и реквизиты</li>
                    <li>Получите выплату в течение <strong>7 рабочих дней</strong></li>
                  </ul>
                  <a 
                    href="https://t.me/vextrsupport" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn-withdrawal"
                  >
                    Запросить вывод средств
                  </a>
                </div>
              </div>

              {/* История выводов */}
              <div className="withdrawal-history">
                <h3 className="block-title">История выводов</h3>
                <div className="history-placeholder">
                  <p>У вас пока нет выводов</p>
                  <p className="placeholder-hint">Когда вы запросите вывод средств, он появится здесь</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <Footer />
      <style jsx>{styles}</style>
    </>
  )
}

const styles = `
  * {
    box-sizing: border-box;
  }

  html, body {
    overflow-x: hidden;
    width: 100%;
    max-width: 100vw;
    margin: 0;
    padding: 0;
  }

  .dashboard-loading {
    min-height: 80vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }

  .spinner-container {
    text-align: center;
  }

  .spinner {
    display: inline-block;
    width: 48px;
    height: 48px;
    border: 4px solid rgba(159, 255, 0, 0.2);
    border-top-color: #9FFF00;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .spinner-container p {
    margin-top: 1.5rem;
    font-size: 1.1rem;
    color: #9FFF00;
    font-weight: 500;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .dashboard-wrapper {
    position: relative;
    min-height: 100vh;
    padding-top: 80px;
    background: #0a0a0a;
    overflow-x: hidden !important;
    width: 100%;
    max-width: 100vw;
  }

  /* Плавающие элементы */
  .float-element {
    position: fixed;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(159, 255, 0, 0.05) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }

  .float-1 {
    width: 400px;
    height: 400px;
    top: 100px;
    right: 0;
    animation: float 20s ease-in-out infinite;
  }

  .float-2 {
    width: 300px;
    height: 300px;
    bottom: 0;
    left: 0;
    animation: float 15s ease-in-out infinite reverse;
  }

  .float-3 {
    width: 200px;
    height: 200px;
    top: 50%;
    left: 30%;
    animation: float 25s ease-in-out infinite;
  }

  @keyframes float {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(50px, -50px) scale(1.1); }
    66% { transform: translate(-50px, 50px) scale(0.9); }
  }

  /* Pending state */
  .dashboard-container {
    position: relative;
    min-height: 80vh;
    padding: 120px 1.5rem 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow-x: hidden;
    width: 100%;
    max-width: 100vw;
  }

  .pending-state {
    position: relative;
    z-index: 1;
    max-width: 700px;
    margin: 0 auto;
    padding: 4rem 2.5rem;
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    text-align: center;
  }

  .pending-title {
    font-size: 2.2rem;
    font-weight: 700;
    color: #9FFF00;
    margin-bottom: 1.5rem;
  }

  .pending-text {
    font-size: 1.15rem;
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.6;
    margin-bottom: 2.5rem;
  }

  .btn-back {
    padding: 1.2rem 2.5rem;
    border-radius: 50px;
    background: #9FFF00;
    border: none;
    color: #000;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 20px rgba(159, 255, 0, 0.3);
  }

  .btn-back:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 30px rgba(159, 255, 0, 0.5);
  }

  /* Упрощенная шапка */
  .program-header-simple {
    position: relative;
    z-index: 10;
    max-width: 1400px;
    width: 100%;
    margin: 0 auto;
    padding: 1.5rem 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    box-sizing: border-box;
  }

  .program-meta-simple {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    align-items: center;
  }

  .level-badge-simple {
    padding: 0.6rem 1.2rem;
    background: rgba(159, 255, 0, 0.15);
    border: 1px solid rgba(159, 255, 0, 0.3);
    border-radius: 20px;
    font-size: 1rem;
    font-weight: 600;
    color: #9FFF00;
  }

  .rate-info-simple {
    font-size: 1rem;
    color: rgba(255, 255, 255, 0.8);
    font-weight: 500;
  }

  .btn-logout-header {
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #fff;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-logout-header:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  /* Вкладки */
  .tabs-container {
    position: relative;
    z-index: 10;
    max-width: 1400px;
    width: 100%;
    margin: 0 auto;
    padding: 0 2rem 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    box-sizing: border-box;
  }

  .tabs {
    display: flex;
    gap: 0.5rem;
  }

  .tab {
    padding: 0.75rem 1.5rem;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
  }

  .tab:hover {
    color: rgba(255, 255, 255, 0.9);
  }

  .tab.active {
    color: #9FFF00;
    border-bottom-color: #9FFF00;
  }

  /* Контент */
  .dashboard-content {
    position: relative;
    z-index: 1;
    max-width: 1400px;
    width: 100%;
    margin: 0 auto;
    padding: 2rem;
    box-sizing: border-box;
    overflow-x: hidden;
  }

  .tab-content {
    animation: fadeIn 0.3s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .section-header {
    margin-bottom: 2rem;
  }

  .section-header-with-filter {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .section-header h2,
  .section-header-with-filter h2 {
    font-size: 1.8rem;
    font-weight: 700;
    color: #fff;
    margin: 0 0 0.5rem;
  }

  .last-update,
  .subtitle {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.5);
    margin: 0;
  }

  /* Фильтр по времени */
  .time-filter {
    display: flex;
    gap: 0.5rem;
    background: rgba(255, 255, 255, 0.03);
    padding: 0.5rem;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .filter-btn {
    padding: 0.75rem 1.5rem;
    background: transparent;
    border: none;
    border-radius: 8px;
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .filter-btn:hover {
    color: rgba(255, 255, 255, 0.9);
    background: rgba(255, 255, 255, 0.05);
  }

  .filter-btn.active {
    background: rgba(159, 255, 0, 0.15);
    color: #9FFF00;
    border: 1px solid rgba(159, 255, 0, 0.3);
  }

  /* Статистика (стиль OKX) */
  .stats-grid-okx {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .stats-grid-compact {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
    width: 100%;
    box-sizing: border-box;
  }

  .stat-card-okx {
    padding: 1.5rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    transition: all 0.2s ease;
  }

  .stat-card-okx.highlight {
    background: rgba(159, 255, 0, 0.05);
    border-color: rgba(159, 255, 0, 0.3);
  }

  .stat-card-okx:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(159, 255, 0, 0.2);
  }

  .stat-card-okx.highlight:hover {
    background: rgba(159, 255, 0, 0.08);
  }

  .stat-header-okx {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .stat-label-okx {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.6);
  }

  .stat-value-okx {
    font-size: 1.8rem;
    font-weight: 700;
    color: #fff;
  }

  .stat-value-okx.green {
    color: #9FFF00;
  }

  .stat-revenue {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.6);
    margin-top: 0.5rem;
  }

  /* Контент в 2 колонки */
  .content-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin-bottom: 2rem;
    width: 100%;
    box-sizing: border-box;
  }

  .promo-block,
  .commission-breakdown {
    padding: 2rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    width: 100%;
    box-sizing: border-box;
    overflow-x: hidden;
  }

  .block-title {
    font-size: 1.2rem;
    font-weight: 600;
    color: #fff;
    margin: 0 0 1.5rem;
  }

  .promo-rates {
    display: flex;
    align-items: center;
    justify-content: space-around;
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: rgba(159, 255, 0, 0.05);
    border-radius: 12px;
  }

  .rate-item {
    text-align: center;
  }

  .rate-label {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.6);
    margin-bottom: 0.5rem;
  }

  .rate-value {
    font-size: 2rem;
    font-weight: 700;
    color: #9FFF00;
    margin-bottom: 0.25rem;
  }

  .rate-desc {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.5);
  }

  .rate-divider {
    font-size: 2rem;
    color: rgba(159, 255, 0, 0.5);
    font-weight: 700;
    margin: 0 1rem;
    position: relative;
  }

  .rate-divider::before {
    content: '';
    position: absolute;
    left: 50%;
    top: -20px;
    bottom: -20px;
    width: 1px;
    background: linear-gradient(to bottom, transparent, rgba(159, 255, 0, 0.3), transparent);
  }

  /* Управление скидкой */
  .discount-control {
    padding: 1.5rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 12px;
    margin-bottom: 1.5rem;
  }

  .discount-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .discount-label {
    font-size: 0.95rem;
    color: rgba(255, 255, 255, 0.8);
  }

  .discount-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #9FFF00;
  }

  .discount-slider {
    width: 100%;
    height: 8px;
    -webkit-appearance: none;
    appearance: none;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 5px;
    outline: none;
    margin-bottom: 0.5rem;
  }

  .discount-slider::-webkit-slider-track {
    height: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 5px;
  }

  .discount-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    background: #9FFF00;
    cursor: pointer;
    border-radius: 50%;
    box-shadow: 0 0 10px rgba(159, 255, 0, 0.5);
    margin-top: -6px;
  }

  .discount-slider::-moz-range-track {
    height: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 5px;
    border: none;
  }

  .discount-slider::-moz-range-thumb {
    width: 20px;
    height: 20px;
    background: #9FFF00;
    cursor: pointer;
    border-radius: 50%;
    border: none;
    box-shadow: 0 0 10px rgba(159, 255, 0, 0.5);
  }

  .discount-slider:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .discount-marks {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.5);
    margin-bottom: 1rem;
  }

  .btn-save-discount {
    width: 100%;
    padding: 0.75rem;
    background: rgba(159, 255, 0, 0.1);
    border: 1px solid rgba(159, 255, 0, 0.3);
    border-radius: 8px;
    color: #9FFF00;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-bottom: 0.75rem;
  }

  .btn-save-discount:hover:not(:disabled) {
    background: rgba(159, 255, 0, 0.2);
  }

  .btn-save-discount:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .discount-hint {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.5);
    text-align: center;
    margin: 0;
    line-height: 1.4;
  }

  .promo-code-container {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .promo-input-okx {
    flex: 1;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: #9FFF00;
    font-size: 1.2rem;
    font-weight: 700;
    text-align: center;
    letter-spacing: 3px;
    font-family: monospace;
  }

  .btn-copy-okx {
    padding: 1rem 1.5rem;
    background: rgba(159, 255, 0, 0.1);
    border: 1px solid rgba(159, 255, 0, 0.3);
    border-radius: 8px;
    color: #9FFF00;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .btn-copy-okx:hover {
    background: rgba(159, 255, 0, 0.2);
  }

  .promo-hint {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.6);
    margin: 0;
    text-align: center;
  }

  .promo-hint code {
    padding: 0.25rem 0.5rem;
    background: rgba(159, 255, 0, 0.1);
    border-radius: 4px;
    color: #9FFF00;
    font-family: monospace;
  }

  /* Разбивка комиссий */
  .commission-items {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .commission-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
  }

  .commission-label {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.8);
  }

  .commission-amount {
    font-size: 1.2rem;
    font-weight: 700;
    color: #fff;
    flex: 1;
    text-align: right;
    padding: 0 1rem;
  }

  .commission-percent {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.5);
    width: 50px;
    text-align: right;
  }

  .commission-total {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 1rem;
    margin-top: 0.5rem;
    background: rgba(159, 255, 0, 0.05);
    border: 1px solid rgba(159, 255, 0, 0.2);
    border-radius: 8px;
  }

  .commission-total .commission-label {
    font-weight: 600;
    color: #fff;
  }

  .commission-total .commission-amount {
    color: #9FFF00;
    font-size: 1.5rem;
  }

  /* Информация */
  .info-section {
    padding: 2rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    width: 100%;
    box-sizing: border-box;
  }

  .info-list-okx {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .info-list-okx li {
    padding: 0.75rem 0;
    padding-left: 1.5rem;
    position: relative;
    font-size: 0.95rem;
    color: rgba(255, 255, 255, 0.8);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .info-list-okx li:last-child {
    border-bottom: none;
  }

  .info-list-okx li::before {
    content: '✓';
    position: absolute;
    left: 0;
    color: #9FFF00;
    font-weight: 700;
  }

  .info-list-okx strong {
    color: #9FFF00;
    font-weight: 600;
  }

  /* Вкладка "Уровни" */
  .current-level-card {
    padding: 2.5rem;
    background: linear-gradient(135deg, rgba(159, 255, 0, 0.1) 0%, rgba(159, 255, 0, 0.03) 100%);
    border: 2px solid rgba(159, 255, 0, 0.3);
    border-radius: 20px;
    margin-bottom: 3rem;
    width: 100%;
    box-sizing: border-box;
  }

  .level-header-large {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 2rem;
    margin-bottom: 2rem;
  }

  .level-badge-large {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .level-number {
    font-size: 1.8rem;
    font-weight: 700;
    color: #fff;
    margin-bottom: 0.25rem;
  }

  .level-rate-large {
    font-size: 1.2rem;
    color: #9FFF00;
    font-weight: 600;
  }

  .level-users {
    text-align: right;
  }

  .users-count {
    font-size: 3rem;
    font-weight: 700;
    color: #9FFF00;
    line-height: 1;
    margin-bottom: 0.5rem;
  }

  .users-label {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.6);
  }

  .progress-section {
    margin-top: 2rem;
  }

  .progress-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    font-size: 0.95rem;
    color: rgba(255, 255, 255, 0.8);
  }

  .progress-remaining {
    color: #9FFF00;
    font-weight: 600;
  }

  .progress-bar-large {
    height: 20px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50px;
    overflow: hidden;
    position: relative;
  }

  .progress-fill-large {
    height: 100%;
    background: linear-gradient(90deg, #9FFF00 0%, #7FDF00 100%);
    border-radius: 50px;
    transition: width 0.5s ease;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 1rem;
  }

  .progress-label {
    font-size: 0.8rem;
    font-weight: 700;
    color: #000;
  }

  .max-level-text {
    text-align: center;
    margin-top: 1rem;
    font-size: 1.1rem;
    color: #9FFF00;
    font-weight: 600;
  }

  /* Сетка уровней */
  .levels-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 3rem;
    width: 100%;
    box-sizing: border-box;
  }

  .level-card-compact {
    padding: 1.25rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    transition: all 0.3s ease;
  }

  .level-card-compact.active {
    background: rgba(159, 255, 0, 0.05);
    border-color: rgba(159, 255, 0, 0.3);
  }

  .level-card-compact:hover {
    transform: translateY(-2px);
  }

  .level-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .level-number-card {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(159, 255, 0, 0.1);
    border: 2px solid rgba(159, 255, 0, 0.3);
    border-radius: 50%;
    font-size: 1.2rem;
    font-weight: 700;
    color: #9FFF00;
  }

  .level-status {
    padding: 0.4rem 0.8rem;
    background: rgba(159, 255, 0, 0.1);
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    color: #9FFF00;
    text-transform: uppercase;
  }

  .level-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: #fff;
    margin: 0 0 0.5rem;
  }

  .level-title-compact {
    font-size: 1.1rem;
    font-weight: 600;
    color: #fff;
    margin: 0 0 1rem;
  }

  .level-subtitle {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.6);
    margin: 0 0 1.5rem;
  }

  .level-rate-display {
    padding: 1.5rem;
    background: rgba(159, 255, 0, 0.05);
    border-radius: 12px;
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .level-rate-display-compact {
    padding: 1rem;
    background: rgba(159, 255, 0, 0.05);
    border-radius: 8px;
    text-align: center;
    margin-bottom: 1rem;
  }

  .rate-label {
    display: block;
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.6);
    margin-bottom: 0.5rem;
  }

  .rate-value-large {
    font-size: 2.5rem;
    font-weight: 700;
    color: #9FFF00;
  }

  .rate-value-compact {
    font-size: 1.8rem;
    font-weight: 700;
    color: #9FFF00;
  }

  .level-requirement {
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    margin-bottom: 1.5rem;
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.8);
    text-align: center;
  }

  .level-benefits-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .level-benefits-list li {
    padding: 0.5rem 0;
    padding-left: 1.5rem;
    position: relative;
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.7);
  }

  .level-benefits-list li::before {
    content: '✓';
    position: absolute;
    left: 0;
    color: #9FFF00;
    font-weight: 700;
  }

  /* Советы */
  .levels-info {
    padding: 2rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    width: 100%;
    box-sizing: border-box;
  }

  .tips-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-top: 1.5rem;
  }

  .tip-card {
    padding: 1.5rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 12px;
    text-align: center;
  }

  .tip-card h4 {
    font-size: 1.1rem;
    font-weight: 600;
    color: #9FFF00;
    margin: 0 0 0.75rem;
  }

  .tip-card p {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.7);
    margin: 0;
    line-height: 1.5;
  }

  /* Адаптивность */
  @media (max-width: 1200px) {
    .content-row {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 768px) {
    .dashboard-content {
      padding: 1.5rem 1rem;
    }

    .program-header-simple {
      padding: 1rem;
    }

    .program-meta-simple {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .tabs-container {
      padding: 0 1rem 1rem;
    }

    .section-header-with-filter {
      flex-direction: column;
      align-items: flex-start;
    }

    .time-filter {
      width: 100%;
      justify-content: space-between;
    }

    .filter-btn {
      flex: 1;
      padding: 0.6rem 0.75rem;
      font-size: 0.85rem;
    }

    .stats-grid-okx,
    .stats-grid-compact {
      grid-template-columns: 1fr;
    }

    .levels-grid {
      grid-template-columns: 1fr;
    }

    .level-header-large {
      flex-direction: column;
      align-items: flex-start;
    }

    .level-users {
      text-align: left;
    }

    .tips-grid {
      grid-template-columns: 1fr;
    }
  }

  /* ============================================
     WALLET TAB STYLES
     ============================================ */

  .wallet-summary-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .wallet-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(159, 255, 0, 0.1);
    border-radius: 16px;
    padding: 1.5rem;
    transition: all 0.3s ease;
  }

  .wallet-card:hover {
    border-color: rgba(159, 255, 0, 0.3);
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(159, 255, 0, 0.1);
  }

  .wallet-card.highlight {
    background: linear-gradient(135deg, rgba(159, 255, 0, 0.08), rgba(159, 255, 0, 0.02));
    border-color: rgba(159, 255, 0, 0.3);
  }

  .wallet-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .wallet-label {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.6);
    font-weight: 500;
  }

  .wallet-value {
    font-size: 2rem;
    font-weight: 700;
    color: #9FFF00;
    margin-bottom: 0.5rem;
    letter-spacing: -0.02em;
  }

  .wallet-description {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.5);
  }

  .withdrawal-section {
    margin: 2rem 0;
  }

  .withdrawal-info-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(159, 255, 0, 0.1);
    border-radius: 16px;
    padding: 2rem;
  }

  .withdrawal-info-card h3 {
    font-size: 1.3rem;
    margin-bottom: 1rem;
    color: #fff;
  }

  .withdrawal-steps {
    list-style: none;
    padding: 0;
    margin: 1.5rem 0;
  }

  .withdrawal-steps li {
    padding: 0.75rem 0;
    padding-left: 2rem;
    position: relative;
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.95rem;
  }

  .withdrawal-steps li::before {
    content: '✓';
    position: absolute;
    left: 0;
    color: #9FFF00;
    font-weight: bold;
    font-size: 1.2rem;
  }

  .btn-withdrawal {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    background: linear-gradient(135deg, #9FFF00, #7ACC00);
    color: #000;
    padding: 1rem 2rem;
    border-radius: 12px;
    font-weight: 600;
    font-size: 1rem;
    text-decoration: none;
    transition: all 0.3s ease;
    margin-top: 1rem;
    border: none;
    cursor: pointer;
  }

  .btn-withdrawal:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(159, 255, 0, 0.3);
  }

  .withdrawal-history {
    margin: 2rem 0;
  }

  .history-placeholder {
    background: rgba(255, 255, 255, 0.02);
    border: 2px dashed rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 3rem 2rem;
    text-align: center;
  }

  .history-placeholder p {
    color: rgba(255, 255, 255, 0.5);
    margin: 0.5rem 0;
  }

  .placeholder-hint {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.3) !important;
  }

  /* Mobile responsiveness for wallet */
  @media (max-width: 768px) {
    .wallet-summary-grid {
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .wallet-value {
      font-size: 1.5rem;
    }

    .withdrawal-info-card {
      padding: 1.5rem;
    }

    .btn-withdrawal {
      width: 100%;
      justify-content: center;
    }

    .history-placeholder {
      padding: 2rem 1rem;
    }
  }
`

export default PartnerDashboard
