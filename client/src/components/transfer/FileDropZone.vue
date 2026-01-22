<script setup lang="ts">
import { ref } from "vue";
import { Upload } from "lucide-vue-next";
import { cn } from "@/lib/utils";

const props = defineProps<{
  isDragging: boolean;
  hasFiles: boolean;
}>();

const emit = defineEmits<{
  (e: "update:isDragging", value: boolean): void;
  (e: "drop", event: DragEvent): void;
  (e: "click"): void;
}>();

const fileInput = ref<HTMLInputElement | null>(null);

defineExpose({
  fileInput,
});

function onDragEnter(e: DragEvent) {
  e.preventDefault();
  e.stopPropagation();
  emit("update:isDragging", true);
}

function onDragLeave(e: DragEvent) {
  e.preventDefault();
  e.stopPropagation();

  if (
    e.currentTarget &&
    (e.relatedTarget as Node) &&
    !(e.currentTarget as Node).contains(e.relatedTarget as Node)
  ) {
    emit("update:isDragging", false);
  }
}

function onDragOver(e: DragEvent) {
  e.preventDefault();
  e.stopPropagation();
  emit("update:isDragging", true);
}

function onDrop(e: DragEvent) {
  e.preventDefault();
  e.stopPropagation();
  emit("update:isDragging", false);
  emit("drop", e);
}
</script>

<template>
  <div
    @dragenter="onDragEnter"
    @dragleave="onDragLeave"
    @dragover="onDragOver"
    @drop="onDrop"
    @click="$emit('click')"
    :class="
      cn(
        'relative flex-1 rounded-[2.5rem] border-2 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden cursor-pointer group',
        isDragging
          ? 'border-neutral-900 bg-neutral-100 scale-[1.01] shadow-2xl'
          : 'border-dashed border-neutral-200 bg-white/60 hover:bg-white/80 hover:border-neutral-300 shadow-sm hover:shadow-md',
        hasFiles ? 'flex-[0_0_auto] h-48 mb-6' : 'h-full', // Shrink when files exist
      )
    "
  >
    <div
      class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6 text-center"
    >
      <div
        class="rounded-full bg-white shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3"
        :class="
          cn(
            isDragging ? 'scale-125 rotate-0' : '',
            hasFiles ? 'mb-3 p-4' : 'mb-6 p-6',
          )
        "
      >
        <Upload
          class="text-neutral-900 transition-colors"
          :class="
            cn(
              isDragging
                ? 'text-neutral-900'
                : 'text-neutral-400 group-hover:text-neutral-900',
              hasFiles ? 'h-6 w-6' : 'h-10 w-10',
            )
          "
        />
      </div>
      <h3
        class="font-semibold text-neutral-900 tracking-tight transition-all duration-300"
        :class="hasFiles ? 'text-lg mb-1' : 'text-2xl mb-2'"
      >
        {{ isDragging ? "快松手！" : "拖拽文件到这里" }}
      </h3>
      <p
        class="text-neutral-500 max-w-md mx-auto leading-relaxed transition-all duration-300 overflow-hidden"
        :class="hasFiles ? 'opacity-0 h-0' : 'opacity-100 h-auto'"
      >
        或者点击选择文件。 支持大文件、文件夹。
      </p>
    </div>

    <div
      class="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700"
    >
      <div
        class="absolute top-1/4 left-1/4 w-64 h-64 bg-linear-to-br from-blue-50/50 to-purple-50/50 rounded-full blur-3xl -z-10 animate-pulse"
      ></div>
      <div
        class="absolute bottom-1/4 right-1/4 w-64 h-64 bg-linear-to-br from-orange-50/50 to-pink-50/50 rounded-full blur-3xl -z-10 animate-pulse delay-700"
      ></div>
    </div>
  </div>
</template>
