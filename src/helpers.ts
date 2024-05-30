import type { DMMF as PrismaDMMF } from '@prisma/generator-helper';
import path from 'path';
import { promises as fs } from 'fs';
import {
  DecoratorStructure,
  ExportDeclarationStructure,
  ImportDeclarationStructure,
  OptionalKind,
  Project,
  SourceFile,
} from 'ts-morph';

function generateUniqueImports(sourceFile: SourceFile, imports: string[], moduleSpecifier: string) {
  let existingImport = sourceFile.getImportDeclaration(moduleSpecifier);

  if (!existingImport) {
    existingImport = sourceFile.addImportDeclaration({
      moduleSpecifier,
      namedImports: [],
    });
  }

  const namedImports = new Set(existingImport.getNamedImports().map(namedImport => namedImport.getName()));
  imports.forEach(importName => namedImports.add(importName));
  existingImport.removeNamedImports();
  existingImport.addNamedImports(Array.from(namedImports).map(name => ({ name })));
}

export const generateModelsIndexFile = (
  prismaClientDmmf: PrismaDMMF.Document,
  project: Project,
  outputDir: string,
) => {
  const modelsBarrelExportSourceFile = project.createSourceFile(
    path.resolve(outputDir, 'models', 'index.ts'),
    undefined,
    { overwrite: true },
  );

  modelsBarrelExportSourceFile.addExportDeclarations(
    prismaClientDmmf.datamodel.models
      .map((model) => model.name)
      .sort()
      .map<OptionalKind<ExportDeclarationStructure>>((modelName) => ({
        moduleSpecifier: `./${modelName}DTO.model`,
        namedExports: [`${modelName}DTO`],
      })),
  );
};

export const shouldImportPrisma = (fields: PrismaDMMF.Field[]) => {
  return fields.some((field) => ['Decimal', 'Json'].includes(field.type));
};

export const shouldImportHelpers = (fields: PrismaDMMF.Field[]) => {
  return fields.some((field) => ['enum'].includes(field.kind));
};

export const getTSDataTypeFromFieldType = (field: PrismaDMMF.Field) => {
  let type = field.type;
  switch (field.type) {
    case 'Int':
    case 'Float':
      type = 'number';
      break;
    case 'DateTime':
      type = 'Date';
      break;
    case 'String':
      type = 'string';
      break;
    case 'Boolean':
      type = 'boolean';
      break;
    case 'Decimal':
      type = 'Prisma.Decimal';
      break;
    case 'Json':
      type = 'Prisma.JsonValue';
      break;
    case 'Bytes':
      type = 'Buffer';
      break;
  }

  if (field.isList) {
    type = `${type}DTO[]`;
  } else if (field.kind === 'object') {
    type = `${type}DTO`;
  }
  return type;
};

export const getDecoratorsByFieldType = (field: PrismaDMMF.Field) => {
  const decorators: OptionalKind<DecoratorStructure>[] = [];
  switch (field.type) {
    case 'Int':
      decorators.push({
        name: 'IsInt',
        arguments: [],
      });
      break;
    case 'DateTime':
      decorators.push({
        name: 'IsDate',
        arguments: [],
      });
      break;
    case 'String':
      decorators.push({
        name: 'IsString',
        arguments: [],
      });
      break;
    case 'Boolean':
      decorators.push({
        name: 'IsBoolean',
        arguments: [],
      });
      break;
  }
  if (field.isRequired) {
    decorators.unshift({
      name: 'IsDefined',
      arguments: [],
    });
  } else {
    decorators.unshift({
      name: 'IsOptional',
      arguments: [],
    });
  }
  if (field.kind === 'enum') {
    decorators.push({
      name: 'IsIn',
      arguments: [`getEnumValues(${String(field.type)})`],
    });
  }
  let typeDecorator: OptionalKind<DecoratorStructure> | null = null;
  decorators.push({ name: 'Expose', arguments: [] });
  switch (field.type) {
    case 'Int':
    case 'Float':
      decorators.push({ name: 'Type', arguments: ['() => Number'] });
      break;
    case 'DateTime':
      decorators.push({ name: 'Type', arguments: ['() => Date'] });
      break;
    case 'String':
      decorators.push({ name: 'Type', arguments: ['() => String'] });
      break;
    case 'Boolean':
      decorators.push({ name: 'Type', arguments: ['() => Boolean'] });
      break;
  }
  if (typeDecorator) {
    if (field.isList) {
      typeDecorator.arguments = [`() => [${(typeDecorator.arguments as string[])[0]}]`];
    }
    decorators.push(typeDecorator);
  }
  return decorators;
};

