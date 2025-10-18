import React from 'react'
import Head from 'next/head'
import Navigation from '../components/navigation'
import Footer from '../components/footer'

const About = () => {
  return (
    <>
      <Head>
        <title>О нас — VEXTR</title>
        <meta name="description" content="Команда VEXTR - обычные люди, которые делают трейдинг простым, понятным и честным. Узнайте нашу историю и философию." />
      </Head>
      <Navigation></Navigation>
      <main style={{ paddingTop: 100 }}>
        <section className="about-hero" style={{ padding: '4rem 0', textAlign: 'center', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
          <div className="about-hero__container" style={{ maxWidth: '800px', margin: '0 auto', padding: '0 2rem' }}>
            <h1 className="section-title" style={{ marginBottom: '1.5rem' }}>
              Мы — команда VEXTR
            </h1>
            <p className="section-subtitle" style={{ fontSize: '1.2rem', lineHeight: '1.6', marginBottom: '2rem' }}>
              Не корпорация, не обезличенный стартап, а обычные люди, которым однажды надоело видеть, как рынок ломает людей — эмоциями, страхом, поспешными решениями.
            </p>
            <div className="glass-main" style={{ padding: '2rem', borderRadius: '16px' }}>
              <p style={{ fontSize: '1.1rem', lineHeight: '1.7', margin: 0 }}>
                Мы захотели сделать трейдинг таким, каким он должен быть с самого начала: <strong>простым, понятным и честным</strong>.
              </p>
            </div>
          </div>
        </section>

        <section className="about-story" style={{ padding: '4rem 0', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
          <div className="about-story__container" style={{ maxWidth: '900px', margin: '0 auto', padding: '0 2rem' }}>
            <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '3rem' }}>
              Почему всё началось
            </h2>
            <div className="about-story__content" style={{ display: 'grid', gap: '2rem' }}>
              <div className="glass-main" style={{ padding: '2rem', borderRadius: '16px', backgroundColor: 'rgba(255, 255, 255, 0.04)' }}>
                <p style={{ fontSize: '1.1rem', lineHeight: '1.7', margin: 0 }}>
                  Когда мы запускали первый прототип стратегии, цель была не в том, чтобы "поймать миллионы".<br/>
                  Мы хотели сделать инструмент, которому можно доверять.
                </p>
              </div>
              <div className="glass-main" style={{ padding: '2rem', borderRadius: '16px', backgroundColor: 'rgba(255, 255, 255, 0.04)' }}>
                <p style={{ fontSize: '1.1rem', lineHeight: '1.7', margin: 0 }}>
                  Инструмент, который не требует постоянного сидения у графиков, не заставляет нервничать и не рушит день, если свеча пошла "не туда".
                </p>
              </div>
              <div className="glass-main" style={{ padding: '2rem', borderRadius: '16px', border: '2px solid var(--color-primary)', backgroundColor: 'rgba(255, 255, 255, 0.04)' }}>
                <p style={{ fontSize: '1.1rem', lineHeight: '1.7', margin: 0, fontWeight: '500' }}>
                  <strong>VEXTR — это про уверенность и спокойствие.</strong><br/>
                  Про то, что твои деньги могут работать без твоего постоянного участия, как надёжный механизм, не зависящий от человеческих ошибок.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="about-difference" style={{ padding: '4rem 0', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
          <div className="about-difference__container" style={{ maxWidth: '900px', margin: '0 auto', padding: '0 2rem' }}>
            <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '3rem' }}>
              Что делает нас другими
            </h2>
            <div className="about-difference__grid" style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
              <div className="glass-main" style={{ padding: '2rem', borderRadius: '16px', backgroundColor: 'rgba(255, 255, 255, 0.04)' }}>
                <h3 style={{ color: 'var(--color-primary)', marginBottom: '1rem', fontSize: '1.3rem' }}>
                  Прозрачность
                </h3>
                <p style={{ fontSize: '1rem', lineHeight: '1.6', margin: 0 }}>
                  На рынке тысячи "сигнальных" каналов и "гениев" трейдинга, обещающих чудеса. Но мы — не про обещания. Мы про прозрачность.
                </p>
              </div>
              <div className="glass-main" style={{ padding: '2rem', borderRadius: '16px', backgroundColor: 'rgba(255, 255, 255, 0.04)' }}>
                <h3 style={{ color: 'var(--color-primary)', marginBottom: '1rem', fontSize: '1.3rem' }}>
                  Живое сообщество
                </h3>
                <p style={{ fontSize: '1rem', lineHeight: '1.6', margin: 0 }}>
                  У нас открытая статистика, и мы не боимся показать результаты. У нас живое комьюнити — люди, которые тестируют, обсуждают, предлагают идеи.
                </p>
              </div>
              <div className="glass-main" style={{ padding: '2rem', borderRadius: '16px', backgroundColor: 'rgba(255, 255, 255, 0.04)' }}>
                <h3 style={{ color: 'var(--color-primary)', marginBottom: '1rem', fontSize: '1.3rem' }}>
                  Постоянное развитие
                </h3>
                <p style={{ fontSize: '1rem', lineHeight: '1.6', margin: 0 }}>
                  Каждую неделю мы оптимизируем систему, тестируем обновления и улучшаем алгоритмы. Рынок меняется — и мы меняемся вместе с ним.
                </p>
              </div>
              <div className="glass-main" style={{ padding: '2rem', borderRadius: '16px', backgroundColor: 'rgba(255, 255, 255, 0.04)' }}>
                <h3 style={{ color: 'var(--color-primary)', marginBottom: '1rem', fontSize: '1.3rem' }}>
                  Мы не прячемся за фасадом
                </h3>
                <p style={{ fontSize: '1rem', lineHeight: '1.6', margin: 0 }}>
                  Мы не играем в экспертов и не прячем свои процессы. Если что-то идёт не так — мы говорим об этом. Если что-то получается — делимся результатом. У нас нет "закулисья", потому что VEXTR строится на доверии.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="about-philosophy" style={{ padding: '4rem 0', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
          <div className="about-philosophy__container" style={{ maxWidth: '900px', margin: '0 auto', padding: '0 2rem' }}>
            <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '3rem' }}>
              Наша философия
            </h2>
            <div className="about-philosophy__content" style={{ display: 'grid', gap: '2rem' }}>
              <div className="glass-main" style={{ padding: '2rem', borderRadius: '16px', backgroundColor: 'rgba(255, 255, 255, 0.04)' }}>
                <h3 style={{ color: 'var(--color-accent)', marginBottom: '1rem', fontSize: '1.3rem' }}>
                  Мы хотим, чтобы рынок перестал быть местом страха
                </h3>
                <p style={{ fontSize: '1rem', lineHeight: '1.7', margin: 0 }}>
                  Чтобы люди перестали думать, что торговля — это казино. Чтобы каждый понял: всё можно делать спокойно, рационально, с головой.
                </p>
              </div>
              <div className="glass-main" style={{ padding: '2rem', borderRadius: '16px', backgroundColor: 'rgba(255, 255, 255, 0.04)' }}>
                <h3 style={{ color: 'var(--color-accent)', marginBottom: '1rem', fontSize: '1.3rem' }}>
                  Мы создаём ощущение спокойствия
                </h3>
                <p style={{ fontSize: '1rem', lineHeight: '1.7', margin: 0 }}>
                  Когда можно выдохнуть и довериться системе, которая работает. Мы создаём среду, где люди помогают друг другу, где идеи обсуждаются, а не высмеиваются.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="about-team" style={{ padding: '4rem 0', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
          <div className="about-team__container" style={{ maxWidth: '900px', margin: '0 auto', padding: '0 2rem' }}>
            <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '3rem' }}>
              Наша команда
            </h2>
            <div className="glass-main" style={{ padding: '3rem', borderRadius: '16px', textAlign: 'center', backgroundColor: 'rgba(255, 255, 255, 0.04)' }}>
              <p style={{ fontSize: '1.1rem', lineHeight: '1.7', marginBottom: '2rem' }}>
                За VEXTR стоят не только строки кода и алгоритмы. За ним — люди, которые горят идеей сделать торговлю лучше.
              </p>
              <p style={{ fontSize: '1.1rem', lineHeight: '1.7', marginBottom: '2rem' }}>
                Каждый из нас прошёл через рынок, ошибки, бессонные ночи, сливы и победы. И именно поэтому мы знаем, как важно, когда можно доверять.
              </p>
              <div style={{ padding: '2rem', backgroundColor: 'rgba(155, 255, 0, 0.1)', borderRadius: '12px', border: '1px solid var(--color-primary)' }}>
                <p style={{ fontSize: '1.1rem', lineHeight: '1.7', margin: 0, fontWeight: '500' }}>
                  <strong>И самое главное — мы не выше своих пользователей.</strong><br/>
                  Мы такие же, как вы. Просто хотим, чтобы рынок перестал быть хаосом и стал чем-то, что приносит удовольствие.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="about-future" style={{ padding: '4rem 0', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
          <div className="about-future__container" style={{ maxWidth: '800px', margin: '0 auto', padding: '0 2rem', textAlign: 'center' }}>
            <h2 className="section-title" style={{ marginBottom: '2rem' }}>
              Куда мы идём
            </h2>
            <div className="glass-main" style={{ padding: '3rem', borderRadius: '16px', backgroundColor: 'rgba(255, 255, 255, 0.04)' }}>
              <p style={{ fontSize: '1.1rem', lineHeight: '1.7', marginBottom: '2rem' }}>
                У нас большие цели. Мы растём, развиваемся и уже выходим за рамки привычного. Мы строим проект, который не застрянет в одном формате.
              </p>
              <div style={{ padding: '2rem', backgroundColor: 'rgba(0, 255, 102, 0.1)', borderRadius: '12px', border: '1px solid var(--color-accent)' }}>
                <p style={{ fontSize: '1.2rem', lineHeight: '1.6', margin: 0, fontWeight: '600' }}>
                  💬 VEXTR — это когда торговля перестаёт быть гонкой и становится удовольствием.
                </p>
                <p style={{ fontSize: '1.1rem', lineHeight: '1.6', margin: '1rem 0 0 0' }}>
                  Мы не обещаем чудес, но гарантируем одно — честность, открытость и постоянное движение вперёд.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer></Footer>
      <style jsx>
        {`
          @media (max-width: 768px) {
            .about-hero__container,
            .about-story__container,
            .about-difference__container,
            .about-philosophy__container,
            .about-team__container,
            .about-future__container {
              padding: 0 1rem !important;
            }
            
            .about-hero,
            .about-story,
            .about-difference,
            .about-philosophy,
            .about-team,
            .about-future {
              padding: 2rem 0 !important;
            }
            
            .about-difference__grid {
              grid-template-columns: 1fr !important;
              gap: 1.5rem !important;
            }
            
            .about-story__content {
              gap: 1.5rem !important;
            }
            
            .about-philosophy__content {
              gap: 1.5rem !important;
            }
            
            .glass-main {
              padding: 1.5rem !important;
            }
            
            .section-title {
              font-size: 1.8rem !important;
              line-height: 1.2 !important;
            }
            
            .section-subtitle {
              font-size: 1rem !important;
              line-height: 1.5 !important;
            }
            
            h3 {
              font-size: 1.1rem !important;
            }
            
            p {
              font-size: 0.95rem !important;
              line-height: 1.6 !important;
            }
            
            .about-hero .glass-main {
              padding: 1.5rem !important;
            }
            
            .about-hero .section-subtitle {
              font-size: 1rem !important;
              margin-bottom: 1.5rem !important;
            }
            
            .about-team .glass-main,
            .about-future .glass-main {
              padding: 2rem !important;
            }
            
            .about-team .glass-main p,
            .about-future .glass-main p {
              font-size: 1rem !important;
              margin-bottom: 1.5rem !important;
            }
            
            .about-team .glass-main > div,
            .about-future .glass-main > div {
              padding: 1.5rem !important;
            }
            
            .about-team .glass-main > div p,
            .about-future .glass-main > div p {
              font-size: 1rem !important;
              margin: 0 !important;
            }
            
            .about-future .glass-main > div p:first-child {
              font-size: 1.1rem !important;
              margin-bottom: 1rem !important;
            }
          }
          
          @media (max-width: 480px) {
            .about-hero__container,
            .about-story__container,
            .about-difference__container,
            .about-philosophy__container,
            .about-team__container,
            .about-future__container {
              padding: 0 0.75rem !important;
            }
            
            .about-hero,
            .about-story,
            .about-difference,
            .about-philosophy,
            .about-team,
            .about-future {
              padding: 1.5rem 0 !important;
            }
            
            .glass-main {
              padding: 1rem !important;
            }
            
            .section-title {
              font-size: 1.5rem !important;
            }
            
            .section-subtitle {
              font-size: 0.9rem !important;
            }
            
            h3 {
              font-size: 1rem !important;
            }
            
            p {
              font-size: 0.9rem !important;
            }
            
            .about-team .glass-main,
            .about-future .glass-main {
              padding: 1.5rem !important;
            }
            
            .about-team .glass-main > div,
            .about-future .glass-main > div {
              padding: 1rem !important;
            }
            
            .about-team .glass-main > div p:first-child,
            .about-future .glass-main > div p:first-child {
              font-size: 1rem !important;
            }
          }
        `}
      </style>
    </>
  )
}

export default About