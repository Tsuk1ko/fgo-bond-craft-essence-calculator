import { expose } from 'comlink';
import { plannerResources } from './catalog';
import { init } from './resources';
import { solve } from './solve';

init(plannerResources);
const api = { solve };
export type PlannerWorker = typeof api;
expose(api);
