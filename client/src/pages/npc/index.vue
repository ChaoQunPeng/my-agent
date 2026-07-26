<template>
  <SessionChatWorkspace
    ref="workspaceRef"
    :sessions="sessions"
    :current-session-id="currentSessionId"
    :session-id="currentSessionId"
    :api-func="chatStreamApi"
    :api-params="chatApiParams"
    @create-session="handleCreate"
    @select-session="handleSelect"
    @delete-session="handleDeleteSession"
    @save-session-title="handleUpdateSession"
  >
    <template #material>
      <CharacterSelector
        v-if="currentSessionId"
        :session-id="currentSessionId"
        v-model="selectedCharacterId"
        @character-bound="handleCharacterBound"
      />

      <div v-else class="material-empty-state">
        <div class="material-empty-state__title">人物素材区</div>
        <div class="material-empty-state__desc">
          先创建或选择一个会话，再为这个会话绑定人物。
        </div>
      </div>
    </template>
  </SessionChatWorkspace>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import SessionChatWorkspace from "@/pages/dialog/index.vue";
import CharacterSelector from "@/pages/dialog/components/character-selector.vue";
import { chatStreamApi } from "@/composables/chat-stream";
import { getCharacterBySessionId } from "@/api/character";
import { useSessionManager } from "@/pages/dialog/composables/use-session-manager";

const MODULE_KEY = "npc";
const RESOURCE_TYPE = "character";

const workspaceRef = ref<InstanceType<typeof SessionChatWorkspace> | null>(
  null,
);
const currentCharacterId = ref("");
const selectedCharacterId = ref("");

const chatApiParams = computed(() => ({
  type: RESOURCE_TYPE,
  resourceId: currentCharacterId.value,
}));

const {
  sessions,
  currentSessionId,
  fetchSessions,
  handleCreateSession,
  handleDeleteSession,
  handleSelectSession,
  handleUpdateSession,
} = useSessionManager({
  getModuleKey: () => MODULE_KEY,
  onSessionSelected: async (sessionId) => {
    await fetchCurrentCharacterId(sessionId);
    workspaceRef.value?.getMessages();
  },
  onCurrentSessionCleared: () => {
    currentCharacterId.value = "";
    selectedCharacterId.value = "";
    workspaceRef.value?.clearMessages();
  },
});

const fetchCurrentCharacterId = async (sessionId: string) => {
  try {
    const res = await getCharacterBySessionId(sessionId);
    const characterId = res.data?.characterId || "";

    currentCharacterId.value = characterId;
    selectedCharacterId.value = characterId;
  } catch (error) {
    currentCharacterId.value = "";
    selectedCharacterId.value = "";
  }
};

const handleCharacterBound = (characterId: string) => {
  currentCharacterId.value = characterId;
  selectedCharacterId.value = characterId;
};

const handleCreate = async () => {
  workspaceRef.value?.stopGeneration();
  await handleCreateSession();
};

const handleSelect = async (sessionId: string) => {
  workspaceRef.value?.stopGeneration();
  await handleSelectSession(sessionId);
};

onMounted(() => {
  fetchSessions();
});
</script>

<style scoped lang="less">
.material-empty-state {
  padding: 24px 20px;
  background: #fff;
  min-height: 100%;
}

.material-empty-state__title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.material-empty-state__desc {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.7;
  color: #6b7280;
}
</style>
