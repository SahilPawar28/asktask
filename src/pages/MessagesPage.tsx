import { useEffect, useRef, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { MobileNav } from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import {
  sendMessage,
  subscribeMessages,
  subscribeUserTasks,
  subscribeAcceptedTasks,
  getTask,
  getUserProfile,
} from "@/lib/firestore";
import { uploadImage } from "@/lib/cloudinary";
import type { Task, ChatMessage, UserProfile } from "@/types";
import { Image, Loader2, Send, ArrowLeft, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getAvatarUrl } from "@/lib/utils";

interface AnnotatedMessage extends ChatMessage {
  taskId: string;
  taskTitle: string;
}

interface PersonEntry {
  id: string;
  name: string;
  tasks: Task[];
}

function avatar(profile: UserProfile | null | undefined, fallbackName?: string) {
  return getAvatarUrl(profile ?? (fallbackName ? { name: fallbackName } : null));
}

export default function MessagesPage() {
  const { taskId: paramTaskId } = useParams<{ taskId?: string }>();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<Task[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string>("");
  const [activeTaskId, setActiveTaskId] = useState<string>("");
  const [allMessages, setAllMessages] = useState<AnnotatedMessage[]>([]);
  const [profileCache, setProfileCache] = useState<Record<string, UserProfile>>({});
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load all tasks user is involved in (creator or doer)
  useEffect(() => {
    if (!user) return;
    const allTasks = new Map<string, Task>();
    let loaded = 0;
    const done = () => {
      if (++loaded === 2) {
        const list = Array.from(allTasks.values());
        list.sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));
        setConversations(list);
        setLoadingConvos(false);
      }
    };
    const u1 = subscribeUserTasks(user.uid, (tasks) => { tasks.forEach((t) => allTasks.set(t.id, t)); done(); });
    const u2 = subscribeAcceptedTasks(user.uid, (tasks) => { tasks.forEach((t) => allTasks.set(t.id, t)); done(); });
    return () => { u1(); u2(); };
  }, [user]);

  // Group conversations by other person
  const personList = useMemo<PersonEntry[]>(() => {
    const map = new Map<string, PersonEntry>();
    conversations.forEach((task) => {
      const isCreator = user?.uid === task.creatorId;
      const otherId = isCreator ? task.doerId : task.creatorId;
      if (!otherId) return;
      const otherName = isCreator ? (task.doerName || "Waiting…") : task.creatorName;
      if (!map.has(otherId)) {
        map.set(otherId, { id: otherId, name: otherName, tasks: [] });
      }
      map.get(otherId)!.tasks.push(task);
    });
    return Array.from(map.values());
  }, [conversations, user?.uid]);

  // Auto-select person when coming from paramTaskId
  useEffect(() => {
    if (!paramTaskId || loadingConvos) return;
    const task = conversations.find((c) => c.id === paramTaskId);
    if (task) {
      const otherId = task.creatorId === user?.uid ? task.doerId : task.creatorId;
      if (otherId) {
        setSelectedPersonId(otherId);
        setActiveTaskId(paramTaskId);
        return;
      }
    }
    // Task not in subscriptions: fetch directly
    getTask(paramTaskId).then((t) => {
      if (!t) return;
      const otherId = t.creatorId === user?.uid ? t.doerId : t.creatorId;
      if (otherId) {
        setSelectedPersonId(otherId);
        setActiveTaskId(paramTaskId);
      }
    });
  }, [paramTaskId, loadingConvos, conversations]);

  // Default to first person when no param
  useEffect(() => {
    if (!paramTaskId && !selectedPersonId && personList.length > 0) {
      const first = personList[0];
      setSelectedPersonId(first.id);
      const active = first.tasks.find((t) => ["accepted", "in_progress"].includes(t.status)) || first.tasks[0];
      if (active) setActiveTaskId(active.id);
    }
  }, [personList, paramTaskId, selectedPersonId]);

  // When person changes, set default activeTaskId
  useEffect(() => {
    if (!selectedPersonId) return;
    const person = personList.find((p) => p.id === selectedPersonId);
    if (!person) return;
    if (!activeTaskId || !person.tasks.find((t) => t.id === activeTaskId)) {
      const active = person.tasks.find((t) => ["accepted", "in_progress"].includes(t.status)) || person.tasks[0];
      if (active) setActiveTaskId(active.id);
    }
  }, [selectedPersonId, personList]);

  // Load live profiles for sidebar
  useEffect(() => {
    if (!user || personList.length === 0) return;
    const missing = personList.map((p) => p.id).filter((id) => !profileCache[id]);
    if (missing.length === 0) return;
    Promise.all(missing.map((id) => getUserProfile(id))).then((profiles) => {
      setProfileCache((prev) => {
        const next = { ...prev };
        profiles.forEach((p) => { if (p) next[p.id] = p; });
        return next;
      });
    });
  }, [personList, user?.uid]);

  // Subscribe to messages from all tasks for the selected person
  useEffect(() => {
    if (!selectedPersonId) return;
    const person = personList.find((p) => p.id === selectedPersonId);
    if (!person || person.tasks.length === 0) { setAllMessages([]); return; }

    const msgMap = new Map<string, AnnotatedMessage[]>();
    const unsubscribers: (() => void)[] = [];

    person.tasks.forEach((task) => {
      const unsub = subscribeMessages(task.id, (msgs) => {
        msgMap.set(task.id, msgs.map((m) => ({ ...m, taskId: task.id, taskTitle: task.title })));
        const merged: AnnotatedMessage[] = [];
        msgMap.forEach((taskMsgs) => merged.push(...taskMsgs));
        merged.sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
        setAllMessages(merged);
      });
      unsubscribers.push(unsub);
    });

    return () => { unsubscribers.forEach((u) => u()); setAllMessages([]); };
  }, [selectedPersonId, personList]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !user || !profile || !activeTaskId) return;
    setSending(true);
    try {
      await sendMessage(activeTaskId, {
        senderId: user.uid,
        senderName: profile.name,
        senderAvatar: avatar(profile),
        text: text.trim(),
        type: "text",
      });
      setText("");
    } catch {
      toast({ title: "Failed to send", variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  async function handleImageSend(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.[0] || !user || !profile || !activeTaskId) return;
    setUploadingImg(true);
    try {
      const imageUrl = await uploadImage(e.target.files[0], `asktask/chat/${activeTaskId}`);
      await sendMessage(activeTaskId, {
        senderId: user.uid,
        senderName: profile.name,
        senderAvatar: avatar(profile),
        imageUrl,
        type: "image",
      });
    } catch {
      toast({ title: "Failed to send image", variant: "destructive" });
    } finally {
      setUploadingImg(false);
    }
  }

  const selectedPerson = personList.find((p) => p.id === selectedPersonId);
  const otherLiveProfile = profileCache[selectedPersonId];
  const otherAvatar = otherLiveProfile
    ? getAvatarUrl(otherLiveProfile)
    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedPerson?.name || "user"}`;
  const activeTask = selectedPerson?.tasks.find((t) => t.id === activeTaskId);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid md:grid-cols-3 gap-6 h-[calc(100vh-140px)]">

          {/* Sidebar — one entry per person */}
          <div className="bg-card rounded-2xl border border-border shadow-task-card overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border">
              <h2 className="font-display font-semibold text-foreground">Messages</h2>
            </div>
            <div className="overflow-y-auto flex-1">
              {loadingConvos ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : personList.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <p className="text-4xl mb-3">💬</p>
                  <p className="text-sm text-muted-foreground">
                    No conversations yet. Accept or post a task to start chatting.
                  </p>
                </div>
              ) : (
                personList.map((person) => {
                  const liveProfile = profileCache[person.id];
                  const personAvatar = liveProfile
                    ? getAvatarUrl(liveProfile)
                    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${person.name}`;
                  const latestTask = person.tasks[0];
                  const isSelected = selectedPersonId === person.id;
                  return (
                    <button
                      key={person.id}
                      onClick={() => setSelectedPersonId(person.id)}
                      className={`w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left ${isSelected ? "bg-muted" : ""}`}
                    >
                      <img
                        src={personAvatar}
                        alt={person.name}
                        className="w-10 h-10 rounded-full bg-muted shrink-0 object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{person.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{latestTask?.title}</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground shrink-0">
                        {person.tasks.length} task{person.tasks.length > 1 ? "s" : ""}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat window */}
          <div className="md:col-span-2 bg-card rounded-2xl border border-border shadow-task-card flex flex-col overflow-hidden">
            {selectedPerson ? (
              <>
                {/* Header */}
                <div className="p-4 border-b border-border flex items-center gap-3">
                  <button onClick={() => navigate(-1)} className="md:hidden mr-1">
                    <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <img
                    src={otherAvatar}
                    alt={selectedPerson.name}
                    className="w-9 h-9 rounded-full bg-muted object-cover ring-2 ring-primary/20"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">{selectedPerson.name}</p>
                    {/* Active task selector */}
                    {selectedPerson.tasks.length > 0 && (
                      <div className="relative">
                        <button
                          onClick={() => setShowTaskPicker((v) => !v)}
                          className="text-xs text-primary hover:underline truncate max-w-full flex items-center gap-1"
                        >
                          {activeTask?.title || "Select task"}
                          {selectedPerson.tasks.length > 1 && <ChevronDown className="h-3 w-3 shrink-0" />}
                        </button>
                        {showTaskPicker && selectedPerson.tasks.length > 1 && (
                          <div className="absolute top-full left-0 z-50 mt-1 bg-card border border-border rounded-xl shadow-elevated overflow-hidden min-w-[200px]">
                            {selectedPerson.tasks.map((t) => (
                              <button
                                key={t.id}
                                onClick={() => { setActiveTaskId(t.id); setShowTaskPicker(false); navigate(`/task/${t.id}`); }}
                                className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors truncate ${t.id === activeTaskId ? "text-primary font-medium" : "text-foreground"}`}
                              >
                                {t.title}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {allMessages.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-4xl mb-2">👋</p>
                      <p className="text-sm text-muted-foreground">Start the conversation!</p>
                    </div>
                  )}
                  {allMessages.map((msg, i) => {
                    const isMe = msg.senderId === user?.uid;
                    // Show task divider when task changes between messages
                    const prevMsg = i > 0 ? allMessages[i - 1] : null;
                    const showDivider = !prevMsg || prevMsg.taskId !== msg.taskId;
                    // For my messages, use live profile photo; for theirs, use live profile from cache
                    const msgAvatar = isMe
                      ? avatar(profile)
                      : (otherLiveProfile ? getAvatarUrl(otherLiveProfile) : msg.senderAvatar) ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.senderName}`;
                    return (
                      <div key={msg.id}>
                        {showDivider && (
                          <div className="flex items-center justify-center py-2">
                            <button
                              onClick={() => navigate(`/task/${msg.taskId}`)}
                              className="text-[10px] bg-muted px-3 py-1 rounded-full text-muted-foreground hover:text-primary hover:bg-muted/80 transition-colors"
                            >
                              {msg.taskTitle}
                            </button>
                          </div>
                        )}
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i * 0.02, 0.2) }}
                          className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}
                        >
                          {!isMe && (
                            <img
                              src={msgAvatar}
                              alt={msg.senderName}
                              className="w-6 h-6 rounded-full bg-muted shrink-0 object-cover"
                            />
                          )}
                          <div className={`max-w-[70%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                            {msg.type === "image" && msg.imageUrl ? (
                              <img
                                src={msg.imageUrl}
                                alt="Shared"
                                className={`rounded-2xl max-w-full object-cover ${isMe ? "rounded-br-md" : "rounded-bl-md"}`}
                              />
                            ) : (
                              <div
                                className={`px-4 py-2.5 rounded-2xl text-sm ${
                                  isMe
                                    ? "gradient-primary text-primary-foreground rounded-br-md"
                                    : "bg-muted text-foreground rounded-bl-md"
                                }`}
                              >
                                <p>{msg.text}</p>
                              </div>
                            )}
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {msg.createdAt?.toDate?.()?.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              }) || ""}
                            </p>
                          </div>
                          {isMe && (
                            <img
                              src={msgAvatar}
                              alt="You"
                              className="w-6 h-6 rounded-full bg-muted shrink-0 object-cover"
                            />
                          )}
                        </motion.div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <form
                  onSubmit={handleSend}
                  className="p-4 border-t border-border flex gap-2 items-center"
                >
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="text-muted-foreground hover:text-primary transition-colors"
                    disabled={uploadingImg}
                  >
                    {uploadingImg ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Image className="h-5 w-5" />
                    )}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageSend}
                  />
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type a message…"
                    className="flex-1 h-10 px-4 rounded-xl bg-muted border-none text-sm focus:ring-2 focus:ring-ring outline-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(e as any);
                      }
                    }}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    variant="hero"
                    className="rounded-xl h-10 w-10 shrink-0"
                    disabled={sending || !text.trim()}
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <p className="text-4xl mb-3">💬</p>
                <p className="font-display font-semibold text-foreground">Select a conversation</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose a person from the left to start chatting
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
