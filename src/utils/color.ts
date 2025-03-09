const configColor: Record<string, [number, number, number]> = {
    "*": [255, 255, 255], // 白色
    "ref": [255, 165, 0], // 橙色 
    "str": [0, 255, 0], // 绿色
    "int": [0, 0, 255], // 蓝色
    "float": [0, 255, 255], // 青色
    "bool": [255, 0, 255], // 紫色
    "ref<str>": [128, 255, 128], // 浅绿色
    "ref<int>": [128, 128, 255], // 浅蓝色
    "ref<float>": [128, 255, 255], // 浅青色
    "ref<bool>": [255, 128, 255], // 浅紫色
}

function fnv1aHash(str: string) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return hash >>> 0; // 确保结果为非负整数
}

/**
 * 将类型名转换为RGB颜色值
 * @param str 输入字符串
 * @returns RGB颜色值，格式为 [r, g, b]，每个分量范围0-255
 */
export function typeToColor(str: string): [number, number, number] {
    if (configColor[str]) {
        return configColor[str];
    }
    // 使用简单的哈希算法将字符串转换为数字
    const hash = fnv1aHash(str);

    // 将哈希值映射到HSV颜色空间
    const h = Math.abs(hash) % 360;  // 色相 0-360
    const s = 70 + (Math.abs(hash >> 16) % 31);  // 饱和度 70-100
    const v = 70 + (Math.abs(hash >> 24) % 31); // 明度 70-100

    // HSV转RGB
    const c = (v / 100) * (s / 100);
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = (v / 100) - c;

    let r = 0, g = 0, b = 0;
    if (h < 60) {
        [r, g, b] = [c, x, 0];
    } else if (h < 120) {
        [r, g, b] = [x, c, 0];
    } else if (h < 180) {
        [r, g, b] = [0, c, x];
    } else if (h < 240) {
        [r, g, b] = [0, x, c];
    } else if (h < 300) {
        [r, g, b] = [x, 0, c];
    } else {
        [r, g, b] = [c, 0, x];
    }

    // 转换为0-255范围的RGB值
    return [
        Math.round((r + m) * 255),
        Math.round((g + m) * 255),
        Math.round((b + m) * 255)
    ];
}

export function rgbToCssFormat(rgb: [number, number, number]) : string {
    return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}