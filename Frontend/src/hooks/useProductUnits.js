import { useQuery } from "@tanstack/react-query";
import { getProductUnits, lookupProductUnit } from "../api/inventory/productUnits.api";

export const useProductUnits = (params) => {
    return useQuery({
        queryKey: ["productUnits", params],
        queryFn: () => getProductUnits(params),
    });
};

export const useLookupProductUnit = (unitSku) => {
    return useQuery({
        queryKey: ["lookupProductUnit", unitSku],
        queryFn: () => lookupProductUnit(unitSku),
        enabled: !!unitSku,
        retry: false, // Don't retry if not found
    });
};
