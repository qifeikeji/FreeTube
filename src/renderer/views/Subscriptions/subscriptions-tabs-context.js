import { inject } from 'vue'

export const SUBSCRIPTIONS_TABS_CTX = Symbol('subscriptions-tabs-ctx')

export function useSubscriptionsTabsContext() {
  return inject(SUBSCRIPTIONS_TABS_CTX, null)
}
