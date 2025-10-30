import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import Script from 'next/script'
import { useRouter } from 'next/router'

import Navigation from '../components/navigation'
import Footer from '../components/footer'

const Register = () => {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [telegramLoading, setTelegramLoading] = useState(false)

  // Обработчик авторизации через Telegram
  useEffect(() => {
    // Проверяем сохраненную сессию
    const savedUser = localStorage.getItem('telegram_user')
    if (savedUser) {
      // Если уже авторизован - редирект на форму заявки
      router.push('/affiliate-application')
      return
    }

    // Глобальный обработчик для Telegram Widget
    window.TelegramLoginWidgetCallback = async function(user) {
      console.log('✅ Telegram auth received:', user)
      setTelegramLoading(true)
      setMessage('')
      
      try {
        console.log('📤 Sending auth request to /api/auth/telegram...')
        
        // Отправляем данные на бэкенд для проверки
        const response = await fetch('/api/auth/telegram', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(user)
        })

        console.log('📥 Response status:', response.status)
        
        const data = await response.json()
        console.log('📥 Response data:', data)

        if (response.ok && data.success) {
          // Сохраняем пользователя
          localStorage.setItem('telegram_user', JSON.stringify(user))
          localStorage.setItem('auth_token', data.token)
          
          setMessage(`Добро пожаловать, ${user.first_name}! 🎉`)
          
          console.log('✅ Auth successful, redirecting...')
          
          // Редирект на форму заявки через 1 секунду
          setTimeout(() => {
            router.push('/affiliate-application')
          }, 1000)
        } else {
          const errorMsg = data.error || data.details || 'Неизвестная ошибка'
          console.error('❌ Auth failed:', errorMsg)
          setMessage('Ошибка авторизации: ' + errorMsg)
          setTelegramLoading(false)
        }
      } catch (error) {
        console.error('❌ Auth error:', error)
        setMessage('Ошибка подключения к серверу: ' + error.message)
        setTelegramLoading(false)
      }
    }

    return () => {
      delete window.TelegramLoginWidgetCallback
    }
  }, [router])

  return (
    <>
      <Head>
        <title>Регистрация — VEXTR</title>
      </Head>
      <Navigation></Navigation>
      
      <Script
        src="https://telegram.org/js/telegram-widget.js?22"
        strategy="lazyOnload"
      />
      
      <main style={{ 
        paddingTop: 100, 
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <section className="how-it-works" style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          padding: '2rem',
          width: '100%'
        }}>
          <div className="glass-main" style={{ 
            maxWidth: 500, 
            width: '100%', 
            padding: '3rem 2.5rem',
            textAlign: 'center'
          }}>
            <h1 className="section-title" style={{ 
              textAlign: 'center', 
              marginBottom: '1rem',
              fontSize: '2.5rem'
            }}>
              Партнерская программа
            </h1>
            
            <p style={{
              fontSize: '1.1rem',
              color: 'rgba(255, 255, 255, 0.7)',
              marginBottom: '3rem',
              lineHeight: '1.6'
            }}>
              Войдите через Telegram, чтобы подать заявку на участие в партнерской программе
            </p>

            {/* Telegram Login Button */}
            <div style={{ marginBottom: '2rem' }}>
              <div
                id="telegram-login-button"
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginBottom: '1.5rem'
                }}
                dangerouslySetInnerHTML={{
                  __html: `
                    <script async src="https://telegram.org/js/telegram-widget.js?22" 
                      data-telegram-login="vextrregisterbot" 
                      data-size="large" 
                      data-radius="12"
                      data-onauth="TelegramLoginWidgetCallback(user)" 
                      data-request-access="write">
                    </script>
                  `
                }}
              />
              
              {telegramLoading && (
                <div style={{
                  textAlign: 'center',
                  color: '#9FFF00',
                  marginTop: '1.5rem'
                }}>
                  <div className="spinner" style={{
                    display: 'inline-block',
                    width: '24px',
                    height: '24px',
                    border: '3px solid rgba(159, 255, 0, 0.3)',
                    borderTopColor: '#9FFF00',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  <p style={{ marginTop: '1rem', fontSize: '1rem' }}>
                    Проверка авторизации...
                  </p>
                </div>
              )}
            </div>
            
            {message && (
              <div style={{
                marginTop: '2rem',
                padding: '1.2rem',
                borderRadius: '12px',
                background: message.includes('успешн') || message.includes('Добро') 
                  ? 'rgba(159, 255, 0, 0.1)' 
                  : 'rgba(255, 100, 100, 0.1)',
                border: `1px solid ${
                  message.includes('успешн') || message.includes('Добро')
                    ? 'rgba(159, 255, 0, 0.3)' 
                    : 'rgba(255, 100, 100, 0.3)'
                }`,
                color: message.includes('успешн') || message.includes('Добро')
                  ? '#9FFF00' 
                  : '#ff6464',
                textAlign: 'center',
                fontSize: '1rem',
                fontWeight: '500'
              }}>
                {message}
              </div>
            )}

            <div style={{
              marginTop: '3rem',
              padding: '1.5rem',
              background: 'rgba(159, 255, 0, 0.05)',
              borderRadius: '12px',
              border: '1px solid rgba(159, 255, 0, 0.2)'
            }}>
              <div style={{
                fontSize: '0.9rem',
                color: 'rgba(255, 255, 255, 0.7)',
                lineHeight: '1.6'
              }}>
                <p style={{ marginBottom: '0.5rem' }}>
                  ✓ Безопасная авторизация через Telegram
                </p>
                <p style={{ marginBottom: '0.5rem' }}>
                  ✓ Быстрая подача заявки
                </p>
                <p>
                  ✓ Прозрачные условия партнерства
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer></Footer>
      
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}

export default Register
