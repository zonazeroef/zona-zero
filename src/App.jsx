import { useState } from 'react'
import './App.css'
import { categories as exerciseCategories } from './exercises'

function App() {
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedSubcategory, setSelectedSubcategory] = useState(null)

  const categories = exerciseCategories

  const currentCategory = categories.find(
    (category) => category.name === selectedCategory
  )

  const currentSubcategory = currentCategory?.subcategories?.find(
    (subcategory) => subcategory.name === selectedSubcategory
  )

  const exercises =
    currentSubcategory?.exercises || currentCategory?.exercises || []

  function goBack() {
    if (selectedSubcategory) {
      setSelectedSubcategory(null)
    } else {
      setSelectedCategory(null)
    }
  }

  return (
    <div className="app">
      <header className="header">
        {(selectedCategory || selectedSubcategory) && (
          <button className="back-button" onClick={goBack}>
            ← Volver
          </button>
        )}

        <div className="brand">
          <div className="brand-main">
            <span>ZONA</span>
            <strong>ZERO</strong>
          </div>

          <div className="brand-subtitle">
            <span>Entrenamiento</span>
            <span className="brand-functional">
              <b>F</b>unciona<b>L</b>
            </span>
          </div>
        </div>

        {!selectedCategory && (
          <p className="subtitle">ENTRENAMIENTO FUNCIONAL</p>
        )}
      </header>

      {!selectedCategory && (
        <main className="home">
          <section className="hero">
            <p className="eyebrow">ZONA ZERO · ENTRENAMIENTO FUNCIONAL</p>

            <h1>
              Entrena.
              <br />
              <span>Muévete mejor.</span>
            </h1>

            <p className="hero-text">
              Tu biblioteca de ejercicios para mejorar fuerza, movilidad,
              rendimiento y salud.
            </p>

            <div className="brand-mark">
              <span>ZZ</span>
            </div>
          </section>

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

            <div className="category-grid">
              {categories.map((category, index) => (
                <button
                  className="category-card"
                  key={category.name}
                  onClick={() => setSelectedCategory(category.name)}
                >
                  <span className="number">
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <span className="category-name">{category.name}</span>

                  <span className="arrow">↗</span>
                </button>
              ))}
            </div>
          </section>
        </main>
      )}

      {selectedCategory && !selectedSubcategory && (
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
                {currentCategory.subcategories.map((subcategory, index) => (
                  <button
                    className="category-card"
                    key={subcategory.name}
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

                    <span className="arrow">↗</span>
                  </button>
                ))}
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
                  <div className="category-card" key={exercise.name}>
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
      )}

      {selectedSubcategory && (
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

            <div className="category-grid">
              {exercises.map((exercise, index) => (
                <div className="category-card" key={exercise.name}>
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
        </main>
      )}
    </div>
  )
}

export default App