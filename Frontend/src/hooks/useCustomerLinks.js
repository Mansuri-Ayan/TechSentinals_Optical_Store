import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLinkedMembersApi, createLinkedMemberApi, removeLinkedMemberApi } from '../api/customer/customerLinks.api';

// Fetch linked members for a customer
export const useLinkedMembers = (customerId) => {
  return useQuery({
    queryKey: ['customerLinks', customerId],
    queryFn: () => getLinkedMembersApi(customerId),
    enabled: !!customerId,
  });
};

// Create a link
export const useCreateLink = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ customerId, payload }) => createLinkedMemberApi(customerId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['customerLinks', variables.customerId]);
    },
  });
};

// Remove a link
export const useRemoveLink = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ customerId, linkedId }) => removeLinkedMemberApi(customerId, linkedId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['customerLinks', variables.customerId]);
    },
  });
};
