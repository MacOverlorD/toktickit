import { useCallback, useEffect, useState } from 'react'
import { getCategories, type Category } from '../api/categories'

type CategoryState = 'loading' | 'success' | 'error'

function CategoryList() {
  const [categoryState, setCategoryState] = useState<CategoryState>('loading')
  const [categories, setCategories] = useState<Category[]>([])

  const loadCategories = useCallback(async () => {
    setCategoryState('loading')

    try {
      const data = await getCategories()
      setCategories(data)
      setCategoryState('success')
    } catch {
      setCategories([])
      setCategoryState('error')
    }
  }, [])

  useEffect(() => {
    void loadCategories()
  }, [loadCategories])

  return (
    <section className="category-section" aria-labelledby="category-list-title">
      <div className="category-heading">
        <div>
          <h2 id="category-list-title" className="h4 mb-1">
            Supported request categories
          </h2>
          <p className="text-secondary mb-0">
            Services currently available through the IT desk.
          </p>
        </div>

        {categoryState === 'success' && categories.length > 0 && (
          <span className="category-count">{categories.length} categories</span>
        )}
      </div>

      {categoryState === 'loading' && (
        <div className="category-state category-loading" role="status">
          <span className="spinner-border spinner-border-sm" aria-hidden="true" />
          <span>Loading request categories...</span>
        </div>
      )}

      {categoryState === 'error' && (
        <div className="category-state category-error" role="alert">
          <div>
            <p className="fw-semibold mb-1">Categories are unavailable</p>
            <p className="mb-0">Unable to load request categories from the API.</p>
          </div>
          <button
            className="btn btn-outline-danger retry-button"
            type="button"
            onClick={() => void loadCategories()}
          >
            Retry
          </button>
        </div>
      )}

      {categoryState === 'success' && categories.length === 0 && (
        <p className="category-empty mb-0">No request categories are available.</p>
      )}

      {categoryState === 'success' && categories.length > 0 && (
        <ul className="category-list" aria-label="IT request categories">
          {categories.map((category) => (
            <li className="category-item" key={category.id}>
              <span className="category-id" aria-label={`Category ID ${category.id}`}>
                {String(category.id).padStart(2, '0')}
              </span>
              <span className="category-name">{category.name}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default CategoryList
