import React, { useState } from 'react'
import Head from 'next/head'

import Navigation from '../components/navigation'
import Footer from '../components/footer'
import { useGlobalContext } from '../global-context'

const Register = () => {
  const { supabase } = useGlobalContext()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!supabase) {
      setMessage('Supabase не настроен')
      return
    }
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setMessage(error.message)
    else setMessage('Регистрация успешно! Проверьте почту для подтверждения.')
    setLoading(false)
  }

  return (
    <>
      <Head>
        <title>Регистрация — VEXTR</title>
      </Head>
      <Navigation></Navigation>
      <main style={{ paddingTop: 100 }}>
        <section className="how-it-works" style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="glass-main" style={{ maxWidth: 420, width: '100%' }}>
            <h1 className="section-title" style={{ textAlign: 'center' }}>Регистрация</h1>
            <form onSubmit={onSubmit} className="thq-flex-column" style={{ alignItems: 'stretch' }}>
              <input
                className="thq-input"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                className="thq-input"
                type="password"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? 'Загрузка...' : 'Зарегистрироваться'}
              </button>
            </form>
            {message ? (
              <p className="section-subtitle" style={{ marginTop: 12, textAlign: 'center' }}>{message}</p>
            ) : null}
          </div>
        </section>
      </main>
      <Footer></Footer>
    </>
  )
}

export default Register


