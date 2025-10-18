import React from 'react'
import Head from 'next/head'
import Navigation from '../components/navigation'
import Footer from '../components/footer'

const Security = () => {
  return (
    <>
      <Head>
        <title>Безопасность — VEXTR</title>
        <meta name="description" content="Безопасность VEXTR - API-ключи с ограниченными правами, защищенные соединения, ваши средства под вашим контролем." />
      </Head>
      <Navigation></Navigation>
      <main style={{ paddingTop: 100 }}>
        <section className="security-hero" style={{ padding: '4rem 0', textAlign: 'center', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
          <div className="security-hero__container" style={{ maxWidth: '800px', margin: '0 auto', padding: '0 2rem' }}>
            <h1 className="section-title" style={{ marginBottom: '1.5rem' }}>
              Безопасность
            </h1>
            <p className="section-subtitle" style={{ fontSize: '1.2rem', lineHeight: '1.6', marginBottom: '2rem' }}>
              Безопасность — это то, с чего начинается любая наша идея.
            </p>
            <div className="glass-main" style={{ padding: '2rem', borderRadius: '16px', backgroundColor: 'rgba(255, 255, 255, 0.04)' }}>
              <p style={{ fontSize: '1.1rem', lineHeight: '1.7', margin: 0 }}>
                <strong>VEXTR создавался не ради риска, а ради спокойствия.</strong>
              </p>
            </div>
          </div>
        </section>

        <section className="security-trust" style={{ padding: '4rem 0', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
          <div className="security-trust__container" style={{ maxWidth: '900px', margin: '0 auto', padding: '0 2rem' }}>
            <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '3rem' }}>
              Мы понимаем ответственность
            </h2>
            <div className="glass-main" style={{ padding: '3rem', borderRadius: '16px', textAlign: 'center', backgroundColor: 'rgba(255, 255, 255, 0.04)' }}>
              <p style={{ fontSize: '1.1rem', lineHeight: '1.7', marginBottom: '2rem' }}>
                Мы понимаем, что люди доверяют нам не просто инструмент — они доверяют доступ к своему счёту, своему времени и своей уверенности в завтрашнем дне.
              </p>
              <div style={{ padding: '2rem', backgroundColor: 'rgba(155, 255, 0, 0.1)', borderRadius: '12px', border: '1px solid var(--color-primary)' }}>
                <p style={{ fontSize: '1.1rem', lineHeight: '1.7', margin: 0, fontWeight: '500' }}>
                  <strong>Поэтому мы изначально строили систему так, чтобы она не могла навредить.</strong>
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="security-features" style={{ padding: '4rem 0', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
          <div className="security-features__container" style={{ maxWidth: '900px', margin: '0 auto', padding: '0 2rem' }}>
            <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '3rem' }}>
              Как мы обеспечиваем безопасность
            </h2>
            <div className="security-features__grid" style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
              <div className="glass-main" style={{ padding: '2rem', borderRadius: '16px', backgroundColor: 'rgba(255, 255, 255, 0.04)' }}>
                <h3 style={{ color: 'var(--color-primary)', marginBottom: '1rem', fontSize: '1.3rem' }}>
                  🔐 API-ключи с ограниченными правами
                </h3>
                <p style={{ fontSize: '1rem', lineHeight: '1.6', margin: 0 }}>
                  VEXTR работает только через API-ключи с ограниченными правами — бот не имеет доступа к выводу средств, не хранит ваши деньги и не вмешивается в ваш баланс.
                </p>
              </div>
              <div className="glass-main" style={{ padding: '2rem', borderRadius: '16px', backgroundColor: 'rgba(255, 255, 255, 0.04)' }}>
                <h3 style={{ color: 'var(--color-primary)', marginBottom: '1rem', fontSize: '1.3rem' }}>
                  🛡️ Защищённые соединения
                </h3>
                <p style={{ fontSize: '1rem', lineHeight: '1.6', margin: 0 }}>
                  Все сигналы проходят через защищённые соединения, а данные пользователей не сохраняются на серверах.
                </p>
              </div>
              <div className="glass-main" style={{ padding: '2rem', borderRadius: '16px', backgroundColor: 'rgba(255, 255, 255, 0.04)' }}>
                <h3 style={{ color: 'var(--color-primary)', marginBottom: '1rem', fontSize: '1.3rem' }}>
                  🔒 Ваши средства под контролем
                </h3>
                <p style={{ fontSize: '1rem', lineHeight: '1.6', margin: 0 }}>
                  Мы не обещаем чудес, но обещаем одно — честность и безопасность. Если в чём-то есть сомнения, мы всегда готовы объяснить, показать и помочь.
                </p>
              </div>
              <div className="glass-main" style={{ padding: '2rem', borderRadius: '16px', backgroundColor: 'rgba(255, 255, 255, 0.04)' }}>
                <h3 style={{ color: 'var(--color-primary)', marginBottom: '1rem', fontSize: '1.3rem' }}>
                  📊 Прозрачность и контроль
                </h3>
                <p style={{ fontSize: '1rem', lineHeight: '1.6', margin: 0 }}>
                  Каждый пользователь видит статистику, результаты и работу алгоритмов в реальном времени. Никаких скрытых действий, закрытых отчётов или "секретных" сделок — всё открыто и доступно. Мы строим доверие не словами, а цифрами, которые можно проверить.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="security-philosophy" style={{ padding: '4rem 0', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
          <div className="security-philosophy__container" style={{ maxWidth: '900px', margin: '0 auto', padding: '0 2rem' }}>
            <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '3rem' }}>
              Наша философия безопасности
            </h2>
            <div className="glass-main" style={{ padding: '3rem', borderRadius: '16px', textAlign: 'center', backgroundColor: 'rgba(255, 255, 255, 0.04)' }}>
              <p style={{ fontSize: '1.1rem', lineHeight: '1.7', marginBottom: '2rem' }}>
                Потому что доверие — это не функция, это основа, на которой держится весь VEXTR.
              </p>
              <div style={{ padding: '2rem', backgroundColor: 'rgba(0, 255, 102, 0.1)', borderRadius: '12px', border: '1px solid var(--color-accent)' }}>
                <p style={{ fontSize: '1.2rem', lineHeight: '1.6', margin: 0, fontWeight: '600' }}>
                  💬 Ваши средства — под вашим контролем.
                </p>
                <p style={{ fontSize: '1.1rem', lineHeight: '1.6', margin: '1rem 0 0 0' }}>
                  VEXTR — зарабатывает, но не рискует.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer></Footer>
      {/* styles moved to pages/style.css (global) */}
    </>
  )
}

export default Security