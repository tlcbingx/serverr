import React from 'react'
import Head from 'next/head'
import Navigation from '../components/navigation'
import Footer from '../components/footer'

const FAQ = () => {
  return (
    <>
      <Head>
        <title>FAQ — VEXTR</title>
      </Head>
      <Navigation />
      <main style={{ paddingTop: 100 }}>
        <section className="how-it-works" style={{ minHeight: '60vh' }}>
          <div style={{ maxWidth: 'var(--content-max-width)', margin: '0 auto', paddingLeft: 'var(--spacing-xl)', paddingRight: 'var(--spacing-xl)' }}>
            <div className="glass-main glass-main--compact" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h1 className="section-title">FAQ — Часто задаваемые вопросы о VEXTR</h1>
              <div className="docs-steps" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '100%' }}>
                <ol className="docs-list faq" style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--color-on-surface-secondary)', fontSize: '1rem', lineHeight: '1.5' }}>
                  <li>
                    <div className="faq-question">Что такое VEXTR?</div>
                    <div className="faq-answer">VEXTR — это торговый Telegram-бот, который подключается к вашему аккаунту на криптобирже и совершает сделки по заранее протестированной стратегии. Вы не передаёте нам деньги: средства остаются на вашей бирже, бот лишь управляет ордерами через API без права вывода.</div>
                  </li>
                  <li>
                    <div className="faq-question">Как работает стратегия?</div>
                    <div className="faq-answer">Стратегия анализирует цену, объём, поведение рынка и другие технические параметры по 11 криптовалютам. Когда алгоритм видит подходящую ситуацию — он открывает позицию, а затем закрывает её при достижении прибыли или при сигнале на выход. Бот не торгует каждый день — он ждёт благоприятные условия.</div>
                  </li>
                  <li>
                    <div className="faq-question">Это безопасно?</div>
                    <div className="faq-answer">Да. Подключение происходит через официальные API ключи вашей биржи без права вывода. Бот не может перевести или снять ваши средства. Вы можете удалить ключи в любой момент.</div>
                  </li>
                  <li>
                    <div className="faq-question">Какие биржи поддерживаются?</div>
                    <div className="faq-answer">На данный момент: BingX, OKX, Bybit. Поддержка других площадок появится позже.</div>
                  </li>
                  <li>
                    <div className="faq-question">Сколько стоит подписка?</div>
                    <div className="faq-answer">Стоимость доступа: 500 ₽ в месяц, или 1200 ₽ за 3 месяца со скидкой. Оплата проходит через бота в телеграмм где вы подключаете стратегию.</div>
                  </li>
                  <li>
                    <div className="faq-question">Что я получаю после оплаты?</div>
                    <div className="faq-answer">Полный доступ к Telegram-боту</div>
                    <div className="faq-answer">Возможность подключить биржу и начать торговлю</div>
                    <div className="faq-answer">Доступ к закрытому чату пользователей</div>
                  </li>
                  <li>
                    <div className="faq-question">Что в закрытом чате?</div>
                    <div className="faq-answer">Чат — это сообщество пользователей VEXTR. Люди делятся опытом, результатами, обсуждают рынок и настройки. Новички могут получить поддержку от опытных участников и команды VEXTR.</div>
                  </li>
                  <li>
                    <div className="faq-question">Сколько можно заработать с помощью бота?</div>
                    <div className="faq-answer">Реальные результаты зависят от рынка. По данным тестов: средняя доходность — 4–12% в месяц в нормальных условиях. Бывают как прибыльные, так и убыточные месяцы.</div>
                  </li>
                  <li>
                    <div className="faq-question">Могу ли я потерять деньги?</div>
                    <div className="faq-answer">Да, как и в любой торговле. VEXTR снижает риски, но полностью исключить просадки невозможно. Бот открывает сделки на 5% депозита и 10 плечо, скоро будет возможность самому настраивать следите за обновлениями в канале </div>
                  </li>
                  <li>
                    <div className="faq-question">Бот торгует каждый день?</div>
                    <div className="faq-answer">Нет. Бот не торгует ради количества сделок. Иногда бывает 2–3 сделки в день, иногда — ни одной за пару дней.</div>
                  </li>
                  <li>
                    <div className="faq-question">Где я могу посмотреть результаты?</div>
                    <div className="faq-answer">Результаты можно посмотреть на сайте VEXTR в разделе “Результаты” и на <a className="link-tradingview" href="https://ru.tradingview.com/script/tun2o41g-tlcpro/" target="_blank" rel="noopener noreferrer">TradingView</a>, где стратегия выложена открыто. На сайте можно выбрать период: прошлый месяц, текущий год, всё время тестов.</div>
                  </li>
                  <li>
                    <div className="faq-question">Можно ли использовать сразу несколько ботов?</div>
                    <div className="faq-answer">Нет. Сейчас доступна одна стратегия и один активный бот на аккаунт. Позже появится больше стратегий.</div>
                  </li>
                  <li>
                    <div className="faq-question">Можно ли запустить бота с телефона?</div>
                    <div className="faq-answer">Да. Все операции проходят через Telegram — запуск, пауза, просмотр статистики. API подключается один раз, и дальше всё работает автоматически.</div>
                  </li>
                  <li>
                    <div className="faq-question">Что нужно, чтобы начать?</div>
                    <div className="faq-answer">Аккаунт на поддерживаемой бирже, Telegram, минимальный депозит от $50 (рекомендуется $100–200), подписка на VEXTR. После этого бот начнёт работу автоматически.</div>
                  </li>
                  <li>
                    <div className="faq-question">Что делать, если бот не торгует?</div>
                    <div className="faq-answer">Если бот не открывает сделки — значит, нет сигнала по стратегии. Это часть логики: бот ждёт проверенные условия. Как только появится сигнал — сделка откроется автоматически.</div>
                  </li>
                  <li>
                    <div className="faq-question">Можно ли остановить торговлю?</div>
                    <div className="faq-answer">Да. Вы можете приостановить торговлю в самом боте или удалить API-ключи с биржи. Всё управление в ваших руках.</div>
                  </li>
                  <li>
                    <div className="faq-question">Могу ли я вернуть деньги за подписку?</div>
                    <div className="faq-answer">Можно спустя если произошла какаято техническая ошибка, но если вы подключили и прошло больше недели к сожалению нельзя. Вы можете не продлевать подписку — доступ прекратится по окончании оплаченного периода.</div>
                  </li>
                  <li>
                    <div className="faq-question">Почему стоит выбрать VEXTR?</div>
                    <div className="faq-answer">Безопасно — без доступа к выводу средств </div>
                    <div className="faq-answer">Прозрачно — стратегия на TradingView </div>
                    <div className="faq-answer">Реалистично — без гарантий </div>
                    <div className="faq-answer">Сообщество — чат с пользователями </div>
                    <div className="faq-answer">Работа через Telegram — удобно</div>
                  </li>
                  <li>
                    <div className="faq-question">Что если стратегия перестанет работать?</div>
                    <div className="faq-answer">Рынок меняется. Команда VEXTR обновляет стратегию и оповещает пользователей о новых версиях при необходимости.</div>
                  </li>
                  <li>
                    <div className="faq-question">Что будет дальше?</div>
                    <div className="faq-answer">Развитие платформы, добавление маркетплейса стратегий, улучшение статистики и интерфейса, запуск партнёрской программы, создание мобильного приложения.</div>
                  </li>
                </ol>
              </div>
            </div>
            <div className="faq-support-block">
              <div className="faq-support">
                <p className="faq-support-note">Если здесь нет ответа на ваш вопрос — напишите саппорту!</p>
                <a className="btn-support" href="https://t.me/vextrsupport" target="_blank" rel="noopener noreferrer">Написать в поддержку</a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer></Footer>
    </>
  )
}

export default FAQ


