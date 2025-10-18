import React from 'react'
import Head from 'next/head'
import Navigation from '../components/navigation'
import Footer from '../components/footer'

const Details = () => {
  return (
    <>
      <Head>
        <title>Детали — VEXTR</title>
      </Head>
      <Navigation></Navigation>
      <main style={{ paddingTop: 100 }}>
        <section className="how-it-works" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-main" style={{ textAlign: 'center', padding: '2rem', maxWidth: '600px' }}>
            <h1 className="section-title">Скоро появится</h1>
            <p className="section-subtitle" style={{ marginBottom: '2rem' }}>
              Мы работаем над этой страницей. Следите за обновлениями в нашем Telegram канале.
            </p>
            <a
              href="https://t.me/vextr_autor"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary btn-lg btn"
              style={{ display: 'inline-block', textDecoration: 'none' }}
            >
              Подписаться на канал
            </a>
          </div>
        </section>
      </main>
      <Footer></Footer>
    </>
  )
}

export default Details