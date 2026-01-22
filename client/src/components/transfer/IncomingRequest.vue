<script setup lang="ts">
import { computed } from "vue";
import { Check, X, File as FileIcon, Download } from "lucide-vue-next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { IncomingTransfer, User } from "@/types/transfer";
import { formatBytes } from "@/lib/utils";

const props = defineProps<{
  transfer: IncomingTransfer;
  users: User[];
}>();

const emit = defineEmits<{
  (e: "accept", id: string): void;
  (e: "decline", id: string): void;
}>();

const sender = computed(() =>
  props.users.find((u) => u.id === props.transfer.senderId),
);

const formattedSize = computed(() => {
  return formatBytes(props.transfer.totalSize);
});
</script>

<template>
  <div
    class="relative w-full max-w-sm mx-auto sm:mx-0 overflow-visible pointer-events-auto"
  >
    <div class="relative w-full">
      <div
        v-if="transfer.status === 'completed' || transfer.status === 'declined'"
        class="absolute -top-2 -right-2 z-50"
      >
        <button
          @click="$emit('decline', transfer.id)"
          class="bg-white rounded-full p-1 shadow-md hover:bg-neutral-100 transition-colors border border-neutral-100"
        >
          <X class="h-4 w-4 text-neutral-500" />
        </button>
      </div>

      <div
        class="bg-white/90 backdrop-blur-xl border shadow-sm rounded-3xl overflow-hidden p-5 animate-in slide-in-from-bottom-5 fade-in duration-500"
      >
        <div class="flex items-start gap-4 mb-4">
          <div class="relative">
            <Avatar class="h-12 w-12 border-2 border-white shadow-sm">
              <AvatarImage :src="sender?.avatar ?? ''" />
              <AvatarFallback>{{
                sender?.name.charAt(0) ?? "?"
              }}</AvatarFallback>
            </Avatar>
            <div
              class="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm"
            >
              <Download class="h-4 w-4 text-blue-500" />
            </div>
          </div>

          <div class="flex-1 min-w-0">
            <h4 class="font-semibold text-neutral-900 truncate">
              {{ sender?.name || "Unknown Device" }}
            </h4>
            <p class="text-sm text-neutral-500">
              想要发送 {{ transfer.files.length }} 个文件
            </p>
          </div>
        </div>

        <div
          class="bg-neutral-50/50 rounded-2xl p-3 mb-4 border border-neutral-100/50"
        >
          <div class="flex items-center gap-3">
            <div
              class="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-neutral-400 shadow-sm"
            >
              <FileIcon class="h-5 w-5" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-neutral-700 truncate">
                {{ transfer.files[0]?.name }}
              </p>
              <p
                v-if="transfer.files.length > 1"
                class="text-xs text-neutral-400"
              >
                + {{ transfer.files.length - 1 }} 更多文件 • {{ formattedSize }}
              </p>
              <p v-else class="text-xs text-neutral-400">
                {{ formattedSize }}
              </p>
            </div>
          </div>
        </div>

        <div v-if="transfer.status === 'pending'" class="flex gap-3">
          <Button
            variant="outline"
            class="flex-1 rounded-xl border-neutral-200 hover:bg-neutral-50 hover:text-red-500"
            @click="$emit('decline', transfer.id)"
          >
            <X class="h-4 w-4 mr-2" />
            拒绝
          </Button>
          <Button
            class="flex-1 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white shadow-lg shadow-neutral-900/10"
            @click="$emit('accept', transfer.id)"
          >
            <Check class="h-4 w-4 mr-2" />
            接收
          </Button>
        </div>

        <div v-else class="space-y-2">
          <div class="flex justify-between text-xs font-medium">
            <span
              :class="
                transfer.status === 'completed'
                  ? 'text-emerald-500'
                  : 'text-blue-500'
              "
            >
              {{ transfer.status === "completed" ? "接收完成" : "接收中..." }}
            </span>
            <span class="text-neutral-400"
              >{{ transfer.progress.toFixed(0) }}%</span
            >
          </div>
          <div class="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
            <div
              class="h-full transition-all duration-300 ease-out"
              :class="
                transfer.status === 'completed'
                  ? 'bg-emerald-500'
                  : 'bg-blue-500'
              "
              :style="{ width: `${transfer.progress}%` }"
            ></div>
          </div>

          <div v-if="transfer.status === 'completed'" class="mt-3">
            <Button
              variant="outline"
              class="w-full rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
              @click="$emit('decline', transfer.id)"
            >
              <Check class="h-4 w-4 mr-2" />
              已完成，关闭
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
