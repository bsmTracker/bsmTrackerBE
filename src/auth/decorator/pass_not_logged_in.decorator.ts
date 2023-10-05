import { SetMetadata } from '@nestjs/common';

export const PassNotLoggedIn = (pass_not_logged_in: boolean = true): any => {
  return SetMetadata('pass_not_logged_in', pass_not_logged_in);
};
