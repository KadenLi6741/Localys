/**
 * Example page demonstrating the new user-to-user messaging system
 * This is a full implementation example showing how to use all the messaging components
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ChatList } from '@/components/ChatList';
import { ChatWindow } from '@/components/ChatWindow';
import { MessageComposer } from '@/components/MessageComposer';
import { sendMessage, createOrGetDirectConversation } from '@/lib/supabase/messaging';
import { supabase } from '@/lib/supabase/client';

export default function NewMessagingPage() {
  return (
    <ProtectedRoute>
      <MessagingContent />
    </ProtectedRoute>
  );
}

function MessagingContent() {
  const { user } = useAuth();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);

  const handleSendMessage = async (content: string, attachments?: File[]) => {
    if (!user || !selectedConversationId) return;
    
    try {
      // If there are attachments, upload them first (concurrently)
      let uploadedAttachments = [];
      
      if (attachments && attachments.length > 0) {
        const uploadPromises = attachments.map(async (file) => {
          const path = `${selectedConversationId}/${user.id}/${Date.now()}-${file.name}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('message-attachments')
            .upload(path, file);
          
          if (uploadError) {
            console.error('Error uploading file:', uploadError);
            return null;
          }
          
          // Get signed URL
          const { data: urlData } = await supabase.storage
            .from('message-attachments')
            .createSignedUrl(uploadData.path, 3600); // 1 hour expiry
          
          return {
            id: uploadData.path,
            name: file.name,
            url: urlData?.signedUrl || '',
            type: file.type,
            size: file.size,
          };
        });

        const results = await Promise.all(uploadPromises);
        uploadedAttachments = results.filter(Boolean); // Filter out failed uploads
      }
      
      // Send the message
      await sendMessage(
        selectedConversationId,
        user.id,
        content,
        uploadedAttachments.length > 0 ? 'attachment' : 'text',
        uploadedAttachments
      );
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">New Messaging System</h1>
          <button
            onClick={() => setShowNewChat(true)}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
          >
            New Chat
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto h-[calc(100vh-80px)]">
        <div className="flex h-full">
          {/* Sidebar - Conversation List */}
          <div className="w-80 border-r border-white/10 overflow-y-auto">
            <ChatList
              userId={user?.id || ''}
              onConversationSelect={(id) => {
                setSelectedConversationId(id);
                setShowNewChat(false);
              }}
            />
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col bg-white/5">
            {selectedConversationId ? (
              <>
                <ChatWindow
                  conversationId={selectedConversationId}
                  userId={user?.id || ''}
                />
                <MessageComposer onSend={handleSendMessage} />
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-white/60">
                  <svg
                    className="w-24 h-24 mx-auto mb-4 text-white/20"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  <p className="text-lg mb-2">Select a conversation to start messaging</p>
                  <p className="text-sm">or create a new chat using the button above</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <NewChatModal
          userId={user?.id || ''}
          onClose={() => setShowNewChat(false)}
          onConversationCreated={(id) => {
            setSelectedConversationId(id);
            setShowNewChat(false);
          }}
        />
      )}
    </div>
  );
}

interface NewChatModalProps {
  userId: string;
  onClose: () => void;
  onConversationCreated: (conversationId: string) => void;
}

function NewChatModal({ userId, onClose, onConversationCreated }: NewChatModalProps) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, full_name, profile_picture_url')
      .neq('id', userId)
      .limit(20);

    if (data) {
      setUsers(data);
    }
  };

  const handleCreateChat = async () => {
    if (!selectedUserId) return;

    try {
      setLoading(true);
      const { data, error } = await createOrGetDirectConversation(userId, selectedUserId);
      
      if (error) throw error;
      if (data) {
        onConversationCreated(data.id);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Start New Chat</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select a user to chat with:
            </label>
            <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg">
              {users.map((user) => (
                <div
                  key={user.id}
                  onClick={() => setSelectedUserId(user.id)}
                  className={`p-3 cursor-pointer hover:bg-gray-50 flex items-center gap-3 ${
                    selectedUserId === user.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                    {user.profile_picture_url ? (
                      <img
                        src={user.profile_picture_url}
                        alt={user.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        {user.full_name?.[0] || user.username?.[0] || '?'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {user.full_name || user.username}
                    </p>
                    {user.username && (
                      <p className="text-sm text-gray-500 truncate">@{user.username}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateChat}
              disabled={!selectedUserId || loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Start Chat'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
