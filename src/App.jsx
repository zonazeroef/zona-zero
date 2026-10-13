
import { useState, useEffect } from 'react'
import './App.css'
import { categories as exerciseCategories } from './exercises'
import { supabase } from './supabase'
import Auth from './Auth'
import Admin from './Admin'

function buildLibraryCategories(databaseCategories, databaseExercises) {
  const roots = databaseCategories.filter(
    (category) => category.parent_id == null
  )

  const getDatabaseExercises = (categoryId) =>
    databaseExercises
      .filter(
        (exercise) =>
          Number(exercise.category_id) === Number(categoryId)
      )
      .map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        description: exercise.description || '',
        video_url: exercise.video_url || '',
        image_url: exercise.image_url || '',
      }))

  const orderByOriginal = (items, originalItems) =>
    [...items].sort((a, b) => {
      const indexA = originalItems.findIndex(
        (item) => item.name === a.name
      )
      const indexB = originalItems.findIndex(
        (item) => item.name === b.name
      )

      if (indexA !== -1 && indexB !== -1) return indexA - indexB
      if (indexA !== -1) return -1
      if (indexB !== -1) return 1

      return a.name.localeCompare(b.name, 'es')
    })

  return orderByOriginal(roots, exerciseCategories).map((root) => {
    const originalRoot = exerciseCategories.find(
      (category) => category.name === root.name
    )

    const children = databaseCategories.filter(
      (category) =>
        category.parent_id != null &&
        Number(category.parent_id) === Number(root.id)
    )

    const subcategories = orderByOriginal(
      children,
      originalRoot?.subcategories || []
    ).map((child) => ({
      id: child.id,
      name: child.name,
      description: child.description || '',
      exercises: getDatabaseExercises(child.id),
    }))

    return {
      id: root.id,
      name: root.name,
      description: root.description || '',
      subcategories,
      exercises: getDatabaseExercises(root.id),
    }
  })
}

