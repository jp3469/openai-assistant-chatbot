'use client'

import { useAssistant, type Message, useChat } from 'ai/react'

import { cn } from '@/lib/utils'
import { ChatList } from '@/components/chat-list'
import { ChatPanel } from '@/components/chat-panel'
import { EmptyScreen } from '@/components/empty-screen'
import { ChatScrollAnchor } from '@/components/chat-scroll-anchor'
import { useLocalStorage } from '@/lib/hooks/use-local-storage'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { useEffect, useRef, useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { usePathname, useRouter } from 'next/navigation'
import { AssistantStatus } from 'ai'
import saveChat from '@/app/api/chat/util'

const IS_PREVIEW = process.env.VERCEL_ENV === 'preview'
export interface ChatProps extends React.ComponentProps<'div'> {
  initialMessages?: Message[]
  id?: string
}

export function Chat({ id, initialMessages, className }: ChatProps) {
  const router = useRouter()
  const path = usePathname()
  const [previewToken, setPreviewToken] = useLocalStorage<string | null>(
    'ai-token',
    null
  )
  const [previewTokenDialog, setPreviewTokenDialog] = useState(IS_PREVIEW)
  const [previewTokenInput, setPreviewTokenInput] = useState(previewToken ?? '')
  const { status, messages, input, submitMessage, handleInputChange, setInput } =
    useAssistant({ api: '/api/chat' });
  const prevStatusRef = useRef<AssistantStatus>('awaiting_message');
  useEffect(() => {
    // Store the current status in a ref to compare later
    const prevStatus = prevStatusRef.current;
    
    // Check if the last status was 'completed' and current is 'in_progress', or vice versa
    if (prevStatus === 'in_progress' && status === 'awaiting_message') {
      console.log('Status changed:', prevStatus, '->', status);
      console.log('Messages:', messages);
      saveChat(id, messages)
    }
    
    // Update the ref with the new status for the next effect run
    prevStatusRef.current = status;
    
    // This useEffect hook should rerun every time the `status` value changes.
  }, [status, messages, id]);
  const [messagesWithInitial, setMessagesWithInitial] = useState<Message[]>(initialMessages || [])
  useEffect(() => {
    setMessagesWithInitial([...initialMessages || [], ...messages])
  }, [initialMessages, messages])

  return (
    <>
      <div className={cn('pb-[200px] pt-4 md:pt-10', className)}>
        {messagesWithInitial.length ? (
          <>
            <ChatList messages={messagesWithInitial} />
            <ChatScrollAnchor trackVisibility={ status == 'in_progress' } />
          </>
        ) : (
          <EmptyScreen setInput={setInput} />
        )}
      </div>
      <ChatPanel
        id={id}
        status={status}
        submitMessage={submitMessage} 
        handleInputChange={handleInputChange}
        messages={messagesWithInitial}
        input={input}
        setInput={setInput}
      />

      <Dialog open={previewTokenDialog} onOpenChange={setPreviewTokenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter your OpenAI Key</DialogTitle>
            <DialogDescription>
              If you have not obtained your OpenAI API key, you can do so by{' '}
              <a
                href="https://platform.openai.com/signup/"
                className="underline"
              >
                signing up
              </a>{' '}
              on the OpenAI website. This is only necessary for preview
              environments so that the open source community can test the app.
              The token will be saved to your browser&apos;s local storage under
              the name <code className="font-mono">ai-token</code>.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={previewTokenInput}
            placeholder="OpenAI API key"
            onChange={e => setPreviewTokenInput(e.target.value)}
          />
          <DialogFooter className="items-center">
            <Button
              onClick={() => {
                setPreviewToken(previewTokenInput)
                setPreviewTokenDialog(false)
              }}
            >
              Save Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
