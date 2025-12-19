import React, { useEffect, useState } from 'react';

interface Conversation {
  _id: string;
  participants: Array<any>;
  lastMessage?: string;
}

interface Message {
  _id: string;
  body: string;
  sender: any;
}

const MessagesPanel: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');

  const token = localStorage.getItem('barrylandAuthToken');

  useEffect(() => {
    const fetchConvos = async () => {
      try {
        const res = await fetch('/api/messages/conversations', { headers: { Authorization: token ? `Bearer ${token}` : '' } });
        const data = await res.json();
        if (res.ok) setConversations(data.data.conversations || []);
      } catch (err) {
        // ignore for now
      }
    };
    fetchConvos();
  }, [token]);

  useEffect(() => {
    if (!selected) return;
    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/messages/${selected}`, { headers: { Authorization: token ? `Bearer ${token}` : '' } });
        const data = await res.json();
        if (res.ok) setMessages(data.data.messages || []);
      } catch (err) {
        // ignore
      }
    };
    fetchMessages();
  }, [selected, token]);

  const send = async () => {
    if (!selected || !text.trim()) return;
    try {
      const res = await fetch(`/api/messages/${selected}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
        body: JSON.stringify({ body: text.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((m) => [...m, data.data.message]);
        setText('');
      }
    } catch (err) {
      // ignore
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 bg-gray-50 rounded-lg p-3 border border-gray-100">
        <div className="divide-y divide-gray-200">
          {conversations.map((c) => (
            <button key={(c as any)._id} onClick={() => setSelected((c as any)._id)} className="w-full text-left p-3 hover:bg-white rounded-md flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">{(c.participants && c.participants[0]) ? `${c.participants[0].firstName || ''} ${c.participants[0].lastName || ''}` : 'Conversation'}</div>
                <div className="text-sm text-gray-500">{c.lastMessage}</div>
              </div>
              <div className="text-xs text-gray-400">{new Date((c as any).updatedAt || Date.now()).toLocaleDateString()}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2 bg-white rounded-lg p-6 border border-gray-100 flex flex-col">
        <div className="flex-1 overflow-y-auto">
          {selected ? (
            messages.map((m) => (
              <div key={m._id} className="mb-4">
                <div className="text-sm text-gray-700"><strong>{m.sender?.firstName}</strong></div>
                <div className="mt-1 text-gray-800">{m.body}</div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 py-16">Sélectionnez une conversation à gauche</div>
          )}
        </div>

        <div className="mt-4">
          <div className="flex gap-3">
            <input value={text} onChange={(e) => setText(e.target.value)} className="flex-1 rounded-full border border-gray-200 px-4 py-3 text-sm" placeholder="Écrire un message..." />
            <button onClick={send} className="bg-emerald-600 text-white rounded-full px-4 py-2">Envoyer</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagesPanel;
