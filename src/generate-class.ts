import type { DMMF as PrismaDMMF } from '@prisma/generator-helper';
import path from 'path';
import { OptionalKind, Project, PropertyDeclarationStructure, VariableDeclarationKind } from 'ts-morph';
import {
  generateClassValidatorImport,
  generateEnumImports,
  generateHelpersImports,
  generatePrismaImport,
  generateClassTransformerImport,
  generateRelationImportsImport,
  getDecoratorsByFieldType,
  getDecoratorsImportsByType,
  getTSDataTypeFromFieldType,
  shouldImportHelpers,
  shouldImportPrisma,
} from './helpers';
import { MetadataStorage, getFromContainer } from 'class-validator';
import { validationMetadatasToSchemas } from 'class-validator-jsonschema';

export default async function generateClass(
  project: Project,
  outputDir: string,
  model: PrismaDMMF.Model,
) {
  const dirPath = path.resolve(outputDir, 'models');
  const filePath = path.resolve(dirPath, `${model.name}DTO.model.ts`);
  const sourceFile = project.createSourceFile(filePath, undefined, {
    overwrite: true,
  });

  const validatorImports = [
    ...new Set(
      model.fields
        .map((field) => getDecoratorsImportsByType(field))
        .flatMap((item) => item),
    ),
  ];
  const transformerImports = ['Expose', 'Type'];
  if (shouldImportPrisma(model.fields as PrismaDMMF.Field[])) {
    generatePrismaImport(sourceFile);
  }

  generateClassValidatorImport(sourceFile, validatorImports as Array<string>);
  generateClassTransformerImport(sourceFile, transformerImports);
  const relationImports = new Set();
  model.fields.forEach((field) => {
    if (field.relationName && model.name !== field.type) {
      relationImports.add(field.type);
    }
  });

  generateRelationImportsImport(sourceFile, [
    ...relationImports,
  ] as Array<string>);

  if (shouldImportHelpers(model.fields as PrismaDMMF.Field[])) {
    generateHelpersImports(sourceFile, ['getEnumValues']);
  }

  generateEnumImports(sourceFile, model.fields as PrismaDMMF.Field[]);

  sourceFile.addImportDeclaration({
    moduleSpecifier: '../decorators',
    namedImports: ['Entity'],
  });

  const classDeclaration = sourceFile.addClass({
    name: `${model.name}DTO`,
    isExported: true,
    properties: [
      ...model.fields.map<OptionalKind<PropertyDeclarationStructure>>(
        (field) => {
          const decorators = getDecoratorsByFieldType(field);

          if (field.relationName && model.name !== field.type) {
            const isArray = field.isList;
            decorators.push({
              name: 'Entity',
              arguments: [`() => ${field.type}DTO`, isArray.toString()],
            });
          }

          return {
            name: field.name,
            type: getTSDataTypeFromFieldType(field),
            hasExclamationToken: field.isRequired,
            hasQuestionToken: !field.isRequired,
            trailingTrivia: '\r\n',
            decorators: decorators,
          };
        },
      ),
    ],
  });

  classDeclaration.addProperty({
    name: 'className',
    type: 'string',
    isStatic: true,
    initializer: `'${model.name}DTO'`,
  });


}
