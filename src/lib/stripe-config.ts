import { Plan } from './types';

// These are placeholder price IDs - replace with your actual Stripe price IDs
// You can find these in your Stripe Dashboard under Products > Prices
export const STRIPE_PRICE_IDS: Record<Exclude<Plan, 'free'>, string> = {
  starter: 'price_starter_placeholder', // Replace with actual Stripe price ID
  premium: 'price_premium_placeholder', // Replace with actual Stripe price ID
};

// Plan display configuration
export const PLAN_CONFIG: Record<Plan, {
  name: string;
  price: string;
  priceAmount: number;
  interval: string;
  features: string[];
  highlighted?: boolean;
}> = {
  free: {
    name: 'Free',
    price: '$0',
    priceAmount: 0,
    interval: 'forever',
    features: [
      '1 monitor',
      '10-minute check intervals',
      'Discord alerts only',
      '7 days data retention',
    ],
  },
  starter: {
    name: 'Starter',
    price: '$9',
    priceAmount: 9,
    interval: 'month',
    features: [
      '10 monitors',
      '1-minute check intervals',
      '3 monitoring regions',
      '4 alert channels',
      '30 days data retention',
    ],
    highlighted: true,
  },
  premium: {
    name: 'Premium',
    price: '$29',
    priceAmount: 29,
    interval: 'month',
    features: [
      '50 monitors',
      '30-second check intervals',
      'All global regions',
      'All channels + SMS',
      'API access',
      'Team members',
      'Status pages',
    ],
  },
};