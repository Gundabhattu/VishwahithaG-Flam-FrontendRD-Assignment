import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express'

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
) => {
  response.status(500).json({ message: 'Unexpected server error' })
  console.error(error)
  _next()
}
