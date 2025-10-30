import React from 'react'
import Head from 'next/head'
import Navigation from '../components/navigation'
import Footer from '../components/footer'

const AffiliateTerms = () => {
  return (
    <>
      <Head>
        <title>Правила партнёрской программы — VEXTR</title>
        <meta name="description" content="Условия участия в партнёрской программе VEXTR" />
      </Head>
      <Navigation />
      
      <main style={{ paddingTop: 100, paddingBottom: 60 }}>
        <div style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: '0 1.5rem'
        }}>
          <div className="glass-main" style={{ padding: '3rem 2.5rem' }}>
            <h1 className="section-title" style={{ 
              textAlign: 'center', 
              marginBottom: '2rem',
              fontSize: '2.5rem'
            }}>
              Правила партнёрской программы VEXTR
            </h1>

            <div style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '1rem',
              lineHeight: '1.8'
            }}>
              <p style={{ marginBottom: '1rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                Дата последнего обновления: 30 октября 2025 г.
              </p>

              <h2 style={{ color: '#9FFF00', fontSize: '1.5rem', marginTop: '2rem', marginBottom: '1rem' }}>
                1. Общие положения
              </h2>
              <p style={{ marginBottom: '1rem' }}>
                Настоящие правила определяют условия участия в партнёрской программе VEXTR (далее — Программа).
                Присоединяясь к Программе, вы (далее — Партнёр) подтверждаете согласие с её условиями и обязуетесь их соблюдать.
              </p>

              <h2 style={{ color: '#9FFF00', fontSize: '1.5rem', marginTop: '2rem', marginBottom: '1rem' }}>
                2. Условия участия
              </h2>
              <p style={{ marginBottom: '1rem' }}>
                Партнёром может стать любое физическое или юридическое лицо, соответствующее следующим требованиям:
              </p>
              <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
                <li style={{ marginBottom: '0.5rem' }}>Возраст от 18 лет;</li>
                <li style={{ marginBottom: '0.5rem' }}>Наличие активного аккаунта в Telegram;</li>
                <li style={{ marginBottom: '0.5rem' }}>Согласие с настоящими Правилами и Политикой VEXTR;</li>
                <li style={{ marginBottom: '0.5rem' }}>Отсутствие нарушений законодательства в сфере финансовых услуг.</li>
              </ul>

              <h2 style={{ color: '#9FFF00', fontSize: '1.5rem', marginTop: '2rem', marginBottom: '1rem' }}>
                3. Вознаграждение
              </h2>
              <p style={{ marginBottom: '1rem' }}>
                Партнёр получает вознаграждение за каждого приведённого пользователя:
              </p>
              <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
                <li style={{ marginBottom: '0.5rem' }}>
                  <strong>100 %</strong> от первого платежа привлечённого пользователя;
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  <strong>До 50 %</strong> от всех последующих платежей этого пользователя.
                </li>
              </ul>
              <p style={{ marginBottom: '1rem' }}>
                Начисление вознаграждения осуществляется в течение трёх рабочих дней после подтверждения оплаты.
              </p>

              <h2 style={{ color: '#9FFF00', fontSize: '1.5rem', marginTop: '2rem', marginBottom: '1rem' }}>
                4. Обязанности партнёра
              </h2>
              <p style={{ marginBottom: '1rem' }}>
                Партнёр обязуется:
              </p>
              <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
                <li style={{ marginBottom: '0.5rem' }}>Продвигать продукт VEXTR честно и законно;</li>
                <li style={{ marginBottom: '0.5rem' }}>Не использовать спам, вводящие в заблуждение обещания и манипуляции;</li>
                <li style={{ marginBottom: '0.5rem' }}>Не выдавать себя за официального представителя VEXTR без письменного разрешения;</li>
                <li style={{ marginBottom: '0.5rem' }}>Предоставлять достоверную статистику по своим привлечениям;</li>
                <li style={{ marginBottom: '0.5rem' }}>Соблюдать законы своей страны при продвижении продукта.</li>
              </ul>

              <h2 style={{ color: '#9FFF00', fontSize: '1.5rem', marginTop: '2rem', marginBottom: '1rem' }}>
                5. Запрещённые действия
              </h2>
              <p style={{ marginBottom: '0.5rem' }}>
                Партнёру запрещается:
              </p>
              <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
                <li style={{ marginBottom: '0.5rem' }}>Использовать любые формы спама;</li>
                <li style={{ marginBottom: '0.5rem' }}>Размещать ссылки на сайтах с порнографией, насилием или иным незаконным контентом;</li>
                <li style={{ marginBottom: '0.5rem' }}>Обещать пользователям гарантированную прибыль;</li>
                <li style={{ marginBottom: '0.5rem' }}>Использовать накрутку, ботов или фиктивные регистрации;</li>
                <li style={{ marginBottom: '0.5rem' }}>Регистрироваться самому по своей ссылке;</li>
                <li style={{ marginBottom: '0.5rem' }}>Нарушать интеллектуальные права VEXTR.</li>
              </ul>

              <h2 style={{ color: '#9FFF00', fontSize: '1.5rem', marginTop: '2rem', marginBottom: '1rem' }}>
                6. Выплаты
              </h2>
              <p style={{ marginBottom: '1rem' }}>
                Минимальная сумма вывода: <strong>1 000 ₽</strong>
              </p>
              <p style={{ marginBottom: '1rem' }}>
                Способы выплаты:
              </p>
              <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
                <li style={{ marginBottom: '0.5rem' }}>Банковская карта (РФ);</li>
                <li style={{ marginBottom: '0.5rem' }}>Криптовалюта USDT (TRC20);</li>
                <li style={{ marginBottom: '0.5rem' }}>Другие методы — по индивидуальному согласованию.</li>
              </ul>
              <p style={{ marginBottom: '1rem' }}>
                Срок выплаты: до 7 рабочих дней с момента запроса.
              </p>

              <h2 style={{ color: '#9FFF00', fontSize: '1.5rem', marginTop: '2rem', marginBottom: '1rem' }}>
                7. Отчётность и контроль
              </h2>
              <p style={{ marginBottom: '1rem' }}>
                Партнёр получает доступ в личный кабинет, где отображаются:
              </p>
              <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
                <li style={{ marginBottom: '0.5rem' }}>количество переходов по ссылке;</li>
                <li style={{ marginBottom: '0.5rem' }}>число регистраций и оплат;</li>
                <li style={{ marginBottom: '0.5rem' }}>начисленное вознаграждение;</li>
                <li style={{ marginBottom: '0.5rem' }}>история выплат.</li>
              </ul>

              <h2 style={{ color: '#9FFF00', fontSize: '1.5rem', marginTop: '2rem', marginBottom: '1rem' }}>
                8. Изменение условий
              </h2>
              <p style={{ marginBottom: '1rem' }}>
                VEXTR оставляет за собой право вносить изменения в условия Программы.
                О существенных изменениях партнёры уведомляются через Telegram не позднее чем за 7 дней до вступления новых правил в силу.
              </p>

              <h2 style={{ color: '#9FFF00', fontSize: '1.5rem', marginTop: '2rem', marginBottom: '1rem' }}>
                9. Прекращение участия
              </h2>
              <p style={{ marginBottom: '1rem' }}>
                Компания VEXTR имеет право приостановить или прекратить участие Партнёра в Программе в случаях:
              </p>
              <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
                <li style={{ marginBottom: '0.5rem' }}>нарушения настоящих Правил;</li>
                <li style={{ marginBottom: '0.5rem' }}>использования запрещённых методов продвижения;</li>
                <li style={{ marginBottom: '0.5rem' }}>мошенничества или обмана пользователей;</li>
                <li style={{ marginBottom: '0.5rem' }}>действий, наносящих ущерб репутации VEXTR.</li>
              </ul>
              <p style={{ marginBottom: '1rem' }}>
                При прекращении участия все неоплаченные вознаграждения аннулируются.
              </p>

              <h2 style={{ color: '#9FFF00', fontSize: '1.5rem', marginTop: '2rem', marginBottom: '1rem' }}>
                10. Ответственность
              </h2>
              <p style={{ marginBottom: '1rem' }}>
                Партнёр несёт полную ответственность за способы продвижения и публикуемый им контент.
                VEXTR не несёт ответственности за убытки или репутационные риски, вызванные действиями Партнёра.
              </p>

              <h2 style={{ color: '#9FFF00', fontSize: '1.5rem', marginTop: '2rem', marginBottom: '1rem' }}>
                11. Контакты
              </h2>
              <p style={{ marginBottom: '1rem' }}>
                По всем вопросам партнёрской программы:
              </p>
              <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
                <li style={{ marginBottom: '0.5rem' }}>📩 Telegram: @vextr_support</li>
                <li style={{ marginBottom: '0.5rem' }}>📧 Email: partners@vextr.ru</li>
              </ul>

              <div style={{
                marginTop: '3rem',
                padding: '1.5rem',
                background: 'rgba(159, 255, 0, 0.1)',
                border: '1px solid rgba(159, 255, 0, 0.3)',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <p style={{ fontSize: '0.95rem', marginBottom: '0' }}>
                  📘 Подавая заявку на участие, вы подтверждаете, что ознакомились с настоящими Правилами и полностью согласны с их условиями.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </>
  )
}

export default AffiliateTerms

