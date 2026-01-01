import type { Servant } from '@/utils/data';

export interface ServantForDisplay extends Servant {
  selectedTypes: number[];
  hasTypeComment?: boolean;
  typeTooltip: Array<{
    text: string;
    comment?: string;
    disabled?: boolean;
  }>;
}

export type ServantGroupForDisplay = [string, ServantForDisplay[]];
