import {
  ValidationArguments,
  ValidationOptions,
  registerDecorator,
} from 'class-validator';

export function IsTime(validationOptions: ValidationOptions = {}) {
  return function (object: Record<string, any>, propertyName: string): void {
    registerDecorator({
      name: 'isTime',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments): boolean {
          const { object }: { object: any } = args;
          if (
            typeof value.hour !== 'number' ||
            typeof value.minute !== 'number' ||
            typeof value.second !== 'number'
          ) {
            validationOptions.message = 'time type all args must be number';
            return false;
          }
          if (value.hour < 0 || value.hour > 24) {
            validationOptions.message = 'hour has to be in range (0 ~ 24)';

            return false;
          }
          if (value.minute < 0 || value.minute > 59) {
            validationOptions.message = 'minute has to be in range (0 ~ 59)';
            return false;
          }
          if (value.second < 0 || value.second > 59) {
            validationOptions.message = 'second has to be in range (0 ~ 59)';
            return false;
          }
          return true;
        },
        defaultMessage(args: ValidationArguments): string {
          return validationOptions?.message.toString() ?? '올바르게 보내주세요';
        },
      },
    });
  };
}
