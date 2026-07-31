import { useQuery } from '@tanstack/react-query';
import { paymentService, type PaymentListParams } from '@/services/paymentService';
import { queryKeys } from './keys';

export function usePaymentsList(params: PaymentListParams) {
  return useQuery({
    queryKey: queryKeys.payments.list(params),
    queryFn: () => paymentService.list(params),
  });
}
