'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  Shield, Truck, Building2, Lock, LogOut, Plus, CheckCircle2, 
  AlertCircle, Clock, MapPin, Navigation, Route, Trash2, 
  Users, Sparkles, RefreshCw, Compass, Edit2, X
} from 'lucide-react'

export default function DentaMotoApp() {
  const [session, setSession] = useState(null)
  const [passwordInput, setPasswordInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [panelData, setPanelData] = useState(null)
  const [activeTab, setActiveTab] = useState('dispatch')

  // Stări Optimizare Traseu Curier
  const [isOptimized, setIsOptimized] = useState(false)
  const [optimizedList, setOptimizedList] = useState([])

  // Stări Formular Client
  const [selectedDest, setSelectedDest] = useState('')
  const [isUrgent, setIsUrgent] = useState(false)
  const [needsReturn, setNeedsReturn] = useState(false)
  const [packageNotes, setPackageNotes] = useState('')

  // Stări Formulare Admin + ID-uri pentru Editare
  const [editingClientId, setEditingClientId] = useState(null)
  const [newClient, setNewClient] = useState({
    name: '', legal_name: '', cui: '', pickup_address: '', phone: '',
    monthly_quota: 25, subscription_price: 500, extra_fee: 35, urgent_fee: 50, password: ''
  })

  const [editingDestId, setEditingDestId] = useState(null)
  const [newDest, setNewDest] = useState({
    client_id: '', clinic_name: '', dropoff_address: '', zone: 'Sector 1', contact_phone: ''
  })

  const [editingCourierId, setEditingCourierId] = useState(null)
  const [newCourier, setNewCourier] = useState({
    name: '', phone: '', vehicle_plate: '', password: ''
  })

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
        setIsOptimized(false)
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

  // --- FUNCȚII CLIENT ---
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
      alert('Comandă plasată cu succes! Curierul a fost notificat.')
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

  // --- FUNCȚII CURIER & OPTIMIZARE TRASEU ---
  const updateDeliveryStatus = async (deliveryId, newStatus) => {
    const recipient = newStatus === 'delivered' ? prompt('Numele persoanei care a preluat coletul la clinică:') : null
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
      alert('Eroare la actualizarea statusului: ' + err.message)
    }
  }

  const handleOptimizeRoute = (deliveriesList) => {
    const active = deliveriesList.filter(d => d.status !== 'delivered' && d.status !== 'cancelled')
    const completed = deliveriesList.filter(d => d.status === 'delivered' || d.status === 'cancelled')

    const sortedActive = [...active].sort((a, b) => {
      if (a.is_urgent !== b.is_urgent) return a.is_urgent ? -1 : 1
      if (a.status !== b.status) return a.status === 'pending' ? -1 : 1
      const zoneA = a.status === 'pending' ? (a.pickup_address || '') : (a.zone || '')
      const zoneB = b.status === 'pending' ? (b.pickup_address || '') : (b.zone || '')
      return zoneA.localeCompare(zoneB)
    })

    setOptimizedList([...sortedActive, ...completed])
    setIsOptimized(true)
  }

  const openMultiStopGoogleMaps = (deliveriesList) => {
    const active = deliveriesList.filter(d => d.status === 'pending' || d.status === 'picked_up')
    if (active.length === 0) return alert('Nu ai opriri active pentru traseu!')

    const stops = []
    active.forEach(d => {
      const address = d.status === 'pending' ? d.pickup_address : d.dropoff_address
      const fullAddr = `${address}, Bucuresti, Romania`
      if (!stops.includes(fullAddr)) stops.push(fullAddr)
    })

    const destination = encodeURIComponent(stops[stops.length - 1])
    const waypoints = stops.slice(0, -1).map(s => encodeURIComponent(s)).join('|')
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}${waypoints ? `&waypoints=${waypoints}` : ''}&travelmode=two-wheeler`
    window.open(url, '_blank')
  }

  // --- FUNCȚII ADMIN CRUD (ADAUGARE + EDITARE + ȘTERGERE) ---
  const handleAssignCourier = async (deliveryId, courierId) => {
    try {
      const { error } = await supabase.rpc('rpc_admin_assign_courier', {
        input_password: session.password,
        p_delivery_id: deliveryId,
        p_courier_id: courierId || null
      })
      if (error) throw error
      loadPanelData(session.password, 'admin')
    } catch (err) {
      alert('Eroare alocare: ' + err.message)
    }
  }

  const handleSaveClient = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (editingClientId) {
        const { error } = await supabase.rpc('rpc_admin_update_client', {
          input_password: session.password,
          p_id: editingClientId,
          p_name: newClient.name,
          p_legal_name: newClient.legal_name || newClient.name,
          p_cui: newClient.cui,
          p_pickup_address: newClient.pickup_address,
          p_phone: newClient.phone,
          p_monthly_quota: Number(newClient.monthly_quota),
          p_subscription_price: Number(newClient.subscription_price),
          p_extra_fee: Number(newClient.extra_fee),
          p_urgent_fee: Number(newClient.urgent_fee),
          p_raw_password: newClient.password || null
        })
        if (error) throw error
        alert('Laborator actualizat cu succes!')
      } else {
        const { error } = await supabase.rpc('rpc_admin_add_client', {
          input_password: session.password,
          p_name: newClient.name,
          p_legal_name: newClient.legal_name || newClient.name,
          p_cui: newClient.cui,
          p_pickup_address: newClient.pickup_address,
          p_phone: newClient.phone,
          p_monthly_quota: Number(newClient.monthly_quota),
          p_subscription_price: Number(newClient.subscription_price),
          p_extra_fee: Number(newClient.extra_fee),
          p_urgent_fee: Number(newClient.urgent_fee),
          p_raw_password: newClient.password
        })
        if (error) throw error
        alert('Laborator adăugat cu succes!')
      }
      resetClientForm()
      loadPanelData(session.password, 'admin')
    } catch (err) {
      alert('Eroare la salvare laborator: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const startEditClient = (c) => {
    setEditingClientId(c.id)
    setNewClient({
      name: c.name || '',
      legal_name: c.legal_name || c.name || '',
      cui: c.cui || '',
      pickup_address: c.pickup_address || '',
      phone: c.phone || '',
      monthly_quota: c.monthly_quota ?? 25,
      subscription_price: c.subscription_price ?? 500,
      extra_fee: c.extra_fee ?? 35,
      urgent_fee: c.urgent_fee ?? 50,
      password: ''
    })
  }

  const resetClientForm = () => {
    setEditingClientId(null)
    setNewClient({ name: '', legal_name: '', cui: '', pickup_address: '', phone: '', monthly_quota: 25, subscription_price: 500, extra_fee: 35, urgent_fee: 50, password: '' })
  }

  const handleSaveDestination = async (e) => {
    e.preventDefault()
    if (!newDest.client_id) return alert('Selectează laboratorul de care aparține clinica!')
    setLoading(true)
    try {
      if (editingDestId) {
        const { error } = await supabase.rpc('rpc_admin_update_destination', {
          input_password: session.password,
          p_id: editingDestId,
          p_client_id: newDest.client_id,
          p_clinic_name: newDest.clinic_name,
          p_dropoff_address: newDest.dropoff_address,
          p_zone: newDest.zone,
          p_contact_phone: newDest.contact_phone
        })
        if (error) throw error
        alert('Clinică destinație actualizată!')
      } else {
        const { error } = await supabase.rpc('rpc_admin_add_destination', {
          input_password: session.password,
          p_client_id: newDest.client_id,
          p_clinic_name: newDest.clinic_name,
          p_dropoff_address: newDest.dropoff_address,
          p_zone: newDest.zone,
          p_contact_phone: newDest.contact_phone
        })
        if (error) throw error
        alert('Clinică destinație adăugată!')
      }
      resetDestForm()
      loadPanelData(session.password, 'admin')
    } catch (err) {
      alert('Eroare la salvare destinație: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const startEditDest = (dest) => {
    setEditingDestId(dest.id)
    setNewDest({
      client_id: dest.client_id || '',
      clinic_name: dest.clinic_name || '',
      dropoff_address: dest.dropoff_address || '',
      zone: dest.zone || 'Sector 1',
      contact_phone: dest.contact_phone || ''
    })
  }

  const resetDestForm = () => {
    setEditingDestId(null)
    setNewDest({ client_id: '', clinic_name: '', dropoff_address: '', zone: 'Sector 1', contact_phone: '' })
  }

  const handleSaveCourier = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (editingCourierId) {
        const { error } = await supabase.rpc('rpc_admin_update_courier', {
          input_password: session.password,
          p_id: editingCourierId,
          p_name: newCourier.name,
          p_phone: newCourier.phone,
          p_vehicle_plate: newCourier.vehicle_plate,
          p_raw_password: newCourier.password || null
        })
        if (error) throw error
        alert('Curier actualizat cu succes!')
      } else {
        const { error } = await supabase.rpc('rpc_admin_add_courier', {
          input_password: session.password,
          p_name: newCourier.name,
          p_phone: newCourier.phone,
          p_vehicle_plate: newCourier.vehicle_plate,
          p_raw_password: newCourier.password
        })
        if (error) throw error
        alert('Curier adăugat cu succes!')
      }
      resetCourierForm()
      loadPanelData(session.password, 'admin')
    } catch (err) {
      alert('Eroare la salvare curier: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const startEditCourier = (cr) => {
    setEditingCourierId(cr.id)
    setNewCourier({
      name: cr.name || '',
      phone: cr.phone || '',
      vehicle_plate: cr.vehicle_plate || '',
      password: ''
    })
  }

  const resetCourierForm = () => {
    setEditingCourierId(null)
    setNewCourier({ name: '', phone: '', vehicle_plate: '', password: '' })
  }

  const handleDeleteItem = async (table, id, label) => {
    if (!confirm(`Ești sigur că vrei să ștergi "${label}"?`)) return
    try {
      const { error } = await supabase.rpc('rpc_admin_delete_item', {
        input_password: session.password,
        p_table: table,
        p_id: id
      })
      if (error) throw error
      loadPanelData(session.password, 'admin')
    } catch (err) {
      alert('Eroare la ștergere: ' + err.message)
    }
  }

  // --- COMPONENTĂ REUTILIZABILĂ COCKPIT MOTO ---
  const renderCourierCockpit = (rawDeliveries) => {
    const listToDisplay = isOptimized ? optimizedList : rawDeliveries
    const activeCount = rawDeliveries.filter(d => d.status === 'pending' || d.status === 'picked_up').length

    return (
      <div className="space-y-4">
        <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-lg">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Compass size={18} /> Optimizare Traseu & Navigație ({activeCount} opriri active)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isOptimized ? 'Traseu ordonat inteligent: Urgențe -> Ridicări -> Sectoare' : 'Comenzile sunt afișate în ordinea plasării.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button
              onClick={() => handleOptimizeRoute(rawDeliveries)}
              className="flex-1 sm:flex-none px-3.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-md"
            >
              <Sparkles size={15} /> Optimizează Traseul
            </button>
            <button
              onClick={() => openMultiStopGoogleMaps(listToDisplay)}
              className="flex-1 sm:flex-none px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-md"
            >
              <Route size={15} /> Traseu Complet Maps
            </button>
            <button
              onClick={() => loadPanelData(session.password, session.panel)}
              className="p-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl transition"
              title="Reîmprospătează lista"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {listToDisplay.length === 0 ? (
          <div className="bg-slate-800 rounded-2xl p-8 text-center text-slate-400 border border-slate-700">
            Nu există comenzi active în acest moment. Drum bun!
          </div>
        ) : (
          listToDisplay.map((d, index) => {
            const targetAddress = d.status === 'pending' ? d.pickup_address : d.dropoff_address
            const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(targetAddress + ', Bucuresti')}&navigate=yes`
            const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(targetAddress + ', Bucuresti, Romania')}&travelmode=two-wheeler`

            return (
              <div key={d.id} className={`bg-slate-800 rounded-2xl p-5 border ${d.is_urgent && d.status !== 'delivered' ? 'border-red-500/80' : 'border-slate-700'} shadow-lg space-y-4`}>
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      {isOptimized && d.status !== 'delivered' && (
                        <span className="bg-amber-500 text-slate-950 text-xs font-extrabold px-2 py-0.5 rounded-md">
                          Oprirea #{index + 1}
                        </span>
                      )}
                      <span className="font-bold text-lg text-white">{d.clinic_name}</span>
                      <span className="text-xs bg-slate-700 text-slate-300 px-2.5 py-0.5 rounded-full">{d.zone}</span>
                      {d.is_urgent && <span className="bg-red-600 text-white text-xs px-2.5 py-0.5 rounded-full font-bold">URGENT (60m)</span>}
                      {!d.courier_id && d.status === 'pending' && (
                        <span className="bg-blue-600/30 border border-blue-400 text-blue-300 text-xs px-2 py-0.5 rounded-full font-semibold">
                          Comandă Nouă (Nealocată)
                        </span>
                      )}
                    </div>

                    <div className="mt-2 space-y-1 text-xs">
                      <p className={`${d.status === 'pending' ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>
                        1. Ridicare ({d.client_name || 'Laborator'}): {d.pickup_address}
                      </p>
                      <p className={`${d.status === 'picked_up' ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
                        2. Livrare ({d.clinic_name}): {d.dropoff_address}
                      </p>
                    </div>
                  </div>

                  <span className={`text-xs px-3 py-1 rounded-full font-semibold shrink-0 ${
                    d.status === 'delivered' ? 'bg-green-900 text-green-300' :
                    d.status === 'picked_up' ? 'bg-blue-900 text-blue-300' : 'bg-amber-900 text-amber-300'
                  }`}>
                    {d.status === 'delivered' ? 'Livrat' : d.status === 'picked_up' ? 'În tranzit' : 'De ridicat'}
                  </span>
                </div>

                <div className="bg-slate-900/60 p-3 rounded-xl text-xs text-slate-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <span>Detalii colet: <strong className="text-white">{d.package_notes || 'Cutie lucrare dentară'}</strong></span>
                    {d.needs_return && <span className="ml-2 text-amber-400 font-semibold">• Necesită Retur!</span>}
                  </div>
                  
                  {d.status !== 'delivered' && (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <a 
                        href={wazeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 sm:flex-none bg-sky-600 hover:bg-sky-500 text-white px-3 py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition"
                      >
                        <Navigation size={14} /> Waze ({d.status === 'pending' ? 'Ridicare' : 'Livrare'})
                      </a>
                      <a 
                        href={gmapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition"
                      >
                        <MapPin size={14} /> Google Maps
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-700">
                  {d.status === 'pending' && (
                    <button
                      onClick={() => updateDeliveryStatus(d.id, 'picked_up')}
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition shadow-md"
                    >
                      {!d.courier_id ? 'Preia Comanda & Confirmă Ridicarea (Pick-up)' : 'Confirmă Preluarea Coletului (Pick-up)'}
                    </button>
                  )}
                  {d.status === 'picked_up' && (
                    <button
                      onClick={() => updateDeliveryStatus(d.id, 'delivered')}
                      className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl text-xs transition shadow-md"
                    >
                      Confirmă Livrarea la Clinică (Delivered)
                    </button>
                  )}
                  {d.status === 'delivered' && (
                    <div className="text-xs text-green-400 font-medium flex items-center gap-1.5">
                      <CheckCircle2 size={16} /> Livrat cu succes (Preluat de: {d.recipient_name || 'Recepție'})
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    )
  }

  // --- ECRAN DE LOGIN ---
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
    const { client, destinations = [], deliveries = [], current_month } = panelData
    const standardUsed = deliveries.filter(d => d.status !== 'cancelled' && !d.is_urgent).length
    const quotaPercent = Math.min(100, (standardUsed / (client?.monthly_quota || 1)) * 100)

    return (
      <div className="min-h-screen bg-slate-100 pb-12">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-lg font-bold text-slate-900">{client?.name}</h1>
              <p className="text-xs text-slate-500">CUI: {client?.cui} • Ridicare: {client?.pickup_address}</p>
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
                <Plus size={18} className="text-blue-600" /> Cheamă Curierul Moto
              </h2>
              <form onSubmit={handleCreateOrder} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Cabinet Stomatologic / Clinică</label>
                  <select
                    value={selectedDest}
                    onChange={(e) => setSelectedDest(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  >
                    <option value="">-- Alege clinica destinație --</option>
                    {destinations.map(d => (
                      <option key={d.id} value={d.id}>{d.clinic_name} ({d.zone})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Detalii Lucrare / Pacient</label>
                  <input
                    type="text"
                    value={packageNotes}
                    onChange={(e) => setPackageNotes(e.target.value)}
                    placeholder="Ex: Coroană zirconiu - Dr. Popescu"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={isUrgent} onChange={(e) => setIsUrgent(e.target.checked)} className="rounded text-blue-600 w-4 h-4" />
                    <span className="text-sm font-medium text-red-600">Regim Urgență (60 min • +{client?.urgent_fee} RON)</span>
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
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Clock size={18} className="text-blue-600" /> Istoric & Status Comenzi ({current_month})
                </h2>
                <button onClick={() => loadPanelData(session.password, 'client')} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  <RefreshCw size={13} /> Actualizează
                </button>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {deliveries.length === 0 ? (
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
                        <p className="text-xs text-slate-500 mt-1">{d.package_notes || 'Colet standard'}</p>
                      </div>
                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                          d.status === 'delivered' ? 'bg-green-100 text-green-700' :
                          d.status === 'picked_up' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {d.status === 'delivered' ? `Livrat (${d.recipient_name || 'Recepție'})` :
                           d.status === 'picked_up' ? 'În tranzit pe scuter' : 'În așteptare preluare'}
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

        <main className="max-w-4xl mx-auto px-4 mt-6">
          {renderCourierCockpit(deliveries)}
        </main>
      </div>
    )
  }

  // --- PANOU ADMIN COMPLET ---
  if (session.panel === 'admin' && panelData) {
    const { admin, clients = [], destinations = [], couriers = [], deliveries = [] } = panelData

    return (
      <div className="min-h-screen bg-slate-900 text-white pb-12">
        <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 text-white p-2 rounded-xl font-bold">
                <Shield size={20} />
              </div>
              <div>
                <h1 className="text-base font-bold">Admin & Dispecerat ({admin?.name || 'Admin'})</h1>
                <p className="text-xs text-slate-400">Control Central DentaMoto Express</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
              <div className="flex flex-wrap bg-slate-900 p-1 rounded-xl border border-slate-700 gap-1">
                <button
                  onClick={() => setActiveTab('dispatch')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === 'dispatch' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  1. Dispecerat Live
                </button>
                <button
                  onClick={() => setActiveTab('cockpit')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === 'cockpit' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  2. Cockpit Moto
                </button>
                <button
                  onClick={() => setActiveTab('manage')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === 'manage' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  3. Gestiune (Clienți / Curieri)
                </button>
                <button
                  onClick={() => setActiveTab('solo')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === 'solo' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  4. Facturare Solo.ro
                </button>
              </div>
              <button onClick={handleLogout} className="flex items-center gap-1 px-3 py-2 text-xs text-red-400 hover:bg-slate-700 rounded-lg transition font-medium">
                <LogOut size={15} /> Ieșire
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 mt-6 space-y-6">
          {/* TAB 1: DISPECERAT */}
          {activeTab === 'dispatch' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Comenzi Active / Total</span>
                  <p className="text-2xl font-extrabold text-white mt-1">
                    {deliveries.filter(d => d.status !== 'delivered').length} / {deliveries.length}
                  </p>
                </div>
                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Laboratoare Partenere</span>
                  <p className="text-2xl font-extrabold text-blue-400 mt-1">{clients.length}</p>
                </div>
                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Curieri Activi</span>
                  <p className="text-2xl font-extrabold text-amber-400 mt-1">{couriers.length}</p>
                </div>
              </div>

              <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">Toate Comenzile & Alocare Curieri</h2>
                  <button onClick={() => loadPanelData(session.password, 'admin')} className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                    <RefreshCw size={14} /> Reîmprospătează
                  </button>
                </div>

                <div className="space-y-3">
                  {deliveries.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">Nicio comandă înregistrată.</p>
                  ) : (
                    deliveries.map(d => (
                      <div key={d.id} className="p-4 rounded-xl bg-slate-900 border border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-white text-sm">{d.clinic_name}</span>
                            <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">{d.zone}</span>
                            {d.is_urgent && <span className="text-xs bg-red-900 text-red-300 px-2 py-0.5 rounded-full font-bold">URGENT</span>}
                          </div>
                          <p className="text-xs text-amber-400 mt-1">Ridicare: {d.client_name} ({d.pickup_address})</p>
                          <p className="text-xs text-slate-400 mt-0.5">Livrare: {d.dropoff_address} • Detalii: {d.package_notes}</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                          <select
                            value={d.courier_id || ''}
                            onChange={(e) => handleAssignCourier(d.id, e.target.value)}
                            className="bg-slate-800 border border-slate-600 text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                          >
                            <option value="">-- Nealocat (Vizibil tuturor) --</option>
                            {couriers.map(c => (
                              <option key={c.id} value={c.id}>{c.name} ({c.vehicle_plate})</option>
                            ))}
                          </select>

                          <span className={`text-xs px-3 py-1.5 rounded-lg font-semibold ${
                            d.status === 'delivered' ? 'bg-green-900 text-green-300' :
                            d.status === 'picked_up' ? 'bg-blue-900 text-blue-300' : 'bg-amber-900 text-amber-300'
                          }`}>
                            {d.status === 'delivered' ? `Livrat (${d.recipient_name || ''})` : d.status === 'picked_up' ? 'În tranzit' : 'În așteptare'}
                          </span>

                          <button
                            onClick={() => handleDeleteItem('delivery', d.id, `Comanda către ${d.clinic_name}`)}
                            className="p-2 text-slate-500 hover:text-red-400 transition"
                            title="Șterge comanda"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COCKPIT MOTO PENTRU ADMIN */}
          {activeTab === 'cockpit' && renderCourierCockpit(deliveries)}

          {/* TAB 3: GESTIUNE CRUD (ADAUGARE + EDITARE + ȘTERGERE) */}
          {activeTab === 'manage' && (
            <div className="space-y-8">
              {/* Secțiune 1: Laboratoare (Clienți) */}
              <div className="grid md:grid-cols-3 gap-6 bg-slate-800 p-6 rounded-2xl border border-slate-700">
                <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-slate-700 pb-6 md:pb-0 md:pr-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-bold text-blue-400 flex items-center gap-2">
                      <Building2 size={18} /> {editingClientId ? 'Editează Laborator' : 'Adaugă Laborator Nou'}
                    </h3>
                    {editingClientId && (
                      <button onClick={resetClientForm} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
                        <X size={14} /> Anulează
                      </button>
                    )}
                  </div>
                  <form onSubmit={handleSaveClient} className="space-y-3 text-xs">
                    <input type="text" placeholder="Nume Scurt (ex: DentCraft Plevnei)" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white" required />
                    <input type="text" placeholder="Denumire SRL (ex: SC DentCraft SRL)" value={newClient.legal_name} onChange={e => setNewClient({...newClient, legal_name: e.target.value})} className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white" />
                    <input type="text" placeholder="CUI (ex: RO123456)" value={newClient.cui} onChange={e => setNewClient({...newClient, cui: e.target.value})} className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white" required />
                    <input type="text" placeholder="Adresă Ridicare (București)" value={newClient.pickup_address} onChange={e => setNewClient({...newClient, pickup_address: e.target.value})} className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white" required />
                    <input type="text" placeholder="Telefon Contact" value={newClient.phone} onChange={e => setNewClient({...newClient, phone: e.target.value})} className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white" required />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-400 block mb-1">Cotă Curse/Lună</label>
                        <input type="number" value={newClient.monthly_quota} onChange={e => setNewClient({...newClient, monthly_quota: e.target.value})} className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white" />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">Abonament (RON)</label>
                        <input type="number" value={newClient.subscription_price} onChange={e => setNewClient({...newClient, subscription_price: e.target.value})} className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-400 block mb-1">Tarif Extra (RON)</label>
                        <input type="number" value={newClient.extra_fee} onChange={e => setNewClient({...newClient, extra_fee: e.target.value})} className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white" />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">Tarif Urgent (RON)</label>
                        <input type="number" value={newClient.urgent_fee} onChange={e => setNewClient({...newClient, urgent_fee: e.target.value})} className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white" />
                      </div>
                    </div>
                    <input 
                      type="text" 
                      placeholder={editingClientId ? "Parolă nouă (lasă gol pt a păstra vechea parolă)" : "Setează Parola de Acces (ex: Lab#2026)"} 
                      value={newClient.password} 
                      onChange={e => setNewClient({...newClient, password: e.target.value})} 
                      className="w-full p-2.5 bg-slate-900 border border-blue-500 rounded-xl text-white font-bold" 
                      required={!editingClientId} 
                    />
                    <button type="submit" disabled={loading} className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition">
                      {editingClientId ? 'Salvează Modificările' : '+ Salvează Laborator'}
                    </button>
                  </form>
                </div>

                <div className="md:col-span-2">
                  <h3 className="text-base font-bold text-white mb-4">Laboratoare Existente ({clients.length})</h3>
                  <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                    {clients.map(c => (
                      <div key={c.id} className={`p-3.5 bg-slate-900 rounded-xl border ${editingClientId === c.id ? 'border-blue-500' : 'border-slate-700'} flex justify-between items-center`}>
                        <div>
                          <p className="font-bold text-sm text-white">{c.name} <span className="text-xs text-slate-400">({c.cui})</span></p>
                          <p className="text-xs text-slate-400">{c.pickup_address} • Tel: {c.phone}</p>
                          <p className="text-xs text-blue-400 mt-1">Cotă: {c.monthly_quota} curse • Abonament: {c.subscription_price || 0} RON • Extra: {c.extra_fee} RON • Urgent: {c.urgent_fee} RON</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => startEditClient(c)} className="p-2 text-slate-400 hover:text-blue-400 transition" title="Editează laborator">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDeleteItem('client', c.id, c.name)} className="p-2 text-slate-500 hover:text-red-400 transition" title="Șterge laborator">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Secțiune 2: Clinici Destinație */}
              <div className="grid md:grid-cols-3 gap-6 bg-slate-800 p-6 rounded-2xl border border-slate-700">
                <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-slate-700 pb-6 md:pb-0 md:pr-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-bold text-emerald-400 flex items-center gap-2">
                      <MapPin size={18} /> {editingDestId ? 'Editează Clinica' : 'Adaugă Clinică Destinație'}
                    </h3>
                    {editingDestId && (
                      <button onClick={resetDestForm} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
                        <X size={14} /> Anulează
                      </button>
                    )}
                  </div>
                  <form onSubmit={handleSaveDestination} className="space-y-3 text-xs">
                    <select value={newDest.client_id} onChange={e => setNewDest({...newDest, client_id: e.target.value})} className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white" required>
                      <option value="">-- Alege Laboratorul Partener --</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <input type="text" placeholder="Nume Cabinet / Clinică" value={newDest.clinic_name} onChange={e => setNewDest({...newDest, clinic_name: e.target.value})} className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white" required />
                    <input type="text" placeholder="Adresă Livrare Completă" value={newDest.dropoff_address} onChange={e => setNewDest({...newDest, dropoff_address: e.target.value})} className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white" required />
                    <select value={newDest.zone} onChange={e => setNewDest({...newDest, zone: e.target.value})} className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white">
                      <option value="Sector 1">Sector 1</option>
                      <option value="Sector 2">Sector 2</option>
                      <option value="Sector 3">Sector 3</option>
                      <option value="Sector 4">Sector 4</option>
                      <option value="Sector 5">Sector 5</option>
                      <option value="Sector 6">Sector 6</option>
                      <option value="Ilfov">Ilfov</option>
                    </select>
                    <input type="text" placeholder="Telefon Recepție Clinică" value={newDest.contact_phone} onChange={e => setNewDest({...newDest, contact_phone: e.target.value})} className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white" />
                    <button type="submit" disabled={loading} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition">
                      {editingDestId ? 'Salvează Modificările' : '+ Adaugă Clinica'}
                    </button>
                  </form>
                </div>

                <div className="md:col-span-2">
                  <h3 className="text-base font-bold text-white mb-4">Clinici Arondate ({destinations?.length || 0})</h3>
                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                    {destinations?.map(dest => (
                      <div key={dest.id} className={`p-3 bg-slate-900 rounded-xl border ${editingDestId === dest.id ? 'border-emerald-500' : 'border-slate-700'} flex justify-between items-center`}>
                        <div>
                          <p className="font-bold text-sm text-white">{dest.clinic_name} <span className="text-xs bg-slate-800 text-emerald-400 px-2 py-0.5 rounded-full">{dest.zone}</span></p>
                          <p className="text-xs text-slate-400">{dest.dropoff_address} • Tel: {dest.contact_phone}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => startEditDest(dest)} className="p-2 text-slate-400 hover:text-emerald-400 transition" title="Editează clinica">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDeleteItem('destination', dest.id, dest.clinic_name)} className="p-2 text-slate-500 hover:text-red-400 transition" title="Șterge clinica">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Secțiune 3: Curieri Moto */}
              <div className="grid md:grid-cols-3 gap-6 bg-slate-800 p-6 rounded-2xl border border-slate-700">
                <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-slate-700 pb-6 md:pb-0 md:pr-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
                      <Users size={18} /> {editingCourierId ? 'Editează Curier' : 'Adaugă Curier Moto'}
                    </h3>
                    {editingCourierId && (
                      <button onClick={resetCourierForm} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
                        <X size={14} /> Anulează
                      </button>
                    )}
                  </div>
                  <form onSubmit={handleSaveCourier} className="space-y-3 text-xs">
                    <input type="text" placeholder="Nume Curier (ex: Andrei Moto)" value={newCourier.name} onChange={e => setNewCourier({...newCourier, name: e.target.value})} className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white" required />
                    <input type="text" placeholder="Telefon Curier" value={newCourier.phone} onChange={e => setNewCourier({...newCourier, phone: e.target.value})} className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white" required />
                    <input type="text" placeholder="Număr Scuter (ex: B-102-SCO)" value={newCourier.vehicle_plate} onChange={e => setNewCourier({...newCourier, vehicle_plate: e.target.value})} className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white" required />
                    <input 
                      type="text" 
                      placeholder={editingCourierId ? "Parolă nouă (lasă gol pt a păstra vechea parolă)" : "Setează Parola Curier (ex: Moto#99)"} 
                      value={newCourier.password} 
                      onChange={e => setNewCourier({...newCourier, password: e.target.value})} 
                      className="w-full p-2.5 bg-slate-900 border border-amber-500 rounded-xl text-white font-bold" 
                      required={!editingCourierId} 
                    />
                    <button type="submit" disabled={loading} className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition">
                      {editingCourierId ? 'Salvează Modificările' : '+ Salvează Curier'}
                    </button>
                  </form>
                </div>

                <div className="md:col-span-2">
                  <h3 className="text-base font-bold text-white mb-4">Echipa de Curieri ({couriers.length})</h3>
                  <div className="space-y-2.5">
                    {couriers.map(cr => (
                      <div key={cr.id} className={`p-3.5 bg-slate-900 rounded-xl border ${editingCourierId === cr.id ? 'border-amber-500' : 'border-slate-700'} flex justify-between items-center`}>
                        <div>
                          <p className="font-bold text-sm text-white">{cr.name} <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-md ml-1">{cr.vehicle_plate}</span></p>
                          <p className="text-xs text-slate-400">Telefon: {cr.phone}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => startEditCourier(cr)} className="p-2 text-slate-400 hover:text-amber-400 transition" title="Editează curier">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDeleteItem('courier', cr.id, cr.name)} className="p-2 text-slate-500 hover:text-red-400 transition" title="Șterge curier">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CONTABILITATE SOLO.RO */}
          {activeTab === 'solo' && (
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-base font-bold text-white">Raport Facturare & Cotele Lunare (Solo.ro)</h2>
                  <p className="text-xs text-slate-400">Situația centralizată a abonamentelor, curselor extra și urgențelor pe fiecare laborator.</p>
                </div>
                <span className="bg-blue-900 text-blue-200 text-xs px-3 py-1 rounded-full font-semibold">Mod Contabilitate B2B</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900 text-slate-400 uppercase text-xs">
                    <tr>
                      <th className="p-3 rounded-l-xl">Laborator</th>
                      <th className="p-3">CUI</th>
                      <th className="p-3">Cotă Standard</th>
                      <th className="p-3">Curse Extra</th>
                      <th className="p-3">Curse Urgente</th>
                      <th className="p-3 rounded-r-xl">Total Suplimentar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {clients.map(c => {
                      const validDeliveries = deliveries.filter(d => d.client_id === c.id && d.status !== 'cancelled')
                      const standardCount = validDeliveries.filter(d => !d.is_urgent).length
                      const urgentCount = validDeliveries.filter(d => d.is_urgent).length
                      const extraCount = Math.max(0, standardCount - c.monthly_quota)
                      const totalExtraRon = (extraCount * (c.extra_fee || 0)) + (urgentCount * (c.urgent_fee || 0))

                      return (
                        <tr key={c.id} className="hover:bg-slate-900/50">
                          <td className="p-3 font-bold text-white">{c.name}</td>
                          <td className="p-3 text-slate-400">{c.cui}</td>
                          <td className="p-3 font-semibold text-blue-400">{standardCount} / {c.monthly_quota}</td>
                          <td className="p-3">{extraCount} curse (+{extraCount * (c.extra_fee || 0)} RON)</td>
                          <td className="p-3 text-red-400">{urgentCount} urgențe (+{urgentCount * (c.urgent_fee || 0)} RON)</td>
                          <td className="p-3 font-bold text-amber-400">+{totalExtraRon} RON</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
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
        <p className="text-slate-400">Se încarcă datele...</p>
        <button onClick={handleLogout} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-medium transition">
          Resetare Sesiune
        </button>
      </div>
    </div>
  )
}
