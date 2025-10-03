import { Card } from "@/components/ui/card";
import { ChatBot } from "@/components/ChatBot";
import { Navigation } from "@/components/Navigation";

const Chat = () => {
  return (
    <div className="min-h-screen gradient-sky">
      <div className="container mx-auto px-4 py-6 pb-20">
        <Card className="shadow-card border-0 h-[calc(100vh-8rem)]">
          <ChatBot />
        </Card>
      </div>
      <Navigation />
    </div>
  );
};

export default Chat;