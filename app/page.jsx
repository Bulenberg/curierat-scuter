'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  Shield, Truck, Building2, Lock, LogOut, Plus, CheckCircle2, 
  AlertCircle, Clock, MapPin, Phone, FileText, DollarSign, Activity, Users, Settings 
} from 'lucide-react'

export default function DentaMotoApp() {
  const [session, setSession] = useState(null)
  const [passwordInput, setPasswordInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [panelData, setPanelData] = useState(null)
  const [activeTab, setActiveTab] = useState('dashboard')

  const [selectedDest, setSelectedDest] = useState('')
  const [isUrgent, setIsUrgent] = useState(false)
  const [needsReturn, setNeedsReturn] = useState(false)
  const [packageNotes, setPackageNotes] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('denta_moto_session')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setSession(parsed)
        loadPanelData(parsed.password, parsed.panel)
      } catch (e) {
        localStorage.removeItem('denta_moto_session')
      }
    }
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!passwordInput.trim()) return
    setLoading(true)
    setError('')

    try {
      const { data, error: rpcError } = await supabase.rpc('rpc_login', {
        input_password: passwordInput.trim()
      })

      if (rpcError) throw rpcError

      if (data && data.authenticated) {
        const newSession = {
          password: passwordInput.trim(),
          panel: data.panel,
          user: data.user || {}
        }
        setSession(newSession)
        localStorage.setItem('denta_moto_session', JSON.stringify(newSession))
        loadPanelData(newSession.password, data.panel)
      } else {
        setError(data?.error || 'Parolă incorectă.')
      }
    } catch (err) {
      setError(err.message || 'Eroare de conexiune cu serverul.')
    } finally {
      setLoading(false)
    }
  }

  const loadPanelData = async (password, panelType) => {
    setLoading(true)
    try {
      if (panelType === 'client') {
        const { data, error } = await supabase.rpc('rpc_client_get_dashboard', { input_password: password })
        if (error) throw error
        setPanelData(data)
      } else if (panelType === 'courier') {
        const { data, error } = await supabase.rpc('rpc_courier_get_tasks', { input_password: password })
        if (error) throw error
        setPanelData(data)
      } else if (panelType === 'admin') {
        const { data, error } = await supabase.rpc('rpc_admin_get_full_state', { input_password: password })
        if (error) throw error
        setPanelData(data)
      }
    } catch (err) {
      alert('Eroare la încărcarea datelor: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('denta_moto_session')
    setSession(null)
    setPanelData(null)
    setPasswordInput('')
  }

  const handleCreateOrder = async (e) => {
    e.preventDefault()
    if (!selectedDest) return alert('Selectează clinica destinație!')
    setLoading(true)

    try {
      const { error } = await supabase.rpc('rpc_client_create_order', {
        input_password: session.password,
        p_destination_id: selectedDest,
        p_is_urgent: isUrgent,
        p_needs_return: needsReturn,
        p_package_notes: packageNotes
      })

      if (error) throw error
      alert('Comandă plasată cu succes!')
      setPackageNotes('')
      setIsUrgent(false)
      setNeedsReturn(false)
      loadPanelData(session.password, 'client')
    } catch (err) {
      alert('Eroare: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const updateDeliveryStatus = async (deliveryId, newStatus) => {
    const recipient = newStatus === 'delivered' ? prompt('Numele persoanei care a preluat coletul:') : null
    if (newStatus === 'delivered' && !recipient) return

    try {
      const { error } = await supabase.rpc('rpc_courier_update_status', {
        input_password: session.password,
        p_delivery_id: deliveryId,
        p_new_status: newStatus,
        p_recipient_name: recipient
      })

      if (error) throw error
      loadPanelData(session.password, session.panel)
    } catch (err) {
      alert('Eroare: ' + err.message)
    }
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 border border-slate-800">
          <div className="text-center mb-8">
            <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-lg">
              <Truck size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">DentaMoto Express</h1>
            <p className="text-sm text-slate-500 mt-1">Curierat Moto B2B • Laboratoare Dentare București</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Parolă Unică de Acces</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 text-slate-400" size={18} />
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Introdu parola primită..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none text-slate-800 font-medium"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center gap-2">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
            >
              {loading ? 'Se verifică...' : 'Autentificare în Panou'}
            </button>
          </form>

          <div className="mt-8 text-center text-xs text-slate-400 border-t pt-4">
            Sistem securizat prin funcții RPC pe Supabase & Bcrypt
          </div>
        </div>
      </main>
    )
  }

  // --- PANOU CLIENT ---
  if (session.panel === 'client' && panelData) {
    const { client, destinations, deliveries, current_month } = panelData
    const standardUsed = deliveries.filter(d => d.status !== 'cancelled' && !d.is_urgent).length
    const quotaPercent = Math.min(100, (standardUsed / (client?.monthly_quota || 1)) * 100)

    return (
      <div className="min-h-screen bg-slate-100 pb-12">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-lg font-bold text-slate-900">{client?.name}</h1>
              <p className="text-xs text-slate-500">CUI: {client?.cui} • {client?.pickup_address}</p>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition font-medium">
              <LogOut size={16} /> Ieșire
            </button>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 mt-6 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-slate-700">Consum Cotă Lunară ({current_month})</span>
              <span className="text-sm font-bold text-blue-600">{standardUsed} / {client?.monthly_quota} curse incluse</span>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-full transition-all duration-500" style={{ width: `${quotaPercent}%` }}></div>
            </div>
            <p className="text-xs text-slate-400 mt-2">Cursele peste cotă se facturează conform contractului cu {client?.extra_fee} RON / oprire.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 md:col-span-1">
              <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Plus size={18} className="text-blue-600" /> Trimite Pachet Nou
              </h2>
              <form onSubmit={handleCreateOrder} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Cabinet Stomatologic / Clinică</label>
                  <select
                    value={selectedDest}
                    onChange={(e) => setSelectedDest(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  >
                    <option value="">-- Alege clinica destinație --</option>
                    {destinations?.map(d => (
                      <option key={d.id} value={d.id}>{d.clinic_name} ({d.zone})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Detalii Lucrare / Observații</label>
                  <input
                    type="text"
                    value={packageNotes}
                    onChange={(e) => setPackageNotes(e.target.value)}
                    placeholder="Ex: Lucrare protetică / Amprentă"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={isUrgent} onChange={(e) => setIsUrgent(e.target.checked)} className="rounded text-blue-600 w-4 h-4" />
                    <span className="text-sm font-medium text-red-600">Regim Urgență (60 min - +{client?.urgent_fee} RON)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={needsReturn} onChange={(e) => setNeedsReturn(e.target.checked)} className="rounded text-blue-600 w-4 h-4" />
                    <span className="text-sm font-medium text-slate-700">Necesită retur la laborator</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition shadow-md shadow-blue-600/20"
                >
                  Plasare Comandă Curier
                </button>
              </form>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 md:col-span-2">
              <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Clock size={18} className="text-blue-600" /> Istoric & Status Comenzi ({current_month})
              </h2>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {!deliveries || deliveries.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">Nicio comandă înregistrată în această lună.</p>
                ) : (
                  deliveries.map(d => (
                    <div key={d.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-sm">{d.clinic_name}</span>
                          <span className="text-xs text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">{d.zone}</span>
                          {d.is_urgent && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">URGENT</span>}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{d.package_notes}</p>
                      </div>
                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                          d.status === 'delivered' ? 'bg-green-100 text-green-700' :
                          d.status === 'picked_up' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {d.status === 'delivered' ? `Livrat (${d.recipient_name || 'Recepție'})` :
                           d.status === 'picked_up' ? 'În tranzit moto' : 'În așteptare'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // --- PANOU CURIER ---
  if (session.panel === 'courier' && panelData) {
    const deliveries = panelData.deliveries || []

    return (
      <div className="min-h-screen bg-slate-900 text-white pb-12">
        <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-amber-500 text-slate-900 p-2 rounded-xl font-bold">
                <Truck size={20} />
              </div>
              <div>
                <h1 className="text-base font-bold">Cockpit Moto ({session.user?.name || 'Curier'})</h1>
                <p className="text-xs text-slate-400">Scuter: {session.user?.vehicle_plate || 'B-MOTO'}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-400 hover:bg-slate-700 rounded-lg transition font-medium">
              <LogOut size={16} /> Ieșire
            </button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 mt-6 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-2">Comenzi Active de Ridicat / Livrat</h2>

          {deliveries.length === 0 ? (
            <div className="bg-slate-800 rounded-2xl p-8 text-center text-slate-400">
              Nu există comenzi active în acest moment. Drum bun!
            </div>
          ) : (
            deliveries.map(d => (
              <div key={d.id} className="bg-slate-800 rounded-2xl p-5 border border-slate-700 shadow-lg space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg text-white">{d.clinic_name}</span>
                      {d.is_urgent && <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">URGENT</span>}
                    </div>
                    <p className="text-xs text-amber-400 font-medium mt-1">Ridicare de la: {d.pickup_address}</p>
                    <p className="text-xs text-slate-300 mt-0.5">Livrare la: {d.dropoff_address} ({d.zone})</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                    d.status === 'delivered' ? 'bg-green-900 text-green-300' :
                    d.status === 'picked_up' ? 'bg-blue-900 text-blue-300' : 'bg-amber-900 text-amber-300'
                  }`}>
                    {d.status}
                  </span>
                </div>

                <div className="bg-slate-900/50 p-3 rounded-xl text-xs text-slate-300 flex justify-between items-center">
                  <span>Pachet: <strong>{d.package_notes}</strong></span>
                  <a 
                    href={`https://waze.com/ul?q=${encodeURIComponent(d.dropoff_address + ' Bucuresti')}&navigate=yes`}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition"
                  >
                    Navighează Waze
                  </a>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-700">
                  {d.status === 'pending' && (
                    <button
                      onClick={() => updateDeliveryStatus(d.id, 'picked_up')}
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 font-semibold rounded-xl text-xs transition"
                    >
                      Confirmă Preluarea (Pick-up)
                    </button>
                  )}
                  {d.status === 'picked_up' && (
                    <button
                      onClick={() => updateDeliveryStatus(d.id, 'delivered')}
                      className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 font-semibold rounded-xl text-xs transition"
                    >
                      Confirmă Livrarea (Delivered)
                    </button>
                  )}
                  {d.status === 'delivered' && (
                    <div className="text-xs text-green-400 font-medium flex items-center gap-1">
                      <CheckCircle2 size={16} /> Livrat cu succes către {d.recipient_name}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </main>
      </div>
    )
  }

  // --- PANOU ADMIN & CONTABILITATE SOLO.RO ---
  if (session.panel === 'admin' && panelData) {
    const { admin, clients = [], couriers = [], deliveries = [] } = panelData

    return (
      <div className="min-h-screen bg-slate-900 text-white pb-12">
        <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 text-white p-2 rounded-xl font-bold">
                <Shield size={20} />
              </div>
              <div>
                <h1 className="text-base font-bold">Panou Admin & Solo.ro ({admin?.name || 'Admin'})</h1>
                <p className="text-xs text-slate-400">Control Central DentaMoto Express</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Comenzi & Live
                </button>
                <button
                  onClick={() => setActiveTab('solo')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === 'solo' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Contabilitate Solo.ro
                </button>
              </div>
              <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-400 hover:bg-slate-700 rounded-lg transition font-medium">
                <LogOut size={16} /> Ieșire
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 mt-6 space-y-6">
          {activeTab === 'dashboard' ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Total Comenzi</span>
                  <p className="text-2xl font-extrabold text-white mt-1">{deliveries.length}</p>
                </div>
                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Laboratoare Active</span>
                  <p className="text-2xl font-extrabold text-blue-400 mt-1">{clients.length}</p>
                </div>
                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Curieri pe Scutere</span>
                  <p className="text-2xl font-extrabold text-amber-400 mt-1">{couriers.length}</p>
                </div>
              </div>

              <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Toate Cursele Din Sistem</h2>
                <div className="space-y-3">
                  {deliveries.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">Nicio cursă înregistrată.</p>
                  ) : (
                    deliveries.map(d => (
                      <div key={d.id} className="p-4 rounded-xl bg-slate-900 border border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{d.clinic_name}</span>
                            <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">{d.zone}</span>
                            {d.is_urgent && <span className="text-xs bg-red-900 text-red-300 px-2 py-0.5 rounded-full font-bold">URGENT</span>}
                          </div>
                          <p className="text-xs text-slate-400 mt-1">Laborator: {d.client_name} • Observații: {d.package_notes}</p>
                        </div>
                        <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                          d.status === 'delivered' ? 'bg-green-900 text-green-300' :
                          d.status === 'picked_up' ? 'bg-blue-900 text-blue-300' : 'bg-amber-900 text-amber-300'
                        }`}>
                          {d.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-base font-bold text-white">Raport Facturare & Cotele Lunare (Solo.ro)</h2>
                    <p className="text-xs text-slate-400">Situația centralizată a abonamentelor și curselor suplimentare pe laboratoare.</p>
                  </div>
                  <span className="bg-blue-900 text-blue-200 text-xs px-3 py-1 rounded-full font-semibold">Mod Contabilitate B2B</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-900 text-slate-400 uppercase text-xs">
                      <tr>
                        <th className="p-3 rounded-l-xl">Laborator</th>
                        <th className="p-3">CUI</th>
                        <th className="p-3">Cotă lunară</th>
                        <th className="p-3">Curse efectuate</th>
                        <th className="p-3">Tarif extra</th>
                        <th className="p-3 rounded-r-xl">Status facturare</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {clients.map(c => {
                        const clientDeliveries = deliveries.filter(d => d.client_id === c.id && d.status !== 'cancelled' && !d.is_urgent)
                        const count = clientDeliveries.length
                        const extraCount = Math.max(0, count - c.monthly_quota)
                        const extraTotal = extraCount * c.extra_fee

                        return (
                          <tr key={c.id} className="hover:bg-slate-900/50">
                            <td className="p-3 font-bold text-white">{c.name}</td>
                            <td className="p-3 text-slate-400">{c.cui}</td>
                            <td className="p-3">{c.monthly_quota} curse</td>
                            <td className="p-3 font-semibold text-blue-400">{count} curse</td>
                            <td className="p-3 text-amber-400">+{extraTotal} RON ({extraCount} extra)</td>
                            <td className="p-3">
                              <span className="bg-green-900 text-green-300 text-xs px-2.5 py-1 rounded-full font-medium">Pregătit Solo.ro</span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <p className="text-slate-400">Se încarcă panoul de control...</p>
        <button onClick={handleLogout} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-medium transition">
          Ieșire / Resetare Sesiune
        </button>
      </div>
    </div>
  )
}
