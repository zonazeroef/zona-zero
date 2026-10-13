
import { useState } from 'react'
import { supabase } from './supabase'

function Auth() {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')
    setLoading(true)

    try {
      if (mode === 'register') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
          },
        })

        if (error) throw error

        setMessage(
          'Registro enviado. Si se requiere confirmar el correo, revisa tu bandeja de entrada.'
        )
      } else {
        const { error } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          })

        if (error) throw error
      }
    } catch (error) {
      setMessage(error.message || 'No se ha podido completar la operación.')
    } finally {
      setLoading(false)
    }
  }

  const styles = {
    page: {
      minHeight: '65vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '32px 16px',
    },
    card: {
      width: '100%',
      maxWidth: '420px',
      padding: '28px',
      border: '1px solid #e5e5e5',
      borderRadius: '16px',
      background: '#fff',
      color: '#171717',
      boxSizing: 'border-box',
    },
    input: {
      width: '100%',
      padding: '12px',
      marginTop: '6px',
      border: '1px solid #d4d4d4',
      borderRadius: '8px',
      boxSizing: 'border-box',
      fontSize: '16px',
    },
    button: {
      width: '100%',
      padding: '13px',
      border: 'none',
      borderRadius: '8px',
      background: '#171717',
      color: '#fff',
      fontSize: '15px',
      cursor: 'pointer',
    },
    label: {
      display: 'block',
      marginTop: '16px',
      fontSize: '14px',
      fontWeight: '600',
    },
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <p style={{ fontSize: '12px', letterSpacing: '2px' }}>
          ZONA ZERO
        </p>

        <h1 style={{ marginBottom: '8px' }}>
          {mode === 'login' ? 'Bienvenido' : 'Crea tu cuenta'}
        </h1>

        <p style={{ color: '#666', lineHeight: 1.5 }}>
          {mode === 'login'
            ? 'Accede a tu biblioteca y a tus rutinas.'
            : 'Regístrate para acceder a Zona Zero.'}
        </p>

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <label style={styles.label}>
              Nombre completo
              <input
                style={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </label>
          )}

          <label style={styles.label}>
            Correo electrónico
            <input
              style={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label style={styles.label}>
            Contraseña
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={
                mode === 'login' ? 'current-password' : 'new-password'
              }
              minLength={8}
              required
            />
          </label>

          <button
            type="submit"
            style={{ ...styles.button, marginTop: '22px' }}
            disabled={loading}
          >
            {loading
              ? 'Un momento...'
              : mode === 'login'
                ? 'Iniciar sesión'
                : 'Crear cuenta'}
          </button>
        </form>

        {message && (
          <p role="status" style={{ marginTop: '16px', lineHeight: 1.5 }}>
            {message}
          </p>
        )}

        <p style={{ marginTop: '22px', fontSize: '14px' }}>
          {mode === 'login'
            ? '¿Todavía no tienes cuenta?'
            : '¿Ya tienes una cuenta?'}
          {' '}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login')
              setMessage('')
            }}
            style={{
              border: 'none',
              background: 'none',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
          </button>
        </p>
      </section>
    </main>
  )
}

export default Auth