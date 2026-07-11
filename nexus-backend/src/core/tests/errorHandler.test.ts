import { Request, Response } from 'express';
import { errorHandler } from '../middleware/errorHandler';
import { ValidationError, NotFoundError } from '../errors/AppError';

function mockRes() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe('errorHandler', () => {
  it('formats a ValidationError with 400 and message', () => {
    const res = mockRes();
    errorHandler(new ValidationError('Bad input'), {} as Request, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: expect.objectContaining({ message: 'Bad input' }) })
    );
  });

  it('formats a NotFoundError with 404', () => {
    const res = mockRes();
    errorHandler(new NotFoundError('Missing'), {} as Request, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('formats an unknown thrown value as a 500 without leaking internals', () => {
    const res = mockRes();
    errorHandler(new Error('raw db error'), {} as Request, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: { message: 'Internal server error' } })
    );
  });
});