export const getDecoratorsImportsByType = (field: PrismaDMMF.Field) => {
  const validatorImports = new Set();
  switch (field.type) {
    case 'Int':
      validatorImports.add('IsInt');
      break;
    case 'DateTime':
      validatorImports.add('IsDate');
      break;
    case 'String':
      validatorImports.add('IsString');
      break;
    case 'Boolean':
      validatorImports.add('IsBoolean');
      break;
  }
  if (field.isRequired) {
    validatorImports.add('IsDefined');
  } else {
    validatorImports.add('IsOptional');
  }
  if (field.kind === 'enum') {
    validatorImports.add('IsIn');
  }
  return [...validatorImports];
};

export const generateClassValidatorImport = (
  sourceFile: SourceFile,
  validatorImports: Array<string>,
) => {
  generateUniqueImports(sourceFile, validatorImports, 'class-validator');
};

export const generatePrismaImport = (sourceFile: SourceFile) => {
  sourceFile.addImportDeclaration({
    moduleSpecifier: '@prisma/client',
    namedImports: ['Prisma'],
  });
};

export const generateRelationImportsImport = (
  sourceFile: SourceFile,
  relationImports: Array<string>,
) => {
  generateUniqueImports(sourceFile, relationImports.map(name => `${name}DTO`), './');
};

export const generateHelpersImports = (
  sourceFile: SourceFile,
  helpersImports: Array<string>,
) => {
  sourceFile.addImportDeclaration({
    moduleSpecifier: '../helpers',
    namedImports: helpersImports,
  });
};

export const generateEnumImports = (
  sourceFile: SourceFile,
  fields: PrismaDMMF.Field[],
) => {
  const enumsToImport = fields
    .filter((field) => field.kind === 'enum')
    .map((field) => field.type);

  if (enumsToImport.length > 0) {
    generateUniqueImports(sourceFile, enumsToImport, '../enums');
  }
};

export function generateEnumsIndexFile(
  sourceFile: SourceFile,
  enumNames: string[],
) {
  sourceFile.addExportDeclarations(
    enumNames.sort().map<OptionalKind<ExportDeclarationStructure>>((name) => ({
      moduleSpecifier: `./${name}.enum`,
      namedExports: [name],
    })),
  );
}

export const generateClassTransformerImport = (
  sourceFile: SourceFile,
  transformerImports: Array<string>,
) => {
  generateUniqueImports(sourceFile, transformerImports, 'class-transformer');
};


export async function generateDecoratorsFile(outputDir: string) {
  const content = `
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
      $ref: \`#/components/schemas/\${reference.name}\`,
    }) as PropertyDecorator;
  }
  
  export function FixArrayJsonSchemaReference(reference: any): PropertyDecorator {
    return JSONSchema({
      type: "array",
      items: {
        $ref: \`#/components/schemas/\${reference.name}\`,
      },
    }) as PropertyDecorator;
  }
  
  export function Entity(typeFunction: () => Function, isArray: boolean = false): PropertyDecorator {
    return function (target: Object, propertyKey: string | symbol) {
      ValidateNested({ each: isArray })(target, propertyKey);
      Type(typeFunction)(target, propertyKey);
      if (isArray) {
        const type = typeFunction();      
        if (type) {
          FixArrayJsonSchemaReference(type)(target, propertyKey);
        }
      } else {
        const type = typeFunction();
        if (type) {
          FixItemJsonSchemaReference(type)(target, propertyKey);
        }
      }
    };
  }
    `;

  const filePath = path.join(outputDir, 'decorators.ts');
  await fs.writeFile(filePath, content);
}