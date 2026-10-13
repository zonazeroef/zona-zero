
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const buttonStyle = {
  padding: '10px 14px',
  border: '1px solid #d4d4d4',
  borderRadius: '8px',
  background: '#fff',
  color: '#171717',
  cursor: 'pointer',
}

const inputStyle = {
  width: '100%',
  padding: '11px',
  border: '1px solid #d4d4d4',
  borderRadius: '8px',
  boxSizing: 'border-box',
  fontSize: '14px',
}

const cardStyle = {
  border: '1px solid #e5e5e5',
  borderRadius: '12px',
  padding: '18px',
  background: '#fff',
  color: '#171717',
}

const emptyCategory = {
  id: null,
  name: '',
  description: '',
  parent_id: '',
}

const emptyExercise = {
  id: null,
  category_id: '',
  name: '',
  description: '',
  video_url: '',
  image_url: '',
}

function Admin() {
  const [tab, setTab] = useState('categories')
  const [categories, setCategories] = useState([])
  const [exercises, setExercises] = useState([])
  const [clients, setClients] = useState([])
  const [routines, setRoutines] = useState([])
  const [routineItems, setRoutineItems] = useState([])
  const [selectedRoutine, setSelectedRoutine] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingCategory, setSavingCategory] = useState(false)
  const [savingExercise, setSavingExercise] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [categoryForm, setCategoryForm] = useState(emptyCategory)
  const [exerciseForm, setExerciseForm] = useState(emptyExercise)

  const [routineForm, setRoutineForm] = useState({
    client_id: '',
    name: '',
    description: '',
  })

  const [routineExerciseForm, setRoutineExerciseForm] = useState({
    exercise_id: '',
    sets: '3',
    reps: '10',
    notes: '',
  })

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      const results = await Promise.all([
        supabase
          .from('exercise_categories')
          .select('*')
          .order('name'),
        supabase.from('exercises').select('*').order('name'),
        supabase
          .from('profiles')
          .select('id, full_name, role')
          .eq('role', 'client')
          .order('full_name'),
        supabase
          .from('routines')
          .select('*')
          .order('created_at', { ascending: false }),
      ])

      const failed = results.find((result) => result.error)

      if (failed) throw failed.error

      setCategories(results[0].data || [])
      setExercises(results[1].data || [])
      setClients(results[2].data || [])
      setRoutines(results[3].data || [])
    } catch (err) {
      setError(
        err.message ||
          'No se han podido cargar los datos. Comprueba los permisos de Supabase.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function showMessage(text) {
    setMessage(text)
    setError('')
  }

  function showError(err) {
    setError(err.message || 'Se ha producido un error.')
    setMessage('')
  }

  function getDescendantIds(categoryId) {
    const descendants = new Set()
    const pending = [Number(categoryId)]

    while (pending.length > 0) {
      const currentId = pending.pop()

      categories.forEach((category) => {
        if (
          category.parent_id != null &&
          Number(category.parent_id) === currentId &&
          !descendants.has(Number(category.id))
        ) {
          descendants.add(Number(category.id))
          pending.push(Number(category.id))
        }
      })
    }

    return descendants
  }

  function getCategoryLabel(category) {
    const names = [category.name]
    let parentId = category.parent_id
    const visited = new Set([Number(category.id)])

    while (parentId != null) {
      const numericParentId = Number(parentId)

      if (visited.has(numericParentId)) break

      visited.add(numericParentId)

      const parent = categories.find(
        (item) => Number(item.id) === numericParentId
      )

      if (!parent) break

      names.unshift(parent.name)
      parentId = parent.parent_id
    }

    return names.join(' / ')
  }

  function editCategory(category) {
    setTab('categories')
    setCategoryForm({
      id: category.id,
      name: category.name || '',
      description: category.description || '',
      parent_id:
        category.parent_id != null
          ? String(category.parent_id)
          : '',
    })

    setMessage('')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function saveCategory(event) {
    event.preventDefault()
    setMessage('')
    setError('')

    const parentId = categoryForm.parent_id
      ? Number(categoryForm.parent_id)
      : null

    const payload = {
      name: categoryForm.name.trim(),
      description: categoryForm.description.trim(),
      parent_id: parentId,
    }

    if (!payload.name) {
      setError('Escribe el nombre de la categoría.')
      return
    }

    if (
      parentId !== null &&
      !categories.some((category) => Number(category.id) === parentId)
    ) {
      setError('La categoría superior seleccionada no existe.')
      return
    }

    if (
      categoryForm.id !== null &&
      parentId !== null &&
      Number(categoryForm.id) === parentId
    ) {
      setError(
        'Una categoría no puede ser su propia categoría superior.'
      )
      return
    }

    if (categoryForm.id !== null && parentId !== null) {
      const descendants = getDescendantIds(categoryForm.id)

      if (descendants.has(parentId)) {
        setError(
          'No puedes asignar como categoría superior una de sus propias subcategorías.'
        )
        return
      }
    }

    setSavingCategory(true)

    try {
      let result

      if (categoryForm.id !== null) {
        result = await supabase
          .from('exercise_categories')
          .update(payload)
          .eq('id', categoryForm.id)
          .select()
      } else {
        result = await supabase
          .from('exercise_categories')
          .insert(payload)
          .select()
      }

      if (result.error) throw result.error

      if (!result.data || result.data.length === 0) {
        throw new Error(
          'No se ha guardado la categoría. Comprueba los permisos de Supabase.'
        )
      }

      setCategoryForm({ ...emptyCategory })
      showMessage('Categoría guardada correctamente.')
      await loadData()
    } catch (err) {
      showError(err)
    } finally {
      setSavingCategory(false)
    }
  }

  async function deleteCategory(id) {
    const category = categories.find(
      (item) => Number(item.id) === Number(id)
    )

    const descendants = getDescendantIds(id)
    const hasChildren = descendants.size > 0

    const warning = hasChildren
      ? ' Esta categoría tiene subcategorías y eliminarlas puede eliminar también sus descendientes.'
      : ''

    const confirmed = window.confirm(
      '¿Quieres eliminar la categoría "' +
        (category?.name || '') +
        '"?' +
        warning +
        ' Comprueba también si hay ejercicios asociados antes de continuar.'
    )

    if (!confirmed) return

    const { error } = await supabase
      .from('exercise_categories')
      .delete()
      .eq('id', id)

    if (error) {
      showError(error)
      return
    }

    if (Number(categoryForm.id) === Number(id)) {
      setCategoryForm({ ...emptyCategory })
    }

    showMessage('Categoría eliminada.')
    await loadData()
  }

  function editExercise(exercise) {
    setTab('exercises')
    setExerciseForm({
      id: exercise.id,
      category_id:
        exercise.category_id != null
          ? String(exercise.category_id)
          : '',
      name: exercise.name || '',
      description: exercise.description || '',
      video_url: exercise.video_url || '',
      image_url: exercise.image_url || '',
    })

    setMessage('')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function saveExercise(event) {
    event.preventDefault()
    setMessage('')
    setError('')
    setSavingExercise(true)

    const payload = {
      name: exerciseForm.name.trim(),
      category_id: exerciseForm.category_id
        ? Number(exerciseForm.category_id)
        : null,
      description: exerciseForm.description.trim(),
      video_url: exerciseForm.video_url.trim(),
      image_url: exerciseForm.image_url.trim(),
    }

    if (!payload.name) {
      setError('Escribe el nombre del ejercicio.')
      setSavingExercise(false)
      return
    }

    if (
      payload.category_id !== null &&
      !categories.some(
        (category) => Number(category.id) === payload.category_id
      )
    ) {
      setError('La categoría seleccionada no existe.')
      setSavingExercise(false)
      return
    }

    try {
      let result

      if (exerciseForm.id !== null) {
        result = await supabase
          .from('exercises')
          .update(payload)
          .eq('id', exerciseForm.id)
          .select()
      } else {
        result = await supabase
          .from('exercises')
          .insert(payload)
          .select()
      }

      if (result.error) throw result.error

      if (!result.data || result.data.length === 0) {
        throw new Error(
          'No se ha guardado el ejercicio. Comprueba los permisos de Supabase.'
        )
      }

      setExerciseForm({ ...emptyExercise })
      showMessage(
        exerciseForm.id !== null
          ? 'Cambios del ejercicio guardados correctamente.'
          : 'Ejercicio creado correctamente.'
      )

      await loadData()
    } catch (err) {
      showError(err)
    } finally {
      setSavingExercise(false)
    }
  }

  async function deleteExercise(id) {
    const confirmed = window.confirm(
      '¿Quieres eliminar este ejercicio?'
    )

    if (!confirmed) return

    const { error } = await supabase
      .from('exercises')
      .delete()
      .eq('id', id)

    if (error) {
      showError(error)
      return
    }

    if (Number(exerciseForm.id) === Number(id)) {
      setExerciseForm({ ...emptyExercise })
    }

    showMessage('Ejercicio eliminado.')
    await loadData()
  }

  async function loadRoutineItems(routineId) {
    setSelectedRoutine(String(routineId || ''))
    setRoutineItems([])

    if (!routineId) return

    const { data, error } = await supabase
      .from('routine_exercises')
      .select(
        'id, routine_id, exercise_id, sets, reps, notes, position, exercises(name)'
      )
      .eq('routine_id', routineId)
      .order('position')

    if (error) {
      showError(error)
      return
    }

    setRoutineItems(data || [])
  }

  async function createRoutine(event) {
    event.preventDefault()
    setMessage('')
    setError('')

    if (!routineForm.client_id || !routineForm.name.trim()) {
      setError('Selecciona un cliente y escribe el nombre de la rutina.')
      return
    }

    const { data, error } = await supabase
      .from('routines')
      .insert({
        client_id: routineForm.client_id,
        name: routineForm.name.trim(),
        description: routineForm.description.trim(),
      })
      .select()
      .single()

    if (error) {
      showError(error)
      return
    }

    setRoutineForm({
      client_id: '',
      name: '',
      description: '',
    })

    showMessage('Rutina creada correctamente.')
    await loadData()
    await loadRoutineItems(data.id)
  }

  async function addExerciseToRoutine(event) {
    event.preventDefault()
    setMessage('')
    setError('')

    if (!selectedRoutine || !routineExerciseForm.exercise_id) {
      setError('Selecciona una rutina y un ejercicio.')
      return
    }

    const payload = {
      routine_id: Number(selectedRoutine),
      exercise_id: Number(routineExerciseForm.exercise_id),
      sets: routineExerciseForm.sets
        ? Number(routineExerciseForm.sets)
        : null,
      reps: routineExerciseForm.reps
        ? Number(routineExerciseForm.reps)
        : null,
      notes: routineExerciseForm.notes.trim(),
      position: routineItems.length + 1,
    }

    const { error } = await supabase
      .from('routine_exercises')
      .insert(payload)

    if (error) {
      showError(error)
      return
    }

    setRoutineExerciseForm({
      exercise_id: '',
      sets: '3',
      reps: '10',
      notes: '',
    })

    showMessage('Ejercicio añadido a la rutina.')
    await loadRoutineItems(selectedRoutine)
  }

  async function removeRoutineExercise(id) {
    const confirmed = window.confirm(
      '¿Quieres quitar este ejercicio de la rutina?'
    )

    if (!confirmed) return

    const { error } = await supabase
      .from('routine_exercises')
      .delete()
      .eq('id', id)

    if (error) {
      showError(error)
      return
    }

    showMessage('Ejercicio eliminado de la rutina.')
    await loadRoutineItems(selectedRoutine)
  }

  async function deleteRoutine(id) {
    const confirmed = window.confirm(
      '¿Eliminar esta rutina y todos sus ejercicios asignados?'
    )

    if (!confirmed) return

    const { error: itemsError } = await supabase
      .from('routine_exercises')
      .delete()
      .eq('routine_id', id)

    if (itemsError) {
      showError(itemsError)
      return
    }

    const { error } = await supabase
      .from('routines')
      .delete()
      .eq('id', id)

    if (error) {
      showError(error)
      return
    }

    if (String(id) === selectedRoutine) {
      setSelectedRoutine('')
      setRoutineItems([])
    }

    showMessage('Rutina eliminada.')
    await loadData()
  }

  const tabs = [
    { id: 'categories', label: 'Categorías' },
    { id: 'exercises', label: 'Ejercicios' },
    { id: 'clients', label: 'Clientes' },
    { id: 'routines', label: 'Rutinas' },
  ]

  const selectableParentCategories = categories.filter((category) => {
    if (categoryForm.id === null) return true

    if (Number(category.id) === Number(categoryForm.id)) return false

    const descendants = getDescendantIds(categoryForm.id)

    return !descendants.has(Number(category.id))
  })

  return (
    <main
      style={{
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '28px 16px 60px',
        color: '#171717',
      }}
    >
      <p style={{ fontSize: '12px', letterSpacing: '2px' }}>
        ZONA ZERO · ADMINISTRACIÓN
      </p>

      <h1 style={{ marginBottom: '8px' }}>
        Panel de administración
      </h1>

      <p style={{ color: '#666', lineHeight: 1.5 }}>
        Gestiona tu biblioteca de ejercicios y las rutinas de tus clientes.
      </p>

      <div
        style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          margin: '24px 0',
        }}
      >
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setTab(item.id)
              setMessage('')
              setError('')
            }}
            style={{
              ...buttonStyle,
              background: tab === item.id ? '#171717' : '#fff',
              color: tab === item.id ? '#fff' : '#171717',
            }}
          >
            {item.label}
          </button>
        ))}

        <button
          type="button"
          style={{ ...buttonStyle, marginLeft: 'auto' }}
          onClick={loadData}
        >
          Actualizar
        </button>
      </div>

      {message && (
        <p
          role="status"
          style={{
            padding: '12px',
            background: '#f0fdf4',
            borderRadius: '8px',
          }}
        >
          {message}
        </p>
      )}

      {error && (
        <p
          role="alert"
          style={{
            padding: '12px',
            background: '#fef2f2',
            borderRadius: '8px',
          }}
        >
          {error}
        </p>
      )}

      {loading ? (
        <p>Cargando datos...</p>
      ) : (
        <>
          {tab === 'categories' && (
            <section style={{ display: 'grid', gap: '20px' }}>
              <form onSubmit={saveCategory} style={cardStyle}>
                <h2>
                  {categoryForm.id !== null
                    ? 'Editar categoría'
                    : 'Añadir nueva categoría'}
                </h2>

                <p style={{ color: '#666', lineHeight: 1.5 }}>
                  Crea categorías principales o selecciona una categoría
                  superior para crear una subcategoría.
                </p>

                <label style={{ display: 'block', marginTop: '14px' }}>
                  Nombre
                  <input
                    style={inputStyle}
                    value={categoryForm.name}
                    onChange={(e) =>
                      setCategoryForm({
                        ...categoryForm,
                        name: e.target.value,
                      })
                    }
                    required
                  />
                </label>

                <label style={{ display: 'block', marginTop: '14px' }}>
                  Descripción
                  <textarea
                    style={inputStyle}
                    rows={3}
                    value={categoryForm.description}
                    onChange={(e) =>
                      setCategoryForm({
                        ...categoryForm,
                        description: e.target.value,
                      })
                    }
                  />
                </label>

                <label style={{ display: 'block', marginTop: '14px' }}>
                  Categoría superior
                  <select
                    style={inputStyle}
                    value={categoryForm.parent_id}
                    onChange={(e) =>
                      setCategoryForm({
                        ...categoryForm,
                        parent_id: e.target.value,
                      })
                    }
                  >
                    <option value="">
                      Ninguna (categoría principal)
                    </option>

                    {selectableParentCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {getCategoryLabel(category)}
                      </option>
                    ))}
                  </select>
                </label>

                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap',
                    marginTop: '14px',
                  }}
                >
                  <button
                    style={buttonStyle}
                    type="submit"
                    disabled={savingCategory}
                  >
                    {savingCategory
                      ? 'Guardando...'
                      : categoryForm.id !== null
                        ? 'Guardar cambios'
                        : 'Crear categoría'}
                  </button>

                  <button
                    style={buttonStyle}
                    type="button"
                    onClick={() => {
                      setCategoryForm({ ...emptyCategory })
                      setMessage('')
                      setError('')
                    }}
                  >
                    {categoryForm.id !== null
                      ? 'Cancelar edición'
                      : 'Limpiar'}
                  </button>
                </div>
              </form>

              <div>
                <h2>
                  Categorías existentes ({categories.length})
                </h2>

                {categories.length === 0 ? (
                  <p>
                    Todavía no hay categorías. Utiliza el formulario anterior
                    para crear la primera categoría principal.
                  </p>
                ) : (
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {categories
                      .slice()
                      .sort((a, b) =>
                        getCategoryLabel(a).localeCompare(
                          getCategoryLabel(b),
                          'es'
                        )
                      )
                      .map((category) => (
                        <article key={category.id} style={cardStyle}>
                          <h3 style={{ marginTop: 0 }}>
                            {getCategoryLabel(category)}
                          </h3>

                          <p style={{ color: '#555' }}>
                            {category.description || 'Sin descripción'}
                          </p>

                          <p
                            style={{
                              color: '#666',
                              fontSize: '13px',
                              marginBottom: 0,
                            }}
                          >
                            Categoría superior:{' '}
                            {category.parent_id != null
                              ? categories.find(
                                  (item) =>
                                    Number(item.id) ===
                                    Number(category.parent_id)
                                )?.name || 'Categoría no encontrada'
                              : 'Ninguna (principal)'}
                          </p>

                          <div
                            style={{
                              display: 'flex',
                              gap: '8px',
                              flexWrap: 'wrap',
                              marginTop: '12px',
                            }}
                          >
                            <button
                              type="button"
                              style={{
                                ...buttonStyle,
                                background: '#171717',
                                color: '#fff',
                              }}
                              onClick={() => editCategory(category)}
                            >
                              Editar categoría
                            </button>

                            <button
                              type="button"
                              style={buttonStyle}
                              onClick={() => deleteCategory(category.id)}
                            >
                              Eliminar categoría
                            </button>
                          </div>
                        </article>
                      ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {tab === 'exercises' && (
            <section style={{ display: 'grid', gap: '20px' }}>
              <form onSubmit={saveExercise} style={cardStyle}>
                <h2>
                  {exerciseForm.id !== null
                    ? 'Editar ejercicio'
                    : 'Nuevo ejercicio'}
                </h2>

                <label style={{ display: 'block', marginTop: '14px' }}>
                  Nombre del ejercicio
                  <input
                    style={inputStyle}
                    value={exerciseForm.name}
                    onChange={(e) =>
                      setExerciseForm({
                        ...exerciseForm,
                        name: e.target.value,
                      })
                    }
                    required
                  />
                </label>

                <label style={{ display: 'block', marginTop: '14px' }}>
                  Categoría
                  <select
                    style={inputStyle}
                    value={exerciseForm.category_id}
                    onChange={(e) =>
                      setExerciseForm({
                        ...exerciseForm,
                        category_id: e.target.value,
                      })
                    }
                  >
                    <option value="">Sin categoría</option>

                    {categories
                      .slice()
                      .sort((a, b) =>
                        getCategoryLabel(a).localeCompare(
                          getCategoryLabel(b),
                          'es'
                        )
                      )
                      .map((category) => (
                        <option key={category.id} value={category.id}>
                          {getCategoryLabel(category)}
                        </option>
                      ))}
                  </select>
                </label>

                <label style={{ display: 'block', marginTop: '14px' }}>
                  Descripción e indicaciones
                  <textarea
                    style={inputStyle}
                    rows={4}
                    value={exerciseForm.description}
                    onChange={(e) =>
                      setExerciseForm({
                        ...exerciseForm,
                        description: e.target.value,
                      })
                    }
                  />
                </label>

                <label style={{ display: 'block', marginTop: '14px' }}>
                  Enlace de la imagen
                  <input
                    style={inputStyle}
                    type="url"
                    placeholder="https://..."
                    value={exerciseForm.image_url}
                    onChange={(e) =>
                      setExerciseForm({
                        ...exerciseForm,
                        image_url: e.target.value,
                      })
                    }
                  />
                </label>

                {exerciseForm.image_url && (
                  <div style={{ marginTop: '12px' }}>
                    <p>Vista previa de la imagen:</p>
                    <img
                      src={exerciseForm.image_url}
                      alt="Vista previa del ejercicio"
                      style={{
                        maxWidth: '100%',
                        width: '300px',
                        maxHeight: '220px',
                        objectFit: 'contain',
                        borderRadius: '8px',
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                      onLoad={(e) => {
                        e.currentTarget.style.display = 'block'
                      }}
                    />
                  </div>
                )}

                <label style={{ display: 'block', marginTop: '14px' }}>
                  Enlace del vídeo
                  <input
                    style={inputStyle}
                    type="url"
                    placeholder="https://..."
                    value={exerciseForm.video_url}
                    onChange={(e) =>
                      setExerciseForm({
                        ...exerciseForm,
                        video_url: e.target.value,
                      })
                    }
                  />
                </label>

                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    marginTop: '14px',
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    style={{
                      ...buttonStyle,
                      background: '#171717',
                      color: '#fff',
                    }}
                    type="submit"
                    disabled={savingExercise}
                  >
                    {savingExercise
                      ? 'Guardando...'
                      : exerciseForm.id !== null
                        ? 'Guardar cambios'
                        : 'Crear ejercicio'}
                  </button>

                  <button
                    style={buttonStyle}
                    type="button"
                    onClick={() => {
                      setExerciseForm({ ...emptyExercise })
                      setMessage('')
                      setError('')
                    }}
                  >
                    {exerciseForm.id !== null
                      ? 'Cancelar edición'
                      : 'Limpiar'}
                  </button>
                </div>
              </form>

              <div>
                <h2>Ejercicios existentes ({exercises.length})</h2>

                {exercises.map((exercise) => {
                  const category = categories.find(
                    (item) =>
                      Number(item.id) === Number(exercise.category_id)
                  )

                  return (
                    <article
                      key={exercise.id}
                      style={{ ...cardStyle, marginBottom: '12px' }}
                    >
                      <h3 style={{ marginTop: 0 }}>{exercise.name}</h3>

                      <p style={{ color: '#666' }}>
                        {category
                          ? getCategoryLabel(category)
                          : 'Sin categoría'}
                      </p>

                      {exercise.image_url && (
                        <img
                          src={exercise.image_url}
                          alt={exercise.name}
                          loading="lazy"
                          style={{
                            width: '100%',
                            maxWidth: '400px',
                            maxHeight: '260px',
                            objectFit: 'contain',
                            display: 'block',
                            marginBottom: '12px',
                            borderRadius: '8px',
                          }}
                        />
                      )}

                      {exercise.description && (
                        <p>{exercise.description}</p>
                      )}

                      {exercise.video_url && (
                        <p>
                          <a
                            href={exercise.video_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Abrir vídeo
                          </a>
                        </p>
                      )}

                      <div
                        style={{
                          display: 'flex',
                          gap: '8px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <button
                          type="button"
                          style={{
                            ...buttonStyle,
                            background: '#171717',
                            color: '#fff',
                          }}
                          onClick={() => editExercise(exercise)}
                        >
                          Editar ejercicio
                        </button>

                        <button
                          type="button"
                          style={buttonStyle}
                          onClick={() => deleteExercise(exercise.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </article>
                  )
                })}

                {exercises.length === 0 && (
                  <p>Aún no hay ejercicios en Supabase.</p>
                )}
              </div>
            </section>
          )}

          {tab === 'clients' && (
            <section style={{ display: 'grid', gap: '12px' }}>
              <h2>Clientes registrados</h2>

              <p>
                Aquí aparecen las cuentas registradas como clientes.
                Las contraseñas no son visibles ni accesibles desde este panel.
              </p>

              {clients.map((client) => (
                <article key={client.id} style={cardStyle}>
                  <h3>{client.full_name || 'Cliente sin nombre'}</h3>

                  <p style={{ fontSize: '12px', color: '#666' }}>
                    ID de usuario: {client.id}
                  </p>
                </article>
              ))}

              {clients.length === 0 && (
                <p>Aún no aparecen clientes registrados.</p>
              )}
            </section>
          )}

          {tab === 'routines' && (
            <section style={{ display: 'grid', gap: '20px' }}>
              <form onSubmit={createRoutine} style={cardStyle}>
                <h2>Crear rutina para un cliente</h2>

                <label style={{ display: 'block', marginTop: '14px' }}>
                  Cliente
                  <select
                    style={inputStyle}
                    value={routineForm.client_id}
                    onChange={(e) =>
                      setRoutineForm({
                        ...routineForm,
                        client_id: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Selecciona un cliente</option>

                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.full_name || client.id}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ display: 'block', marginTop: '14px' }}>
                  Nombre de la rutina
                  <input
                    style={inputStyle}
                    value={routineForm.name}
                    onChange={(e) =>
                      setRoutineForm({
                        ...routineForm,
                        name: e.target.value,
                      })
                    }
                    placeholder="Ej. Día 1 - Fuerza general"
                    required
                  />
                </label>

                <label style={{ display: 'block', marginTop: '14px' }}>
                  Descripción
                  <textarea
                    style={inputStyle}
                    rows={3}
                    value={routineForm.description}
                    onChange={(e) =>
                      setRoutineForm({
                        ...routineForm,
                        description: e.target.value,
                      })
                    }
                  />
                </label>

                <button
                  style={{ ...buttonStyle, marginTop: '14px' }}
                  type="submit"
                >
                  Crear rutina
                </button>
              </form>

              <div style={cardStyle}>
                <h2>Añadir ejercicios a una rutina</h2>

                <label style={{ display: 'block', marginTop: '14px' }}>
                  Rutina
                  <select
                    style={inputStyle}
                    value={selectedRoutine}
                    onChange={(e) => loadRoutineItems(e.target.value)}
                  >
                    <option value="">Selecciona una rutina</option>

                    {routines.map((routine) => (
                      <option key={routine.id} value={routine.id}>
                        {routine.name}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedRoutine && (
                  <>
                    <form onSubmit={addExerciseToRoutine}>
                      <label style={{ display: 'block', marginTop: '14px' }}>
                        Ejercicio
                        <select
                          style={inputStyle}
                          value={routineExerciseForm.exercise_id}
                          onChange={(e) =>
                            setRoutineExerciseForm({
                              ...routineExerciseForm,
                              exercise_id: e.target.value,
                            })
                          }
                          required
                        >
                          <option value="">
                            Selecciona un ejercicio
                          </option>

                          {exercises.map((exercise) => (
                            <option key={exercise.id} value={exercise.id}>
                              {exercise.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns:
                            'repeat(auto-fit, minmax(120px, 1fr))',
                          gap: '12px',
                          marginTop: '14px',
                        }}
                      >
                        <label>
                          Series
                          <input
                            style={inputStyle}
                            type="number"
                            min="1"
                            value={routineExerciseForm.sets}
                            onChange={(e) =>
                              setRoutineExerciseForm({
                                ...routineExerciseForm,
                                sets: e.target.value,
                              })
                            }
                          />
                        </label>

                        <label>
                          Repeticiones
                          <input
                            style={inputStyle}
                            value={routineExerciseForm.reps}
                            onChange={(e) =>
                              setRoutineExerciseForm({
                                ...routineExerciseForm,
                                reps: e.target.value,
                              })
                            }
                          />
                        </label>
                      </div>

                      <label style={{ display: 'block', marginTop: '14px' }}>
                        Indicaciones
                        <textarea
                          style={inputStyle}
                          rows={2}
                          value={routineExerciseForm.notes}
                          onChange={(e) =>
                            setRoutineExerciseForm({
                              ...routineExerciseForm,
                              notes: e.target.value,
                            })
                          }
                        />
                      </label>

                      <button
                        style={{ ...buttonStyle, marginTop: '14px' }}
                        type="submit"
                      >
                        Añadir ejercicio
                      </button>
                    </form>

                    <h3 style={{ marginTop: '24px' }}>
                      Ejercicios asignados
                    </h3>

                    {routineItems.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          borderTop: '1px solid #e5e5e5',
                          padding: '12px 0',
                        }}
                      >
                        <strong>
                          {item.exercises?.name || 'Ejercicio'}
                        </strong>

                        <p>
                          {item.sets != null &&
                            String(item.sets) + ' series'}
                          {item.sets != null &&
                            item.reps != null &&
                            ' · '}
                          {item.reps != null &&
                            String(item.reps) + ' repeticiones'}
                        </p>

                        {item.notes && <p>{item.notes}</p>}

                        <button
                          type="button"
                          style={buttonStyle}
                          onClick={() => removeRoutineExercise(item.id)}
                        >
                          Quitar de la rutina
                        </button>
                      </div>
                    ))}

                    {routineItems.length === 0 && (
                      <p>
                        Esta rutina todavía no tiene ejercicios asignados.
                      </p>
                    )}
                  </>
                )}
              </div>

              <div>
                <h2>Rutinas existentes</h2>

                {routines.map((routine) => {
                  const client = clients.find(
                    (item) => item.id === routine.client_id
                  )

                  return (
                    <article
                      key={routine.id}
                      style={{
                        ...cardStyle,
                        marginTop: '12px',
                      }}
                    >
                      <h3>{routine.name}</h3>

                      <p>
                        Cliente:{' '}
                        {client?.full_name || 'Cuenta de cliente'}
                      </p>

                      {routine.description && (
                        <p>{routine.description}</p>
                      )}

                      <div
                        style={{
                          display: 'flex',
                          gap: '8px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <button
                          type="button"
                          style={buttonStyle}
                          onClick={() => loadRoutineItems(routine.id)}
                        >
                          Gestionar ejercicios
                        </button>

                        <button
                          type="button"
                          style={buttonStyle}
                          onClick={() => deleteRoutine(routine.id)}
                        >
                          Eliminar rutina
                        </button>
                      </div>
                    </article>
                  )
                })}

                {routines.length === 0 && (
                  <p>Aún no hay rutinas creadas.</p>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  )
}

export default Admin
