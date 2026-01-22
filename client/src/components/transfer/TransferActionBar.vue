<script setup lang="ts">
import { Send, Loader2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

defineProps<{
  show: boolean
  canSend: boolean
  isTransferring: boolean
  targetCount: number
}>()

defineEmits<{
  (e: 'send'): void
}>()
</script>

<template>
  <div class="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-auto max-w-[calc(100vw-2rem)] sm:max-w-none">
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="translate-y-10 opacity-0 scale-90"
      enter-to-class="translate-y-0 opacity-100 scale-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="translate-y-0 opacity-100 scale-100"
      leave-to-class="translate-y-10 opacity-0 scale-90"
    >
      <div v-if="show" class="flex items-center gap-2 sm:gap-3 p-2 pr-2 sm:pr-4 bg-neutral-900/95 backdrop-blur-md text-white rounded-full shadow-2xl shadow-neutral-900/20 border border-white/10 ring-1 ring-white/10">
          <div class="pl-3 sm:pl-4 text-xs sm:text-sm font-medium text-neutral-300 border-r border-white/10 pr-3 sm:pr-4 mr-0 sm:mr-1 whitespace-nowrap">
              <span v-if="targetCount === 0">选择设备</span>
              <span v-else class="text-white flex items-center gap-2">
                  <span class="hidden sm:inline">发送给</span> {{ targetCount }} <span class="hidden sm:inline">个</span>设备
              </span>
          </div>
          <Button 
              @click="$emit('send')"
              :disabled="!canSend"
              size="default"
              class="rounded-full px-4 sm:px-6 font-semibold transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none bg-white text-neutral-900 hover:bg-neutral-200 h-9 sm:h-10 text-xs sm:text-sm whitespace-nowrap"
          >
              <span v-if="isTransferring" class="flex items-center gap-2">
                  <Loader2 class="h-4 w-4 animate-spin" />
                  发送中...
              </span>
              <span v-else class="flex items-center gap-2">
                  发送文件 <Send class="h-4 w-4 ml-1" />
              </span>
          </Button>
      </div>
    </Transition>
  </div>
</template>
