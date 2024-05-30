import {
    ValidateNested,
    ValidationOptions,
    registerDecorator,
    ValidationArguments,
} from "class-validator";
import { Type } from "class-transformer";
import { JSONSchema } from "class-validator-jsonschema";


export function FixItemJsonSchemaReference(reference: any): PropertyDecorator {
    return JSONSchema({
        $ref: `#/components/schemas/${reference.name}`,
    });
}

export function DTO(typeFunction: () => Function): PropertyDecorator {
    return function (target: Object, propertyKey: string | symbol) {
        ValidateNested()(target, propertyKey);
        Type(typeFunction)(target, propertyKey);
        FixItemJsonSchemaReference(typeFunction())(target, propertyKey);
    };
}
