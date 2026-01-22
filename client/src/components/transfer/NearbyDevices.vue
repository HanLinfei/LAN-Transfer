<script setup lang="ts">
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Check } from "lucide-vue-next";
import type { User } from "@/types/transfer";

defineProps<{
  currentUser?: User | null;
  users: User[];
  selectedUserIds: Set<string>;
}>();

defineEmits<{
  (e: "toggle", id: string): void;
}>();
</script>

<template>
  <div class="w-full max-w-5xl mb-12 fade-in-down">
    <div class="flex items-center justify-between mb-4 px-2">
      <h2 class="text-sm font-medium text-neutral-500 tracking-wide uppercase">
        附近设备
      </h2>
      <span
        class="text-xs text-neutral-400 bg-white px-2 py-1 rounded-full border border-neutral-100 shadow-sm"
      >
        {{ users.length }} 在线
      </span>
    </div>

    <ScrollArea
      class="w-full whitespace-nowrap rounded-3xl border border-white/50 bg-white/40 backdrop-blur-xl shadow-sm"
    >
      <div class="flex w-max space-x-6 p-6 items-center">
        <div
          v-if="currentUser"
          class="group relative flex flex-col items-center gap-3 opacity-100 cursor-default"
        >
          <div class="relative">
            <Avatar
              class="h-16 w-16 sm:h-20 sm:w-20 border-4 border-white shadow-lg"
            >
              <AvatarImage :src="currentUser.avatar" />
              <AvatarFallback
                class="bg-linear-to-br from-blue-50 to-blue-100 text-blue-500 text-lg"
              >
                {{ currentUser.name.charAt(0) }}
              </AvatarFallback>
            </Avatar>

            <span
              class="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-neutral-900 text-white text-[10px] font-bold shadow-sm z-10"
            >
              YOU
            </span>
          </div>

          <div class="text-center space-y-0.5">
            <p class="text-sm font-semibold text-neutral-800 leading-tight">
              {{ currentUser.name }}
            </p>
            <p class="text-xs text-neutral-400 font-medium">
              {{ currentUser.deviceName }}
            </p>
          </div>
        </div>

        <div
          v-if="currentUser && users.length > 0"
          class="h-24 w-px bg-neutral-200/60 mx-2"
        ></div>

        <button
          v-for="user in users"
          :key="user.id"
          @click="$emit('toggle', user.id)"
          :class="
            cn(
              'group relative flex flex-col items-center gap-3 transition-all duration-300 ease-out outline-none',
              selectedUserIds.has(user.id)
                ? 'scale-105 opacity-100'
                : 'opacity-60 hover:opacity-100 hover:scale-105',
            )
          "
        >
          <div class="relative">
            <Avatar
              class="h-16 w-16 sm:h-20 sm:w-20 border-4 border-white shadow-lg transition-all duration-500 group-hover:shadow-xl"
            >
              <AvatarImage :src="user.avatar" />
              <AvatarFallback
                class="bg-linear-to-br from-neutral-100 to-neutral-200 text-neutral-500 text-lg"
              >
                {{ user.name.charAt(0) }}
              </AvatarFallback>
            </Avatar>

            <span
              class="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-500 shadow-sm transition-transform duration-300"
            ></span>

            <div
              v-if="selectedUserIds.has(user.id)"
              class="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-neutral-900 text-white flex items-center justify-center shadow-md animate-in zoom-in duration-200"
            >
              <Check class="h-3.5 w-3.5" />
            </div>

            <!-- Selection Ring -->
            <div
              class="absolute inset-0 -m-2 rounded-full border-2 border-neutral-900 opacity-0 transition-all duration-300 scale-90"
              :class="
                selectedUserIds.has(user.id) ? 'opacity-100 scale-100' : ''
              "
            ></div>
          </div>

          <div class="text-center space-y-0.5">
            <p class="text-sm font-semibold text-neutral-800 leading-tight">
              {{ user.name }}
            </p>
            <p class="text-xs text-neutral-400 font-medium">
              {{ user.deviceName }}
            </p>
          </div>
        </button>
      </div>
      <ScrollBar
        orientation="horizontal"
        class="opacity-0 group-hover/scroll:opacity-100 transition-opacity"
      />
    </ScrollArea>
  </div>
</template>

<style scoped>
.fade-in-down {
  animation: fadeInDown 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
