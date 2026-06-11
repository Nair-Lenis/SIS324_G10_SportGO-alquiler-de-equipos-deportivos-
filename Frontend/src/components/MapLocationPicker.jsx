import { useEffect, useRef, useState } from 'react'

let googleMapsPromise = null
function loadGoogleMaps(apiKey) {
  if (!apiKey) return Promise.reject(new Error('No se encontró la clave de Google Maps.'))
  if (window.google && window.google.maps && window.google.maps.places) return Promise.resolve(window.google)
  if (googleMapsPromise) return googleMapsPromise

  googleMapsPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        if (window.google && window.google.maps && window.google.maps.places) resolve(window.google)
        else {
          googleMapsPromise = null
          reject(new Error('No se pudo cargar Google Maps correctamente.'))
        }
      })
      existingScript.addEventListener('error', () => {
        googleMapsPromise = null
        reject(new Error('No se pudo cargar el script de Google Maps. Verifica la clave y la conexión.'))
      })
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&v=weekly`
    script.async = true
    script.defer = true
    script.onload = () => {
      if (window.google && window.google.maps && window.google.maps.places) resolve(window.google)
      else {
        googleMapsPromise = null
        reject(new Error('No se pudo cargar Google Maps correctamente.'))
      }
    }
    script.onerror = () => {
      googleMapsPromise = null
      reject(new Error('No se pudo cargar el script de Google Maps. Verifica la clave y la conexión.'))
    }
    document.head.appendChild(script)
  })

  return googleMapsPromise
}

export default function MapLocationPicker({ value, coordinates, onChange }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  const [address, setAddress] = useState(value || '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)
  const mapRef = useRef(null)
  const inputRef = useRef(null)
  const mapInstance = useRef(null)
  const markerRef = useRef(null)
  const autocompleteRef = useRef(null)
  const geocoderRef = useRef(null)

  useEffect(() => {
    setAddress(value || '')
  }, [value])

  useEffect(() => {
    if (!apiKey) return
    setLoading(true)
    setLoadFailed(false)

    const previousAuthFailure = window.gm_authFailure
    window.gm_authFailure = () => {
      setError('Google Maps rechazó la clave. Revisa la API key y las restricciones de dominio.')
      googleMapsPromise = null
      setLoadFailed(true)
    }

    loadGoogleMaps(apiKey)
      .then(google => {
        if (!mapRef.current || !inputRef.current) return

        // Si el mapa ya está inicializado solo mover la posición, no recrearlo
        if (mapInstance.current) {
          if (coordinates?.lat && coordinates?.lng) {
            mapInstance.current.panTo({ lat: Number(coordinates.lat), lng: Number(coordinates.lng) })
            markerRef.current?.setPosition({ lat: Number(coordinates.lat), lng: Number(coordinates.lng) })
          }
          return
        }

        try {
          const center = (coordinates?.lat && coordinates?.lng)
            ? { lat: Number(coordinates.lat), lng: Number(coordinates.lng) }
            : { lat: -16.500000, lng: -68.150000 }

          mapInstance.current = new google.maps.Map(mapRef.current, {
            center,
            zoom: 13,
            disableDefaultUI: true,
            zoomControl: true,
          })

          markerRef.current = new google.maps.Marker({
            map: mapInstance.current,
            position: center,
            draggable: true,
          })

          geocoderRef.current = new google.maps.Geocoder()

          autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
            fields: ['formatted_address', 'geometry'],
          })

          autocompleteRef.current.addListener('place_changed', () => {
            const place = autocompleteRef.current.getPlace()
            if (!place.geometry) {
              setError('Selecciona una dirección válida de la lista.')
              return
            }
            const lat = place.geometry.location.lat()
            const lng = place.geometry.location.lng()
            const formatted = place.formatted_address || inputRef.current.value
            setError('')
            setAddress(formatted)
            mapInstance.current.panTo({ lat, lng })
            markerRef.current.setPosition({ lat, lng })
            onChange({ address: formatted, lat, lng })
          })

          markerRef.current.addListener('dragend', () => {
            const position = markerRef.current.getPosition()
            const lat = position.lat()
            const lng = position.lng()
            if (!geocoderRef.current) return
            geocoderRef.current.geocode({ location: { lat, lng } }, results => {
              const formatted = (results && results[0]?.formatted_address) || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
              setAddress(formatted)
              if (inputRef.current) inputRef.current.value = formatted
              onChange({ address: formatted, lat, lng })
            })
          })
        } catch (initErr) {
          setError('No se pudo inicializar el mapa.')
          setLoadFailed(true)
        }
      })
      .catch(err => {
        setError(err.message || 'No se pudo cargar Google Maps.')
        setLoadFailed(true)
      })
      .finally(() => setLoading(false))

    return () => {
      if (previousAuthFailure) window.gm_authFailure = previousAuthFailure
      else delete window.gm_authFailure
    }
  }, [apiKey, coordinates])

  useEffect(() => {
    if (!mapInstance.current || !coordinates) return
    mapInstance.current.panTo({ lat: Number(coordinates.lat), lng: Number(coordinates.lng) })
    markerRef.current.setPosition({ lat: Number(coordinates.lat), lng: Number(coordinates.lng) })
  }, [coordinates])

  async function getBrowserLocation() {
    if (!navigator.geolocation) throw new Error('Tu navegador no soporta geolocalización.')
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        pos => resolve(pos.coords),
        err => reject(new Error(err.message || 'No se pudo obtener la ubicación.')),
        { timeout: 15000 }
      )
    })
  }

  async function reverseGeocode(lat, lon) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`
    const res = await fetch(url)
    if (!res.ok) throw new Error('No se pudo obtener la dirección desde la ubicación.')
    const data = await res.json()
    return data.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`
  }

  async function useCurrentLocation() {
    setGeoLoading(true)
    setError('')
    try {
      const coords = await getBrowserLocation()
      const addressValue = await reverseGeocode(coords.latitude, coords.longitude)
      setAddress(addressValue)
      setError('')
      onChange({ address: addressValue, lat: coords.latitude, lng: coords.longitude })
    } catch (err) {
      setError(err.message || 'No se pudo obtener la ubicación actual.')
    } finally {
      setGeoLoading(false)
    }
  }

  if (!apiKey) {
    return (
      <div style={{ color: '#f8f8f8', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1rem', marginBottom: '0.75rem' }}>
        <strong style={{ display:'block', marginBottom:'0.5rem' }}>Mapas de Google no configurados</strong>
        Para activar la selección de ubicación con Google Maps, agrega la variable <code>VITE_GOOGLE_MAPS_API_KEY</code> en el archivo <code>.env</code> del frontend.
      </div>
    )
  }

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display:'block', fontSize:'0.75rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text2)', marginBottom:'0.5rem' }}>
        Buscar ubicación
      </label>
      <input
        ref={inputRef}
        value={address}
        onChange={e => setAddress(e.target.value)}
        placeholder="Escribe una dirección..."
        style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', marginBottom: '0.75rem' }}
      />
      <div style={{ width:'100%', height:'260px', borderRadius:'18px', overflow:'hidden', border:'1px solid var(--border)', position:'relative' }} ref={mapRef}>
        {loadFailed && (
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'1rem', background:'rgba(15,23,42,0.9)', color:'#f8fafc', textAlign:'center' }}>
            <div style={{ fontWeight:700, marginBottom:'0.5rem' }}>No se pudo cargar Google Maps</div>
            <div style={{ fontSize:'0.9rem', color:'#cbd5e1', marginBottom:'0.75rem' }}>
              Revisa la clave y las restricciones de la API. Puedes seguir ingresando la dirección y usar la opción de geolocalización.
            </div>
            <button onClick={useCurrentLocation} disabled={geoLoading} style={{ background:'var(--teal)', border:'none', borderRadius:'12px', padding:'0.65rem 1rem', color:'#fff', cursor:'pointer' }}>
              {geoLoading ? 'Obteniendo ubicación...' : 'Usar mi ubicación actual'}
            </button>
          </div>
        )}
      </div>
      {loading && <div style={{ color: 'var(--text2)', marginTop:'0.75rem' }}>Cargando Google Maps...</div>}
      {error && <div style={{ color: '#f87171', marginTop:'0.75rem' }}>{error}</div>}
      <div style={{ marginTop:'0.75rem', color:'var(--text2)', fontSize:'0.82rem' }}>
        Escribe una dirección y selecciona la sugerencia. También puedes arrastrar el pin en el mapa.
      </div>
    </div>
  )
}
