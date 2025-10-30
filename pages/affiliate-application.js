import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'

import Navigation from '../components/navigation'
import Footer from '../components/footer'

const AffiliateApplication = () => {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const [formData, setFormData] = useState({
    // Базовая информация
    fullName: '',
    telegramNick: '',
    email: '',
    age: '',
    
    // О вас
    aboutYou: '',
    hasAudience: [],
    socialLinks: '',
    
    // Как планируете продвигать
    promotionMethods: [],
    promotionDetails: '',
    targetAudience: '',
    
    // Ожидания и цели
    expectedResults: '',
    
    // Согласие
    agreeToTerms: false
  })

  useEffect(() => {
    const savedUser = localStorage.getItem('telegram_user')
    if (!savedUser) {
      router.push('/register')
      return
    }
    
    const userData = JSON.parse(savedUser)
    setUser(userData)
    
    // Автозаполнение Telegram username
    setFormData(prev => ({
      ...prev,
      telegramNick: userData.username ? `@${userData.username}` : ''
    }))
    
    setLoading(false)
  }, [router])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    
    if (type === 'checkbox') {
      if (name === 'agreeToTerms') {
        setFormData(prev => ({ ...prev, agreeToTerms: checked }))
      } else {
        setFormData(prev => {
          const currentArray = prev[name] || []
          if (checked) {
            return { ...prev, [name]: [...currentArray, value] }
          } else {
            return { ...prev, [name]: currentArray.filter(item => item !== value) }
          }
        })
      }
    } else if (type === 'radio') {
      setFormData(prev => ({ ...prev, [name]: value }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage('')

    // Валидация обязательных полей
    if (!formData.fullName || !formData.telegramNick || !formData.email) {
      setMessage('Пожалуйста, заполните обязательные поля: Имя и фамилия, Telegram ник, Email')
      setSubmitting(false)
      return
    }

    if (!formData.agreeToTerms) {
      setMessage('Необходимо согласиться с условиями партнёрской программы')
      setSubmitting(false)
      return
    }

    try {
      const response = await fetch('/api/submit-application', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user: user,
          formData: formData,
          submittedAt: new Date().toISOString()
        })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('✅ Заявка успешно отправлена! Мы свяжемся с вами в ближайшее время.')
        // Очистка формы
        window.scrollTo(0, 0)
      } else {
        setMessage('❌ ' + (data.error || 'Ошибка отправки заявки. Попробуйте позже.'))
      }
    } catch (error) {
      console.error('Submit error:', error)
      setMessage('❌ Ошибка подключения к серверу')
    } finally {
      setSubmitting(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('telegram_user')
    localStorage.removeItem('auth_token')
    router.push('/register')
  }

  if (loading) {
    return (
      <>
        <Head>
          <title>Загрузка...</title>
        </Head>
        <Navigation />
        <div style={{
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            textAlign: 'center',
            color: '#9FFF00'
          }}>
            <div className="spinner" style={{
              display: 'inline-block',
              width: '48px',
              height: '48px',
              border: '4px solid rgba(159, 255, 0, 0.3)',
              borderTopColor: '#9FFF00',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <p style={{ marginTop: '1rem', fontSize: '1.2rem' }}>Загрузка...</p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Head>
        <title>Заявка на партнерскую программу — VEXTR</title>
      </Head>
      <Navigation />
      
      <main style={{ paddingTop: 100, paddingBottom: 60 }}>
        <div style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: '0 1.5rem'
        }}>
          {/* Шапка с информацией о пользователе */}
          <div className="glass-main" style={{
            padding: '1.5rem 2rem',
            marginBottom: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {user?.photo_url && (
                <img
                  src={user.photo_url}
                  alt={user.first_name}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    border: '2px solid #9FFF00'
                  }}
                />
              )}
              <div>
                <p style={{ 
                  fontSize: '1.1rem', 
                  fontWeight: '600', 
                  color: '#9FFF00',
                  marginBottom: '0.25rem'
                }}>
                  {user?.first_name} {user?.last_name || ''}
                </p>
                <p style={{ 
                  fontSize: '0.9rem', 
                  color: 'rgba(255, 255, 255, 0.6)'
                }}>
                  @{user?.username || 'telegram_user'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                padding: '0.6rem 1.5rem',
                borderRadius: '50px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: '#ffffff',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.15)'
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.5)'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)'
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)'
              }}
            >
              Выйти
            </button>
          </div>

          {/* Сообщение о результате вверху */}
          {message && (
            <div style={{
              marginBottom: '2rem',
              padding: '1.2rem',
              borderRadius: '12px',
              background: message.includes('успешно') || message.includes('✅')
                ? 'rgba(159, 255, 0, 0.1)' 
                : 'rgba(255, 100, 100, 0.1)',
              border: `1px solid ${
                message.includes('успешно') || message.includes('✅')
                  ? 'rgba(159, 255, 0, 0.3)' 
                  : 'rgba(255, 100, 100, 0.3)'
              }`,
              color: message.includes('успешно') || message.includes('✅')
                ? '#9FFF00' 
                : '#ff6464',
              textAlign: 'center',
              fontSize: '1rem',
              fontWeight: '500'
            }}>
              {message}
            </div>
          )}

          {/* Форма заявки */}
          <div className="glass-main" style={{ padding: '3rem 2.5rem' }}>
            <h1 className="section-title" style={{ 
              textAlign: 'center', 
              marginBottom: '1rem',
              fontSize: '2.5rem'
            }}>
              Заявка на участие в партнёрской программе
            </h1>
            
            <p style={{
              fontSize: '1rem',
              color: 'rgba(255, 255, 255, 0.7)',
              marginBottom: '3rem',
              textAlign: 'center',
              lineHeight: '1.6'
            }}>
              Заполните анкету, чтобы стать партнером VEXTR
            </p>

            <form onSubmit={handleSubmit}>
              {/* Базовая информация */}
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#9FFF00',
                marginBottom: '1.5rem',
                marginTop: '2rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                🔹 Базовая информация
              </h2>
              <p style={{
                fontSize: '0.9rem',
                color: 'rgba(255, 255, 255, 0.6)',
                marginBottom: '2rem',
                marginTop: '-0.5rem'
              }}>
                Чтобы идентифицировать партнёра
              </p>

              <FormInput
                label="Имя и фамилия"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                placeholder="Например: Иван Иванов"
              />

              <FormInput
                label="Ник в Telegram (обязательно)"
                name="telegramNick"
                value={formData.telegramNick}
                onChange={handleChange}
                required
                placeholder="@username"
              />

              <FormInput
                label="Email (для связи и аналитики)"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="example@email.com"
              />

              <FormInput
                label="Возраст (опционально)"
                name="age"
                type="number"
                value={formData.age}
                onChange={handleChange}
                placeholder="25"
              />

              {/* О вас */}
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#9FFF00',
                marginBottom: '1.5rem',
                marginTop: '3rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                🔹 О вас
              </h2>
              <p style={{
                fontSize: '0.9rem',
                color: 'rgba(255, 255, 255, 0.6)',
                marginBottom: '2rem',
                marginTop: '-0.5rem'
              }}>
                Чтобы понять, кто вы и чем занимаетесь
              </p>

              <FormTextarea
                label="Расскажите кратко о себе (1–2 предложения)"
                name="aboutYou"
                value={formData.aboutYou}
                onChange={handleChange}
                rows="3"
                placeholder='Например: "Я веду Telegram-канал о трейдинге" или "Занимаюсь обучением трейдингу"'
              />

              <FormCheckboxGroup
                label="Есть ли у вас аудитория / комьюнити?"
                name="hasAudience"
                options={[
                  'Telegram-канал',
                  'YouTube / TikTok',
                  'Discord / форум',
                  'Пока нет, только начинаю'
                ]}
                selectedValues={formData.hasAudience}
                onChange={handleChange}
              />

              <FormTextarea
                label="Укажите ссылки на ваши соцсети / каналы"
                name="socialLinks"
                value={formData.socialLinks}
                onChange={handleChange}
                rows="3"
                placeholder="Например: https://t.me/mychannel, https://youtube.com/@mychannel"
              />

              {/* Как планируете продвигать */}
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#9FFF00',
                marginBottom: '1.5rem',
                marginTop: '3rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                🔹 Как вы планируете продвигать VEXTR?
              </h2>
              <p style={{
                fontSize: '0.9rem',
                color: 'rgba(255, 255, 255, 0.6)',
                marginBottom: '2rem',
                marginTop: '-0.5rem'
              }}>
                Главная часть — показывает серьёзность и подход
              </p>

              <FormCheckboxGroup
                label="Каким способом вы будете рекламировать наш сервис?"
                name="promotionMethods"
                options={[
                  'Обзоры / видео',
                  'Посты в Telegram',
                  'Баннеры / реферальные ссылки',
                  'Работа с трейд-комьюнити',
                  'Другое'
                ]}
                selectedValues={formData.promotionMethods}
                onChange={handleChange}
              />

              <FormTextarea
                label="Опишите подробнее, как вы планируете это делать"
                name="promotionDetails"
                value={formData.promotionDetails}
                onChange={handleChange}
                rows="4"
                placeholder='Например: "Буду делать обзор VEXTR в своём Telegram-канале" или "Добавлю в подборку инструментов для трейдеров"'
              />

              <FormTextarea
                label="Какую аудиторию вы планируете привлечь?"
                name="targetAudience"
                value={formData.targetAudience}
                onChange={handleChange}
                rows="3"
                placeholder='Например: "Частные трейдеры", "Новички", "Опытные криптоинвесторы"'
              />

              {/* Ожидаемые результаты */}
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#9FFF00',
                marginBottom: '1.5rem',
                marginTop: '3rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                🔹 Ожидаемые результаты
              </h2>

              <FormRadioGroup
                label="Какой результат вы ожидаете за первый месяц?"
                name="expectedResults"
                options={[
                  '10+ регистраций',
                  '50+ регистраций',
                  '100+ регистраций',
                  'Более 200 регистраций'
                ]}
                selectedValue={formData.expectedResults}
                onChange={handleChange}
              />

              {/* Согласие */}
              <div style={{
                marginTop: '3rem',
                marginBottom: '2rem',
                padding: '1.5rem',
                background: 'rgba(159, 255, 0, 0.05)',
                border: '1px solid rgba(159, 255, 0, 0.2)',
                borderRadius: '12px'
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}>
                  <input
                    type="checkbox"
                    name="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onChange={handleChange}
                    required
                    style={{
                      width: '20px',
                      height: '20px',
                      marginTop: '2px',
                      cursor: 'pointer',
                      accentColor: '#9FFF00'
                    }}
                  />
                  <span style={{
                    fontSize: '0.95rem',
                    color: 'rgba(255, 255, 255, 0.9)',
                    lineHeight: '1.6'
                  }}>
                    Я соглашаюсь с{' '}
                    <a href="/affiliate-terms" target="_blank" style={{ color: '#9FFF00', textDecoration: 'underline' }}>
                      правилами партнёрской программы
                    </a>
                    {' '}и{' '}
                    <a href="/privacy" target="_blank" style={{ color: '#9FFF00', textDecoration: 'underline' }}>
                      обработкой персональных данных
                    </a>
                  </span>
                </label>
              </div>

              {/* Кнопка отправки */}
              <button
                type="submit"
                disabled={submitting || !formData.agreeToTerms}
                style={{
                  width: '100%',
                  padding: '1.2rem',
                  borderRadius: '50px',
                  background: (submitting || !formData.agreeToTerms)
                    ? 'rgba(159, 255, 0, 0.3)' 
                    : '#9FFF00',
                  border: 'none',
                  color: '#000000',
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  cursor: (submitting || !formData.agreeToTerms) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: (submitting || !formData.agreeToTerms)
                    ? 'none' 
                    : '0 0 20px rgba(159, 255, 0, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem'
                }}
                onMouseEnter={(e) => {
                  if (!submitting && formData.agreeToTerms) {
                    e.target.style.transform = 'scale(1.02)'
                    e.target.style.boxShadow = '0 0 30px rgba(159, 255, 0, 0.6)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)'
                  e.target.style.boxShadow = '0 0 20px rgba(159, 255, 0, 0.4)'
                }}
              >
                {submitting ? (
                  <>
                    <div className="spinner" style={{
                      width: '20px',
                      height: '20px',
                      border: '3px solid rgba(0, 0, 0, 0.3)',
                      borderTopColor: '#000000',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Отправка...
                  </>
                ) : (
                  'Отправить заявку'
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
      
      <Footer />
      
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}

// Вспомогательные компоненты для полей формы
const FormInput = ({ label, name, type = 'text', value, onChange, required, placeholder }) => (
  <div style={{ marginBottom: '1.5rem' }}>
    <label style={{
      display: 'block',
      fontSize: '1rem',
      fontWeight: '600',
      marginBottom: '0.5rem',
      color: 'rgba(255, 255, 255, 0.9)'
    }}>
      {label} {required && <span style={{ color: '#ff6464' }}>*</span>}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      style={{
        width: '100%',
        padding: '0.9rem 1rem',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        background: 'rgba(255, 255, 255, 0.05)',
        color: '#ffffff',
        fontSize: '0.95rem',
        outline: 'none',
        transition: 'all 0.3s ease'
      }}
      onFocus={(e) => {
        e.target.style.borderColor = '#9FFF00'
        e.target.style.background = 'rgba(159, 255, 0, 0.05)'
      }}
      onBlur={(e) => {
        e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'
        e.target.style.background = 'rgba(255, 255, 255, 0.05)'
      }}
    />
  </div>
)

const FormTextarea = ({ label, name, value, onChange, required, placeholder, rows = 4 }) => (
  <div style={{ marginBottom: '1.5rem' }}>
    <label style={{
      display: 'block',
      fontSize: '1rem',
      fontWeight: '600',
      marginBottom: '0.5rem',
      color: 'rgba(255, 255, 255, 0.9)'
    }}>
      {label} {required && <span style={{ color: '#ff6464' }}>*</span>}
    </label>
    <textarea
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      required={required}
      style={{
        width: '100%',
        padding: '0.9rem 1rem',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        background: 'rgba(255, 255, 255, 0.05)',
        color: '#ffffff',
        fontSize: '0.95rem',
        outline: 'none',
        transition: 'all 0.3s ease',
        resize: 'vertical',
        fontFamily: 'inherit',
        lineHeight: '1.6'
      }}
      onFocus={(e) => {
        e.target.style.borderColor = '#9FFF00'
        e.target.style.background = 'rgba(159, 255, 0, 0.05)'
      }}
      onBlur={(e) => {
        e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'
        e.target.style.background = 'rgba(255, 255, 255, 0.05)'
      }}
    />
  </div>
)

const FormCheckboxGroup = ({ label, name, options, selectedValues, onChange }) => (
  <div style={{ marginBottom: '1.5rem' }}>
    <label style={{
      display: 'block',
      fontSize: '1rem',
      fontWeight: '600',
      marginBottom: '0.75rem',
      color: 'rgba(255, 255, 255, 0.9)'
    }}>
      {label}
    </label>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {options.map((option, index) => (
        <label key={index} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          cursor: 'pointer',
          userSelect: 'none',
          padding: '0.6rem 0.8rem',
          borderRadius: '8px',
          background: selectedValues.includes(option) ? 'rgba(159, 255, 0, 0.1)' : 'transparent',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(159, 255, 0, 0.05)'}
        onMouseLeave={(e) => e.currentTarget.style.background = selectedValues.includes(option) ? 'rgba(159, 255, 0, 0.1)' : 'transparent'}
        >
          <input
            type="checkbox"
            name={name}
            value={option}
            checked={selectedValues.includes(option)}
            onChange={onChange}
            style={{
              width: '18px',
              height: '18px',
              cursor: 'pointer',
              accentColor: '#9FFF00'
            }}
          />
          <span style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.9)' }}>
            {option}
          </span>
        </label>
      ))}
    </div>
  </div>
)

const FormRadioGroup = ({ label, name, options, selectedValue, onChange }) => (
  <div style={{ marginBottom: '1.5rem' }}>
    <label style={{
      display: 'block',
      fontSize: '1rem',
      fontWeight: '600',
      marginBottom: '0.75rem',
      color: 'rgba(255, 255, 255, 0.9)'
    }}>
      {label}
    </label>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {options.map((option, index) => (
        <label key={index} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          cursor: 'pointer',
          userSelect: 'none',
          padding: '0.6rem 0.8rem',
          borderRadius: '8px',
          background: selectedValue === option ? 'rgba(159, 255, 0, 0.1)' : 'transparent',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(159, 255, 0, 0.05)'}
        onMouseLeave={(e) => e.currentTarget.style.background = selectedValue === option ? 'rgba(159, 255, 0, 0.1)' : 'transparent'}
        >
          <input
            type="radio"
            name={name}
            value={option}
            checked={selectedValue === option}
            onChange={onChange}
            style={{
              width: '18px',
              height: '18px',
              cursor: 'pointer',
              accentColor: '#9FFF00'
            }}
          />
          <span style={{ fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.9)' }}>
            {option}
          </span>
        </label>
      ))}
    </div>
  </div>
)

export default AffiliateApplication
