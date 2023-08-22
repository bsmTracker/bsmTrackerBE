import {
  ValidationArguments,
  ValidationOptions,
  registerDecorator,
} from 'class-validator';

export function ValidateDaysOfWeek(validationOptions: ValidationOptions = {}) {
  return function (object: Record<string, any>, propertyName: string): void {
    registerDecorator({
      name: 'validateDaysOfWeek',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments): boolean {
          const { object }: { object: any } = args;
          return value?.every(
            (dayOfWeek: number) => dayOfWeek >= 0 && dayOfWeek <= 7,
          );
        },
        defaultMessage(args: ValidationArguments): string {
          return (
            validationOptions?.message?.toString() ?? '올바르게 보내주세요'
          );
        },
      },
    });
  };
}
