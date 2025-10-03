import { useState, useEffect, useRef } from "react";
import { Send, Phone, Video, MoreVertical, Paperclip, Smile, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";

const Community = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select(`*, profiles(full_name, avatar_url)`)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
      } else {
        setMessages(data || []);
      }
    };
    fetchMessages();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        if (payload.new.user_id !== user?.id) {
          const fetchNewMessage = async () => {
            const { data, error } = await supabase
              .from('messages')
              .select(`*, profiles(full_name, avatar_url)`)
              .eq('id', payload.new.id)
              .single();
            if (!error && data) {
              setMessages((prev) => [...prev, data]);
            }
          }
          fetchNewMessage();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const content = newMessage.trim();

    const optimisticMessage = {
      id: Math.random(),
      created_at: new Date().toISOString(),
      content: content,
      user_id: user.id,
      profiles: {
        full_name: user.user_metadata?.full_name || "You",
        avatar_url: user.user_metadata?.avatar_url,
      },
    };
    setMessages(prevMessages => [...prevMessages, optimisticMessage]);
    
    setNewMessage("");

    const { error } = await supabase.from("messages").insert({
      content: content,
      user_id: user.id,
    });

    if (error) {
      console.error("Send message error:", error);
      toast({ title: "Error", description: "Failed to send message.", variant: "destructive" });
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
    }
  };
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isCurrentUser = (userId: string) => user && userId === user.id;

  return (
    <div className="h-screen w-full flex flex-col bg-white">
      {/* Header (does not grow) */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 shadow-lg flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-lg">🌾</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold">Farm Community</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-white/10 rounded-full"><Video className="w-5 h-5" /></button>
            <button className="p-2 hover:bg-white/10 rounded-full"><Phone className="w-5 h-5" /></button>
            <button className="p-2 hover:bg-white/10 rounded-full"><MoreVertical className="w-5 h-5" /></button>
          </div>
        </div>
      </div>

      {/* Chat Messages Area (grows to fill all available space) */}
      <div className="flex-1 overflow-y-auto p-4 pb-20 space-y-4 bg-gray-100">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-end gap-2 ${isCurrentUser(message.user_id) ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex flex-col max-w-xs lg:max-w-md ${isCurrentUser(message.user_id) ? 'items-end' : 'items-start'}`}>
              {!isCurrentUser(message.user_id) && (
                <span className="text-xs font-medium text-gray-600 ml-2 mb-1">
                  {message.profiles?.full_name || "A Farmer"}
                </span>
              )}
              <div
                className={`px-4 py-2 rounded-2xl shadow-sm ${
                  isCurrentUser(message.user_id)
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white rounded-br-none'
                    : 'bg-white text-gray-800 rounded-bl-none border'
                }`}
              >
                <p className="text-sm break-words">{message.content}</p>
                <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${isCurrentUser(message.user_id) ? 'text-green-200' : 'text-gray-400'}`}>
                  <Clock className="w-3 h-3" />
                  <span>{formatTime(message.created_at)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area (does not grow) */}
      <div className="bg-white border-t p-4 flex-shrink-0">
        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <button type="button" className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"><Paperclip className="w-5 h-5" /></button>
          <div className="flex-1 relative">
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="w-full px-4 py-12 bg-gray-100 rounded-full border-0 focus:ring-2 focus:ring-green-500 pr-12"
            />
            <button type="button" className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-500"><Smile className="w-5 h-5" /></button>
          </div>
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="p-3 rounded-full bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg disabled:bg-gray-300 disabled:shadow-none"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
      <Navigation />
    </div>
  );
};

export default Community;
