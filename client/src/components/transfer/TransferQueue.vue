<script setup lang="ts">
import {
  File as FileIcon,
  X,
  ArrowRight,
  Clock,
  XCircle,
  CheckCircle2,
} from "lucide-vue-next";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { FileItem, TransferTask, User } from "@/types/transfer";
import { formatBytes } from "@/lib/utils";

const props = defineProps<{
  files: FileItem[];
  transfers: TransferTask[];
  users: User[];
  formattedTotalSize: string;
}>();

defineEmits<{
  (e: "remove", id: string): void;
}>();

const getUser = (userId: string) => props.users.find((u) => u.id === userId);
const getFile = (id: string) =>
  props.transfers.find((f) => {
    return f.fileId === id;
  });

const activeTransfers = computed(() =>
  props.transfers.filter((t) => ["pending", "transferring"].includes(t.status)),
);
const completedTransfers = computed(() =>
  props.transfers.filter((t) => t.status === "completed"),
);
const rejectedTransfers = computed(() =>
  props.transfers.filter((t) => ["rejected", "error"].includes(t.status)),
);

import { computed } from "vue";
</script>

<template>
  <div
    v-if="files.length > 0 || transfers.length > 0"
    class="flex-1 bg-white/40 backdrop-blur-md rounded-4xl border border-white/60 shadow-lg p-6 overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 fade-in duration-500"
  >
    <div v-if="files.length > 0" class="flex flex-col mb-4">
      <div class="flex items-center justify-between mb-4 px-2">
        <h4 class="text-sm font-semibold text-neutral-900">
          待发送 ({{ files.length }})
        </h4>
        <span class="text-xs font-mono text-neutral-400">{{
          formattedTotalSize
        }}</span>
      </div>

      <ScrollArea class="h-40 -mr-4 pr-4">
        <div class="space-y-3">
          <TransitionGroup name="list">
            <div
              v-for="item in files"
              :key="item.id"
              class="group relative flex items-center gap-4 p-4 rounded-2xl bg-white border border-neutral-100 shadow-sm transition-all hover:shadow-md hover:border-neutral-200"
            >
              <div
                class="h-12 w-12 rounded-xl bg-neutral-50 flex items-center justify-center text-neutral-500 border border-neutral-100"
              >
                <FileIcon class="h-6 w-6" />
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-1">
                  <p class="text-sm font-medium text-neutral-900 truncate pr-4">
                    {{ item.file.name }}
                  </p>
                  <button
                    @click="$emit('remove', item.id)"
                    class="text-neutral-300 hover:text-red-500 transition-colors p-1"
                  >
                    <X class="h-4 w-4" />
                  </button>
                </div>
                <p class="text-xs text-neutral-400">
                  {{ formatBytes(item.size) }}
                </p>
              </div>
            </div>
          </TransitionGroup>
        </div>
      </ScrollArea>
    </div>

    <div
      v-if="activeTransfers.length > 0"
      class="flex flex-col mt-2 pt-4 border-t border-white/20"
    >
      <div class="flex items-center justify-between mb-2 px-2">
        <h4 class="text-sm font-semibold text-neutral-900">
          传输中 ({{ activeTransfers.length }})
        </h4>
      </div>

      <ScrollArea class="h-32 -mr-4 pr-4">
        <div class="space-y-3">
          <TransitionGroup name="list">
            <div
              v-for="task in activeTransfers"
              :key="task.fileId + task.targetUserId"
              class="group relative flex items-center gap-4 p-3 rounded-2xl bg-white/80 border border-neutral-100 shadow-sm"
            >
              <Avatar class="h-8 w-8 border border-white shadow-sm">
                <AvatarImage :src="getUser(task.targetUserId)?.avatar ?? ''" />
                <AvatarFallback>{{
                  getUser(task.targetUserId)?.name.charAt(0)
                }}</AvatarFallback>
              </Avatar>

              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-1">
                  <div class="flex items-center gap-2 overflow-hidden">
                    <span
                      class="text-xs font-medium text-neutral-700 truncate max-w-30"
                    >
                      {{ getFile(task.fileId)?.name || "Unknown File" }}
                    </span>
                    <ArrowRight class="h-3 w-3 text-neutral-300" />
                    <span class="text-xs text-neutral-500 truncate">
                      {{ getUser(task.targetUserId)?.name }}
                    </span>
                  </div>
                  <span
                    class="text-xs font-medium flex items-center gap-1.5 text-blue-500 whitespace-nowrap"
                  >
                    <template v-if="task.status === 'pending'">
                      <Clock class="h-3 w-3 animate-pulse" />
                      等待接受
                    </template>
                    <template v-else>
                      {{ task.progress.toFixed(0) + "%" }}
                    </template>
                  </span>
                </div>

                <div
                  v-if="task.status === 'transferring'"
                  class="h-1 w-full bg-neutral-100 rounded-full overflow-hidden"
                >
                  <div
                    class="h-full bg-blue-500 transition-all duration-300 ease-out relative overflow-hidden"
                    :style="{ width: `${task.progress}%` }"
                  >
                    <div
                      class="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite] w-full h-full -skew-x-12 transform origin-left"
                    ></div>
                  </div>
                </div>
                <div
                  v-else-if="task.status === 'pending'"
                  class="h-1 w-full bg-neutral-100 rounded-full overflow-hidden"
                >
                  <div
                    class="h-full w-1/3 bg-neutral-300 rounded-full animate-indeterminate"
                  ></div>
                </div>
              </div>
            </div>
          </TransitionGroup>
        </div>
      </ScrollArea>
    </div>

    <div
      v-if="completedTransfers.length > 0"
      class="flex flex-col mt-2 pt-4 border-t border-white/20"
    >
      <div class="flex items-center justify-between mb-2 px-2">
        <h4 class="text-sm font-semibold text-emerald-700">
          已完成 ({{ completedTransfers.length }})
        </h4>
      </div>
      <ScrollArea class="h-32 -mr-4 pr-4">
        <div class="space-y-2">
          <TransitionGroup name="list">
            <div
              v-for="task in completedTransfers"
              :key="task.fileId + task.targetUserId"
              class="flex items-center gap-3 p-2 rounded-xl bg-emerald-50/50 border border-emerald-100/50"
            >
              <div
                class="h-6 w-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"
              >
                <CheckCircle2 class="h-3.5 w-3.5" />
              </div>
              <div class="flex-1 min-w-0 flex items-center justify-between">
                <span class="text-xs text-emerald-900 truncate">{{
                  getFile(task.fileId)?.name
                }}</span>
              </div>
            </div>
          </TransitionGroup>
        </div>
      </ScrollArea>
    </div>

    <div
      v-if="rejectedTransfers.length > 0"
      class="flex flex-col mt-2 pt-4 border-t border-white/20"
    >
      <div class="flex items-center justify-between mb-2 px-2">
        <h4 class="text-sm font-semibold text-red-700">
          已拒绝/失败 ({{ rejectedTransfers.length }})
        </h4>
      </div>
      <ScrollArea class="h-40 -mr-4 pr-4">
        <div class="space-y-2">
          <TransitionGroup name="list">
            <div
              v-for="task in rejectedTransfers"
              :key="task.fileId + task.targetUserId"
              class="flex items-center gap-3 p-2 rounded-xl bg-red-50/50 border border-red-100/50"
            >
              <div
                class="h-6 w-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center"
              >
                <XCircle class="h-3.5 w-3.5" />
              </div>
              <div class="flex-1 min-w-0 flex items-center justify-between">
                <span class="text-xs text-red-900 truncate">{{
                  getFile(task.fileId)?.name
                }}</span>
                <span class="text-[10px] text-red-500 font-medium">{{
                  task.status === "rejected"
                    ? getUser(task.targetUserId)
                      ? "对方已拒绝"
                      : "对方已离开"
                    : "传输失败"
                }}</span>
              </div>
            </div>
          </TransitionGroup>
        </div>
      </ScrollArea>
    </div>
  </div>
</template>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.4s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%) skewX(-12deg);
  }
  100% {
    transform: translateX(200%) skewX(-12deg);
  }
}

@keyframes indeterminate {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(400%);
  }
}

.animate-indeterminate {
  animation: indeterminate 1.5s infinite linear;
}
</style>
