export const createRoomId = () =>
  `room-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
