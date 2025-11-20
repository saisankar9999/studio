
export type Label =
  | 'coding'
  | 'ml'
  | 'system_design'
  | 'process_domain'
  | 'behavioral'
  | 'other';

import { CODING_TECH_PROMPT, STRUCTURED_PRO_PROMPT } from './prompts';

const re = (p: string) => new RegExp(p, 'i');
const RX = {
  coding: [
    re('\\b(code|function|class|method|endpoint|regex|loop|array|list|dictionary)\\b'),
    re('\\bSQL|SELECT|JOIN|GROUP BY|CTE|window function|index\\b'),
    re('\\btime complexity|space complexity|big[- ]?o\\b'),
    re('[]{3}|[^]+|[(){}\\[\\]]'),
  ],
  ml: [
    re('\\bfeature(s)?|model|train|inference|roc|auc|precision|recall|confusion matrix|pipeline|hyperparameter|GridSearchCV|RandomizedSearchCV|Bayesian|XGBoost|LightGBM|CatBoost\\b'),
  ],
  system_design: [
    re('\\bscale|throughput|latency|cache|cdn|load balancer|partition|shard|consistency|cap theorem|message queue|kafka|rabbitmq|microservice|event[- ]?driven\\b'),
  ],
  behavioral: [
    re('\\bstrength|weakness|conflict|failure|why (us|this role)|teamwork|leadership|deadline|stakeholder|communication|motivation\\b'),
  ],
  process_bias: [
    re('\\bkyc|qc|aml|sanctions?|pep|sla|audit|escalation|validation|excel|vlookup|pivot(table)?\\b'),
  ],
};

const anyMatch = (q: string, arr: RegExp[]) => arr.some((rx) => rx.test(q));

export function classifyQuestion(qRaw: string, jdRoleHint?: string): Label {
  const q = (qRaw || '').trim();
  if (!q) return 'other';

  if (anyMatch(q, RX.coding)) return 'coding';
  if (anyMatch(q, RX.ml)) return 'ml';
  if (anyMatch(q, RX.system_design)) return 'system_design';
  if (anyMatch(q, RX.behavioral)) return 'behavioral';
  if (anyMatch(q, RX.process_bias)) return 'process_domain';

  // JD bias toward tech if ambiguous
  if (jdRoleHint?.match(/engineer|developer|swe|backend|data scientist/i)) {
    return 'ml';
  }
  return 'process_domain';
}

export function pickPrompt(label: Label): string {
  switch (label) {
    case 'coding':
    case 'ml':
    case 'system_design':
      return CODING_TECH_PROMPT;
    case 'behavioral':
    case 'process_domain':
    default:
      return STRUCTURED_PRO_PROMPT;
  }
}
