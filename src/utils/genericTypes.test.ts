import { GenericTypeDefinition } from "@/types";
import {
    parseGenericTypeDefinition,
    genericTypeDefinitionToString,
    hasUnresolvedGenericType,
    genericTypesEqual,
    resolveGenericType
} from './genericTypes';

describe('泛型类型解析和处理测试', () => {
    describe('parseGenericTypeDefinition', () => {
        test('解析简单类型', () => {
            const result = parseGenericTypeDefinition('int');
            expect(result).toEqual({
                mainType: 'int',
                genericTypes: []
            });
        });

        test('解析单层泛型类型', () => {
            const result = parseGenericTypeDefinition('list<int>');
            expect(result).toEqual({
                mainType: 'list',
                genericTypes: [{
                    mainType: 'int',
                    genericTypes: []
                }]
            });
        });

        test('解析嵌套泛型类型', () => {
            const result = parseGenericTypeDefinition('list<pair<int, str>>');
            expect(result).toEqual({
                mainType: 'list',
                genericTypes: [{
                    mainType: 'pair',
                    genericTypes: [
                        { mainType: 'int', genericTypes: [] },
                        { mainType: 'str', genericTypes: [] }
                    ]
                }]
            });
        });

        test('解析复杂嵌套泛型类型', () => {
            const result = parseGenericTypeDefinition('list<pair<int, list<pair<str, int>>>>');
            expect(result).toEqual({
                mainType: 'list',
                genericTypes: [{
                    mainType: 'pair',
                    genericTypes: [
                        { mainType: 'int', genericTypes: [] },
                        {
                            mainType: 'list',
                            genericTypes: [{
                                mainType: 'pair',
                                genericTypes: [
                                    { mainType: 'str', genericTypes: [] },
                                    { mainType: 'int', genericTypes: [] }
                                ]
                            }]
                        }
                    ]
                }]
            });
        });

        test('无效类型定义应该抛出错误', () => {
            expect(() => parseGenericTypeDefinition('list<')).toThrow();
            expect(() => parseGenericTypeDefinition('list>')).toThrow();
            expect(() => parseGenericTypeDefinition('list<int<>')).toThrow();
        });
    });

    describe('genericTypeDefinitionToString', () => {
        test('转换简单类型', () => {
            const type: GenericTypeDefinition = {
                mainType: 'int',
                genericTypes: []
            };
            expect(genericTypeDefinitionToString(type)).toBe('int');
        });

        test('转换单层泛型类型', () => {
            const type: GenericTypeDefinition = {
                mainType: 'list',
                genericTypes: [{
                    mainType: 'int',
                    genericTypes: []
                }]
            };
            expect(genericTypeDefinitionToString(type)).toBe('list<int>');
        });

        test('转换嵌套泛型类型', () => {
            const type: GenericTypeDefinition = {
                mainType: 'list',
                genericTypes: [{
                    mainType: 'pair',
                    genericTypes: [
                        { mainType: 'int', genericTypes: [] },
                        { mainType: 'str', genericTypes: [] }
                    ]
                }]
            };
            expect(genericTypeDefinitionToString(type)).toBe('list<pair<int, str>>');
        });
    });

    describe('hasUnresolvedGenericType', () => {
        test('检查未解析的泛型类型', () => {
            const type: GenericTypeDefinition = {
                mainType: 'list',
                genericTypes: [{
                    mainType: 'T',
                    genericTypes: []
                }]
            };
            const genericTypes = new Set(['T']);
            expect(hasUnresolvedGenericType(type, genericTypes)).toBe(true);
        });

        test('检查已解析的类型', () => {
            const type: GenericTypeDefinition = {
                mainType: 'list',
                genericTypes: [{
                    mainType: 'int',
                    genericTypes: []
                }]
            };
            const genericTypes = new Set(['T']);
            expect(hasUnresolvedGenericType(type, genericTypes)).toBe(false);
        });
    });

    describe('genericTypesEqual', () => {
        test('比较相同的类型', () => {
            const type1: GenericTypeDefinition = {
                mainType: 'list',
                genericTypes: [{
                    mainType: 'int',
                    genericTypes: []
                }]
            };
            const type2: GenericTypeDefinition = {
                mainType: 'list',
                genericTypes: [{
                    mainType: 'int',
                    genericTypes: []
                }]
            };
            expect(genericTypesEqual(type1, type2)).toBe(true);
        });

        test('比较不同的类型', () => {
            const type1: GenericTypeDefinition = {
                mainType: 'list',
                genericTypes: [{
                    mainType: 'int',
                    genericTypes: []
                }]
            };
            const type2: GenericTypeDefinition = {
                mainType: 'list',
                genericTypes: [{
                    mainType: 'str',
                    genericTypes: []
                }]
            };
            expect(genericTypesEqual(type1, type2)).toBe(false);
        });
    });

    describe('resolveGenericType', () => {
        test('解析简单泛型类型', () => {
            const toResolve: GenericTypeDefinition = {
                mainType: 'T',
                genericTypes: []
            };
            const definedType: GenericTypeDefinition = {
                mainType: 'int',
                genericTypes: []
            };
            const genericTypes = new Set(['T']);
            const result = resolveGenericType(toResolve, definedType, genericTypes);
            expect(result).toEqual({
                'T': {
                    mainType: 'int',
                    genericTypes: []
                }
            });
        });

        test('解析嵌套泛型类型', () => {
            const toResolve: GenericTypeDefinition = {
                mainType: 'list',
                genericTypes: [{
                    mainType: 'T',
                    genericTypes: []
                }]
            };
            const definedType: GenericTypeDefinition = {
                mainType: 'list',
                genericTypes: [{
                    mainType: 'int',
                    genericTypes: []
                }]
            };
            const genericTypes = new Set(['T']);
            const result = resolveGenericType(toResolve, definedType, genericTypes);
            expect(result).toEqual({
                'T': {
                    mainType: 'int',
                    genericTypes: []
                }
            });
        });

        test('解析出复杂泛型类型', () => {
            const toResolve: GenericTypeDefinition = {
                mainType: 'list',
                genericTypes: [{
                    mainType: 'T',
                    genericTypes: []
                }]
            };
            const definedType: GenericTypeDefinition = {
                mainType: 'list',
                genericTypes: [{
                    mainType: 'list',
                    genericTypes: [
                        {
                            mainType: 'int',
                            genericTypes: []
                        }
                    ]
                }]
            };
            const genericTypes = new Set(['T']);
            const result = resolveGenericType(toResolve, definedType, genericTypes);
            expect(result).toEqual({
                'T': {
                    mainType: 'list',
                    genericTypes: [
                        {
                            mainType: 'int',
                            genericTypes: []
                        }
                    ]
                }
            });
        });

        test('类型不匹配应该抛出错误', () => {
            const toResolve: GenericTypeDefinition = {
                mainType: 'list',
                genericTypes: [{
                    mainType: 'T',
                    genericTypes: []
                }]
            };
            const definedType: GenericTypeDefinition = {
                mainType: 'pair',
                genericTypes: [{
                    mainType: 'int',
                    genericTypes: []
                }]
            };
            const genericTypes = new Set(['T']);
            expect(() => resolveGenericType(toResolve, definedType, genericTypes)).toThrow();
        });


        test('泛型个数不同抛出错误', () => {
            const toResolve: GenericTypeDefinition = {
                mainType: 'list',
                genericTypes: [{
                    mainType: 'T',
                    genericTypes: []
                }]
            };
            const definedType: GenericTypeDefinition = {
                mainType: 'list',
                genericTypes: [{
                    mainType: 'int',
                    genericTypes: []
                }, {
                    mainType: 'str',
                    genericTypes: []
                }]
            };
            const genericTypes = new Set(['T']);
            expect(() => resolveGenericType(toResolve, definedType, genericTypes)).toThrow();
        });
    });
}); 