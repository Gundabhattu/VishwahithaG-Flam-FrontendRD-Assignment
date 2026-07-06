import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

export const RoomRedirectPage = () => {
  const { roomId } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    if (roomId) {
      navigate(`/canvas/${roomId}`, { replace: true })
    } else {
      navigate('/', { replace: true })
    }
  }, [navigate, roomId])

  return null
}

export default RoomRedirectPage
