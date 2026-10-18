import { useQuery } from "@tanstack/react-query";
import { getChannel } from "../services/catalogApi";
import { catalogKeys } from "./catalogKeys";

export function useChannel(id: string) {
  return useQuery({
    queryKey: catalogKeys.channel(id),
    queryFn: () => getChannel(id),
    enabled: id.length > 0,
  });
}
