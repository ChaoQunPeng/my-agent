import { nextTick, ref } from "vue";
import { message as antMessage } from "ant-design-vue";
import {
  createSession,
  deleteSession,
  getSessions,
  updateSession,
  type Session,
} from "@/api/session";

interface UseSessionManagerOptions {
  getModuleKey: () => string;
  canCreateSession?: () => boolean;
  shouldFetchSessions?: () => boolean;
  getCreateBlockedMessage?: () => string;
  onSessionSelected?: (sessionId: string) => Promise<void> | void;
  onCurrentSessionCleared?: () => void;
}

export function useSessionManager(options: UseSessionManagerOptions) {
  const sessions = ref<Session[]>([]);
  const currentSessionId = ref("");

  const clearCurrentSession = () => {
    currentSessionId.value = "";
    options.onCurrentSessionCleared?.();
  };

  const fetchSessions = async () => {
    try {
      if (options.shouldFetchSessions && !options.shouldFetchSessions()) {
        sessions.value = [];
        return;
      }

      const res = await getSessions(options.getModuleKey());
      sessions.value = res.data || [];
    } catch (error) {
      antMessage.error("获取会话列表失败");
    }
  };

  const handleSelectSession = async (sessionId: string) => {
    currentSessionId.value = sessionId;
    await nextTick();
    await options.onSessionSelected?.(sessionId);
  };

  const handleCreateSession = async () => {
    if (options.canCreateSession && !options.canCreateSession()) {
      antMessage.warning(
        options.getCreateBlockedMessage?.() || "当前条件下无法创建会话",
      );
      return;
    }

    try {
      const res = await createSession({
        moduleKey: options.getModuleKey(),
      });
      const newSession = res.data;
      sessions.value.unshift(newSession);
      await handleSelectSession(newSession.sessionId);
      // antMessage.success("会话创建成功");
    } catch (error) {
      antMessage.error("创建会话失败");
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteSession(sessionId);
      sessions.value = sessions.value.filter(
        (session) => session.sessionId !== sessionId,
      );

      if (currentSessionId.value === sessionId) {
        clearCurrentSession();
      }

      antMessage.success("会话删除成功");
    } catch (error) {
      antMessage.error("删除会话失败");
    }
  };

  const handleUpdateSession = async ({
    sessionId,
    title,
  }: {
    sessionId: string;
    title: string;
  }) => {
    const nextTitle = title.trim();

    if (!nextTitle) {
      antMessage.warning("请输入会话标题");
      return;
    }

    try {
      await updateSession(sessionId, { title: nextTitle });
      const targetSession = sessions.value.find(
        (session) => session.sessionId === sessionId,
      );

      if (targetSession) {
        targetSession.title = nextTitle;
      }

      antMessage.success("更新成功");
    } catch (error) {
      antMessage.error("更新失败");
    }
  };

  return {
    sessions,
    currentSessionId,
    clearCurrentSession,
    fetchSessions,
    handleSelectSession,
    handleCreateSession,
    handleDeleteSession,
    handleUpdateSession,
  };
}
