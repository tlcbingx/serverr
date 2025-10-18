import React from 'react'
import Head from 'next/head'
import Navigation from '../components/navigation'
import Footer from '../components/footer'

const Contacts = () => {
  return (
    <>
      <Head>
        <title>Контакты — VEXTR</title>
      </Head>
      <Navigation></Navigation>
      <main style={{ paddingTop: 100 }}>
        <section className="contacts-section" style={{ minHeight: '60vh' }}>
          <div className="contacts-glass-container">
            <div className="contacts-content">
              <h1 className="section-title">Контакты</h1>
              <p className="section-subtitle">Мы всегда на связи — напишите в поддержку или присоединяйтесь к нашему каналу с новостями в Telegram.</p>

              <div className="contacts-grid">
                <div className="contact-card">
                  <h3 className="contact-card__title">Техническая поддержка</h3>
                  <p className="contact-card__text">Telegram - @vextrsupport</p>
                  <a className="btn btn-primary contact-card__link" href="https://t.me/vextrsupport">Написать в Telegram</a>
                </div>

                <div className="contact-card">
                  <h3 className="contact-card__title">Канал в Telegram</h3>
                  <p className="contact-card__text">Telegram: https://t.me/vextr_auto</p>
                  <a className="btn btn-primary contact-card__link" href="https://t.me/vextr_auto" target="_blank" rel="noopener noreferrer">Открыть канал</a>
                </div>

                <div className="contact-card">
                  <h3 className="contact-card__title">Юридический адрес</h3>
                  <p className="contact-card__text">Магнитогорск</p>
                  <p className="contact-card__muted">ИП Шафиков Константин Романович ИНН 744515567628 | ОГРНИП 325745600175201</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer></Footer>
    </>
  )
}

export default Contacts



