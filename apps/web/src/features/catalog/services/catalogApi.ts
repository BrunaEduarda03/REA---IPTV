import {
  categoryListResponseSchema,
  channelListResponseSchema,
  channelSchema,
  type Category,
  type Channel,
  type ChannelListQuery,
  type ChannelListResponse,
} from "@saimotv/shared";
import { apiGet } from "@/lib/httpClient";

/** Cada função valida a resposta com o MESMO schema que o backend usa para
 * construí-la — ver packages/shared e ADR-009 em docs/implementation/decisions.md. */

export async function getCategories(): Promise<Category[]> {
  const data = await apiGet<unknown>("/api/categories");
  return categoryListResponseSchema.parse(data).items;
}

export async function getChannels(query: ChannelListQuery): Promise<ChannelListResponse> {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.categoryId) params.set("categoryId", query.categoryId);
  params.set("page", String(query.page));
  params.set("pageSize", String(query.pageSize));
  params.set("sort", query.sort);

  const data = await apiGet<unknown>(`/api/channels?${params.toString()}`);
  return channelListResponseSchema.parse(data);
}

export async function getChannel(id: string): Promise<Channel> {
  const data = await apiGet<unknown>(`/api/channels/${encodeURIComponent(id)}`);
  return channelSchema.parse(data);
}
