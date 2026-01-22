<script setup lang="ts">
import { useFileTransfer } from "@/composables/useFileTransfer";
import NearbyDevices from "@/components/transfer/NearbyDevices.vue";
import FileDropZone from "@/components/transfer/FileDropZone.vue";
import TransferQueue from "@/components/transfer/TransferQueue.vue";
import TransferActionBar from "@/components/transfer/TransferActionBar.vue";
import IncomingRequest from "@/components/transfer/IncomingRequest.vue";
import { scanFiles } from "@/lib/file";
import { ref } from "vue";
const {
  currentUser,
  users,
  selectedUserIds,
  files,
  transfers,
  incomingTransfers,
  isDragging,
  isTransferring,
  formattedTotalSize,
  canSend,
  toggleUserSelection,
  addFiles,
  removeFile,
  startTransfer,
  acceptTransfer,
  declineTransfer,
} = useFileTransfer();

function onDrop(e: DragEvent) {
  if (e.dataTransfer?.items) {
    const items = e.dataTransfer.items;
    const promises: Promise<File[]>[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item && item.kind === "file") {
        const entry = item.webkitGetAsEntry() as unknown as FileSystemEntry;
        if (entry) {
          promises.push(scanFiles(entry));
        }
      }
    }

    Promise.all(promises).then((results) => {
      const flatFiles = results.flat();
      if (flatFiles.length > 0) {
        addFiles(flatFiles);
      }
    });
  } else if (e.dataTransfer?.files) {
    addFiles(Array.from(e.dataTransfer.files));
  }
}

function onClick() {
  fileInput.value?.click();
}

const fileInput = ref<HTMLInputElement | null>(null);

function onFileInput(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files) {
    addFiles(Array.from(input.files));
  }
  input.value = "";
}
</script>

<template>
  <div
    class="min-h-screen bg-neutral-50/50 flex flex-col items-center justify-center p-6 sm:p-12 font-sans text-neutral-900 selection:bg-neutral-900 selection:text-white"
  >
    <NearbyDevices
      :current-user="currentUser"
      :users="users"
      :selected-user-ids="selectedUserIds"
      @toggle="toggleUserSelection"
    />

    <div
      class="relative w-full max-w-5xl flex-1 flex flex-col min-h-125 transition-all duration-500"
    >
      <FileDropZone
        v-model:is-dragging="isDragging"
        :has-files="files.length > 0 || transfers.length > 0"
        @drop="onDrop"
        @click="onClick"
      />

      <input
        type="file"
        multiple
        class="hidden"
        ref="fileInput"
        @change="onFileInput"
      />

      <TransferQueue
        :files="files"
        :transfers="transfers"
        :users="users"
        :formatted-total-size="formattedTotalSize"
        @remove="removeFile"
      />
    </div>

    <TransferActionBar
      :show="files.length > 0"
      :can-send="canSend"
      :is-transferring="isTransferring"
      :target-count="selectedUserIds.size"
      @send="startTransfer"
    />

    <div
      class="fixed bottom-6 right-6 left-6 sm:left-auto sm:right-6 z-50 flex flex-col gap-4 pointer-events-none w-auto sm:w-full max-w-sm max-h-[80vh] overflow-y-auto"
    >
      <TransitionGroup name="list">
        <div
          class="pointer-events-auto w-full"
          v-for="transfer in incomingTransfers"
          :key="transfer.id"
        >
          <IncomingRequest
            :transfer="transfer"
            :users="users"
            @accept="acceptTransfer"
            @decline="declineTransfer"
          />
        </div>
      </TransitionGroup>
    </div>

    <Toaster position="top-right" theme="light" />
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
</style>
