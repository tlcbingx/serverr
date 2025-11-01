import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import Script from 'next/script'
import { useRouter } from 'next/router'

import Navigation from '../components/navigation'
import Footer from '../components/footer'

const Admin = () => {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [partners, setPartners] = useState([])
  const [isLoadingPartners, setIsLoadingPartners] = useState(false)
  const [editingPartner, setEditingPartner] = useState(null)
  const [editPromoCode, setEditPromoCode] = useState('')
  const [editCommission, setEditCommission] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    const savedUser = localStorage.getItem('telegram_user')
    if (!savedUser) {
      router.push('/register')
      return
    }
    
    const userData = JSON.parse(savedUser)
    setUser(userData)
    
    // Проверяем права доступа
    checkAdminAccess(userData.id)
  }, [router])

  const checkAdminAccess = async (telegramId) => {
    try {
      // Проверяем доступ через API
      const response = await fetch(`/api/admin/list-partners?telegram_id=${telegramId}`)
      
      if (response.status === 401) {
        alert('❌ У вас нет прав доступа к админ-панели')
        router.push('/')
        return
      }
      
      if (response.ok) {
        setLoading(false)
        loadPartners(telegramId)
      } else {
        alert('❌ Ошибка доступа')
        router.push('/')
      }
    } catch (error) {
      console.error('Error checking admin access:', error)
      alert('❌ Ошибка проверки доступа')
      router.push('/')
    }
  }

  const loadPartners = async (telegramId) => {
    setIsLoadingPartners(true)
    try {
      const response = await fetch(`/api/admin/list-partners?telegram_id=${telegramId}`)
      const data = await response.json()
      
      console.log('📥 Partners data received:', data)
      
      if (data.success) {
        const partnersList = (data.partners || []).map(partner => ({
          ...partner,
          commission_rate: partner.commission_rate ? parseInt(partner.commission_rate) : null,
          discount: partner.discount ? parseInt(partner.discount) : null,
          telegram_id: partner.telegram_id ? String(partner.telegram_id) : null
        }))
        console.log('📊 Processed partners:', partnersList)
        setPartners(partnersList)
      } else {
        console.error('❌ Error loading partners:', data)
        alert('Ошибка загрузки партнеров: ' + (data.error || 'Неизвестная ошибка'))
      }
    } catch (error) {
      console.error('❌ Error loading partners:', error)
      alert('Ошибка загрузки партнеров: ' + error.message)
    } finally {
      setIsLoadingPartners(false)
    }
  }

  const startEdit = (partner) => {
    const telegramId = partner.telegram_id || partner.id
    setEditingPartner(telegramId)
    setEditPromoCode(partner.promo_code || '')
    setEditCommission(partner.commission_rate != null ? String(partner.commission_rate) : '')
  }

  const cancelEdit = () => {
    setEditingPartner(null)
    setEditPromoCode('')
    setEditCommission('')
  }

  const saveChanges = async (telegramId) => {
    if (!user) return
    
    setSaving(true)
    try {
      const updateData = {
        admin_telegram_id: user.id,
        telegram_id: telegramId
      }
      
      const currentPartner = partners.find(p => (p.telegram_id || p.id) === telegramId)
      
      if (editPromoCode !== currentPartner?.promo_code) {
        updateData.promo_code = editPromoCode
      }
      
      const currentCommission = currentPartner?.commission_rate != null ? String(currentPartner.commission_rate) : ''
      if (editCommission !== currentCommission) {
        updateData.commission_rate = parseInt(editCommission)
      }
      
      if (updateData.promo_code === undefined && updateData.commission_rate === undefined) {
        alert('Нет изменений для сохранения')
        setSaving(false)
        return
      }
      
      const response = await fetch('/api/admin/update-partner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert('✅ Изменения сохранены!')
        cancelEdit()
        loadPartners(user.id)
      } else {
        alert('❌ Ошибка: ' + (data.error || data.details || 'Неизвестная ошибка'))
      }
    } catch (error) {
      console.error('Error saving changes:', error)
      alert('❌ Ошибка при сохранении')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (telegramId, partnerName) => {
    if (!user) return
    
    const confirmDelete = confirm(`Вы уверены, что хотите удалить партнера ${partnerName || telegramId}? Это действие нельзя отменить.`)
    if (!confirmDelete) return
    
    setDeleting(telegramId)
    try {
      const response = await fetch('/api/admin/delete-partner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          admin_telegram_id: user.id,
          telegram_id: telegramId
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert('✅ Партнер удален!')
        loadPartners(user.id)
      } else {
        alert('❌ Ошибка: ' + (data.error || data.details || 'Неизвестная ошибка'))
      }
    } catch (error) {
      console.error('Error deleting partner:', error)
      alert('❌ Ошибка при удалении')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <>
        <Head>
          <title>Админ-панель - VEXTR</title>
        </Head>
        <Navigation />
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p>Загрузка...</p>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Head>
        <title>Админ-панель - VEXTR</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      
      <Navigation />
      
      <main style={{ 
        minHeight: '60vh', 
        padding: '2rem 1rem', 
        maxWidth: '1200px', 
        margin: '0 auto',
        color: '#ffffff'
      }}>
        <h1 style={{ 
          marginBottom: '2rem', 
          fontSize: '2rem',
          color: '#9bff00',
          fontWeight: 'bold'
        }}>🔐 Админ-панель</h1>
        
        <div style={{ 
          marginBottom: '1rem', 
          padding: '1rem', 
          background: 'linear-gradient(180deg, rgba(155, 255, 0, 0.1), rgba(155, 255, 0, 0.05))',
          border: '1px solid rgba(155, 255, 0, 0.2)',
          borderRadius: '16px',
          backdropFilter: 'blur(12px)'
        }}>
          <p style={{ margin: '0 0 0.5rem 0', color: '#ffffff' }}>
            <strong>Партнеров:</strong> {partners.length}
          </p>
          <button 
            onClick={() => loadPartners(user?.id)} 
            disabled={isLoadingPartners}
            className="btn btn-primary"
            style={{ 
              marginTop: '0.5rem'
            }}
          >
            {isLoadingPartners ? 'Загрузка...' : '🔄 Обновить список'}
          </button>
        </div>

        {isLoadingPartners ? (
          <p style={{ color: '#9da3a8', textAlign: 'center', padding: '2rem' }}>Загрузка партнеров...</p>
        ) : partners.length === 0 ? (
          <p style={{ color: '#9da3a8', textAlign: 'center', padding: '2rem' }}>Партнеры не найдены</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse', 
              background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.02))',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '16px', 
              overflow: 'hidden',
              backdropFilter: 'blur(12px)'
            }}>
              <thead>
                <tr style={{ background: 'rgba(155, 255, 0, 0.1)' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(155, 255, 0, 0.2)', color: '#9bff00', fontWeight: 'bold' }}>ID</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(155, 255, 0, 0.2)', color: '#9bff00', fontWeight: 'bold' }}>Имя</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(155, 255, 0, 0.2)', color: '#9bff00', fontWeight: 'bold' }}>Username</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(155, 255, 0, 0.2)', color: '#9bff00', fontWeight: 'bold' }}>Email</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(155, 255, 0, 0.2)', color: '#9bff00', fontWeight: 'bold' }}>Промокод</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(155, 255, 0, 0.2)', color: '#9bff00', fontWeight: 'bold' }}>Комиссия (%)</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(155, 255, 0, 0.2)', color: '#9bff00', fontWeight: 'bold' }}>Скидка (%)</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(155, 255, 0, 0.2)', color: '#9bff00', fontWeight: 'bold' }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {partners.map((partner) => (
                  <tr key={partner.id || partner.telegram_id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <td style={{ padding: '1rem', color: '#ffffff' }}>{partner.telegram_id || partner.id || '-'}</td>
                    <td style={{ padding: '1rem', color: '#ffffff' }}>
                      {partner.full_name || `${partner.first_name || ''} ${partner.last_name || ''}`.trim() || '-'}
                    </td>
                    <td style={{ padding: '1rem', color: '#9da3a8' }}>
                      {partner.username ? `@${partner.username}` : '-'}
                    </td>
                    <td style={{ padding: '1rem', color: '#9da3a8' }}>{partner.email || '-'}</td>
                    <td style={{ padding: '1rem' }}>
                      {editingPartner === (partner.telegram_id || partner.id) ? (
                        <input
                          type="text"
                          value={editPromoCode}
                          onChange={(e) => setEditPromoCode(e.target.value.toUpperCase())}
                          style={{ 
                            padding: '0.5rem', 
                            border: '1px solid rgba(155, 255, 0, 0.3)',
                            background: 'rgba(5, 5, 7, 0.6)',
                            color: '#ffffff',
                            borderRadius: '8px', 
                            width: '120px' 
                          }}
                          placeholder="Промокод"
                        />
                      ) : (
                        <code style={{ 
                          background: 'rgba(155, 255, 0, 0.15)', 
                          color: '#9bff00',
                          padding: '0.25rem 0.5rem', 
                          borderRadius: '8px',
                          border: '1px solid rgba(155, 255, 0, 0.2)'
                        }}>
                          {partner.promo_code || '-'}
                        </code>
                      )}
                    </td>
                    <td style={{ padding: '1rem', color: '#ffffff' }}>
                      {editingPartner === (partner.telegram_id || partner.id) ? (
                        <select
                          value={editCommission}
                          onChange={(e) => setEditCommission(e.target.value)}
                          style={{ 
                            padding: '0.5rem', 
                            border: '1px solid rgba(155, 255, 0, 0.3)',
                            background: 'rgba(5, 5, 7, 0.6)',
                            color: '#ffffff',
                            borderRadius: '8px' 
                          }}
                        >
                          <option value="10">10%</option>
                          <option value="20">20%</option>
                          <option value="30">30%</option>
                          <option value="40">40%</option>
                          <option value="50">50%</option>
                          <option value="60">60%</option>
                          <option value="70">70%</option>
                          <option value="80">80%</option>
                        </select>
                      ) : (
                        <strong style={{ color: '#9bff00' }}>{partner.commission_rate != null ? `${partner.commission_rate}%` : '-'}</strong>
                      )}
                    </td>
                    <td style={{ padding: '1rem', color: '#9da3a8' }}>{partner.discount != null ? `${partner.discount}%` : '-'}</td>
                    <td style={{ padding: '1rem' }}>
                      {editingPartner === (partner.telegram_id || partner.id) ? (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => saveChanges(partner.telegram_id || partner.id)}
                            disabled={saving}
                            className="btn btn-primary"
                            style={{
                              fontSize: '0.85em',
                              padding: '0.4rem 0.8rem'
                            }}
                          >
                            {saving ? 'Сохранение...' : '💾 Сохранить'}
                          </button>
                          <button
                            onClick={cancelEdit}
                            disabled={saving}
                            className="btn btn-secondary"
                            style={{
                              fontSize: '0.85em',
                              padding: '0.4rem 0.8rem'
                            }}
                          >
                            Отмена
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => startEdit(partner)}
                            className="btn btn-primary"
                            style={{
                              fontSize: '0.85em',
                              padding: '0.4rem 0.8rem'
                            }}
                          >
                            ✏️ Редактировать
                          </button>
                          <button
                            onClick={() => handleDelete(partner.telegram_id || partner.id, partner.full_name || partner.first_name)}
                            disabled={deleting === (partner.telegram_id || partner.id)}
                            style={{
                              padding: '0.4rem 0.8rem',
                              background: deleting === (partner.telegram_id || partner.id) ? 'rgba(255, 0, 0, 0.3)' : 'rgba(255, 0, 0, 0.6)',
                              color: 'white',
                              border: '1px solid rgba(255, 0, 0, 0.4)',
                              borderRadius: '8px',
                              cursor: deleting === (partner.telegram_id || partner.id) ? 'not-allowed' : 'pointer',
                              fontSize: '0.85em',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              if (deleting !== (partner.telegram_id || partner.id)) {
                                e.target.style.background = 'rgba(255, 0, 0, 0.8)'
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (deleting !== (partner.telegram_id || partner.id)) {
                                e.target.style.background = 'rgba(255, 0, 0, 0.6)'
                              }
                            }}
                          >
                            {deleting === (partner.telegram_id || partner.id) ? '⏳ Удаление...' : '🗑️ Удалить'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
      
      <Footer />
    </>
  )
}

export default Admin

