import { GenericTypeDefinition } from "@/types";

/**
 * 解析泛型类型定义
 * @param type - 泛型类型字符串，例如 "list<pair<int, list<pair<str, int>>>>"
 * @returns 解析后的 GenericTypeDefinition 对象
 * 
 * 示例：
 * 输入: "list<pair<int, str>>"
 * 输出: { mainType: "list", genericTypes: [{ mainType: "pair", genericTypes: ["int", "str"] }] }
 */
export const parseGenericTypeDefinition = (type: string): GenericTypeDefinition => {
    type = type.trim();

    const match = type.match(/^([^<>,]+)\s*(?:<(.+)>\s*)?$/);
    if (!match) {
        throw new Error(`Invalid type definition: ${type}`);
    }

    const mainType = match[1];
    const genericsPart = match[2];

    if (!genericsPart) {
        return { mainType, genericTypes: [] };
    }

    const genericTypes: GenericTypeDefinition[] = [];
    let balance = 0, token = "";
    const tokens: string[] = [];

    for (const char of genericsPart) {
        if (char === '<') balance++;
        if (char === '>') balance--;
        if (char === ',' && balance === 0) {
            tokens.push(token.trim());
            token = "";
        } else {
            token += char;
        }
    }

    if (token) tokens.push(token.trim());

    for (const t of tokens) {
        genericTypes.push(t.includes('<') ? parseGenericTypeDefinition(t) : { mainType: t, genericTypes: [] });
    }

    return { mainType, genericTypes };
};

/**
 * 将 GenericTypeDefinition 对象转换回泛型类型字符串
 * @param type - 泛型类型定义对象
 * @returns 生成的泛型类型字符串
 * 
 * 示例：
 * 输入: { mainType: "list", genericTypes: [{ mainType: "pair", genericTypes: ["int", "str"] }] }
 * 输出: "list<pair<int, str>>"
 */
export const genericTypeDefinitionToString = (type: GenericTypeDefinition): string => {
    if (type.genericTypes.length === 0) {
        return type.mainType;
    }
    const generics = type.genericTypes.map(genericTypeDefinitionToString).join(', ');
    return `${type.mainType}<${generics}>`;
};

export const hasUnresolvedGenericType = (type: GenericTypeDefinition, generic_types: Set<string>): boolean => {
    if (generic_types.has(type.mainType)) {
        return true;
    }
    return type.genericTypes.some(gt => hasUnresolvedGenericType(gt, generic_types));
}


/**
 * 检查两个泛型类型定义是否完全相同
 * @param type1 - 第一个泛型类型定义对象
 * @param type2 - 第二个泛型类型定义对象
 * @returns 布尔值，表示两者是否相等
 */
export const genericTypesEqual = (type1: GenericTypeDefinition, type2: GenericTypeDefinition): boolean => {
    if (type1.mainType !== type2.mainType) {
        return false;
    }
    if (type1.genericTypes.length !== type2.genericTypes.length) {
        return false;
    }
    return type1.genericTypes.every((t1, index) => {
        const t2 = type2.genericTypes[index];
        return genericTypesEqual(t1, t2);
    });
};

export const genericTypesMatch = (type1: GenericTypeDefinition, type2: GenericTypeDefinition): boolean => {
    if (type1.mainType === '*' || type2.mainType === '*') {
        return true;
    }
    if (type1.mainType !== type2.mainType) {
        return false;
    }
    if (type1.genericTypes.length !== type2.genericTypes.length) {
        return false;
    }
    return type1.genericTypes.every((t1, index) => {
        const t2 = type2.genericTypes[index];
        return genericTypesMatch(t1, t2);
    });
};

export const replaceGenericType = (genericType: GenericTypeDefinition, resolved: Record<string, GenericTypeDefinition>): GenericTypeDefinition => {
    const resolvedType = resolved[genericType.mainType];
    return {
        mainType: resolvedType?.mainType ?? genericType.mainType,
        genericTypes: genericType.genericTypes.map(gt => replaceGenericType(gt, resolved))
    };
}

/**
 * 解析泛型的实际类型
 * @param toResolve - 需要解析的泛型类型定义
 * @param definedType - 对照的泛型类型定义
 * @param generic_types - 需要解析的泛型类型集合
 * @returns 泛型定义 -> 实际的类型
 */
export const resolveGenericType = (toResolve: GenericTypeDefinition, definedType: GenericTypeDefinition, generic_types: Set<string>): Record<string, GenericTypeDefinition> => {
    const resolved: Record<string, GenericTypeDefinition> = {};
    const resolve = (toResolve: GenericTypeDefinition, definedType: GenericTypeDefinition, generic_types: Set<string>, resolved: Record<string, GenericTypeDefinition>) => {
        if (generic_types.has(toResolve.mainType)) {
            if (toResolve.genericTypes.length > 0) {
                if (toResolve.genericTypes.length !== definedType.genericTypes.length) {
                    throw new Error(`generic type length mismatch: ${toResolve.mainType} -> ${definedType.mainType}`);
                }
                const fromType = toResolve.mainType;
                const toType = { mainType: definedType.mainType, genericTypes: [] };
                const oldResolved = resolved[fromType];
                if (oldResolved && !genericTypesEqual(toType, oldResolved)) {
                    throw new Error(`conflict generic type: ${fromType} -> ${toType} -> ${oldResolved}`);
                }
                resolved[fromType] = toType;
                for (let i = 0; i < toResolve.genericTypes.length; i++) {
                    resolve(toResolve.genericTypes[i], definedType.genericTypes[i], generic_types, resolved);
                }
            } else {
                const fromType = toResolve.mainType;
                const toType = definedType;
                const oldResolved = resolved[fromType];
                if (oldResolved && !genericTypesEqual(toType, oldResolved)) {
                    throw new Error(`conflict generic type: ${fromType} -> ${toType} -> ${oldResolved}`);
                }
                resolved[fromType] = toType;
            }
        } else {
            if (toResolve.mainType !== definedType.mainType) {
                throw new Error(`main type mismatch: ${toResolve.mainType} -> ${definedType.mainType}`);
            }
            if (toResolve.genericTypes.length !== definedType.genericTypes.length) {
                throw new Error(`generic type length mismatch: ${toResolve.mainType} -> ${definedType.mainType}`);
            }
            for (let i = 0; i < toResolve.genericTypes.length; i++) {
                resolve(toResolve.genericTypes[i], definedType.genericTypes[i], generic_types, resolved);
            }
        }
    }
    resolve(toResolve, definedType, generic_types, resolved);
    return resolved;
}