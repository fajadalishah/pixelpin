// Pricing plans configuration
export const PLANS = {
  free: {
    name: 'Free',
    storageMB: 100,
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      '100 MB Storage',
      '3 Projects',
      'Basic Commenting',
      'Share Links',
      'Community Support',
    ],
    stripePriceIdMonthly: null,
    stripePriceIdYearly: null,
  },
  starter: {
    name: 'Starter',
    storageMB: 5120,
    monthlyPrice: 10,
    yearlyPrice: 108, // $9/mo — 10% off
    features: [
      '5 GB Storage',
      'Unlimited Projects',
      'Team Collaboration',
      'Priority Comments',
      'Custom Branding',
      'Email Support',
    ],
    stripePriceIdMonthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || '',
    stripePriceIdYearly: process.env.STRIPE_PRICE_STARTER_YEARLY || '',
  },
  pro: {
    name: 'Pro',
    storageMB: 10240,
    monthlyPrice: 17,
    yearlyPrice: 183.60, // $15.30/mo — 10% off
    features: [
      '10 GB Storage',
      'Unlimited Projects',
      'Advanced Team Roles',
      'Annotation Tools',
      'Version History',
      'Custom Branding',
      'Priority Email Support',
    ],
    stripePriceIdMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
    stripePriceIdYearly: process.env.STRIPE_PRICE_PRO_YEARLY || '',
  },
  business: {
    name: 'Business',
    storageMB: 30720,
    monthlyPrice: 45,
    yearlyPrice: 486, // $40.50/mo — 10% off
    features: [
      '30 GB Storage',
      'Unlimited Everything',
      'Admin Dashboard',
      'SSO Integration',
      'Audit Logs',
      'White-label Branding',
      'API Access',
      'Dedicated Support',
    ],
    stripePriceIdMonthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY || '',
    stripePriceIdYearly: process.env.STRIPE_PRICE_BUSINESS_YEARLY || '',
  },
} as const

export type PlanKey = keyof typeof PLANS