function App() {
  const [session, setSession] = useState(undefined)
  const [role, setRole] = useState(null)
  const [checkingRole, setCheckingRole] = useState(false)
  const [view, setView] = useState('library')

  const [categories, setCategories] = useState([])
  const [libraryError, setLibraryError] = useState('')

  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedSubcategory, setSelectedSubcategory] = useState(null)

  const [routines, setRoutines] = useState([])
  const [routineExercises, setRoutineExercises] = useState({})
  const [loadingRoutines, setLoadingRoutines] = useState(false)
  const [routineError, setRoutineError] = useState('')

  // Recarga la biblioteca al abrirla o volver desde administración.
  useEffect(() => {
    if (view !== 'library') return

    let active = true

    async function loadLibrary() {
      const [categoryResult, exerciseResult] = await Promise.all([
        supabase
          .from('exercise_categories')
          .select('id, name, description, parent_id')
          .order('name'),

        supabase
          .from('exercises')
          .select(
            'id, name, description, video_url, image_url, category_id'
          )
          .order('name'),
      ])

      if (!active) return

      if (categoryResult.error || exerciseResult.error) {
        const error =
          categoryResult.error || exerciseResult.error

        console.error(
          'Error al cargar la biblioteca:',
          error.message
        )

        setLibraryError(
          'No se ha podido actualizar la biblioteca desde Supabase. Comprueba la conexión y los permisos.'
        )
        return
      }

      const loadedCategories = buildLibraryCategories(
        categoryResult.data || [],
        exerciseResult.data || []
      )

      if (!active) return

      setCategories(loadedCategories)
      setLibraryError('')
    }

    loadLibrary()

    return () => {
      active = false
    }
  }, [view])

  useEffect(() => {
    let active = true

    async function checkSession() {
      const { data, error } = await supabase.auth.getSession()

      if (!active) return

      if (error) {
        console.error('Error al comprobar la sesión:', error.message)
      }

      setSession(data?.session ?? null)
    }

    checkSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let active = true

    async function loadRole() {
      setRole(null)

      if (!session?.user?.id) {
        setCheckingRole(false)
        return
      }

      setCheckingRole(true)

      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle()

      if (!active) return

      if (error) {
        console.error('No se pudo comprobar el rol:', error.message)
        setRole(null)
      } else {
        setRole(data?.role ?? null)
      }

      setCheckingRole(false)
    }

    loadRole()

    return () => {
      active = false
    }
  }, [session])

  const currentCategory = categories.find(
    (category) => category.name === selectedCategory
  )

  const currentSubcategory = currentCategory?.subcategories?.find(
    (subcategory) => subcategory.name === selectedSubcategory
  )

  const exercises =
    currentSubcategory?.exercises || currentCategory?.exercises || []

  function goHome() {
    setView('library')
    setSelectedCategory(null)
    setSelectedSubcategory(null)
  }

  function goBack() {
    if (selectedSubcategory) {
      setSelectedSubcategory(null)
    } else {
      setSelectedCategory(null)
    }
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Error al cerrar sesión:', error.message)
      return
    }

    setRole(null)
    setRoutines([])
    setRoutineExercises({})
    goHome()
  }

  async function loadRoutines() {
    if (!session?.user?.id) return

    setLoadingRoutines(true)
    setRoutineError('')
    setRoutines([])
    setRoutineExercises({})

    const { data, error } = await supabase
      .from('routines')
      .select('id, name, description, created_at')
      .eq('client_id', session.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      setRoutineError(
        'No se han podido cargar las rutinas. Comprueba la conexión y los permisos de Supabase.'
      )
      console.error(error.message)
      setLoadingRoutines(false)
      return
    }

    const loadedRoutines = data || []
    setRoutines(loadedRoutines)

    if (loadedRoutines.length > 0) {
      const routineIds = loadedRoutines.map((routine) => routine.id)

      const { data: items, error: itemsError } = await supabase
        .from('routine_exercises')
        .select(
          'id, routine_id, exercise_id, sets, reps, notes, position, exercises(name, description, video_url)'
        )
        .in('routine_id', routineIds)
        .order('position', { ascending: true })

      if (itemsError) {
        setRoutineError(
          'Se han cargado las rutinas, pero no sus ejercicios. Comprueba la configuración de Supabase.'
        )
        console.error(itemsError.message)
      } else {
        const grouped = {}

        for (const item of items || []) {
          if (!grouped[item.routine_id]) {
            grouped[item.routine_id] = []
          }

          grouped[item.routine_id].push(item)
        }

        setRoutineExercises(grouped)
      }
    }

    setLoadingRoutines(false)
  }

  function openRoutines() {
    if (!session) {
      setView('auth')
      return
    }

    setView('routines')
    loadRoutines()
  }

  function openAdmin() {
    if (role === 'admin') {
      setView('admin')
    }
  }

  function renderLibrary() {
    if (!selectedCategory) {
      return (
        <main className="home" id="inicio">
          <section className="hero">
            <p className="eyebrow">
              ZONA ZERO · ENTRENAMIENTO FUNCIONAL
            </p>

            <h1>
              Entrena.
              <br />
              <span>Muévete mejor.</span>
            </h1>

            <p className="hero-text">
              Tu biblioteca de ejercicios para mejorar fuerza,
              movilidad, rendimiento y salud.
            </p>

            <div className="brand-mark" aria-hidden="true">
              <span>ZZ</span>
            </div>
          </section>

          {libraryError && (
            <p className="empty-state" role="alert">
              {libraryError}
            </p>
          )}

          <section className="categories">
            <div className="section-heading">
              <div>
                <p className="eyebrow">ZONA ZERO</p>
                <h2>Categorías</h2>
              </div>

              <span className="category-count">
                {categories.length} categorías
              </span>
            </div>

            {categories.length > 0 ? (
              <div className="category-grid">
                {categories.map((category, index) => (
                  <button
                    className="category-card"
                    key={category.id ?? category.name}
                    onClick={() => setSelectedCategory(category.name)}
                  >
                    <span className="number">
                      {String(index + 1).padStart(2, '0')}
                    </span>

                    <span className="category-name">
                      {category.name}
                    </span>

                    <span className="arrow" aria-hidden="true">
                      ↗
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              !libraryError && <p>Cargando biblioteca...</p>
            )}
          </section>
        </main>
      )
    }

    if (selectedCategory && !selectedSubcategory) {
      return (
        <main className="category-page">
          <p className="eyebrow">ZONA ZERO · CATEGORÍA</p>

          <h1>{selectedCategory}</h1>

          {currentCategory?.subcategories?.length > 0 && (
            <section className="categories">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">EXPLORA</p>
                  <h2>Subcategorías</h2>
                </div>
              </div>

              <div className="category-grid">
                {currentCategory.subcategories.map(
                  (subcategory, index) => (
                    <button
                      className="category-card"
                      key={subcategory.id ?? subcategory.name}
                      onClick={() =>
                        setSelectedSubcategory(subcategory.name)
                      }
                    >
                      <span className="number">
                        {String(index + 1).padStart(2, '0')}
                      </span>

                      <span className="category-name">
                        {subcategory.name}
                      </span>

                      <span className="arrow" aria-hidden="true">
                        ↗
                      </span>
                    </button>
                  )
                )}
              </div>
            </section>
          )}

          {currentCategory?.exercises?.length > 0 && (
            <section className="categories">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">EJERCICIOS</p>
                  <h2>Ejercicios</h2>
                </div>

                <span className="category-count">
                  {currentCategory.exercises.length} ejercicios
                </span>
              </div>

              <div className="category-grid">
                {currentCategory.exercises.map((exercise, index) => (
                  <div className="category-card" key={exercise.id}>
                    <span className="number">
                      {String(index + 1).padStart(2, '0')}
                    </span>

                    <span className="category-name">
                      {exercise.name}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      )
    }

    return (
      <main className="category-page">
        <p className="eyebrow">
          ZONA ZERO · {selectedCategory}
        </p>

        <h1>{selectedSubcategory}</h1>

        <section className="categories">
          <div className="section-heading">
            <div>
              <p className="eyebrow">EJERCICIOS</p>
              <h2>Ejercicios</h2>
            </div>

            <span className="category-count">
              {exercises.length} ejercicios
            </span>
          </div>

          {exercises.length > 0 ? (
            <div className="category-grid">
              {exercises.map((exercise, index) => (
                <div className="category-card" key={exercise.id}>
                  <span className="number">
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <span className="category-name">
                    {exercise.name}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">ZONA ZERO</div>
              <h2>Próximamente</h2>
              <p>
                Estamos preparando los ejercicios de esta subcategoría.
              </p>
            </div>
          )}
        </section>
      </main>
    )
  }

  if (session === undefined) {
    return <p style={{ padding: '24px' }}>Cargando Zona Zero...</p>
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          {(selectedCategory || selectedSubcategory) &&
            view === 'library' && (
              <button className="back-button" onClick={goBack}>
                ← Volver
              </button>
            )}

          <a
            className="brand"
            href="#inicio"
            onClick={(event) => {
              event.preventDefault()
              goHome()
            }}
            aria-label="Zona Zero, volver al inicio"
          >
            <img
              className="brand-logo"
              src="/logo-zona-zero.png"
              alt="Zona Zero — Entrenamiento Funcional"
            />
          </a>
        </div>

        <p className="subtitle">ENTRENAMIENTO FUNCIONAL</p>

        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          <button type="button" onClick={goHome}>
            Biblioteca gratuita
          </button>

          <button type="button" onClick={openRoutines}>
            Mis rutinas
          </button>

          {session && role === 'admin' && (
            <button type="button" onClick={openAdmin}>
              Administración
            </button>
          )}

          {session ? (
            <>
              <span style={{ fontSize: '12px' }}>
                {session.user.email}
              </span>

              <button type="button" onClick={handleLogout}>
                Cerrar sesión
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setView('auth')}>
              Iniciar sesión
            </button>
          )}
        </nav>
      </header>

      {view === 'library' && renderLibrary()}

      {view === 'auth' && (
        <main className="category-page">
          <button type="button" onClick={goHome}>
            ← Volver a la biblioteca
          </button>

          <Auth />
        </main>
      )}

      {view === 'routines' && (
        <main className="category-page">
          <p className="eyebrow">ZONA ZERO · ÁREA PERSONAL</p>

          <h1>Mis rutinas</h1>

          <p>Estas son las rutinas asignadas a tu cuenta.</p>

          {loadingRoutines && <p>Cargando tus rutinas...</p>}

          {routineError && (
            <div className="empty-state">
              <p>{routineError}</p>

              <button type="button" onClick={loadRoutines}>
                Volver a intentarlo
              </button>
            </div>
          )}

          {!loadingRoutines &&
            !routineError &&
            routines.length === 0 && (
              <div className="empty-state">
                <h2>Aún no tienes rutinas asignadas</h2>

                <p>
                  Cuando tu entrenador te asigne una rutina,
                  aparecerá aquí.
                </p>
              </div>
            )}

          <section className="categories">
            {routines.map((routine) => (
              <article className="category-card" key={routine.id}>
                <h2>{routine.name}</h2>

                {routine.description && <p>{routine.description}</p>}

                <div
                  style={{
                    display: 'grid',
                    gap: '12px',
                    marginTop: '16px',
                  }}
                >
                  {(routineExercises[routine.id] || []).map((item) => (
                    <div
                      key={item.id}
                      style={{
                        borderTop: '1px solid #e5e5e5',
                        paddingTop: '12px',
                      }}
                    >
                      <h3>{item.exercises?.name || 'Ejercicio'}</h3>

                      {item.exercises?.description && (
                        <p>{item.exercises.description}</p>
                      )}

                      <p>
                        {item.sets != null && `${item.sets} series`}
                        {item.sets != null &&
                          item.reps != null &&
                          ' · '}
                        {item.reps != null &&
                          `${item.reps} repeticiones`}
                      </p>

                      {item.notes && <p>{item.notes}</p>}

                      {item.exercises?.video_url && (
                        <p>
                          <a
                            href={item.exercises.video_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Ver vídeo del ejercicio
                          </a>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </section>
        </main>
      )}

      {view === 'admin' && role === 'admin' && <Admin />}

      {view === 'admin' && role !== 'admin' && (
        <main className="category-page">
          <h1>Acceso no autorizado</h1>
          <p>Esta sección está reservada para administración.</p>
          <button type="button" onClick={goHome}>
            Volver a la biblioteca
          </button>
        </main>
      )}

      {checkingRole && session && (
        <p
          style={{
            position: 'fixed',
            bottom: '8px',
            right: '8px',
            fontSize: '11px',
            color: '#666',
          }}
        >
          Comprobando permisos...
        </p>
      )}
    </div>
  )
}

export default App
