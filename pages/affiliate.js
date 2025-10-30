import React, { useEffect, useState } from 'react'
import Head from 'next/head'
import Script from 'next/script'
import { useRouter } from 'next/router'
import Navigation from '../components/navigation'
import Footer from '../components/footer'

const Affiliate = () => {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [calculatorReferrals, setCalculatorReferrals] = useState(10)
  const [calculatorAvgCheck, setCalculatorAvgCheck] = useState(500)
  const [calculatorRecurringRate, setCalculatorRecurringRate] = useState(30)

  useEffect(() => {
    // Проверяем, есть ли пользователь Telegram и одобренная заявка
    const checkPartnerStatus = async () => {
      const savedUser = localStorage.getItem('telegram_user')
      
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser)
          
          // Проверяем статус заявки
          const response = await fetch(`/api/partner/stats?telegram_id=${user.id}`)
          
          const data = await response.json()
          
          // Если заявка одобрена - редирект в кабинет
          if (data.stats && data.stats.status === 'approved') {
            router.push('/partner-dashboard')
            return
          }
        } catch (error) {
          console.error('Ошибка проверки статуса:', error)
        }
      }
      
      setChecking(false)
    }

    checkPartnerStatus()
  }, [router])

  // Показываем загрузку пока проверяем
  if (checking) {
    return (
      <>
        <Head>
          <title>Партнерская программа — VEXTR</title>
        </Head>
        <Navigation />
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000'
        }}>
          <div style={{
            fontSize: '1.2rem',
            color: '#9FFF00',
            fontWeight: '600'
          }}>
            Проверка статуса...
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>Партнерская программа — VEXTR | Заработок до 100% комиссии</title>
        <meta name="description" content="Самая выгодная партнерская программа на рынке. Получайте 100% от первого платежа и до 50% от повторных платежей ваших рефералов. Регистрация бесплатно." />
        <meta name="keywords" content="партнерская программа, рефералы, заработок, VEXTR, партнерство, промокод, комиссия, пассивный доход" />
        <meta name="author" content="VEXTR" />
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://vextr.ru/affiliate" />
        <meta property="og:title" content="Партнерская программа VEXTR | Заработок до 100% комиссии" />
        <meta property="og:description" content="Получайте 100% от первого платежа и до 50% от повторных. Стабильный пассивный доход. Регистрация бесплатно." />
        <meta property="og:image" content="https://vextr.ru/og-affiliate.png" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://vextr.ru/affiliate" />
        <meta name="twitter:title" content="Партнерская программа VEXTR | Заработок до 100%" />
        <meta name="twitter:description" content="100% от первого платежа + до 50% от повторных. Пассивный доход 24/7." />
        <meta name="twitter:image" content="https://vextr.ru/og-affiliate.png" />
        
        {/* Structured Data (JSON-LD) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Offer",
              "name": "Партнерская программа VEXTR",
              "description": "Получайте 100% от первого платежа и до 50% от повторных платежей ваших рефералов. Пассивный доход 24/7.",
              "url": "https://vextr.ru/affiliate",
              "price": "0",
              "priceCurrency": "RUB",
              "seller": {
                "@type": "Organization",
                "name": "VEXTR",
                "url": "https://vextr.ru"
              }
            })
          }}
        />
      </Head>
      <Navigation />
      
      <main style={{ paddingTop: 80 }}>
        {/* Premium Hero Section - OKX Style */}
        <section className="affiliate-hero-premium" style={{ 
          padding: '6rem 0 8rem 0',
          background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(159, 255, 0, 0.15), transparent 50%), linear-gradient(180deg, #000000 0%, #0a0f0a 100%)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Animated background elements */}
          <div style={{
            position: 'absolute',
            top: '10%',
            left: '5%',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(159, 255, 0, 0.1) 0%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(60px)',
            animation: 'float 8s ease-in-out infinite',
            pointerEvents: 'none'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '10%',
            right: '5%',
            width: '500px',
            height: '500px',
            background: 'radial-gradient(circle, rgba(159, 255, 0, 0.08) 0%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(80px)',
            animation: 'float 10s ease-in-out infinite reverse',
            pointerEvents: 'none'
          }} />

          <div style={{ 
            maxWidth: '1400px', 
            margin: '0 auto', 
            padding: '0 3rem',
            position: 'relative',
            zIndex: 1
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1fr',
              gap: '6rem',
              alignItems: 'center'
            }}>
              {/* Left Block - Content */}
              <div className="hero-content" style={{ 
                animation: 'fadeInUp 1s ease-out'
              }}>
                <div style={{
                  display: 'inline-block',
                  padding: '0.5rem 1.2rem',
                  background: 'rgba(159, 255, 0, 0.1)',
                  border: '1px solid rgba(159, 255, 0, 0.3)',
                  borderRadius: '9999px',
                marginBottom: '2rem',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: '#9FFF00',
                  letterSpacing: '0.5px'
                }}>
                  ⚡ ПАРТНЕРСКАЯ ПРОГРАММА
                </div>

                <h1 style={{ 
                  fontSize: '3.75rem',
                  fontWeight: '800',
                  lineHeight: '1.1',
                  marginBottom: '1.5rem',
                color: '#ffffff',
                  letterSpacing: '-0.02em',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                }}>
                  Монетизируйте свое влияние с{' '}
                  <span style={{ 
                    background: 'linear-gradient(135deg, #9FFF00 0%, #00ff88 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                    VEXTR
                  </span>
                </h1>

                <p style={{ 
                  fontSize: '1.25rem', 
                  lineHeight: '1.7', 
                  marginBottom: '2.5rem',
                  color: 'rgba(255, 255, 255, 0.7)',
                  maxWidth: '600px',
                  fontWeight: '400'
                }}>
                  Вы имеете опыт в продажах или у вас много друзей? Присоединяйтесь к партнерской программе VEXTR и получайте доход!
                </p>

                <div style={{
                  padding: '2rem',
                  background: 'rgba(159, 255, 0, 0.05)',
                  border: '1px solid rgba(159, 255, 0, 0.2)',
                  borderRadius: '20px',
                  marginBottom: '3rem',
                  backdropFilter: 'blur(10px)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    marginBottom: '1rem'
                  }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      background: '#9FFF00',
                      borderRadius: '50%',
                      boxShadow: '0 0 20px rgba(159, 255, 0, 0.8)'
                    }} />
                    <span style={{
                      fontSize: '2.5rem',
                      fontWeight: '800',
                      color: '#9FFF00',
                      textShadow: '0 0 30px rgba(159, 255, 0, 0.5)'
                    }}>
                      100%
                    </span>
                    <span style={{
                      fontSize: '1.1rem',
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontWeight: '600'
                    }}>
                      от первого платежа
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                  }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      background: 'rgba(159, 255, 0, 0.6)',
                      borderRadius: '50%',
                      boxShadow: '0 0 15px rgba(159, 255, 0, 0.5)'
                    }} />
                    <span style={{
                      fontSize: '2.5rem',
                      fontWeight: '800',
                      color: 'rgba(159, 255, 0, 0.9)'
                    }}>
                      до 50%
                    </span>
                    <span style={{
                fontSize: '1.1rem',
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontWeight: '600'
              }}>
                      от повторных
                    </span>
              </div>
            </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <a 
                    href="/register" 
                    className="cta-button-premium"
                    style={{
                      padding: '1.2rem 3rem',
                      fontSize: '1.1rem',
                      fontWeight: '700',
                      textDecoration: 'none',
                      borderRadius: '9999px',
                      background: 'linear-gradient(135deg, #9FFF00 0%, #7ed900 100%)',
                      color: '#000',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      display: 'inline-block',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 0 40px rgba(159, 255, 0, 0.4), 0 10px 30px rgba(0, 0, 0, 0.3)',
              position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <span style={{ position: 'relative', zIndex: 1 }}>Стать партнёром</span>
                  </a>
                  
                  <a 
                    href="/docs" 
                    style={{
                      padding: '1.2rem 2.5rem',
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      textDecoration: 'none',
                      borderRadius: '9999px',
                      background: 'transparent',
                      color: '#ffffff',
                      border: '2px solid rgba(255, 255, 255, 0.2)',
                      transition: 'all 0.3s ease',
                      display: 'inline-block'
                    }}
                  >
                    Подробнее
                  </a>
                </div>
              </div>

              {/* Right Block - Earnings Calculator */}
              <EarningsCalculator 
                referrals={calculatorReferrals}
                avgCheck={calculatorAvgCheck}
                recurringRate={calculatorRecurringRate}
                onReferralsChange={setCalculatorReferrals}
                onAvgCheckChange={setCalculatorAvgCheck}
                onRecurringRateChange={setCalculatorRecurringRate}
              />
            </div>
          </div>
        </section>

        {/* Advantages Section */}
        <section className="affiliate-advantages" style={{ padding: '4rem 0', backgroundColor: 'var(--color-surface)' }}>
          <div className="affiliate-advantages__container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
            <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '3rem', fontSize: '2.5rem', color: '#ffffff' }}>
              Наши преимущества
            </h2>
            
            <div className="advantages-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
              gap: '2rem'
            }}>
              {/* Card 1: 100% выплата */}
              <div className="advantage-card glass-main" style={{
                padding: '2rem',
                borderRadius: '20px',
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <h3 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#ffffff', fontWeight: '700' }}>
                  100% выплата с первой оплаты
                </h3>
                <div className="card-content" style={{ 
                  maxHeight: '0', 
                  overflow: 'hidden', 
                  transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease',
                  opacity: '0'
                }}>
                  <p style={{ color: '#c7c9cc', lineHeight: '1.6', fontSize: '1rem', marginBottom: '1.5rem', marginTop: '0.5rem' }}>
                    Получайте полную стоимость подписки за каждого приведенного пользователя. Если он оплатил 500₽, вы получаете 500₽!
                  </p>
                  <a href="/register" style={{
                    padding: '0.8rem 1.5rem',
                    borderRadius: '25px',
                    background: 'linear-gradient(135deg, #9bff00 0%, #00d1ff 100%)',
                    border: 'none',
                    color: '#000',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    textDecoration: 'none',
                    display: 'inline-block'
                  }}>
                    Присоединиться
                  </a>
                </div>
              </div>
              
              {/* Card 2: До 50% от повторных */}
              <div className="advantage-card glass-main" style={{
                padding: '2rem',
                borderRadius: '20px',
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <h3 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#ffffff', fontWeight: '700' }}>
                  До 50% от повторных покупок
                </h3>
                <div className="card-content" style={{ 
                  maxHeight: '0', 
                  overflow: 'hidden', 
                  transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease',
                  opacity: '0'
                }}>
                  <p style={{ color: '#c7c9cc', lineHeight: '1.6', fontSize: '1rem', marginBottom: '1.5rem', marginTop: '0.5rem' }}>
                    Продолжайте получать прибыль до 50% от всех последующих платежей ваших рефералов. Пассивный доход!
                  </p>
                  <a href="/register" style={{
                    padding: '0.8rem 1.5rem',
                    borderRadius: '25px',
                    background: 'linear-gradient(135deg, #9bff00 0%, #00d1ff 100%)',
                    border: 'none',
                    color: '#000',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    textDecoration: 'none',
                    display: 'inline-block'
                  }}>
                    Присоединиться
                  </a>
                </div>
              </div>
              
              {/* Card 3: Эксклюзивные награды */}
              <div className="advantage-card glass-main" style={{
                padding: '2rem',
                borderRadius: '20px',
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <h3 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#ffffff', fontWeight: '700' }}>
                  Эксклюзивные награды
                </h3>
                <div className="card-content" style={{ 
                  maxHeight: '0', 
                  overflow: 'hidden', 
                  transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease',
                  opacity: '0'
                }}>
                  <p style={{ color: '#c7c9cc', lineHeight: '1.6', fontSize: '1rem', marginBottom: '1.5rem', marginTop: '0.5rem' }}>
                    Специальные бонусы, призы и эксклюзивные возможности для наших лучших партнеров. Чем больше рефералов, тем больше наград!
                  </p>
                  <a href="/register" style={{
                    padding: '0.8rem 1.5rem',
                    borderRadius: '25px',
                    background: 'linear-gradient(135deg, #9bff00 0%, #00d1ff 100%)',
                    border: 'none',
                    color: '#000',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    textDecoration: 'none',
                    display: 'inline-block'
                  }}>
                    Присоединиться
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How to Join Section */}
        <section className="affiliate-join" style={{ padding: '5rem 0', backgroundColor: 'var(--color-surface)', position: 'relative' }}>
          <div className="affiliate-join__container" style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem' }}>
            <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '4rem', fontSize: '3rem', color: '#ffffff' }}>
              Как присоединиться
            </h2>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '4rem',
              alignItems: 'center'
            }}>
              {/* Left side - Steps */}
              <div className="join-steps">
                {/* Step 1 */}
                <div className="join-step" style={{ 
                  display: 'flex', 
                  gap: '2rem', 
                  marginBottom: '3rem',
                  alignItems: 'flex-start'
              }}>
                <div style={{
                    width: '60px',
                    height: '60px',
                  borderRadius: '50%',
                    background: '#000',
                    color: '#9bff00',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                    fontSize: '1.8rem',
                  fontWeight: '700',
                    flexShrink: 0,
                    border: '3px solid #9bff00'
                }}>
                  1
                </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#ffffff', fontWeight: '700' }}>
                      Подайте заявку
                </h3>
                    <p style={{ color: '#c7c9cc', lineHeight: '1.6', fontSize: '1.1rem', marginBottom: '1.5rem' }}>
                      Уделите несколько минут заполнению заявки, и мы ее рассмотрим. После одобрения вы получите партнерскую ссылку.
                    </p>
                    <a href="/register" style={{
                      display: 'inline-block',
                      padding: '0.9rem 2rem',
                      borderRadius: '50px',
                      background: 'transparent',
                      border: '2px solid #ffffff',
                      color: '#ffffff',
                      fontSize: '1rem',
                      fontWeight: '600',
                      textDecoration: 'none',
                      transition: 'all 0.3s ease'
                    }}>
                      Подать заявку
                    </a>
                  </div>
              </div>
              
                {/* Step 2 */}
                <div className="join-step" style={{ 
                  display: 'flex', 
                  gap: '2rem', 
                  marginBottom: '3rem',
                  alignItems: 'flex-start'
              }}>
                <div style={{
                    width: '60px',
                    height: '60px',
                  borderRadius: '50%',
                    background: '#000',
                    color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                    fontSize: '1.8rem',
                  fontWeight: '700',
                    flexShrink: 0,
                    border: '3px solid #ffffff'
                  }}>
                    2
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#ffffff', fontWeight: '700' }}>
                      Расскажите о нас
                    </h3>
                    <p style={{ color: '#c7c9cc', lineHeight: '1.6', fontSize: '1.1rem' }}>
                      Делитесь своим партнерским кодом, на форумах, в блогах или с друзьями. Чем больше людей узнает о VEXTR, тем больше вы заработаете.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="join-step" style={{ 
                  display: 'flex', 
                  gap: '2rem', 
                  alignItems: 'flex-start'
                }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: '#000',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.8rem',
                    fontWeight: '700',
                    flexShrink: 0,
                    border: '3px solid #ffffff'
                  }}>
                    3
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#ffffff', fontWeight: '700' }}>
                      Получайте вознаграждение
                </h3>
                    <p style={{ color: '#c7c9cc', lineHeight: '1.6', fontSize: '1.1rem' }}>
                      Автоматически получайте 100% от первого платежа и до 50% от всех последующих платежей ваших рефералов на ваш счет.
                </p>
                  </div>
                </div>
              </div>
              
              {/* Right side - Illustration */}
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '500px'
              }}>
                <div style={{
                  width: '400px',
                  height: '400px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(155, 255, 0, 0.1) 0%, rgba(155, 255, 0, 0) 70%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}>
                  {/* Central circle */}
                  <div style={{
                    width: '180px',
                    height: '180px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(20px)',
                    border: '3px solid rgba(155, 255, 0, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 60px rgba(155, 255, 0, 0.2)',
                    overflow: 'hidden'
                  }}>
                    <img src="/step.jpg" alt="Partnership" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>

                  {/* Floating icons */}
                  <div style={{
                    position: 'absolute',
                    top: '20px',
                    right: '50px',
                    width: '70px',
                    height: '70px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(20px)',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'float 3s ease-in-out infinite',
                    overflow: 'hidden'
                  }}>
                    <img src="/step (2).jpg" alt="Icon 1" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>

                  <div style={{
                    position: 'absolute',
                    top: '120px',
                    left: '-20px',
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'rgba(155, 255, 0, 0.1)',
                    backdropFilter: 'blur(20px)',
                    border: '2px solid #9bff00',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'float 4s ease-in-out infinite',
                    animationDelay: '1s',
                    overflow: 'hidden'
                  }}>
                    <img src="/step (3).jpg" alt="Icon 2" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>

                  <div style={{
                    position: 'absolute',
                    bottom: '60px',
                    right: '-10px',
                    width: '55px',
                    height: '55px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(20px)',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'float 3.5s ease-in-out infinite',
                    animationDelay: '0.5s',
                    overflow: 'hidden'
                  }}>
                    <img src="/step (4).jpg" alt="Icon 3" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>

                  <div style={{
                    position: 'absolute',
                    bottom: '30px',
                    left: '60px',
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(20px)',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'float 4.5s ease-in-out infinite',
                    animationDelay: '1.5s',
                    overflow: 'hidden'
                  }}>
                    <img src="/step (1).jpg" alt="Icon 4" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Learn More Button */}
            <div style={{ textAlign: 'center', marginTop: '4rem' }}>
              <a href="/docs" style={{
                display: 'inline-block',
                padding: '1rem 3rem',
                borderRadius: '50px',
                background: 'transparent',
                border: '2px solid #ffffff',
                color: '#ffffff',
                fontSize: '1.1rem',
                fontWeight: '600',
                textDecoration: 'none',
                transition: 'all 0.3s ease'
              }}>
                Подробнее
              </a>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="affiliate-cta" style={{ padding: '4rem 0', backgroundColor: 'var(--color-surface)' }}>
          <div className="affiliate-cta__container" style={{ maxWidth: '800px', margin: '0 auto', padding: '0 2rem', textAlign: 'center' }}>
            <div className="glass-main" style={{
              padding: '3rem 2rem',
              borderRadius: '24px',
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <h2 style={{ fontSize: '2.5rem', marginBottom: '1.5rem', color: '#ffffff' }}>
                Готовы начать зарабатывать?
              </h2>
              <p style={{ fontSize: '1.2rem', marginBottom: '2rem', color: '#c7c9cc', lineHeight: '1.6' }}>
                Присоединяйтесь к самой выгодной партнерской программе и начните получать пассивный доход уже сегодня
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <a 
                  href="/register" 
                  className="btn-primary btn" 
                  style={{
                    padding: '1rem 2rem',
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    textDecoration: 'none',
                    borderRadius: '50px',
                    background: 'linear-gradient(135deg, #9bff00 0%, #00d1ff 100%)',
                    color: '#000',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    display: 'inline-block'
                  }}
                >
                  Начать зарабатывать
                </a>
                <a 
                  href="/contacts" 
                  className="btn btn-outline" 
                  style={{
                    padding: '1rem 2rem',
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    textDecoration: 'none',
                    borderRadius: '50px',
                    border: '2px solid #9bff00',
                    color: '#9bff00',
                    transition: 'all 0.3s ease',
                    display: 'inline-block'
                  }}
                >
                  Задать вопрос
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
      
      <Script id="affiliate-advantages" strategy="afterInteractive">
        {`(function() {
          // Advantages cards interactions
          function initAdvantages() {
            const cards = document.querySelectorAll('.advantage-card');
            
            cards.forEach(function(card) {
              card.addEventListener('mouseenter', function() {
                const content = card.querySelector('.card-content');
                if (content) {
                  content.style.maxHeight = '300px';
                  content.style.opacity = '1';
                }
                card.style.transform = 'translateY(-5px)';
                card.style.boxShadow = '0 15px 40px rgba(155, 255, 0, 0.2)';
                card.style.border = '1px solid rgba(155, 255, 0, 0.3)';
              });
              
              card.addEventListener('mouseleave', function() {
                const content = card.querySelector('.card-content');
                if (content) {
                  content.style.maxHeight = '0';
                  content.style.opacity = '0';
                }
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = 'none';
                card.style.border = '1px solid rgba(255, 255, 255, 0.1)';
              });
            });
          }
          
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
              initAdvantages();
            });
          } else {
            initAdvantages();
          }
        })();`}
      </Script>
    </>
  )
}

// Калькулятор заработка
const EarningsCalculator = ({ referrals, avgCheck, recurringRate, onReferralsChange, onAvgCheckChange, onRecurringRateChange }) => {
  // Расчеты
  const firstPaymentTotal = referrals * avgCheck
  const firstPaymentEarnings = firstPaymentTotal * 1.0 // 100% от первого платежа
  const monthlyRecurring = Math.round(referrals * avgCheck * (recurringRate / 100))
  const monthlyRecurringEarnings = Math.round(monthlyRecurring * 0.5) // 50% от повторных
  const totalMonthlyEarnings = firstPaymentEarnings + monthlyRecurringEarnings

  return (
    <div className="hero-calculator-premium" style={{ 
      position: 'relative',
      animation: 'fadeInUp 1s ease-out 0.2s backwards'
    }}>
      <div style={{
        textAlign: 'center',
        marginBottom: '2rem'
      }}>
        <h3 style={{ 
          fontSize: '1.5rem',
          fontWeight: '700',
          color: '#ffffff',
          marginBottom: '0.5rem'
        }}>
          Калькулятор заработка
        </h3>
        <p style={{
          fontSize: '0.95rem',
          color: 'rgba(255, 255, 255, 0.6)'
        }}>
          Рассчитайте ваш потенциальный доход
        </p>
      </div>

      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(159, 255, 0, 0.2)',
        borderRadius: '24px',
        padding: '2rem',
        minHeight: '500px'
      }}>
        {/* Первый платеж */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{
            display: 'block',
            fontSize: '0.9rem',
            color: 'rgba(255, 255, 255, 0.7)',
            marginBottom: '0.75rem',
            fontWeight: '600'
          }}>
            Количество рефералов
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <input
              type="range"
              min="1"
              max="200"
              value={referrals}
              onChange={(e) => onReferralsChange(Number(e.target.value))}
              style={{
                flex: 1,
                height: '8px',
                borderRadius: '4px',
                background: 'rgba(255, 255, 255, 0.1)',
                outline: 'none',
                appearance: 'none',
                cursor: 'pointer'
              }}
            />
            <span style={{
              fontSize: '1.5rem',
              fontWeight: '800',
              color: '#9FFF00',
              minWidth: '60px',
              textAlign: 'right'
            }}>
              {referrals}
            </span>
          </div>
        </div>

        {/* Средний чек */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{
            display: 'block',
            fontSize: '0.9rem',
            color: 'rgba(255, 255, 255, 0.7)',
            marginBottom: '0.75rem',
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
              value={avgCheck}
              onChange={(e) => onAvgCheckChange(Number(e.target.value))}
              style={{
                flex: 1,
                height: '8px',
                borderRadius: '4px',
                background: 'rgba(255, 255, 255, 0.1)',
                outline: 'none',
                appearance: 'none',
                cursor: 'pointer'
              }}
            />
            <span style={{
              fontSize: '1.5rem',
              fontWeight: '800',
              color: '#9FFF00',
              minWidth: '100px',
              textAlign: 'right'
            }}>
              {avgCheck}₽
            </span>
          </div>
        </div>

        {/* Процент повторных */}
        <div style={{ marginBottom: '2.5rem' }}>
          <label style={{
            display: 'block',
            fontSize: '0.9rem',
            color: 'rgba(255, 255, 255, 0.7)',
            marginBottom: '0.75rem',
            fontWeight: '600'
          }}>
            % повторных платежей в месяц
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <input
              type="range"
              min="0"
              max="100"
              value={recurringRate}
              onChange={(e) => onRecurringRateChange(Number(e.target.value))}
              style={{
                flex: 1,
                height: '8px',
                borderRadius: '4px',
                background: 'rgba(255, 255, 255, 0.1)',
                outline: 'none',
                appearance: 'none',
                cursor: 'pointer'
              }}
            />
            <span style={{
              fontSize: '1.5rem',
              fontWeight: '800',
              color: '#9FFF00',
              minWidth: '60px',
              textAlign: 'right'
            }}>
              {recurringRate}%
            </span>
          </div>
        </div>

        {/* Результаты */}
        <div style={{
          background: 'rgba(159, 255, 0, 0.05)',
          border: '1px solid rgba(159, 255, 0, 0.3)',
          borderRadius: '16px',
          padding: '1.5rem'
        }}>
          <div style={{
            fontSize: '0.85rem',
            color: 'rgba(255, 255, 255, 0.6)',
            marginBottom: '1rem',
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
            marginBottom: '1rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid rgba(159, 255, 0, 0.2)'
          }}>
            <span style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.8)' }}>
              С первого платежа (100%)
            </span>
            <span style={{
              fontSize: '1.5rem',
              fontWeight: '800',
              color: '#9FFF00'
            }}>
              {firstPaymentEarnings.toLocaleString('ru-RU')} ₽
            </span>
          </div>

          {/* Доход от повторных */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem'
          }}>
            <span style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.8)' }}>
              С повторных (50%)
            </span>
            <span style={{
              fontSize: '1.5rem',
              fontWeight: '800',
              color: 'rgba(159, 255, 0, 0.9)'
            }}>
              {monthlyRecurringEarnings.toLocaleString('ru-RU')} ₽
            </span>
          </div>

          {/* Итого */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '1rem',
            borderTop: '2px solid rgba(159, 255, 0, 0.5)'
          }}>
            <span style={{
              fontSize: '1.1rem',
              color: '#ffffff',
              fontWeight: '700'
            }}>
              ИТОГО
            </span>
            <span style={{
              fontSize: '2.5rem',
              fontWeight: '900',
              color: '#9FFF00',
              textShadow: '0 0 30px rgba(159, 255, 0, 0.6)'
            }}>
              {totalMonthlyEarnings.toLocaleString('ru-RU')} ₽
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Affiliate
