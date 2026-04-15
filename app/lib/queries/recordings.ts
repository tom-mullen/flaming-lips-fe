import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiPost, apiPatch, apiDelete } from "@/app/lib/api";
import type { Recording } from "@/app/lib/types";
import { queries } from "./keys";

export function useRecordingsByWork(workId: string) {
  return useQuery({
    ...queries.recordings.byWork(workId),
    queryFn: ({ signal }) =>
      api<Recording[]>(`/works/${workId}/recordings`, { signal }),
    enabled: !!workId,
  });
}

export function useCreateRecording(workId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      artist?: string;
      isrc?: string;
    }) => apiPost<Recording>(`/works/${workId}/recordings`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queries.recordings._def }),
  });
}

export function useUpdateRecording(workId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      recordingId,
      ...data
    }: {
      recordingId: string;
      title?: string;
      artist?: string;
      isrc?: string;
    }) => apiPatch(`/works/${workId}/recordings/${recordingId}`, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queries.recordings._def }),
  });
}

export function useDeleteRecording(workId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (recordingId: string) =>
      apiDelete(`/works/${workId}/recordings/${recordingId}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queries.recordings._def }),
  });
}
