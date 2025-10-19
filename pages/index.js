import React from 'react'
import Head from 'next/head'
import Script from 'next/script'
import Navigation from '../components/navigation'
import Footer from '../components/footer'

const Home = (props) => {
  return (
    <>
      <div className="home-container1">
        <Head>
          <title>VEXTR — умный Telegram-бот для управления стратегией</title>
          <meta property="og:title" content="VEXTR — современный Telegram-бот, который помогает управлять стратегией, задачами и аналитикой прямо в чате." />
                <meta
          name="keywords"
          content="VEXTR, Telegram бот, умный бот, стратегия, управление, AI, Telegram assistant"/>
        </Head>
        <Navigation></Navigation>
        <div className="home-container2">
          <div className="home-container3">
          </div>
        </div>
        <div id="paymentModal" className="nav-modal" role="dialog" aria-modal="true" style={{display:'none'}}>
          <div className="nav-modal__backdrop" onClick={() => { const m = document.getElementById('paymentModal'); if (m) { m.classList.remove('nav-modal--open'); m.style.display='none'; } }}></div>
          <div className="nav-modal__content" style={{ minWidth: '360px', maxWidth: '820px', padding: '36px', minHeight: '320px', boxSizing: 'border-box' }}>
            <h3 className="section-title" style={{ margin: 0, textAlign: 'center' }}>Оплата скоро появится</h3>
            <p className="section-subtitle" style={{ textAlign: 'center' }}>Извините, функция оплаты пока недоступна. Мы работаем над её запуском.</p>
            <div className="thq-flex-column" style={{ alignItems: 'stretch' }}>
              <p style={{ textAlign: 'center' }}>Пока что вы можете написать в поддержку.</p>
              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <a className="btn-primary btn" href="https://t.me/vextrsupport" target="_blank" rel="noopener noreferrer" style={{ flex: 1, textAlign: 'center' }}>Написать в поддержку</a>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => { const m = document.getElementById('paymentModal'); if (m) { m.classList.remove('nav-modal--open'); m.style.display='none'; } }}>Закрыть</button>
              </div>
            </div>
          </div>
        </div>
        <div className="home-container4">
          <div className="home-container5">
          </div>
        </div>
        <div className="home-container6">
          <div className="home-container7">
            <Script id="vextr-homepage" strategy="afterInteractive">
{`(function(){
  const observerOptions = { root: null, rootMargin: "0px", threshold: 0.1 }
  const animateOnScroll = new IntersectionObserver((entries) => { entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.style.opacity = "1"; entry.target.style.transform = "translateY(0)" } }) }, observerOptions)
  const animatedSections = document.querySelectorAll(".how-card, .performance-card, .testimonial-card, .pricing-card")
  animatedSections.forEach((section) => { animateOnScroll.observe(section) })
  const heroVideo = document.getElementById("hero-video")
  if (heroVideo) { heroVideo.addEventListener("loadeddata", () => { heroVideo.style.opacity = "0.3" }) }
  const ctaButtons = document.querySelectorAll(".btn-primary, .performance__cta")
  ctaButtons.forEach((button) => { button.addEventListener("mouseenter", () => { button.style.transform = "translateY(-2px) scale(1.02)" }); button.addEventListener("mouseleave", () => { button.style.transform = "" }) })
  const internalLinks = document.querySelectorAll('a[href^="#"]')
  internalLinks.forEach((link) => { link.addEventListener("click", (e) => { const href = link.getAttribute("href"); if (href !== "#" && href !== "") { const target = document.querySelector(href); if (target) { e.preventDefault(); target.scrollIntoView({ behavior: "smooth", block: "start" }) } } }) })
  const faqSupportLink = document.getElementById('faqSupportLink')
  if (faqSupportLink) { faqSupportLink.addEventListener('click', (e) => { e.preventDefault(); const modal = document.getElementById('contactModal'); if (modal) { modal.classList.add('nav-modal--open'); modal.style.display = 'block' } }) }
})()`}
            </Script>
          </div>
        </div>
        <main id="vextr-homepage">
          <section role="banner" className="hero">
            <div aria-hidden="true" className="hero__bg">
              <video
                id="hero-video"
                src="https://videos.pexels.com/video-files/3141211/3141211-hd_1920_1080_25fps.mp4"
                loop="true"
                muted="true"
                autoPlay="true"
                playsInline="true"
                className="hero__bg-video"
              ></video>
              <div className="hero__bg-scrim"></div>
              <div className="hero__grid-overlay"></div>
            </div>
            <div className="hero__content">
              <div className="glass-main home-glass-main">
                <h1 className="hero-title">
                  Алгоритм вместо эмоций. Прибыль вместо стресса.
                </h1>
                <p className="hero-subtitle">
                  Подключите биржу и начните автоматическую торговлю за несколько минут.
                </p>
                <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                  <a className="btn-primary btn" href="https://t.me/vextr_bot" target="_blank" rel="noopener noreferrer" style={{ textAlign: 'center' }}>
                    Начать сейчас
                  </a>
                  <a aria-label="Посмотреть статистику торговли" className="btn-lg btn btn-outline" href="/details">
                    Посмотреть статистику
                  </a>
                </div>
              </div>
              <div className="support-column">
                <div className="trust-cue">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="trust-icon"
                  >
                    <path
                      d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    ></path>
                  </svg>
                  <span>Безопасное API подключение</span>
                </div>
                <div className="trust-cue">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="trust-icon"
                  >
                    <path
                      d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    ></path>
                  </svg>
                  <span>Торговля 24/7 без перерыва</span>
                </div>
                <div className="trust-cue">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="trust-icon"
                  >
                    <g
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                    </g>
                  </svg>
                  <span>Интеграция с OKX, Bybit, BingX</span>
                </div>
              </div>
            </div>
          </section>
          <section
            id="how-it-works"
            aria-labelledby="how-title"
            className="how-it-works"
          >
            <div className="how-it-works__container">
              <header className="how-it-works__header">
                <h2 id="how-title" className="section-title">
                  Как это работает
                </h2>
                <p className="section-subtitle">
                  Два шага — и бот начнёт торговать за вас
                </p>
              </header>
              <ol
                aria-label="Как начать работать с VEXTR"
                className="home-how-it-workscards how-it-works__cards"
              >
                <li className="home-how-card1 how-card glass-main">
                  <div className="how-card__icon-wrapper">
                    <svg
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="how-card__icon"
                    >
                      <g
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                      </g>
                    </svg>
                    <span aria-hidden="true" className="how-card__number">
                      01
                    </span>
                  </div>
                  <h3 className="how-card__title">Подключи биржу</h3>
                  <p className="home-how-carddescription1 how-card__description">
                    <span>
                      {' '}
                      Соедините ваш аккаунт BingX, Bybit или OKX за несколько
                      кликов. 
                    </span>
                    <span>
                      Безопасное подключение через API — ключи хранятся
                      зашифрованными,
                    </span>
                    <span>
                      права доступа настроены только на торговлю, без вывода
                      средств.
                      <span
                        dangerouslySetInnerHTML={{
                          __html: ' ',
                        }}
                      />
                    </span>
                  </p>
                </li>
                <li className="home-how-card2 how-card glass-main">
                  <div className="how-card__icon-wrapper">
                    <svg
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="how-card__icon"
                    >
                      <path
                        d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      ></path>
                    </svg>
                    <span aria-hidden="true" className="how-card__number">
                      02
                    </span>
                  </div>
                  <h3 className="how-card__title">Запусти бота</h3>
                  <p className="how-card__description">
                    <span>
                      {' '}
                      Запустите VEXTR одним нажатием — бот начнёт торговлю 24/7,
                    </span>
                    <span>
                      автоматически управляя ордерами и рисками. Мониторинг в
                      реальном 
                    </span>
                    <span>
                      времени и лог сделок доступны в личном кабинете.
                      <span
                        dangerouslySetInnerHTML={{
                          __html: ' ',
                        }}
                      />
                    </span>
                  </p>
                </li>
              </ol>
              <div className="how-it-works__cta">
                <a
                  href="https://t.me/vextr_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary btn-xl btn"
                >
                  Начать сейчас
                </a>
              </div>
            </div>
          </section>
          <section
            id="performance"
            aria-labelledby="performance-title"
            className="performance"
          >
            <div className="performance__container">
              <header className="performance__header">
                <h2 id="performance-title" className="section-title">
                  Статистика за 2025
                </h2>
                <p className="section-subtitle">
                  Прозрачная, надёжная, без фильтров
                </p>
              </header>
              <div className="performance__panel">
                <div className="performance__cards">
                  <article
                    aria-labelledby="roi-title"
                    className="performance-card"
                  >
                    <div className="performance-card__content">
                      <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        className="performance-card__icon"
                      >
                        <g
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M16 7h6v6"></path>
                          <path d="m22 7l-8.5 8.5l-5-5L2 17"></path>
                        </g>
                      </svg>
                      <div className="metric-bg">
                        <h3 id="roi-title" className="performance-card__value">
                          +126.7%
                        </h3>
                        <p className="performance-card__label">
                          Общая доходность 2025
                        </p>
                      </div>
                      <p className="performance-card__note">
                        {' '}
                        ROI 2025: итоговые данные за год, проверяемые и открытые
                        <span
                          dangerouslySetInnerHTML={{
                            __html: ' ',
                          }}
                        />
                      </p>
                    </div>
                  </article>
                  <article
                    aria-labelledby="monthly-title"
                    className="performance-card"
                  >
                    <div className="performance-card__content">
                      <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        className="performance-card__icon"
                      >
                        <g
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M8 2v4m8-4v4"></path>
                          <rect
                            x="3"
                            y="4"
                            rx="2"
                            width="18"
                            height="18"
                          ></rect>
                          <path d="M3 10h18"></path>
                        </g>
                      </svg>
                      <div className="metric-bg">
                        <h3
                          id="monthly-title"
                          className="performance-card__value"
                        >
                          {' '}
                          +12.6%
                          <span
                            dangerouslySetInnerHTML={{
                              __html: ' ',
                            }}
                          />
                        </h3>
                        <p className="performance-card__label">
                          Доход за месяц
                        </p>
                      </div>
                      <p className="performance-card__note">
                        {' '}
                        Средний месячный доход: реальная динамика торговли в
                        2025
                        <span
                          dangerouslySetInnerHTML={{
                            __html: ' ',
                          }}
                        />
                      </p>
                    </div>
                  </article>
                  <article
                    aria-labelledby="coins-title"
                    className="performance-card"
                  >
                    <div className="performance-card__content">
                      <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        className="performance-card__icon"
                      >
                        <g
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle r="6" cx="8" cy="8"></circle>
                          <path d="M18.09 10.37A6 6 0 1 1 10.34 18M7 6h1v4"></path>
                          <path d="m16.71 13.88l.7.71l-2.82 2.82"></path>
                        </g>
                      </svg>
                      <div className="metric-bg">
                        <h3
                          id="coins-title"
                          className="performance-card__value"
                        >
                          11
                        </h3>
                        <p className="performance-card__label">
                          Активных монет
                        </p>
                      </div>
                      <p className="performance-card__note">
                        {' '}
                        Активные позиции: диверсифицированный портфель под
                        управлением VEXTR
                        <span
                          dangerouslySetInnerHTML={{
                            __html: ' ',
                          }}
                        />
                      </p>
                    </div>
                  </article>
                </div>
                <div className="performance__cta-band">
                  <a href="/details">
                    <div
                      role="button"
                      aria-label="Узнать детальную статистику"
                      className="performance__cta"
                    >
                      <span>
                        {' '}
                        Узнать детальней
                        <span
                          dangerouslySetInnerHTML={{
                            __html: ' ',
                          }}
                        />
                      </span>
                    </div>
                  </a>
                </div>
                <p className="performance__disclaimer">
                  {' '}
                  Все цифры приведены за 2025 год. Торговля сопряжена с риском —
                  результаты прошлого периода не гарантируют доход в будущем.
                  <span
                    dangerouslySetInnerHTML={{
                      __html: ' ',
                    }}
                  />
                </p>
              </div>
            </div>
          </section>
          <section
            id="pricing"
            aria-labelledby="pricing-title"
            className="pricing"
          >
            <div className="pricing__container">
              <header className="pricing__header">
                <h2 id="pricing-title" className="section-title">
                  Тарифы
                </h2>
                <p className="section-subtitle">
                  {' '}
                  Выбери план и начни торговать автоматически
                  <span
                    dangerouslySetInnerHTML={{
                      __html: ' ',
                    }}
                  />
                </p>
              </header>
              <div className="pricing__panel">
                <div className="pricing__cards">
                  <article
                    aria-labelledby="starter-title"
                    className="pricing-card"
                  >
                    <div className="pricing-card__header">
                      <h3 id="starter-title" className="pricing-card__title">
                        1 месяц
                      </h3>
                      <div className="pricing-card__price">
                        <span className="pricing-card__amount">₽500</span>
                      </div>
                    </div>
                    <p className="pricing-card__description">
                      {' '}
                      Попробуйте VEXTR и оцените, как бот работает с вашими
                      биржами. Отличный вариант для первого знакомства.
                      <span
                        dangerouslySetInnerHTML={{
                          __html: ' ',
                        }}
                      />
                    </p>
                    <ul role="list" className="pricing-card__features">
                      <li className="pricing-feature">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                          className="pricing-feature__icon"
                        >
                          <path
                            d="M20 6L9 17l-5-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          ></path>
                        </svg>
                        <span>Умный торговый движок 24/7</span>
                      </li>
                      <li className="pricing-feature">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                          className="pricing-feature__icon"
                        >
                          <path
                            d="M20 6L9 17l-5-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          ></path>
                        </svg>
                        <span>Управление рисками</span>
                      </li>
                      <li className="pricing-feature">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                          className="pricing-feature__icon"
                        >
                          <path
                            d="M20 6L9 17l-5-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          ></path>
                        </svg>
                        <span>Авто-аналитика сделок</span>
                      </li>
                      <li className="pricing-feature">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                          className="pricing-feature__icon"
                        >
                          <path
                            d="M20 6L9 17l-5-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          ></path>
                        </svg>
                        <span>Продвинутые стратегии</span>
                      </li>
                    </ul>
                    <button
                      aria-label="Оплатить тариф Starter"
                      className="btn btn-outline btn-primary"
                      onClick={() => { const m = document.getElementById('paymentModal'); if (m) { m.classList.add('nav-modal--open'); m.style.display='block'; } }}
                    >
                      {' '}
                      Оплатить
                      <span
                        dangerouslySetInnerHTML={{
                          __html: ' ',
                        }}
                      />
                    </button>
                  </article>
                  <article
                    aria-labelledby="pro-title"
                    className="pricing-card--pro pricing-card"
                  >
                    <div aria-hidden="true" className="pricing-card__badge">
                      <span>Скидка 20%</span>
                    </div>
                    <div className="pricing-card__header">
                      <h3 id="pro-title" className="pricing-card__title">
                        3 месяца
                      </h3>
                      <div className="pricing-card__price">
                        <span className="pricing-card__amount" style={{ textDecoration: 'line-through', opacity: 0.6 }}>₽1500</span>
                        <span className="pricing-card__amount" style={{ marginLeft: 8 }}>₽1200</span>
                      </div>
                    </div>
                    <p className="pricing-card__description">
                      Для тех, кто уже протестировал платформу и хочет
                      зафиксировать скидку и максимальную выгоду.
                    </p>
                    <ul role="list" className="pricing-card__features">
                      <li className="pricing-feature">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                          className="pricing-feature__icon"
                        >
                          <path
                            d="M20 6L9 17l-5-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          ></path>
                        </svg>
                        <span>
                          <span>Умный торговый движок 24/7</span>
                        </span>
                      </li>
                      <li className="pricing-feature">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                          className="pricing-feature__icon"
                        >
                          <path
                            d="M20 6L9 17l-5-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          ></path>
                        </svg>
                        <span>Управление рисками</span>
                      </li>
                      <li className="pricing-feature">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                          className="pricing-feature__icon"
                        >
                          <path
                            d="M20 6L9 17l-5-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          ></path>
                        </svg>
                        <span>Авто-открытие сделок</span>
                      </li>
                      <li className="pricing-feature">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                          className="pricing-feature__icon"
                        >
                          <path
                            d="M20 6L9 17l-5-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          ></path>
                        </svg>
                        <span>Продвинутые стратегии</span>
                      </li>
                      <li className="pricing-feature"></li>
                    </ul>
                    <button
                      aria-label="Оплатить тариф Pro"
                      className="btn-primary btn"
                      onClick={() => { const m = document.getElementById('paymentModal'); if (m) { m.classList.add('nav-modal--open'); m.style.display='block'; } }}
                    >
                      {' '}
                      Оплатить
                      <span
                        dangerouslySetInnerHTML={{
                          __html: ' ',
                        }}
                      />
                    </button>
                  </article>
                </div>
                <aside className="pricing__aside">
                  <h4 className="pricing__aside-title">Что включено</h4>
                  <ul role="list" className="pricing__aside-list">
                    <li>
                      <span>Умный движок торговли 24/7</span>
                    </li>
                    <li>
                      <span>Авто-управление рисками</span>
                    </li>
                    <li>
                      <span>Реальное время аналитики</span>
                    </li>
                    <li>
                      <span>Интеграция с BingX, Bybit, OKX</span>
                    </li>
                    <li>
                      <span>Безопасные API-подключения</span>
                    </li>
                    <li>
                      <span>Регулярные обновления стратегий</span>
                    </li>
                  </ul>
                  <p className="pricing__aside-note">
                    <span>
                      Оба тарифа включают полный функционал: умную торговлю,
                      аналитику, управление рисками и автоматические обновления.
                    </span>
                    <br></br>
                    <span>Разница — только в сроке и скидке.</span>
                    Тарифы отображают стандартные условия. Возможны
                    индивидуальные решения и корпоративные предложения по
                    запросу.
                    <span
                      dangerouslySetInnerHTML={{
                        __html: ' ',
                      }}
                    />
                  </p>
                </aside>
              </div>
            </div>
          </section>
          <section
            id="community"
            role="region"
            aria-labelledby="community-title"
            className="community"
          >
            <div className="community__container">
              <header className="community__header">
                <div className="community__header-content">
                  <h2 id="community-title" className="section-title">
                    {' '}
                    Присоединяйся к сообществу VEXTR
                    <span
                      dangerouslySetInnerHTML={{
                        __html: ' ',
                      }}
                    />
                  </h2>
                  <p className="section-subtitle">
                    Делитесь опытом, следите за апдейтами и получайте поддержку
                    прямо в Telegram
                  </p>
                </div>
                <a href="https://t.me/vextr_auto" target="_blank" rel="noopener noreferrer">
                  <div
                    role="button"
                    aria-label="Присоединиться к VEXTR в Telegram"
                    className="community__cta"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092a10 10 0 1 0-4.777-4.719"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      ></path>
                    </svg>
                    <span>Telegram</span>
                  </div>
                </a>
              </header>
              <div className="community__testimonials">
                <article
                  aria-label="Отзыв от Алексей"
                  className="testimonial-card--featured testimonial-card"
                >
                  <blockquote className="testimonial-card__quote">
                    Пользуюсь месяц, пока не разбогател, но отзыв положительный.
                    При строгом следовании идет постепенный рост. Откаты бывают,
                    но тенденция положительная. На данный момент палец вверх 👍
                  </blockquote>
                  <footer className="testimonial-card__author">
                    <cite>Андрей</cite>
                    <span className="testimonial-card__meta">трейдер</span>
                    <time className="testimonial-card__date" dateTime="2025-06-17">17 июня 2025</time>
                  </footer>
                </article>
                <article
                  aria-label="Отзыв от Марина"
                  className="testimonial-card"
                >
                  <blockquote className="testimonial-card__quote">
                    <span>
                      Бот отлично выполняет свою работу, нужна вещь для тех, у
                      кого не хватает времени сидеть и мониторить свои открытые
                      позиции
                    </span>
                    <br></br>
                    <span>
                      Удобное и быстрое подключение, качественная поддержка
                    </span>
                  </blockquote>
                  <footer className="testimonial-card__author">
                    <cite>Виктор</cite>
                    <span className="testimonial-card__meta">трейдер</span>
                    <time className="testimonial-card__date" dateTime="2025-10-15">15 октября 2025</time>
                  </footer>
                </article>
                <article
                  aria-label="Отзыв от Дмитрий"
                  className="testimonial-card"
                >
                  <blockquote className="testimonial-card__quote">
                    Раньше я пытался торговать сам, но без опыта это было сложно
                    - часто пропускал хорошие моменты и терял деньги. После того
                    как начал использовать бота, все стало гораздо проще. Теперь
                    система сама находит подходящие моменты для сделок и следит
                    за ними вместо меня <a className="link-telegram" href="https://t.me/otzivstrategyvextr/6" target="_blank" rel="noopener noreferrer">читать полностью</a>
                  </blockquote>
                  <footer className="testimonial-card__author">
                    <cite>Дмитрий</cite>
                    <span className="testimonial-card__meta">трейдер</span>
                    <time className="testimonial-card__date" dateTime="2025-06-19">19 июня 2025</time>
                  </footer>
                </article>
              </div>
              <div className="community__trust-bar">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <g
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3.128a4 4 0 0 1 0 7.744M22 21v-2a4 4 0 0 0-3-3.87"></path>
                    <circle r="4" cx="9" cy="7"></circle>
                  </g>
                </svg>
                <span>
                  {' '}
                  Проверено сообществом — прозрачные отчёты и честные обсуждения
                  <span
                    dangerouslySetInnerHTML={{
                      __html: ' ',
                    }}
                  />
                </span>
              </div>
            </div>
          </section>
          <section id="cta" aria-labelledby="cta-title" className="cta-section">
            <div className="cta-section__container">
              <div className="cta-card">
                <div className="cta-card__content">
                  <h2 id="cta-title" className="cta-card__title">
                    Начать сейчас
                  </h2>
                  <p className="cta-card__text">
                    {' '}
                    VEXTR автоматически торгует 24/7 — подключись и доверь
                    сделки профессиональному боту. Без ручного трейдинга, с
                    продвинутым управлением рисками и прозрачной аналитикой.
                    <span
                      dangerouslySetInnerHTML={{
                        __html: ' ',
                      }}
                    />
                  </p>
                  <p className="cta-card__subtext">
                    {' '}
                    Быстрая активация — подключи биржу, выбери стратегию и
                    запусти. Всё под твоим контролем, всё на автопилоте.
                    <span
                      dangerouslySetInnerHTML={{
                        __html: ' ',
                      }}
                    />
                  </p>
                  <div className="cta-card__actions">
                    <a
                      aria-label="Начать торговлю с VEXTR прямо сейчас"
                      className="btn-primary btn-xl btn"
                      href="https://t.me/vextr_bot"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {' '}
                      Начать сейчас
                      <span
                        dangerouslySetInnerHTML={{
                          __html: ' ',
                        }}
                      />
                    </a>
                    <a
                      aria-label="Попробовать демо-версию VEXTR"
                      className="btn-xl btn btn-outline"
                      href="/demo"
                    >
                      {' '}
                      Попробовать демо
                      <span
                        dangerouslySetInnerHTML={{
                          __html: ' ',
                        }}
                      />
                    </a>
                  </div>
                </div>
                <div aria-hidden="true" className="cta-card__backdrop">
                  <div className="cta-card__glow"></div>
                </div>
              </div>
            </div>
          </section>
          <section id="faq" aria-labelledby="faq-headline" className="faq">
            <div className="faq__container">
              <div className="faq__intro">
                <h2 id="faq-headline" className="section-title">
                  {' '}
                  Безопасность и прозрачность
                  <span
                    dangerouslySetInnerHTML={{
                      __html: ' ',
                    }}
                  />
                </h2>
                <p className="section-content">
                  {' '}
                  В основе VEXTR — банковские стандарты защиты и полная
                  прозрачность всех операций. Ваши средства остаются под вашим
                  контролем.
                  <span
                    dangerouslySetInnerHTML={{
                      __html: ' ',
                    }}
                  />
                </p>
                <a href="#" id="faqSupportLink">
                  <div
                    aria-label="Связаться с поддержкой VEXTR"
                    className="faq__support-link"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <g
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77a4 4 0 0 1 6.74 0a4 4 0 0 1 4.78 4.78a4 4 0 0 1 0 6.74a4 4 0 0 1-4.77 4.78a4 4 0 0 1-6.75 0a4 4 0 0 1-4.78-4.77a4 4 0 0 1 0-6.76"></path>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3m.08 4h.01"></path>
                      </g>
                    </svg>
                    <span>Есть вопросы?</span>
                  </div>
                </a>
              </div>
              <div className="faq__grid">
                <div id="faq-1" className="faq-card">
                  <div className="faq-card__question">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="faq-card__icon"
                    >
                      <path
                        d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      ></path>
                    </svg>
                    <a href="/privacy" className="faq-link">Как защитены средства?</a>
                  </div>
                </div>
                <div id="faq-2" className="faq-card">
                  <div className="faq-card__question">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="faq-card__icon"
                    >
                      <g
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect
                          x="3"
                          y="11"
                          rx="2"
                          ry="2"
                          width="18"
                          height="11"
                        ></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </g>
                    </svg>
                    <a href="/privacy" className="faq-link">Шифрование данных</a>
                  </div>
                </div>
                <div id="faq-3" className="faq-card">
                  <div className="faq-card__question">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="faq-card__icon"
                    >
                      <path
                        d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      ></path>
                    </svg>
                    <a href="/terms" className="faq-link">Управление рисками</a>
                  </div>
                </div>
                <div id="faq-4" className="faq-card">
                  <div className="faq-card__question">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="faq-card__icon"
                    >
                      <path
                        d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      ></path>
                    </svg>
                    <a href="/about" className="faq-link">Аудит и мониторинг</a>
                  </div>
                </div>
                <div id="faq-5" className="faq-card">
                  <div className="faq-card__question">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="faq-card__icon"
                    >
                      <g
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M16 7h6v6"></path>
                        <path d="m22 7l-8.5 8.5l-5-5L2 17"></path>
                      </g>
                    </svg>
                    <a href="/about" className="faq-link">Регулярные обновления</a>
                  </div>
                </div>
                <div id="faq-6" className="faq-card">
                  <div className="faq-card__question">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="faq-card__icon"
                    >
                      <g
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77a4 4 0 0 1 6.74 0a4 4 0 0 1 4.78 4.78a4 4 0 0 1 0 6.74a4 4 0 0 1-4.77 4.78a4 4 0 0 1-6.75 0a4 4 0 0 1-4.78-4.77a4 4 0 0 1 0-6.76"></path>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3m.08 4h.01"></path>
                      </g>
                    </svg>
                    <a href="/terms" className="faq-link">Риски торговли</a>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
        <Footer></Footer>
        <div id="contactModal" className="nav-modal" role="dialog" aria-modal="true" style={{display:'none'}}>
          <div className="nav-modal__backdrop" onClick={() => { const m = document.getElementById('contactModal'); if (m) { m.classList.remove('nav-modal--open'); m.style.display='none'; } }}></div>
          <div className="nav-modal__content">
            <h3 className="section-title" style={{ margin: 0, textAlign: 'center' }}>Оставьте контакты</h3>
            <p className="section-subtitle" style={{ textAlign: 'center' }}>Telegram @username или номер формата +7XXXXXXXXXX</p>
            <form onSubmit={(e) => { e.preventDefault(); const input = document.getElementById('contactInput'); const err = document.getElementById('contactError'); const ok = document.getElementById('contactOk'); const val = (input?.value || '').trim(); const telRegex = /^\+7\d{10}$/; const tgRegex = /^@?[A-Za-z0-9_]{5,}$/; if (!telRegex.test(val) && !tgRegex.test(val)) { if (err) err.textContent = 'Введите @username или номер формата +7XXXXXXXXXX'; if (ok) ok.textContent=''; return;} if (err) err.textContent=''; if (ok) ok.textContent='Заявка отправлена!'; setTimeout(()=>{ const m = document.getElementById('contactModal'); if (m) m.classList.remove('nav-modal--open'); if (input) input.value=''; if (ok) ok.textContent=''; }, 1200); }} className="thq-flex-column" style={{ alignItems: 'stretch' }}>
              <input id="contactInput" className="thq-input" type="text" placeholder="@username или +7XXXXXXXXXX" required />
              <p id="contactError" className="section-subtitle" style={{ color: '#ff6b6b', margin: 0 }}></p>
              <p id="contactOk" className="section-subtitle" style={{ color: '#9bff00', margin: 0 }}></p>
              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Отправить</button>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => { const m = document.getElementById('contactModal'); if (m) { m.classList.remove('nav-modal--open'); m.style.display='none'; } }}>Закрыть</button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <style jsx>
        {`
          .home-container1 {
            width: 100%;
            display: block;
            min-height: 100vh;
          }
          .home-container2 {
            display: none;
          }
          .home-container3 {
            display: contents;
          }
          .home-container4 {
            display: none;
          }
          .home-container5 {
            display: contents;
          }
          .home-container6 {
            display: none;
          }
          .home-container7 {
            display: contents;
          }
          .home-how-it-workscards {
            height: 337px;
            padding-top: var(--dl-layout-space-unit);
          }
          .home-how-card1 {
            width: 512px;
            height: 370px;
          }
          .home-how-carddescription1 {
            text-align: left;
          }
          .home-how-card2 {
            width: 502px;
            height: 370px;
          }
          @media (max-width: 479px) {
            .home-glass-main {
              width: 454px;
              height: 421px;
            }
          }
          .testimonial-card {
            position: relative;
            padding-bottom: 44px;
          }
          .testimonial-card__date {
            position: absolute;
            right: 12px;
            bottom: 8px;
            font-size: 13px;
            color: rgba(255,255,255,0.6);
            background: transparent;
          }
        `}
      </style>
    </>
  )
}

export default Home