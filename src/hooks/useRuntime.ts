import { RuntimeContext } from '@providers'
import { useContext } from 'react'

export const useRuntime = () => {
  const context = useContext(RuntimeContext)
  if (!context) {
    throw new Error('useRuntime must be used inside <RuntimeProvider>')
  }
  return context
}
