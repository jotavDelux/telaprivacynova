import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { paymentPlans, type PaymentPlanId } from './payment-plans';
import { pixAvailability, createPixOrder, consultPixOrder } from './pix.server';
export type { PixResult } from './pix.server';

export const getPixAvailability = createServerFn({ method: 'GET' }).handler(() => pixAvailability());
export const createPix = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => z.object({ plan: z.enum(Object.keys(paymentPlans) as [PaymentPlanId, ...PaymentPlanId[]]), key: z.string().uuid() }).parse(input))
  .handler(({ data }) => createPixOrder(data));
export const consultPix = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => z.object({ orderId: z.string().uuid() }).parse(input))
  .handler(({ data }) => consultPixOrder(data));
