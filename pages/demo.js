import React from 'react'
import Head from 'next/head'
import Navigation from '../components/navigation'
import Footer from '../components/footer'

const Demo = () => {
  return (
    <>
      <Head>
        <title>Демо — VEXTR</title>
        <meta name="robots" content="noindex" />
      </Head>
      <Navigation />
      <main className="page-container" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh'}}>
        <div className="glass-main demo-glass" style={{maxWidth: '880px', margin: '0 auto', textAlign: 'center'}}>
          <h1 style={{marginBottom: '12px'}}>Демо-страница в разработке</h1>
          <p style={{marginBottom: '20px'}}>
            Мы работаем над демо-версией. Следите за обновлениями в нашем
            Telegram-канале.
          </p>
          <div style={{display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap'}}>
            <a
              href="https://t.me/vextr_auto"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline btn-lg btn"
              aria-label="Присоединяйся к сообществу в Telegram"
            >
              Присоединяйся к сообществу в Telegram
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

export default Demo
