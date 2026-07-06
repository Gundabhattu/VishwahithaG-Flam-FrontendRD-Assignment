const getFallbackApiUrl = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:4000'
  }

  const { hostname } = window.location
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:4000'
  }

  return `${window.location.protocol}//${hostname}:4000`
}

const baseUrl = import.meta.env.VITE_API_URL ?? getFallbackApiUrl()

export const createRoomRequest = async (roomId: string) => {
  const response = await fetch(`${baseUrl}/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ roomId }),
  })

  if (!response.ok) {
    throw new Error('Unable to create room')
  }

  return response.json()
}
