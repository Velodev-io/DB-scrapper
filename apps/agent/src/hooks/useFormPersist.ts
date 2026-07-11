import { useState } from 'react'

export function useFormPersist<T>(key: string, initial: T) {
  const [form, setForm] = useState<T>(() => {
    const saved = localStorage.getItem(key)
    return saved ? { ...initial, ...JSON.parse(saved) } : initial
  })

  const update = (patch: Partial<T>) => {
    const next = { ...form, ...patch }
    setForm(next)
    localStorage.setItem(key, JSON.stringify(next))
  }

  const clear = () => {
    setForm(initial)
    localStorage.removeItem(key)
  }

  return { form, update, clear }
}
