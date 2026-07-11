import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { ForbiddenError, UnauthorizedError } from '../errors/AppError';

// Permission-key based authorization (not role === 'admin' checks scattered
// through the app). Adding a future role only ever means inserting rows
// into roles + role_permissions - this middleware, and every route that
// uses it, never changes.
//
// Checks the relational path: User.roleId -> Role -> RolePermission -> Permission.
// There is no direct User<->Permission or User<->RolePermission link -
// permissions are always resolved through the User's assigned Role.
export function authorize(permissionKey: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    // Clients are never permission-checked against role_permissions in V1 -
    // client-facing routes should scope data by req.user.id directly in
    // their own service layer instead of using this middleware.
    if (req.user.type !== 'ADMIN' || !req.user.roleId) {
      return next(new ForbiddenError());
    }

    const grant = await prisma.rolePermission.findFirst({
      where: {
        roleId: req.user.roleId,
        permission: { key: permissionKey },
      },
    });

    if (!grant) {
      return next(new ForbiddenError(`Missing permission: ${permissionKey}`));
    }

    return next();
  };
}
