import {
  ValidationArguments,
  ValidationOptions,
  registerDecorator,
} from 'class-validator';
import { DayOfWeek } from 'src/play-schedule/entity/dayOfWeek.entity';

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
            (dayOfWeek: DayOfWeek) => dayOfWeek.day >= 0 && dayOfWeek.day <= 6,
          );
        },
        defaultMessage(args: ValidationArguments): string {
          console.log('aa');
          return (
            validationOptions?.message?.toString() ?? '올바르게 보내주세요'
          );
        },
      },
    });
  };
}
