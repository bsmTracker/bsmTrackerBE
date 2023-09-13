import {
  ValidationArguments,
  ValidationOptions,
  registerDecorator,
} from 'class-validator';
import { DateEntity } from 'src/play-schedule/entity/date.entity';
export function ValidateDateStrList(validationOptions: ValidationOptions = {}) {
  const dateRegex = /^\d{4}\d{2}\d{2}$/;
  return function (object: Record<string, any>, propertyName: string): void {
    registerDecorator({
      name: 'validateDayteStrList',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments): boolean {
          const { object }: { object: any } = args;
          const status = value?.every((d: DateEntity) => {
            console.log(dateRegex.test(d.date)); //false
            return !dateRegex.test(d.date);
          });
          return status;
        },
        defaultMessage(args: ValidationArguments): string {
          console.log('aab');
          return (
            validationOptions?.message?.toString() ?? '올바르게 보내주세요'
          );
        },
      },
    });
  };
}
