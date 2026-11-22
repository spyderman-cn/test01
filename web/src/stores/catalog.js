import { defineStore } from 'pinia'
import { getCategories, getCampuses } from '@/api/product'

export const useCatalogStore = defineStore('catalog', {
  state: () => ({
    categories: [],
    campuses: [],
    loaded: false,
    loading: false,
  }),
  getters: {
    /** 扁平化后的子分类，便于按 id 反查名称 */
    flatCategories: (state) =>
      state.categories.flatMap((top) => [
        { id: top.id, name: top.name, parentId: null },
        ...top.children.map((child) => ({ id: child.id, name: child.name, parentId: top.id })),
      ]),
  },
  actions: {
    async load(force = false) {
      if (this.loaded && !force) return
      if (this.loading) return
      this.loading = true
      try {
        const [categories, campuses] = await Promise.all([getCategories(), getCampuses()])
        this.categories = categories
        this.campuses = campuses
        this.loaded = true
      } finally {
        this.loading = false
      }
    },
    campusName(id) {
      return this.campuses.find((c) => c.id === id)?.name || '不限校区'
    },
    categoryName(id) {
      return this.flatCategories.find((c) => c.id === id)?.name || '其他'
    },
  },
})
