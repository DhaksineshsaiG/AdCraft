import type { CanvasSize, Region } from './Canvas';

export function escapeSvg(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '');
}

export function rectAttrs(region: Region): string {
  return [
    `x="${formatNumber(region.x)}"`,
    `y="${formatNumber(region.y)}"`,
    `width="${formatNumber(region.width)}"`,
    `height="${formatNumber(region.height)}"`,
  ].join(' ');
}

export class SVGBuilder {
  private readonly defs: string[] = [];

  private readonly reusableDefs = new Map<string, string>();

  private readonly fragments: string[] = [];

  private idCounter = 0;

  constructor(private readonly size: CanvasSize) {}

  nextId(prefix: string): string {
    this.idCounter += 1;
    return `${prefix}-${this.idCounter}`;
  }

  addDef(definition: string): void {
    this.defs.push(definition);
  }

  addReusableDef(key: string, prefix: string, createDefinition: (id: string) => string): string {
    const existing = this.reusableDefs.get(key);
    if (existing) return existing;

    const id = this.nextId(prefix);
    this.reusableDefs.set(key, id);
    this.addDef(createDefinition(id));

    return id;
  }

  addFragment(fragment: string): void {
    if (fragment.trim()) this.fragments.push(fragment);
  }

  build(): string {
    const defs = this.defs.length > 0 ? `<defs>${this.defs.join('')}</defs>` : '';

    return [
      [
        `<svg xmlns="http://www.w3.org/2000/svg"`,
        `width="${formatNumber(this.size.width)}"`,
        `height="${formatNumber(this.size.height)}"`,
        `viewBox="0 0 ${formatNumber(this.size.width)} ${formatNumber(this.size.height)}"`,
        `role="img">`,
      ].join(' '),
      defs,
      ...this.fragments,
      '</svg>',
    ].join('');
  }
}

export default SVGBuilder;
