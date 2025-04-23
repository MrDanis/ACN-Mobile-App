// context/UserContext.tsx
import React, { createContext, useState, useContext, ReactNode } from 'react';

// interface User {
//   name: string;
//   email: string;
//   // add whatever your API returns
// }

interface UserContextProps {
  masseges:any //User | null;
  setMesseges: (messages: any) => void;
}

const ChatContext = createContext<UserContextProps | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [masseges, setMesseges] = useState<any | null>([]);

  return (
    <ChatContext.Provider value={{ masseges, setMesseges }}>
      {children}
    </ChatContext.Provider>
  );
};

// Custom hook for easy use
export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider to handle the chat messages');
  }
  return context;
};
