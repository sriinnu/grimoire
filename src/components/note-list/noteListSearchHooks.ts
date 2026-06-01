import { useCallback, useState } from 'react'

export function useNoteListSearch() {
  const [search, setSearch] = useState('')
  const [searchVisible, setSearchVisible] = useState(false)
  const query = search.trim().toLowerCase()

  const toggleSearch = useCallback(() => {
    setSearchVisible((visible) => {
      if (visible) setSearch('')
      return !visible
    })
  }, [])

  return { search, setSearch, query, searchVisible, toggleSearch }
}
