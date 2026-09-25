import { PRODUCT_IDS } from '@constants'
import type { StoreProduct } from '@types'

/** What App Store Connect / Play Console would return for this app. */
export const STORE_CATALOG: ReadonlyArray<StoreProduct> = [
  {
    id: PRODUCT_IDS.allAccessMonthly,
    type: 'subscription',
    title: 'All Access',
    description: 'Unlimited messages with Ethan and every exclusive post.',
    displayPrice: '$9.99',
    periodLabel: 'month',
  },
  {
    id: PRODUCT_IDS.gift,
    type: 'consumable',
    title: 'Gift',
    description: 'Send Ethan a gift that shows up in your chat.',
    displayPrice: '$4.99',
    periodLabel: null,
  },
]

export const findCatalogProduct = (productId: string) =>
  STORE_CATALOG.find(({ id }) => id === productId)
